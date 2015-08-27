var express 	= require('express');
var cookieParse = require('cookie-parser');
var app 		= express();
var http        = require('http').Server(app);
var io 			= require('socket.io')(http);
var redis       = require('redis');
var fs			= require('fs');
var pm2         = require('pm2');
var db     		= redis.createClient();
var Engine 		= require('./engine');

// If second argument is passed, we are in debug mode:
var debug 			= (process.argv[2] !== undefined);

// Grab our realm from the folder structure
var directory_arr 	= __dirname.split('/');
var realmID			= directory_arr[directory_arr.length - 2];

// Increment and assign the smallest ids to clients
var counter = 0;

// Grab the map and parse into an object
var map = JSON.parse( fs.readFileSync(__dirname + '/../client/maps/town.json') );

var engine = new Engine();

engine.on('create', function (actors) {
	io.emit('create', actors);
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

// Catch memory leaks
/*
memwatch.on('leak', function(info) {
	console.log(JSON.stringify(info));
});
*/

// Catch redis errors
db.on("error", function (err) {
    console.log("Error " + err);
});

io.use(function(socket, next) {
	
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
	
	next(new Error('not authorized'));
  
});

io.on('connection', function (socket) {
	
	// Retrieve the key set earlier
	var uuid = socket.request.session.key;
	
	db.get(uuid, function(error, player) {
		if (player == "new") {
			player = {
                id: counter,
                position: {x: 220, y: 220},
				direction: 0,
                life: 100,
                experience: 0
            };
            
            counter++;
			
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
		
		socket.broadcast.emit('create', data);
		
		// Wire up events:
		socket.on('ready', function (data) {
			// Send initial data with all npc/pc locations, stats, etc
			var data        = {};
			data.player     = player;
			data.players    = engine.players();
			data.npcs       = engine.npcs();
            
			socket.emit('sync', data);
		});
		
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
			db.set(socket.request.session.key, JSON.stringify(player), function (error) {
				
				if (error) {
					console.error(error);
				}
				
			});
		});
        
        socket.on('join_debug', function (data) {
            socket.join('debug');
        });
        
        socket.on('leave_debug', function (data) {
            socket.leave('debug');
        });
		
	});
    
});	

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

engine.initialize();

// 16ms is 60fps, updating at half that
var worldLoop = setInterval(function () {
	
	engine.tick(map);
    
    var broadcast = engine.broadcast();
    
    if ((Object.getOwnPropertyNames(broadcast.npcs).length > 0) ||
    (Object.getOwnPropertyNames(broadcast.players).length > 0)) {
    
        io.emit('update', broadcast);
        
    }
	
	engine.broadcastComplete();
    
    
    
}, 32);

var debugLoop = setInterval(function () {
	//var room = io.sockets.adapter.rooms['debug']; Object.keys(room).length;
    pm2.describe(realmID, function (err, list) {
        if (err) {
            return;
        } 
        io.to('debug').emit('stats', {cpu: list[0].monit.cpu, memory: list[0].monit.memory});
    });
}, 1000);

pm2.connect(function(err) {
	
    if (err) {
        console.log(err.message);
    } else {
        if (debug) {
            // Listen on random port because lots (hopefully) of other nodes are running too!
            http.listen(0, function(){
                // Log the port to the console
                console.log("port: " + http.address().port);

                // In debug mode, trash any DB entries on (re)start so we don't get into trouble
                db.keys(realmID + "-*", function (err, keys) {
                    keys.forEach(function (key, pos) {
                        db.del(key, function (err) {
                            console.log("Deleted key: " + key);
                        });
                    });
                });
                
                db.set(realmID, http.address().port);
                db.set(realmID + '-time', new Date().toString());
                
            });
        } else {
            // In a purchased realm node, the realm instance serves up all it's files:
            app.use(express.static(__dirname + '/../'));

            // Hey!! Listen! --Navi
            http.listen(3000, function(){
                console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
            });
        }
    }
    
});