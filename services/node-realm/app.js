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
var https			    = require('https');
var fs            = require('fs');
var os            = require('os');
var uuid 			    = require('node-uuid');
var db 	          = redis.createClient();
var dbListener    = redis.createClient();
var server			  = http.Server(app);
var request			  = require('request');
var async         = require('async');
var spawn         = require("child_process").spawn;

var sslCerts = {
  key:  fs.readFileSync('/etc/pki/tls/certs/www.assembledrealms.com.key').toString(),
  cert: fs.readFileSync('/etc/pki/tls/certs/STAR_assembledrealms_com.crt').toString(),
  ca:   [
    fs.readFileSync('/etc/pki/tls/certs/AddTrustExternalCARoot.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSAAddTrustCA.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSADomainValidationSecureServerCA.crt').toString()
  ],
  passphrase: '8160'
};

var serverSecure  = https.Server(sslCerts, app);
var io 				    = require('socket.io')(serverSecure);

var SECURITY_TOKEN     = process.env.SECURITY_TOKEN;
var MAX_CLIENTS_GLOBAL = parseInt(process.env.MAX_CLIENTS_GLOBAL);
var MAX_CLIENTS_REALM  = parseInt(process.env.MAX_CLIENTS_REALM);
var MAX_RUNNING_REALMS = parseInt(process.env.MAX_RUNNING_REALMS);
var MODE_DEMO          = (process.env.MODE_DEMO === "true");
var MODE_DEBUG         = (process.env.MODE_DEBUG === "true");
var DEMO_USER_ID_COUNT = -1;
var SESSION_LIST       = "sessions";              // Sessions added via /auth allowing access
var SESSION_MAP        = "session_to_user_map";   // Sessions mapped to user_id via ZSCORE
var ACTIVE_SESSIONS    = "sessions_active";       // Sessions actually connected via SOCKET
var QUEUE              = "queue";
var QUEUE_LOOKUP       = "queue_lookup";          // Quickly determine if user is in queue and for what realm...
var REALM_QUEUE        = "realm_queue";           // Realms waiting to be launched
var REALM_ACTIVITY     = "realm_activity";        // Last timestamp a user joined or left
var REALM_AVAILABILITY = "realm_availability";    // Realms that can be launched

// TODO: Don't flush the DB on restart in production...
// db.flushdb();

// Catch redis errors
db.on("error", function onRedisError(err) {
  console.error(err);
});

// Catch redis-listener messages
dbListener.on('message', function (channel, message) {
  // Test commands:
  //    publish realm_notifications '{"type": "user_disconnected", "user_id": -1, "realm_id": -1}'
  
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
                // io.to(replies[2]).emit('ready');
                io.to(JSON.parse(replies[2]).id).emit('ready');
                
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
    
    var now = Date.now();
    
    // Update user's/realm's last activity time
    db.multi()
      .zadd([REALM_ACTIVITY, now, action.realm_id])
      .zadd([SESSION_LIST, now, action.session_id])
      .exec(function (error, replies) {
        if (error) {
          console.error(error);
        }
      });
  }
});

// EJS for templating
app.set('view engine', 'ejs');

// crossdomain middleware
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://www.assembledrealms.com');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');

  if ('OPTIONS' == req.method) return res.send(200);
  
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser('Assembled Realms is a land without secrets...'));

// Serve up the realm files
app.use('/realms', express.static(__dirname + '/realms'));

var startRealm = function (realmID, startRealmCallback) {
  var now            = Date.now();
  var realmProcess   = "realm-" + realmID;
	var realmApp       = '/var/www/realms/realm-server.js';
  var realmErr       = '/var/www/logs/' + realmID + '.log';
  var realmOut       = '/var/www/logs/' + realmID + '.log';
  var running        = false;
  
  var launchRealm = function (restart, launchRealmCallback) {
    fs.unlink(realmErr, function onRemErrorLog(error){
      fs.unlink(realmOut, function onRemOutLog(error){
        
        if (error) {
          console.log(error);
        }
        
        db.zadd([REALM_ACTIVITY, now, realmID], function (error, reply) {
          
          if (error) {
            launchRealmCallback(error);
          }
          
          if (restart) {
            pm2.restart(realmApp, function onPmRestart(err, proc) {
              
              if (err) {
                launchRealmCallback(err);
              }

              launchRealmCallback();
            });        
          } else {
            var options = {
              name:       realmProcess,
              error:      realmErr,
              output:     realmOut,
              scriptArgs: [realmID, 'true'],
              force:      true,
              mergeLogs:  true
            };
            
            console.log("Starting realm with the following options: " + JSON.stringify(options));

            pm2.start(realmApp, options, function onPmStart(err, proc) {
               
              if (err) {
                console.log("Error starting realm instance: ");
                console.log(JSON.stringify(err));
                launchRealmCallback(err);
              }

              launchRealmCallback();
            });
          }
          
        });
      });
    });
  };
    
  // Get all processes running
  pm2.list(function(err, processes) {
    // Search for running instance of requested realm
    processes.forEach(function(proc) {
      if (proc.name == realmProcess) {
        running = true;
        
        /*
        pm2.describe(proc.name, function (err, list){
          console.log(JSON.stringify(list));
        });
        */
        
        return;
      }
    });
       
    if (!running) {
      // For now, check # of running realms, perhaps in the future when more data is available
      // in terms of average memory consumption, it'll check for free mem
      if (processes.length > MAX_RUNNING_REALMS) {
        
        db.rpush([REALM_QUEUE, realmID], function (error, reply) {
          startRealmCallback(null, 'QUEUED');
        });
        
      } else {
        // Realm not running and we have the space to spool a new one:
        launchRealm(false, function (error) {
          if (error) {
            console.error(error);
            startRealmCallback(error);
          }
          
          db.sadd([REALM_AVAILABILITY, realmID], function (error, reply) {
            startRealmCallback(null, 'QUEUED');
          });
          
          startRealmCallback(null, 'OK');
        });
      }
    } else {
      // Realm is already running, simply restart it
      launchRealm(true, function (error) {
        if (error) {
          console.error(error);
          startRealmCallback(error);
        }
        
        db.sadd([REALM_AVAILABILITY, realmID], function (error, reply) {
          startRealmCallback(null, 'QUEUED');
        });
        
        startRealmCallback(null, 'OK');
      });
    }
  });
};

/////////////////////////////////
// SERVER-TO-SERVER ROUTES

app.use('/api', function(req, res, next) {
  var auth = req.get('Authorization');

  if (auth !== SECURITY_TOKEN) {
    console.log('/api/auth - Bad auth token - ' + SECURITY_TOKEN);
    return res.status(401).send("Please don't try to break things :/");
  } else {
    next();
  }
});

app.post('/api/auth/:id', function httpPostAuth(req, res, next) {

  var php_sess    = req.body.php_sess;
  var user_id     = req.body.user_id;
  var displayname = req.body.displayname;
  var owner       = req.body.owner;
  var realm_id    = req.params.id;
  
  if ((php_sess === undefined) || (user_id === undefined) || (owner === undefined) || (displayname === undefined)) {
    console.log('/auth - Missing params: ' + JSON.stringify(req.body));
    return res.status(500).send("Missing parameters, bruh.");
  }
  
  if (MODE_DEMO) {
    // THIS IS FOR "DEMO" MODE, NO USER REGISTRATION REQ
    if (user_id == 0) {
      // Demo user w/o an account or not logged in, assign a negative user_id...
      // Using negatives here for a reason, if a logged in user with a positive id
      // lis logged in at the same time that id is given, collisions occur (lol)
      user_id = DEMO_USER_ID_COUNT;
      DEMO_USER_ID_COUNT--;
      displayname = "skele #" + user_id; 
    }
  }
  
  var user_obj = {
    display: displayname,
    session: php_sess
  }
  
  console.log("/auth requested: session: %s, user: %s, displayname: %s, realm: %s, owner: %s",
    php_sess, user_id, displayname, realm_id, owner);

  var realm_access_db = "realm_" + realm_id + "_access";
  var user_db         = "user_" + user_id;
  //var privilege = (owner == true) ? 1 : 0;
  var now       = Date.now();
  
  db.multi()
    .zadd([SESSION_LIST, now, php_sess]) // Set session key and activity time for it    	   
    .zadd([SESSION_MAP, user_id, php_sess]) // Map session key to user id
    .zadd([realm_access_db, owner, user_id]) // Add the user permission (1 = privileged)
    .hmset(user_db, user_obj) // Remember user details
    .exec(function (err, replies) {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }
      console.log("/auth success, db replies: %s", JSON.stringify(replies));
      
      return res.send('OK');
    });
});

app.get('/api/launch/:id', function httpGetLaunch(req, res, next) {
  
  startRealm(req.params.id, function (err, status) {
    if (err) {
      return res.status(500).send(err.stack);
    }
    
    return res.send(status);
  });
  
});

app.get('/api/shutdown/:id', function httpGetLaunch(req, res, next) {
  
  var realmID      = req.params.id;
  var realmProcess = "realm-" + realmID;
  var realmDB      = "realm_" + realmID;
  var running      = false;
  
  pm2.list(function(err, processes) {
    // Search for running instance of requested realm
    processes.forEach(function(proc) {
      if (proc.name == realmProcess) {
        running = true;
        return;
      }
    });
       
    if (!running) {
      db.del(realmDB, function (error, reply) {
        if (error) {
          console.error(error.stack);
          return res.status(500).send(error.stack);
        }
        
        return res.send('OK');
        
      });
    } else {
      pm2.delete(realmProcess, function onPmStop(err, proc) {
        if (err) {
          console.error("Attempted to stop " + proc.name + " but errored: " + err.stack);
          return res.status(500).send(err.stack);
        }
        
        db.del(realmDB, function (error, reply) {
          if (error) {
            console.error(error.stack);
            return res.status(500).send(error.stack);
          }
          
          return res.send('OK');
          
        });
        
      });
    }
  });
  
  
});

app.get('/api/stats', function httpGetStats(req, res, next) {
  
  async.series([
    function(callback) {
      db.multi()
        .zrange([SESSION_MAP, 0, -1, 'WITHSCORES'])     // Get sessions list with user ids
        .zrange([ACTIVE_SESSIONS, 0, -1, 'WITHSCORES']) // Get active user_id on realm_id list
        .lrange([QUEUE, 0, -1])                         // user_id's list in the queue
        .zrange([QUEUE_LOOKUP, 0, -1, 'WITHSCORES'])    // user_id's waiting for what realm_id's list
        .exec(function (err, replies) {
          if (err) {
            console.error(err);
            return callback(err);
          }
          
          callback(null, replies);
        });
    },
    function(callback) {
      var prc = spawn("free", []);
      prc.stdout.setEncoding("utf8");
      prc.stdout.on("data", function (data) {
        var lines = data.toString().split(/\n/g),
            line = lines[1].split(/\s+/),
            total = parseInt(line[1], 10),
            free = parseInt(line[3], 10),
            buffers = parseInt(line[5], 10),
            cached = parseInt(line[6], 10),
            actualFree = free + buffers + cached,
            memory = {
                total: total,
                used: parseInt(line[2], 10),
                free: free,
                shared: parseInt(line[4], 10),
                buffers: buffers,
                cached: cached,
                actualFree: actualFree,
                percentUsed: parseFloat(((1 - (actualFree / total)) * 100).toFixed(2)),
                comparePercentUsed: ((1 - (os.freemem() / os.totalmem())) * 100).toFixed(2)
            };
        
        var systemInfo = {
          platform: os.platform(),
          release:  os.release(),
          uptime:   os.uptime(),
          load:     os.loadavg(),
          memory:   memory
        };
        
        callback(null, systemInfo);
      });
      prc.on("error", function (error) {
        console.log("[ERROR] Free memory process", error);
        return callback(error);
      });
    },
    function(callback) {
      pm2.list(function(error, processes) {
        if (error) {
          return callback(error);
        }
        
        var list = [];
        var trim = {};
        
        processes.forEach(function(proc) {
          trim = {
            'created_at': proc.pm2_env.created_at,
            'name': proc.name,
            'monit': proc.monit
          };
          list.push(trim);
        });
        
        callback(null, list);
      });
    }
  ], function(err, results){
    
    if (err) {
      return res.status(500).send(error.message);
    }
    
    var result = {
      active_sessions: results[0][1],
      system:          results[1],
      processes:       results[2]
    };
    
    return res.json(result);
  });

});

/////////////////////////////////
// USER ROUTES

app.use('/realms', function(req, res, next) {

  var phpsession  = req.cookies["PHPSESSID"];
  
  // Are we missing an assembledrealms.com sesh?
  if ((phpsession == undefined) || (phpsession == "")) {
    console.log(req.url + " - Missing phpsession...");
    return res.status(401).send("Please don't try to break things :/");
  }
  
  // /api/auth gets called by assembledrealms.com php and injects the user sesh, if it's
  // missing, call shennanigans 
	db.zscore([SESSION_MAP, phpsession], function redisGetUserID(error, user_id) {
		
    if (error) {
			console.error(error);
			return res.status(500).send(error.message);
		}
        
    if (user_id) {
      
      req.user_id = user_id;
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

  var userID            = req.user_id;
  var realmID           = req.params.id;
  var realmKey          = "realm_" + realmID;
  var realm_access_db   = "realm_" + realmID + "_access";
  var owner             = false;
  var now               = Date.now();
  
  var queueUser = function (callback) {
    // First, is the user already in the queue? (user refreshed browser, etc)
    
    console.log("userID: %s, realmID: %s, realmKey: %s, realm_access_db: %s",
      userID, realmID, realmKey, realm_access_db
    );
    
    db.multi()
      .zscore([realm_access_db, userID])         // Check the user permission (1 = privileged)
      .zscore([QUEUE_LOOKUP, userID])        // Check if user is in queue
      .zadd([REALM_ACTIVITY, now, realmID])  // Update/create realm activity entry
      .exec(function (err, replies) {
        
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        
        console.log('queueUser db.multi() replies: ' + JSON.stringify(replies));
        
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
            .zcount([ACTIVE_SESSIONS, realmID, realmID]) // Sessions on requested realm
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
	
  var renderRealm = function (port, queued) {
    var scripts  = [];

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
  };
  
  queueUser(function(queued) {
    
    // This hash entry in redis is created by the realm itself, if it's missing, the realm error'd on startup,
    // assuming it was launched at all...
    db.hgetall(realmKey, function redisGetRealm(error, realm) {
		
      if (error) {
        return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
      }
      
      if (realm == null) {
        // Is the realm queued?
        db.lrange([REALM_QUEUE, 0, -1], function (error, list) {
          
          if (error) {
            console.error(error);
            return res.render('error', {message: "This realm is offline..."}); 
          }
          
          if (list == null) {
            return res.render('error', {message: "This realm is offline...."}); 
          }
          if (list.indexOf(realmID) > -1) {
            // TODO: Make work like user queue
            //return res.render('error', {message: "This realm is queued for launch..."});
            renderRealm(-1, queued);
          } else {
            // The realm was powered down due to inactivity, bring it back up:
            startRealm(req.params.id, function (err, status) {
              if (err) {
                return res.render('error', {message: "Realm broke after restart." + err.stack}); 
              }
              
              return res.render('retry');
              
            });
            
            //return res.render('error', {message: "This realm is offline....."});
          }
        });
      } else {
        
        if (realm.error !== "") {
          return res.render('error', {message: realm.error});
        }
        
        var port = realm.port.toString().replace(/(\r\n|\n|\r)/gm,"");
        renderRealm(port, queued);
      }
      
    });
  });
  
	
});

app.get('/realms/:id/log', function httpGetRealmLog(req, res, next) {
  fs.readFile('logs/' + req.params.id + '.log', function (err, data) {
    if (err) {
      return res.status(500).send(err.message);
    }
    return res.send(data);
  });
});

if (MODE_DEBUG) {
  app.get('/realms/:id/reboot', function httpGetRealmReboot(req, res, next) {
    
    var user_id         = req.user_id;
    var realm_id        = req.params.id;
    var realm_access_db = "realm_" + realm_id + "_access";
    
    db.zscore([realm_access_db, user_id], function (error, reply) {
      if (error) {
        return res.status(500).send(error.message);
      }
      
      if (reply.toString() === "1") {
        
        db.keys("realm_" + realm_id + "*", function (error, keys) {
          if (error) {
            return res.status(500).send(error.message);
          }
          
          async.each(keys, function (key, callback) {
            db.del(key, callback);
          }, function (error) {
            if (error) {
              return res.status(500).send(error.message);
            }
            
            startRealm(req.params.id, function (error) {
              if (error) {
                return res.status(500).send(error.message);
              }
              
              return res.json({message: 'OK'});
            });
          });
        });
        
      } else {
        console.log("Non-owner reboot attempt, user: %s, db response: %s", user_id, reply.toString());
        return res.status(401).send("Sensitive area! Please don't tinker!");
      }
    });
  });
}

/////////////////////////////////
// USER SOCKET ROUTES
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
    db.zscore([SESSION_MAP, phpsession], function redisGetSession(error, user_id) {
      if (error) {
        console.log("Error with zscore query");
        console.error(error);
        return next(new Error('not authorized'));
      }
      
      if (user_id !== null) {

        // Set the content of the session object to the redis/cookie key
        socket.request.user_id = user_id;
        socket.join(phpsession);
        console.log("user_id set to %s", user_id);
        
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

  db.multi()
    .lrange([QUEUE, 0, -1])
    .lrange([REALM_QUEUE, 0, -1])
    .exec(function (error, replies) {
      if (error) {
        console.error(error);
      }
      socket.emit('info', {
        queue:        replies[0],
        realm_queue:  replies[1]
      });    
    });
});

/* // ADMIN session/auth wall
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
*/

if (!MODE_DEMO) {
  var tickTock = setInterval(function () {
    var now            = Date.now();
    var expiredSession = now - 1800000; // 1.8 million milliseconds = 30 minutes
    var expiredRealm   = now - 120000;  // 2 min
    
    // Expired realms
    pm2.list(function(error, processes) {
      
      if (error) {
        console.log(error.stack);
        return callback(error);
      }
      
      async.each(processes, function(process, callback) {
        if (process.name !== "realm-host") {
          var id = process.name.split('-')[1];
          db.zcount([ACTIVE_SESSIONS, id, id], function (error, count) {
            if (error) {
              console.log(process.name + "  " + error.stack);
              return callback(error);
            }
            
            if (count === 0) {
              
              console.log("Found a process with no users, testing for acitivty...");
              
              db.zscore([REALM_ACTIVITY, id], function (error, lastActivity) {
                if (error) {
                  console.log(error.stack);
                  return callback(error);
                }
                
                console.log("...last active at %s, going to stop it: %s", lastActivity, (lastActivity < expiredRealm));
                
                if (lastActivity < expiredRealm) {
                  pm2.delete(process.name, function onPmStop(err, proc) {
                    if (err) {
                      console.log("Attempted to stop " + process.name + " but errored: " + err.stack);
                      return callback(err);
                    }
                    
                    db.del("realm_" + id, function (error, reply) {
                      if (error) {
                        console.log(error.stack);
                        return callback(error);
                      }
                      
                      // Boot up first queued realm, if any are queued
                      
                      
                      callback();
                    });
                  });
                } else {
                  callback();
                }
                
              });
            } else {
              callback();
            }
          });
        } else {
          callback();
        }
      }, function (error) {
        if (error) {
          console.error(error.stack);
        }
      });
    });
    
    
    // Expired user sessions
    db.zrangebyscore([SESSION_LIST, 0, expiredSession], function redisGetExpiredSessions(error, replies) {
      
      if (error) {
        return console.error(error);
      }
      
      if (replies.length > 0) {
        // Remove any sessions that have active connections from the removal list
        var multiSessionToUserLookup = db.multi();
        
        for (var m = 0; m < replies.length; m++) {
          multiSessionToUserLookup.zscore([SESSION_MAP, replies[m]]); 
        }
        
        multiSessionToUserLookup.exec(function (error, users) {
          if (error) {
            console.log(error.stack);
            return console.error(error);
          }
          
          var multiSessionsActive = db.multi();
          
          for (var u = 0; u < users.length; u++) {
            multiSessionsActive.zscore([ACTIVE_SESSIONS, users[u]]);
          }
          
          multiSessionsActive.exec(function (error, sessionLookups) {
            // check for active sessions
            for (var s = sessionLookups.length; s > -1; s--) {
              if (sessionLookups[s] !== null) {
                // Remove session that is actively connected from list to be purged
                replies.splice(s, 1);
              }
            }
            
            if (replies.length > 0) {
              // Add the target memory table to the beginning of the array so it is formatted properly e.g.
              // ["table_id", "value", "value"]
              replies.unshift(SESSION_MAP);
              
              db.zrem(replies, function redisDeleteSessionMap(error, count) {
                if (error) {
                  console.log(error.stack);
                  return console.error(error);
                }
                
                db.zremrangebyscore([SESSION_LIST, 0, expiredSession], function redisDeleteSessionList(error, counted) {
                  if (error) {
                    console.log(error.stack);
                    return console.error(error);
                  }
                  
                  return true;
                });
              });
            }
            
          });
          
        });
      }
      
      
    });
    
  }, 60000);
}

pm2.connect(function(err) {
	
  if (err) {
    console.log(err.message);
  }
    
	// Hey!! Listen!
	server.listen(3000, function onServerListen(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
    dbListener.subscribe('realm_notifications');
	});
  
  serverSecure.listen(8000, function () {
    console.log("HTTPS started on port 8000");
    
    if (MODE_DEMO) {
      startRealm("1", function () {
        console.log("DEMO REALM 1 LAUNCHED OK");
      });
    }
    
  }); //443
	
});