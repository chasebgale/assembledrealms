var express 	= require('express');
var cookieParse = require('cookie-parser');
var app 		= express();
var http        = require('http').Server(app);
var io 			= require('socket.io')(http);
var morgan		= require('morgan');
var redis       = require('redis');
var rclient     = redis.createClient();

// If second argument is passed, we are in debug mode:
var debug 			= (process.argv[2] !== undefined);

var directory_arr = __dirname.split('/');
directory_arr.pop();
var parentDirectory	= directory_arr.pop();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}
app.use(allowCrossDomain);
app.use(cookieParse());

// Catch redis errors
rclient.on("error", function (err) {
    console.log("Error " + err);
});

io.use(function(socket, next) {
	
	console.log("Socket req w/ cookie: " + socket.request.headers.cookie);
	
	if ( socket.request.headers.cookie ){
		
		// TODO: target should be different not on debug mode
		var target	= "realm-" + parentDirectory + "-debug";
		var arr 	= socket.request.headers.cookie.split(";");
		var worker 	= [];
		var uuid	= "";
		
		for (var i = 0; i < arr.length; i++) {
			worker = arr[i].split("=");
			if (worker[0].toString().trim() == target) {
				uuid = worker[1].toString().trim();
				break;
			}
		}
		
		console.log("Parsed cookies: " + arr.length + ", found: " + uuid);
		
		if (uuid !== "") {
			rclient.get(uuid, function(error, reply) {
				console.log("db found: " + reply.toString());
				if (reply !== null) {
					next();
				}
			});
		}
		
	}
	
	next(new Error('not authorized'));
  
});

io.on('connection', function (socket) {
	
	console.log('CLIENT CONNECTED, HANDSHAKING.....');

	// Wire up events:
	socket.on('message', processMessage);
	socket.on('update', processUpdate);
	socket.on('error', processError);
	
	// Ask client to authenticate:
	socket.emit('admin-message', 'BOOM! BOOOOOOOOOM!');
		
	// Notify everyone else of a new player
	// socket.broadcast.emit('player-new', redisData);
	
	function processMessage(data) {
		rclient.get('userID', function(error, userID) {
			if(userID !== undefined) {
				socket.broadcast.emit('player-message', {
					userID: userID,
					message: data
				});
			}
		});
	}
	
	function processUpdate(data) {
		rclient.get('userID', function(error, userID) {
			if(userID !== undefined) {
				socket.broadcast.emit('player-update', {
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

app.get('/auth/:id/:guid', function(req, res, next) {
    
    //return res.send('JSON: ' + JSON.stringify(req.cookies));
    
    // TODO: Check the server calling this function is, in fact, assembledrealms.com
    rclient.set(req.params.guid, req.params.id, function (error) {
        
        if (error) {
            console.error(error);
			return res.status(500).send(error.message);
        }
        
        return res.json({message: 'OK'});
    });
    
});

if (debug) {
	// Listen on random port because lots (hopefully) of other nodes are running too!
	http.listen(0, function(){
		// Log the port to the console - this is caught by the debug server:
		console.log("port: " + http.address().port);
	});
} else {
	// In a purchased realm node, the realm instance serves up all it's files:
	app.use(express.static(__dirname + '/../client'));

	// Hey!! Listen! --Navi
	http.listen(3000, function(){
		console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
}