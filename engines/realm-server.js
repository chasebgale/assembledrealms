require('app-module-path').addPath(__dirname);

var express     = require('express');
var cookieParse = require('cookie-parser');
var app         = express();
var http        = require('http').Server(app);
var io          = require('socket.io')(http);
var redis       = require('redis');
var fs          = require('fs');
var pm2         = require('pm2');
var db          = redis.createClient();

var realm_id    = process.argv[2];
var debug       = (process.argv[3] == 'true');

var Engine      = require(realm_id + '/server/engine');

var SESSION_MAP        = "session_to_user_map";
var ACTIVE_SESSIONS    = "sessions_active";

// Increment and assign the smallest ids to clients
var counter = 0;
var engine  = new Engine();

engine.on('create', function engineCreate(actors) {
  io.emit('create', actors);
});

engine.on('debug', function engineDebug(message) {
  io.to('debug').emit('debug', message);
});

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

  if ('OPTIONS' == req.method) return res.send(200);
  
  next();
});

app.use(cookieParse());

// Catch redis errors
db.on("error", function redisError(err) {
    console.log("Error " + err);
});

// Sesh wall
io.use(function(socket, next) {
  
  // Grab our PHP Sesh key, if it exists
  var phpsession = '';
  var cookies = "; " + socket.request.headers.cookie;
  var parts = cookies.split("; PHPSESSID=");
  
  if (parts.length == 2) {
    phpsession = parts.pop().split(";").shift();
    
    // Grab the player object in redis for this user
    db.zscore([SESSION_MAP, phpsession], function redisGetUserID(error, reply) {
      if (reply !== null) {
        
        var key = "realm_" + realm_id + ":" + reply;
        
        // Set the content of the session object to the redis/cookie key
        socket.request.session = {
          player_key: key, 
          user_id: reply
        };
        
        next();
      }
    });
  }

  next(new Error('not authorized'));
  
});


io.on('connection', function socketConnected(socket) {
  
  var userID     = socket.request.session.user_id;
  var playerKey  = socket.request.session.player_key;
  var player;
  
  var enterGame = function () {
    
    db.get(playerKey, function redisGetPlayer(error, data) {
      
      player = data;
      if (player === null) {
        
        counter++;
        player = engine.createPlayer();
        player.id = counter;
        
        db.set(playerKey, JSON.stringify(player), function redisSetPlayer(error) {
        
          if (error) {
            console.error(error);
          }
          
        });
      } else {
        player = JSON.parse(player);
      }
      
      engine.addPlayer(player);
      
      var action = {
        type: 'user_connected',
        user_id: userID,
        realm_id: realm_id
      };
      db.publish('realm_notifications', JSON.stringify(action));
      
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
        var action = {
          type: 'user_disconnected',
          user_id: userID,
          realm_id: realm_id
        };
        
        db.publish('realm_notifications', JSON.stringify(action));
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
        pm2.describe(realm_id, function (err, list) {
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
        // Listen on random port because lots (hopefully) of other nodes are running too!
        http.listen(0, function(){
            // Log the port to the console
            console.log("port: " + http.address().port);

            if (debug) {
                // In debug mode, trash any DB entries on (re)start so we don't get into trouble
                db.keys("realm_" + realm_id + "*", function (err, keys) {
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
            
            db.hmset("realm_" + realm_id, data, function(err, reply) {
                if (err) {
                    console.log(err);
                }
                console.log(reply);
            });
            
        });
    }
    
});