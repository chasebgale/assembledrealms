// REMOVE THIS FILE FROM THE ENGINE SOURCE,
// I SHOULD MAINTAIN AND INJECT THIS FILE OUTSIDE
// THE USER'S CONTROL AS IT NEEDS TO ACCURATELY
// REPORT HOW MANY CLIENTS ARE CONNECTED SO I CAN 
// MAINTAIN QUEUES AND USER LIMITS, ETC. 

// FUNDED REALMS SHOULD PERHAPS BE ABLE TO MODIFY?

var express 	= require('express');
var Engine 		= require('./engine');
var cookieParse = require('cookie-parser');
var app 		= express();
var http        = require('http').Server(app);
var io 			= require('socket.io')(http);
var redis       = require('redis');
var fs			= require('fs');
var pm2         = require('pm2');
var db     		= redis.createClient();

// If second argument is passed, we are in debug mode:
var debug 			= (process.argv[2] !== undefined);

// Grab our realm from the folder structure
var directory_arr 	= __dirname.split('/');
var realmID			= directory_arr[directory_arr.length - 2];

// Increment and assign the smallest ids to clients
var counter = 0;

// Grab the map and parse into an object
// This is a really terrible way to grab the default map
// This should be dynamic and really open ended as the user may
// have several maps...
//var map = JSON.parse( fs.readFileSync(__dirname + '/../client/maps/town.json') );

var engine = new Engine();

engine.on('create', function (actors) {
	io.emit('create', actors);
});

engine.on('debug', function (message) {
    io.to('debug').emit('debug', message);
});

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
};

app.use(allowCrossDomain);
app.use(cookieParse());

// Catch redis errors
db.on("error", function (err) {
    console.log("Error " + err);
});


io.use(function(socket, next) {
	
	// Grab our PHP Sesh key, if it exists
    var phpsession = '';
    var cookies = "; " + socket.request.headers.cookie;
    var parts = cookies.split("; PHPSESSID=");
    
    if (parts.length == 2) {
        phpsession = "s_" + parts.pop().split(";").shift();
		
		// Grab the player object in redis for this user
		db.get(phpsession, function(error, reply) {
			if (reply !== null) {
				
				// Set the content of the session object to the redis/cookie key
				socket.request.session = {player_key: reply};
				
				next();
			}
		});
    }
	
/* METHOD USED FOR PRIVATE REALMS
	if ( socket.request.headers.cookie ){
		
		// TODO: target should be different not on debug mode
		var target	= "realm-" + realmID + "-debug";
		var cookies = socket.request.headers.cookie.split(";");
		var worker 	= [];
		var uuid	= "";
		
		// Search for the cookie set by an earlier call to '/auth/:id/:uuid'
		for (var i = 0; i < cookies.length; i++) {
			worker = cookies[i].split("=");
			if (worker[0].toString().trim() == target) {
				uuid = realmID + "-" + worker[1].toString().trim();
				break;
			}
		}
		
		if (uuid !== "") {
			// Grab the player object in redis for this user
			db.get(uuid, function(error, reply) {
				if (reply !== null) {
                    
					// Set the content of the session object to the redis/cookie key
                    socket.request.session = {key: uuid};
                    
					next();
				}
			});
		}
		
	}
*/

	next(new Error('not authorized'));
  
});


io.on('connection', function (socket) {
	
	// Retrieve the key set earlier
	var uuid = socket.request.session.player_key;
	
	var player;
	
	var enterGame = function () {
		db.get(uuid, function(error, data) {
			
			player = data;
			
			if (player == "new") {
				
				counter++;
				player = engine.createPlayer();
				player.id = counter;
				
				db.set(uuid, JSON.stringify(player), function (error) {
				
					if (error) {
						console.error(error);
					}
					
				});
			} else {
				player = JSON.parse(player);
			}
			
			engine.addPlayer(player);
			
			var data = {};
			data.players = {};
			data.players[player.id] = player;
			
			// Tell other clients this client has connected
			socket.broadcast.emit('create', data);
			
			socket.on('ready', function (data) {
				// Send initial data with all npc/pc locations, stats, etc
				var data        = {};
				data.player     = player;
				data.players    = engine.players();
				data.npcs       = engine.npcs();
				
				socket.emit('sync', data);
			});
			
			// Wire up events:
			socket.on('move', function (data) {
				// Update position in memory:
				player.position.x = data.position.x;
				player.position.y = data.position.y;
				
				player.direction = data.direction;
				
				// TODO: Validate player move here
				
				// Broadcast change:
				//socket.broadcast.emit('move', {id: player.id, position: player.position, direction: player.direction});
				engine.addBroadcast(player);
				
				// Store change:
				// TODO: Do this only when we ping the full player position, so we send updates that look like amount:direction, so small, like 1:3 insted of {x: 12800.22, y: 200.1},
				// however, every <interval> we should send the full player position in case the client is out of sync, maybe every second or so
				/*
				db.set(socket.request.session.key, JSON.stringify(player), function (error) {
					
					if (error) {
						console.error(error);
					}
					
				});
				*/
			});
			
			socket.on('attack', function () {
				
				engine.attack(player);
				
			});
			
			socket.on('text', function (data) {
				io.emit('text', {id: player.id, blurb: data});
			});
			
			socket.on('join_debug', function (data) {
				socket.join('debug');
			});
			
			socket.on('leave_debug', function (data) {
				socket.leave('debug');
			});
			
			socket.on('disconnect', function () {
				engine.removePlayer(player);
			});
			
		});
	}
	
	
	
	enterGame();
	
	/*
	// TODO: Have two different queue methods, one more traditional where only
	// 10 or so players can be online at one time. When a player disconnects, the first 
	// person in the queue is allowed to enter; alternatively, implement a second method
	// where users queue and when a player dies, they enter the queue at the end and the 
	// first person in queue enters until they die...
	if (io.sockets.sockets.length > 1) {
		// Enter queue
	} else {
		enterGame();
	}
	*/
    
});	

app.get('/stats', function(req, res, next) {
	return res.send(io.sockets.sockets.length);
});

/*
app.get('/auth/:id/:uuid', function(req, res, next) {
    // TODO: Check the server calling this function is, in fact, assembledrealms.com
    
	var uuid = realmID + "-" + req.params.uuid;
	
    db.get(uuid, function(error, reply) {
        if (reply === null) {
            
            db.set(uuid, req.params.id, function (error) {
        
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
*/

engine.initialize();

// 16ms is 60fps, updating at half that
var worldLoop = setInterval(function () {
	
	engine.tick();
    
    var broadcast = engine.broadcast();
    
    if ((Object.getOwnPropertyNames(broadcast.npcs).length > 0) ||
    (Object.getOwnPropertyNames(broadcast.players).length > 0)) {
    
        io.emit('update', broadcast);
        
    }
	
	engine.broadcastComplete();
    
    
    
}, 32);

if (debug) {

    var debugLoop = setInterval(function () {
        //var room = io.sockets.adapter.rooms['debug']; Object.keys(room).length;
        pm2.describe(realmID, function (err, list) {
            if (err) {
                return;
            } 
            io.to('debug').emit('stats', {cpu: list[0].monit.cpu, memory: list[0].monit.memory});
        });
    }, 1000);

}

pm2.connect(function(err) {
	
    if (err) {
        console.log(err.message);
    } else {
//        if (debug) {
            // Listen on random port because lots (hopefully) of other nodes are running too!
            http.listen(0, function(){
                // Log the port to the console
                console.log("port: " + http.address().port);

				if (debug) {
					// In debug mode, trash any DB entries on (re)start so we don't get into trouble
					db.keys("realm_" + realmID + "*", function (err, keys) {
                        if ((err === undefined) && (keys)) {
                            keys.forEach(function (key, pos) {
                                db.del(key, function (err) {
                                    console.log("Deleted key: " + key);
                                });
                            });
                        }
					});
				}
                
                var data = {
                    "port": http.address().port,
                    "time": Date.now()
                };
                
                db.hmset("realm_" + realmID, data, function(err, reply) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(reply);
                });
                
            });
/*
		} else {
            // In a purchased realm node, the realm instance serves up all it's files:
            app.use(express.static(__dirname + '/../'));

            // Hey!! Listen! --Navi
            http.listen(3000, function(){
                console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
            });
        }
*/
    }
    
});