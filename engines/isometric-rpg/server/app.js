var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var morgan		= require('morgan');

var debug = false;


if (process.argv[2]) {
	debug = true;
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}
app.use(allowCrossDomain);

io.sockets.on('connection', function (client) {

	client.emit('status', 'CONNECTED!');
	console.log('CLIENT CONNECTED');

	client.on('auth', processAuthorization);
	client.on('message', processMessage);
	client.on('update', processUpdate);
	client.on('error', processError);
	
	function processAuthorization(data) {
		// data.id === user ID
		// data.auth === validated session key
		
		// The idea here is to only AUTH and allow access to registered, logged in clients
		// I'm thinking I'll have to write an API call on assembledrealms.com to validate, so:
		
		// 1. User logs in on website
		// 2. User navigates to realm page, which in turn serves HTML from [this server] in an iframe
		// 3. HTML served back is blank black page, sends handshake (userID and sessionKey) after load
		// 4. [this server] receives handshake and calls main site API to validate session
		
		// This prevents someone loading this page outside of assembledrealms.com and handing in whatever
		// user ID they want to trash someones characters or whatnot.
		
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

console.log('Attempting to static-ify: ' + __dirname + '/../client');

// Serve up the realm files, when requested:
app.use(express.static(__dirname + '/../client'));
//app.use(express.static('/var/www/realms/83/client'));

// Log to console
app.use(morgan('dev')); 	

if (debug) {
	// Hey, listen on random port (because lots (hopefully) of other nodes are running too)!
	server.listen(0, function(){
	  console.log("Express server listening on port: " + server.address().port);
	});
} else {
	// Hey!! Listen!
	server.listen(3000, function(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
}