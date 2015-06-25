var express 	= require('express');
var Engine 		= require('./engine');
var cookieParse = require('cookie-parser');
var app 		= express();
var http        = require('http').Server(app);
var io 			= require('socket.io')(http);
var morgan		= require('morgan');
var redis       = require('redis');
var memwatch 	= require('memwatch-next');
var fs			= require('fs');
var db     		= redis.createClient();

// If second argument is passed, we are in debug mode:
var debug 			= (process.argv[2] !== undefined);

var directory_arr = __dirname.split('/');
directory_arr.pop();
var realmID	= directory_arr.pop();

var debug_player_count  = 0;

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

memwatch.on('leak', function(info) {
	console.log(JSON.stringify(info));
});

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
				uuid = worker[1].toString().trim();
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
                id: debug_player_count,
                position: {x: 220, y: 220},
				direction: 0,
                life: 100,
                experience: 0
            };
            
            debug_player_count++;
			
			db.set(uuid, JSON.stringify(player), function (error) {
            
                if (error) {
                    console.error(error);
                }
                
            });
		} else {
			player = JSON.parse(player);
		}
		
		engine.addPlayer(player);
		
		socket.broadcast.emit('player-new', player);
		
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
		
	});
    
});

// Log to console
app.use(morgan('dev')); 	

app.get('/auth/:id/:uuid', function(req, res, next) {
    // TODO: Check the server calling this function is, in fact, assembledrealms.com
    
    db.get(req.params.uuid, function(error, reply) {
        if (reply === null) {
            
            db.set(req.params.uuid, req.params.id, function (error) {
        
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


if (debug) {
	// Listen on random port because lots (hopefully) of other nodes are running too!
	http.listen(0, function(){
		// Log the port to the console
		// console.log("port: " + http.address().port);
        
        db.set(realmID, http.address().port);
        db.set(realmID + '-time', new Date().toString());
        
	});
} else {
	// In a purchased realm node, the realm instance serves up all it's files:
	app.use(express.static(__dirname + '/../client'));

	// Hey!! Listen! --Navi
	http.listen(3000, function(){
		console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
}