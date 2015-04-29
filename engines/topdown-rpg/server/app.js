var express 	= require('express');
var app 		= express();
var server 		= require('http').Server(app);
var io 			= require('socket.io').listen(server);
var morgan		= require('morgan');
var redis       = require('redis');
var client      = redis.createClient();

// If second argument is passed, we are in debug mode:
var debug = (process.argv[2] !== undefined);

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}
app.use(allowCrossDomain);

io.sockets.on('connection', function (client) {
	
	console.log('CLIENT CONNECTED, HANDSHAKING.....');

	// Wire up events:
	client.on('auth', processAuthorization);
	client.on('message', processMessage);
	client.on('update', processUpdate);
	client.on('error', processError);
	
	// Ask client to authenticate:
	client.emit('auth-handshake', 'handshake');
	
	function processAuthorization(data) {
		// data.id === user ID
		// data.auth === validated session key
		
		// The idea here is to only AUTH and allow access to registered, logged in clients
		// I'm thinking I'll have to write an API call on assembledrealms.com / realm to validate, so:
		
		// 1. User logs in on assembledrealms.com
		// 2. User navigates to realm page container, hosted on assembledrealms.com/realm/44
		// 3. assebledrealms.com calls API on realm server to create an entry in memoryDB, I'm thinking IP address of client, userID and new generated key.
		// 4. assembledrealms.com serves back container. Container has an iframe hosted by this realm and has generated key		
		// 4. HTML content of iframe served back is blank black page, uses socket.io client library to handshake (userID and sessionKey) after load
		// 4. [this server] receives handshake and checks memoryDB to auth session
		
		// This prevents someone loading this page outside of assembledrealms.com and handing in whatever
		// user ID they want to trash someones characters or whatnot.
		
		///////////////////////////////////////////////////
		// OPTION 2:
		
		// The idea would be to create an entry in assembledrealms.com DNS via digital ocean API 
		
		// 1. Call digital ocean API and create CNAME under assembledrealms.com, e.g. realm28.assembledrealms.com and point it to the realm IP
		// 2. Now this server will receive the session info with all requests as it is a subdomain of the auth, assembledrealms.com
		
		// Drawback means losing loadbalancer on assembledrealms.com if I move dns to digital ocean
		
		
		////////////////////////////////////////////////////
		// OPTION 3:
		
		// Looks like we need to have a DB server running REDIS and MYSQL / POSTGRE
		// - sessions will be stored on REDIS and accessed from across internal droplets at
		//   digital ocean. 
		// - get away from PHP and use node. Still serve up the same static files, just use
		//   node sessions instead of the clunky user system from PHP
		
		// FOR NOW, just accept a userID and trust it.
		client.set('userID', data.userID);
		
		// TODO: Once we have the userID, lookup all his character(s) or valid info in the local REDIS DB
		var redisData = {characterName: 'Tony Stark', characterLocation: {x: 2432, y: 1121}, characterExp: 12399, characterTitle: "Iron Man"};
		
		// Notify client auth was successful
		client.emit('auth-success', redisData);
		
		// Notify everyone else of a new player
		client.broadcast.emit('player-new', redisData);
	}
	
	function processMessage(data) {
		client.get('userID', function(error, userID) {
			if(userID !== undefined) {
				client.broadcast.emit('player-message', {
					userID: userID,
					message: data
				});
			}
		});
	}
	
	function processUpdate(data) {
		client.get('userID', function(error, userID) {
			if(userID !== undefined) {
				client.broadcast.emit('player-update', {
					userID: userID,
					update: data
				});
			}
		});
	}

	function processError(data) {
		console.log("ERROR: " + data);
	}
	
});

// Log to console
app.use(morgan('dev')); 	

if (debug) {
	// Listen on random port because lots (hopefully) of other nodes are running too!
	server.listen(0, function(){
		// Log the port to the console - this is caught by the debug server:
		console.log("port: " + server.address().port);
	});
} else {
	// In a purchased realm node, the realm instance serves up all it's files:
	app.use(express.static(__dirname + '/../client'));

	// Hey!! Listen! --Navi
	server.listen(3000, function(){
		console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
}