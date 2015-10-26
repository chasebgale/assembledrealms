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
var dbListener    = redis.createClient();
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
var QUEUE_LOOKUP       = "queue_lookup";          // Quickly determine if user is in queue and for what realm...
var REALM_QUEUE        = "realm_queue";           // Realms waiting to be launched

// TODO: Don't flush the DB on restart in production...
// db.flushdb();

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
    console.log('/auth - Missing params: ' + JSON.stringify(req.body));
    return res.status(500).send("Missing parameters, bruh.");
  }
  
  console.log("/auth requested: session: %s, user: %s, realm: %s, owner: %s",
    php_sess, user_id, realm_id, owner);

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
      console.log("/auth success, db replies: %s", JSON.stringify(replies));
      
      return res.send('OK');
    });
});

app.get('/stats', function httpGetStats(req, res, next) {
  var auth = req.get('Authorization');

  if (auth !== SECURITY_TOKEN) {
    console.log('/api/auth - Bad auth token - ' + SECURITY_TOKEN);
    return res.status(401).send("Please don't try to break things :/");
  }

  db.multi()
    .zrange([SESSION_MAP, 0, -1, 'WITHSCORES'])     // Get sessions list with user ids
    .zrange([ACTIVE_SESSIONS, 0, -1, 'WITHSCORES']) // Get active user_id on realm_id list
    .lrange([QUEUE, 0, -1])                         // user_id's list in the queue
    .zrange([QUEUE_LOOKUP, 0, -1, 'WITHSCORES'])    // user_id's waiting for what realm_id's list
    .exec(function (err, replies) {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }
      console.log("MULTI got " + replies.length + " replies");
      return res.json(replies);
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

  var userID       = req.user_id;
  var realmID      = req.params.id;
  var realmKey     = "realm_" + realmID;
  var realmAccess  = "realm_" + realmID + "_access";
  var owner        = false;
  
  var queueUser = function (callback) {
    // First, is the user already in the queue? (user refreshed browser, etc)
    
    db.multi()
      .zscore([realmAccess, userID])     // Check the user permission (1 = privileged)
      .zscore([QUEUE_LOOKUP, userID])    // Check if user is in queue
      .exec(function (err, replies) {
        var accessReply  = replies[0];
        var queueReply   = replies[1];
        
        // TODO: If accessReply === null, punt user
        if (accessReply.toString() === "1") {
          owner = true;
        }
        
        if (queueReply === null) {
          // Not in the queue
          db.multi()
            .zcard(ACTIVE_SESSIONS) // Total active sessions across realms and queue
            .zlexcount([ACTIVE_SESSIONS, realmID, realmID]) // Sessions on requested realm
            .exec(function (err, replies) {
              if (err) {
                console.error(err);
                return res.status(500).send(err.message);
              }
              if ((parseInt(replies[0]) >= MAX_CLIENTS_GLOBAL) || (parseInt(replies[1]) >= MAX_CLIENTS_REALM)) {
                
                db.multi()
                  .zadd([QUEUE_LOOKUP, realmID, userID])
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
          id:       realmID,
          userID:   userID,
          host:     req.headers.host,
          port:     port,
          scripts:  scripts,
          queue:    queued,
          owner:    owner
        });
      });
      
    });
  });
  
	
});

// Test commands:
//    publish realm_notifications '{"type": "user_disconnected", "user_id": -1, "realm_id": -1}'
dbListener.on('message', function (channel, message) {
  if (channel === 'realm_notifications') {
    var action = JSON.parse(message);
    
    if (action.type === 'user_disconnected') {
      console.log('USER %s DISCONNECTED FROM %s', action.user_id, action.realm_id); 
      db.zrem([ACTIVE_SESSIONS, action.user_id], function redisAddSession(error, remSessionReply) {
        if (error) {
          console.log('Error attempting to remove from ACTIVE_SESSIONS, check error log...');
          console.error(error);
        }
        
        // Alert queue if not empty
        db.lpop(QUEUE, function redisGetFirstInQueue(error, user) {
          if (user !== null) {
            db.multi()
              .zscore([QUEUE_LOOKUP, user])             // Lookup realmID the queued user is waiting for
              .zrem([QUEUE_LOOKUP, user])               // Remove the queue lookup entry
              .zrangebyscore([SESSION_MAP, user, user]) // Grab the user's php sesh
              .lrange([QUEUE, 0, -1])                   // Get a list representing the remaining queue
              .exec(function (error, replies) {
                if (error) {
                  console.error(error);
                }
                
                console.log("QUEUE was not empty, first user [%s] has sesh [%s] and was waiting for realm [%s]", user, replies[2], replies[0]);
                
                // Alert user that was first in queue that they are cleared for takeoff
                io.to(replies[2]).emit('ready');
                
                // Update the rest of the queue to what has happened
                io.emit('info', {
                  list: replies[3]
                });
              });
            /*
            // The queue wasn't empty, alert first user in queue to join via socket
            // io.to(phpseshhhhh).emit('', '');
            db.lrange([QUEUE, 0, -1], function (error, list) {
              if (error) {
                console.error(error);
              }
              io.emit('info', {
                list: list
              });
            });
            */
          }
        });
      });
    }
    
    if (action.type === 'user_connected') {
      db.zadd([ACTIVE_SESSIONS, action.realm_id, action.user_id], function redisAddSession(error, addSessionReply) {
        console.log('USER %s CONNECTED TO %s', action.user_id, action.realm_id);
      });
    }
  }
});

// Sesh wall for sockets
io.use(function(socket, next) {
  
  console.log(socket.request.headers);
  
  // Grab our PHP Sesh key, if it exists
  var phpsession = '';
  var cookies    = socket.request.headers.cookie.split('; ');
  for (var c = 0; c < cookies.length; c++) {
    if (cookies[c].indexOf('PHPSESSID=') > -1) {
      phpsession = cookies[c].split('=').pop();
      break;
    }
  }
  
  if (phpsession !== '') {
    
    // Grab the player id associated with this session
    db.zscore([SESSION_MAP, phpsession], function redisGetSession(error, reply) {
      if (error) {
        console.log("Error with zscore query");
        console.error(error);
        return next(new Error('not authorized'));
      }
      
      if (reply !== null) {

        // Set the content of the session object to the redis/cookie key
        socket.request.user_id = reply
        socket.join(phpsession);
        console.log("user_id set to %s", reply);
        
        return next();
      } else {
        console.log("ZSCORE Missing");
        return next(new Error('not authorized'));
      }
    });
  } else {
    console.log('phpsession: %s', phpsession);
    return next(new Error('not authorized'));
  }
  
  //console.log("IO sesh wall failure from id %s, parsed from: %s", phpsession, cookies);
  
});

io.on('connection', function socketConnected(socket) {

  var userID = socket.request.user_id;

  db.lrange([QUEUE, 0, -1], function (error, list) {
    if (error) {
      console.error(error);
    }
    socket.emit('info', {
      list: list
    });
  });
});

// ADMIN session/auth wall
app.use(function(req, res, next) {
  console.log(req.url + " using called");
  
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
  var checkList   = [];
    
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
        pm2.describe(proc.name, function (err, list){
          console.log(JSON.stringify(list));
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
         
      if (found_proc.length === 0) {
        // 7 == max, realm_broker + 7 realms, = 8 total
        // For now, check # of running realms, perhaps in the future when more data is available
        // in terms of average memory consumption, it'll check for free mem
        if (process_list.length > 7) {
          
          // Do we have a realm we can power down?
          var multi = db.multi();
            
          process_list.forEach(function(proc) {
            multi.zrangebyscore([ACTIVE_SESSIONS, proc.name, proc.name]);
            checkList.push(proc.name);
          });
          
          multi.exec(function (error, replies) {
            for (var i = 0; i < replies.length; i++) {
              if (replies[i] === null) {
                // No active sessions for this realm, power it down
                // TODO: Check to make sure realm is at least 15 min old or something
                
              }
            }
          });
          
          
          // QUEUE REALM LAUNCH
          db.rpush([REALM_QUEUE, realmID], function (error, response) {
            callback();
          });
        }
      }
       
      // QUEUE is not necessary, load as usual
      fs.truncate(realmErr, 0, function onTruncateErrorLog(){
        fs.truncate(realmOut, 0, function onTruncateOutLog(){
          if (found_proc.length === 0) {
            // No existing realm server running, spool up new one:
            // scriptArgs: [realm_id, debug]
            var options = {
              name:       realmID,
              error:      realmErr,
              output:     realmOut,
              scriptArgs: [realmID, 'true'],
              force:      true
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
  
  db.zrangebyscore([SESSION_LIST, 0, expired], function redisGetExpiredSessions(error, replies) {
    
    if (error) {
      return console.error(error);
    }
    
    if (replies.length > 0) {
      console.log("Expired sessions: " + JSON.stringify(replies));
      
      // Add the target memory table to the beginning of the array so it is formatted properly e.g.
      // ["table_id", "value", "value"]
      replies.unshift(SESSION_MAP);
      
      db.zrem(replies, function redisDeleteSessionMap(error, count) {
        if (error) {
          return console.error(error);
        }
        
        db.zremrangebyscore([SESSION_LIST, 0, expired], function redisDeleteSessionList(error, counted) {
          if (error) {
            return console.error(error);
          }
          
          return true;
        });
      });
    }
  });
  
}, 30000);

pm2.connect(function(err) {
	
  if (err) {
    console.log(err.message);
  }
    
	// Hey!! Listen!
	server.listen(3000, function onServerListen(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
    dbListener.subscribe('realm_notifications');
	});
	
});