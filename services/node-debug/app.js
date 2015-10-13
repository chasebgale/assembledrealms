var express 		  = require('express');
var bodyParser 		= require('body-parser');
var cookieParser 	= require('cookie-parser');
var app 			    = express();
var moment 		    = require('moment');
var pm2           = require('pm2');
var walk          = require('walk');
var path          = require('path');
var redis 			  = require('redis');
var http 			    = require('http');
var fs            = require('fs');
var uuid 			    = require('node-uuid');
var db 	          = redis.createClient();
var dbSubscriber  = redis.createClient();
var server			  = http.Server(app);
var io 				    = require('socket.io')(server);
var request			  = require('request');

var SECURITY_TOKEN     = process.env.SECURITY_TOKEN;
var MAX_CLIENTS_GLOBAL = parseInt(process.env.MAX_CLIENTS_GLOBAL);
var MAX_CLIENTS_REALM  = parseInt(process.env.MAX_CLIENTS_REALM);
var SESSION_LIST       = "sessions";              // Sessions added via /auth allowing access
var SESSION_MAP        = "session_to_user_map";   // Sessions mapped to user_id via ZSCORE
var ACTIVE_SESSIONS    = "sessions_active";       // Sessions actually connected via SOCKET
var QUEUE              = "queue";
var QUEUE_LOOKUP       = "queue_lookup";          // Quickly determine if user is in queue

// TODO: Don't flush the DB on restart in production...
db.flushdb();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');

  if ('OPTIONS' == req.method) return res.send(200);
  
  next();
});

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies
app.use(cookieParser('Assembled Realms is a land without secrets...'));

// Catch redis errors
db.on("error", function onRedisError(err) {
  console.log("Error " + err);
});

app.set('view engine', 'ejs'); // set up EJS for templating

app.post('/auth/:id', function httpPostAuth(req, res, next) {
  var auth = req.get('Authorization');

  if (auth !== SECURITY_TOKEN) {
    console.log('/api/auth - Bad auth token - ' + SECURITY_TOKEN);
    return res.status(401).send("Please don't try to break things :/");
  }
  
  var php_sess    = req.body.php_sess;
  var user_id     = req.body.user_id;
  var owner       = req.body.owner;
  var realm_id    = req.params.id;
  
  if ((php_sess === undefined) || (user_id === undefined) || (owner === undefined)) {
    console.log('/api/auth - Missing params: ' + JSON.stringify(req.body));
    return res.status(500).send("Missing parameters, bruh.");
  }

  var realm     = "realm_" + realm_id + "_access";
  var privilege = (owner == true) ? 1 : 0;
  var now       = Date.now();
  
  db.multi()
    .zadd([SESSION_LIST, now, php_sess])     	   // Set session key and activity time for it
    .zadd([SESSION_MAP, user_id, php_sess])      // Map session key to user id
    .zadd([realm, privilege, user_id]) 	         // Add the user permission (1 = privileged)
    .exec(function (err, replies) {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }
      console.log("MULTI got " + replies.length + " replies");
      return res.send('OK');
    });
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

// PHP-session/auth wall
app.use(function(req, res, next) {

  var phpsession  = req.cookies["PHPSESSID"];
  
  // Are we missing an assembledrealms.com sesh?
  if ((phpsession == undefined) || (phpsession == "")) {
    console.log(req.url + " - Missing phpsession...");
    return res.status(401).send("Please don't try to break things :/");
  }
  
  // /api/auth gets called by assembledrealms.com php and injects the user sesh, if it's
  // missing, call shennanigans 
	db.zscore([SESSION_MAP, phpsession], function redisGetUserID(error, reply) {
		
    if (error) {
			console.error(error);
			return res.status(500).send(error.message);
		}
        
    if (reply) {
      
      req.user_id = reply;
      var now     = Date.now();
      
      db.zadd([SESSION_LIST, now, phpsession], function redisUpdateSessionTime(error, reply) {
        // Authorized
        next();
      });
      
    } else {
      console.log(req.url + " - Blank redis reply...");
      return res.status(401).send("Please don't try to break things :/");
    }
    
	});
});

app.get('/realms/:id', function httpGetRealm(req, res, next) {

  var realmKey = "realm_" + req.params.id;
  var userID   = req.user_id;
  
  var queueUser = function (callback) {
    // First, is the user already in the queue? (user refreshed browser, etc)
    db.sismember([QUEUE_LOOKUP, userID], function redisCheckQueue(error, found) {
      if (found === null) {
        // Not in the queue
        db.multi()
          .llen(ACTIVE_SESSIONS)        // Total active sessions across realms and queue
          .get(realmKey + '_clients')   // Total sessions active on requested realm
          .exec(function (err, replies) {
            if (err) {
              console.error(err);
              return res.status(500).send(err.message);
            }
            if ((parseInt(replies[0]) >= MAX_CLIENTS_GLOBAL) || (parseInt(replies[1]) >= MAX_CLIENTS_REALM)) {
              
              db.multi()
                .sadd([QUEUE_LOOKUP, userID])
                .rpush([QUEUE, userID])
                .exec(function (err, replies) {
                  // Successfully added to queue
                  return callback(true);
                });
              
            } else {
              // No need for queue
              return callback(false);
            }
          });
      } else {
        // Already queued
        return callback(true);
      }
    });
  };
	
  queueUser(function(queued) {
    db.hgetall(realmKey, function redisGetRealm(error, realm) {
		
      if (error) {
        return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
      }
      
      if (realm == null) {
        return res.render('error', {message: "REDIS has no knowledge of this realm..."});
      }
      
      var scripts  = [];
      var port     = realm.port.toString().replace(/(\r\n|\n|\r)/gm,"");

      // For now, grab all the required libs each time we prep the view, in the future,
      // do this once when '/launch' is called and store the array in redis...
      var walker  = walk.walk('./realms/' + req.params.id + '/client/', { followLinks: false });

      walker.on('file', function onWalkerFile(root, stat, next) {
        if (path.extname(stat.name) == '.js') {
            // Add this file to the list of files
            console.log("root: " + root + " , stat.name: " + stat.name);
            scripts.push("/" + path.join(root, stat.name));
        }
        next();
      });

      walker.on('end', function onWalkerEnd() {
        res.render('realm', {
          id: req.params.id,
          host: req.headers.host,
          port: port,
          scripts: scripts,
          queue: queued
        });
      });
      
    });
  });
  
	
});

dbSubscriber.on('message', function (channel, message) {
  if (channel === 'realm_notifications') {
    var action = JSON.parse(message);
    if (action.type === 'user_disconnected') {
      // TODO: If a user is queued to join this realm, alert him/her
      // via the socket they are on
    }
  }
});

// Sesh wall for sockets
io.use(function(socket, next) {
  
  // Grab our PHP Sesh key, if it exists
  var phpsession = '';
  var cookies = "; " + socket.request.headers.cookie;
  var parts = cookies.split("; PHPSESSID=");
  
  if (parts.length == 2) {
    phpsession = parts.pop().split(";").shift();
    
    // Grab the player id associated with this session
    db.zscore([SESSION_MAP, phpsession], function redisGetSession(error, reply) {
      if (reply !== null) {

        // Set the content of the session object to the redis/cookie key
        socket.request.user_id = reply;
        
        return next();
      }
    });
  }

  return next(new Error('not authorized'));
  
});

io.on('connection', function socketConnected(socket) {
  socket.on('stats', function () {
    socket.emit('stats', '');
  });
});

// ADMIN session/auth wall
app.use(function(req, res, next){
  var realm_id 	= req.url.split('/')[2];
  var realm   	= "realm_" + realm_id + "_access";
  var user_id   = req.user_id;
  
  console.log("checking " + realm + " for user: " + user_id);
  
  db.zscore([realm, user_id], function redisGetPermission(error, reply) {
    if (error) {
      console.error(error);
      return res.status(500).send(error.message);
    }
    console.log("owner: " + reply);
    if (reply == "1") {
      next();
    } else {
      return res.status(401).send("Please don't try to break things :/");
    }
  });
});

app.get('/launch/:id', function httpGetLaunch(req, res, next) {

	console.log(req.url + " called");

	var realmID     = req.params.id;
	var realmApp    = '/var/www/realms/realm-server.js';
  var realmErr    = '/var/www/logs/' + realmID + '-err.log';
  var realmOut    = '/var/www/logs/' + realmID + '-out.log';
  var found_proc  = [];
//  var close_proc  = [];
    
  var realmLaunch = function (callback) {
    // Get all processes running
    pm2.list(function(err, process_list) {
      // Search for running instance of requested realm
      process_list.forEach(function(proc) {
        console.log('checking: ' + proc.name);
        if (proc.name == realmID) {
          found_proc.push(proc);
          return;
        }
 
/* 
        db.get(realmID + "_clients",  function redisGetClients(error, reply) {
          if (error) {
              return;
          }
          // If the server is empty, shut it down:
          // TODO: Maybe check the last activity time and only shudown proc if it's been idle for
          // over 5-10 minutes or something...
          if (reply == 0) {
              close_proc.push(proc);
          }
        });
*/
      });
          
/*
      close_proc.forEach(function(proc) {
        pm2.stop(proc, function onPmStop(err, proc) {
          if (err) {
            console.log("Attempted to stop " + proc + " but errored: " + err.stack);
          }                   
        });
      });
*/
          
      fs.truncate(realmErr, 0, function onTruncateErrorLog(){
        fs.truncate(realmOut, 0, function onTruncateOutLog(){
          if (found_proc.length === 0) {
            // No existing realm server running, spool up new one:
            // scriptArgs: [realm_id, debug]
            var options = {
              name:       realmID,
              error:      realmErr,
              output:     realmOut,
              scriptArgs: [realmID, 'true']
            };
            
            console.log("Starting app with the following options: " + JSON.stringify(options));
            
            // TODO!!!! Check if the server has ~150 or so mb free before launching, if not,
            // add this realm to the REALM QUEUE
            pm2.start(realmApp, options, function onPmStart(err, proc) {
               
              if (err) {
                callback(err);
              }

              callback();
            });
          } else {
            // Existing realm server found, restart it
            pm2.restart(realmApp, function onPmRestart(err, proc) {
              
              if (err) {
                callback(err);
              }

              callback();
            });
          }
        });
      });
          
    });
  };
  
  realmLaunch(function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send(err.stack);
    }
    return res.send('OK');
  });
});

var tickTock = setInterval(function () {
  var expired = Date.now() - 1800000; // 1.8 million milliseconds = 30 minutes
  
  db.zrange([SESSION_LIST, 0, expired], function redisGetExpiredSessions(error, replies) {
    console.log("Expired sessions: " + JSON.stringify(replies));
    // TODO: Loop through replies, killing the SESSION_MAP entry for the session as well, then
    // calling zremrangebyscore
  });
  
  //db.zremrangebyscore(
}, 30000);

pm2.connect(function(err) {
	
  if (err) {
    console.log(err.message);
  }
    
	// Hey!! Listen!
	server.listen(3000, function onServerListen(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
    dbSubscriber.subscribe('realm_notifications');
	});
	
});