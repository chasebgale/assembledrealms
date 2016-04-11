require('app-module-path').addPath(__dirname);

var express     = require('express');
var cookieParse = require('cookie-parser');
var app         = express();
//var http        = require('http').Server(app);
//var io          = require('socket.io')(http);
var redis       = require('redis');
var fs          = require('fs');
var pm2         = require('pm2');
var db          = redis.createClient();

var options = {
  key:  fs.readFileSync('/etc/pki/tls/certs/www.assembledrealms.com.key').toString(),
  cert: fs.readFileSync('/etc/pki/tls/certs/STAR_assembledrealms_com.crt').toString(),
  ca:   [
    fs.readFileSync('/etc/pki/tls/certs/AddTrustExternalCARoot.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSAAddTrustCA.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSADomainValidationSecureServerCA.crt').toString()
  ],
  passphrase: '8160'
};

var serverSecure  = require('https').Server(options, app);
var io 				    = require('socket.io')(serverSecure);

var realm_id    = process.argv[2];
var debug       = (process.argv[3] == 'true');

var Engine      = require(realm_id + '/server/engine');

var SESSION_MAP        = "session_to_user_map";
var ACTIVE_SESSIONS    = "sessions_active";

var engine  = new Engine();

engine.readFile = function (file, callback) {
  if (file.indexOf('..') > -1) {
    return callback(new Error('Illegal request'));
  }

  file = __dirname + '/' + realm_id + '/' + file;
  fs.readFile(file, callback);
};

engine.emit = function (type, message) {
  io.emit(type, message);
};

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://www.assembledrealms.com');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

  if ('OPTIONS' == req.method) return res.send(200);
  
  next();
});

app.use(cookieParse());

// Catch redis errors
db.on("error", function redisError(err) {
  console.log("DB Error: " + err);
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
    db.zscore([SESSION_MAP, phpsession], function redisGetUserID(error, user_id) {
     
      if (error) {
        next(error);
      }

      if (user_id !== null) {
        
        var user_db = "user_" + user_id;
        
        db.hmget([user_db, "display"], function (error, display) {
        
          if (error) {
            next(error);
          }
        
          var key = "realm_" + realm_id + ":" + user_id;
          
          // Set the content of the session object to the redis/cookie key
          socket.request.session = {
            player_key: key, 
            user_id: user_id,
            id: phpsession,
            display: display[0]
          };
          
          next();
        });
        
      }
    });
  }

  next(new Error('not authorized'));
  
});

io.on('connection', function socketConnected(socket) {
  
  var userID     = socket.request.session.user_id;
  var playerKey  = socket.request.session.player_key;
  var playerName = socket.request.session.display;
  var session    = socket.request.session.id;
  var player;
  
  console.log("[SOCKET]: Player %s '%s' has connected",
    userID,
    playerName
  );
  
  var enterGame = function () {
    
    db.get(playerKey, function redisGetPlayer(error, player) {
      
      if (error) {
        console.error(error);
      }
      
      if (player === null) {
        player = { 
          id:   userID,
          name: playerName
        };
        console.log("[PLAYER %s]: Created from {}", player.id);
        
      } else {
        player = JSON.parse(player);
        console.log("[PLAYER %s]: Created from DB", player.id);
      }
      
      engine.addPlayer(player);
      
      var action = {
        type: 'user_connected',
        user_id: userID,
        realm_id: realm_id,
        session_id: session 
      };
      db.publish('realm_notifications', JSON.stringify(action));
      
      socket.on('ready', function (data) {
        // Send initial data with all npc/pc locations, stats, etc
        var data        = {};
        data.player     = player;
        data.players    = engine.players;
        data.npcs       = engine.npcs;
        
        socket.emit('sync', data);
        
        data = {};
        data.players = {};
        data.players[player.id] = player;
        
        // Tell other clients this client has connected
        socket.broadcast.emit('create', data);
      });
      
      /*
      LISTENERS.forEach(function (listener) {
        socket.on(listener.type, function (data) {
          listener.func(player, data);
        });
      });
      */
      
      socket.on('event', function (data) {
        engine[data.type](player, data.message);
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
          realm_id: realm_id,
          session_id: session 
        };
        
        db.publish('realm_notifications', JSON.stringify(action));
        
        console.log("[SOCKET]: Disconnected {userID: %s}", player.id);
        
        // Remove attackers as player is leaving realm
        player.attackers = {};
        
        db.set(playerKey, JSON.stringify(player), function redisSetPlayer(error) {
        
          if (error) {
            console.error(error);
          }
          
          engine.removePlayer(player);
          console.log("[PLAYER %s]: Stored in DB after exit", player.id);
          
        });
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

engine.initialize(function(error) {
  if (error) {
    console.log("engine.initialize error:");
    console.log(error);
    
    var data = {
      'error': error.message + '\n' + error.stack
    };
    
    db.hmset("realm_" + realm_id, data, function(err, reply) {
      if (err) {
        console.log(err);
      }
      
      return;
    });
  }
  
  // 16ms is 60fps, updating at half that
  var worldLoop = setInterval(function () {
    
    engine.tick();
    
    var broadcast = engine.broadcast;
    
    if (broadcast) {
      
      if (broadcast.npcs === undefined) {
        broadcast.npcs = {};
      }
      
      if (broadcast.players === undefined) {
        broadcast.players = {};
      }
    
      if ((Object.getOwnPropertyNames(broadcast.npcs).length > 0) ||
        (Object.getOwnPropertyNames(broadcast.players).length > 0)) {
        io.emit('update', broadcast);  
      }
    }
    
    //engine.broadcastComplete();
    engine.broadcast = {
      players: {},
      npcs:    {}
    };
    
  }, 32);
  
  if (debug) {
    var debugLoop = setInterval(function () {
      //var room = io.sockets.adapter.rooms['debug']; Object.keys(room).length;
      pm2.describe("realm-" + realm_id, function (err, list) {
        if (err) {
          return;
        } 
        io.to('debug').emit('stats', {cpu: list[0].monit.cpu, memory: list[0].monit.memory});
      });
    }, 1000);
  }
  
  pm2.connect(function(err) {
  
    if (err) {
      return console.log(err.message);
    } 
    
    // Listen on random port because lots (hopefully) of other nodes are running too!
    serverSecure.listen(0, function() {
      // Log the port to the console
      console.log("[SOCKET]: Port secured and listening");
      //console.log("port: " + serverSecure.address().port);

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
        "port":  serverSecure.address().port,
        "time":  Date.now(),
        "error": ""
      };
      
      db.hmset("realm_" + realm_id, data, function(err, reply) {
        if (err) {
          console.log(err);
        }
        console.log("[SOCKET]: Registered with backend");
      });
    });
    
  });
});