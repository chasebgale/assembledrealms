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

var debug_player_count  = 0;

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
                    
                    var player_obj = {};
                    
                    if (reply.toString() !== "new") {
                        player_obj = JSON.decode(reply.toString());
                    }
                    
                    socket.request.session = {key: uuid, player: player_obj};
                    
					next();
				}
			});
		}
		
	}
	
	next(new Error('not authorized'));
  
});

io.on('connection', function (socket) {
    
    var player = socket.request.session.player;
    
    if (player) {
	
        if (player.position === undefined) {
            
            player = {
                id: debug_player_count,
                position: {x: 220, y: 220},
                life: 100,
                experience: 0
            };
            
            debug_player_count++;
            
            rclient.set(socket.request.session.key, JSON.stringify(player), function (error) {
            
                if (error) {
                    console.error(error);
                }
                
                socket.broadcast.emit('player-new', player);
                
            });
        } else {
            socket.broadcast.emit('player-new', player);
        }
    } else {
        // TODO: session doesn't exist, disconn or what?
        return;
    }
    
	// Ask client to authenticate:
	// socket.emit('admin-message', socket.request.session.message);
		
	// Notify everyone else of a new player
	// socket.broadcast.emit('player-new', redisData);
	
    function processNewPlayer(data) {
        
    }
    
	function processMove(data) {
        
        // Update position in memory:
		player.position.x = data.x;
        player.position.y = data.y;
        
        // TODO: Validate player move here
        
        // Broadcast change:
        socket.broadcast.emit('move', player.position);
        
        // Store change:
        rclient.set(socket.request.session.key, JSON.stringify(player), function (error) {
            
            if (error) {
                console.error(error);
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
    
    // Wire up events:
	socket.on('move', processMove);
	socket.on('update', processUpdate);
	socket.on('error', processError);
	
});

// Log to console
app.use(morgan('dev')); 	

app.get('/auth/:id/:uuid', function(req, res, next) {
    // TODO: Check the server calling this function is, in fact, assembledrealms.com
    
    rclient.get(req.params.uuid, function(error, reply) {
        if (reply === null) {
            
            rclient.set(req.params.uuid, req.params.id, function (error) {
        
                if (error) {
                    console.error(error);
                    return res.status(500).send(error.message);
                }
                
                return res.json({message: 'OK'});
            });
            
            
        } else {
            return res.json({message: 'OK'});
        }
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