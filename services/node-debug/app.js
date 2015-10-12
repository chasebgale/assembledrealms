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
var server			  = http.Server(app);
var io 				    = require('socket.io')(server);
var request			  = require('request');

var SELF_TOKEN         = process.argv[2];
var MAX_CLIENTS_GLOBAL = parseInt(process.argv[3]);
var MAX_CLIENTS_REALM  = parseInt(process.argv[4]); // 10 on play, 5 on debug, pass as params

var SESSION_LIST       = "sessions";              // Sessions added via /auth allowing access
var SESSION_MAP        = "session_to_user_map";   // Sessions mapped to user_id via ZSCORE
var ACTIVE_SESSIONS    = "sessions_active";       // Sessions actually connected via SOCKET
var QUEUE              = "queue";


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

  if (auth !== SELF_TOKEN) {
    console.log('/api/auth - Bad auth token');
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
app.use(function(req, res, next){

  // Is this a server-to-server request?
  var auth = req.get('Authorization');
  if (auth === SELF_TOKEN) {
    // If the request is authorized, skip further checks:
    return next();
  }

  // Looks like we have a request from a user
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
      
      // Authorized
      next();
      
    } else {
      console.log(req.url + " - Blank redis reply...");
      return res.status(401).send("Please don't try to break things :/");
    }
	});
});

app.get('/realms/:id', function httpGetRealm(req, res, next) {

  var realm_key = "realm_" + req.params.id;
  
  db.llen(ACTIVE_SESSIONS, function redisGetActiveCount(error, activeCount) {
    if (error) {
			return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
    }
    
    if (activeCount < MAX_CLIENTS_GLOBAL) {
      db.get(realm_key + '_clients', function redisGetRealmClientCount(error, realmUserCount) {
        if (error) {
          return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
        }
        
        if (realmUserCount === null) {
          // First user on this realm
          realmUserCount = 0;
        }
        
        if (realmUserCount < MAX_CLIENTS_REALM) {
          // If we get to here, set queue = false on client response, allowing the client
          // to connect to the realm's port
        }
      });
    }
    
    // If we fall down to this line, set queue = true on client response so it displays the queue
  });
	
  
  // TODO: only do the below afterrrrr the above logic
	db.hgetall(realm_key, function redisGetRealm(error, realm) {
		
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
        scripts: scripts
      });
    });
  });
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
  var close_proc  = [];
    
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
      });
          
      close_proc.forEach(function(proc) {
        pm2.stop(proc, function onPmStop(err, proc) {
          if (err) {
            console.log("Attempted to stop " + proc + " but errored: " + err.stack);
          }                   
        });
      });
          
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
      return res.status(500).send(err.stack);
    }
    return res.send('OK');
  });
});



pm2.connect(function(err) {
	
  if (err) {
    console.log(err.message);
  }
    
	// Hey!! Listen!
	server.listen(3000, function onServerListen(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
	
});