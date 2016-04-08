var express      = require('express');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var app          = express();
var https        = require('https');
var server       = require('http').Server(app);
var request      = require('request');
var async        = require('async');
var moment       = require('moment');
var pg           = require('pg');
var fs           = require('fs');
var extend       = require('util')._extend;
var redis 			 = require('redis');
var db 	         = redis.createClient();

// TODO: REMOVE THIS FOR PRODUCTION
db.flushdb();

// TODO: For now we'll just keep the list of servers to check on in memory; however, this should really be stored
// in redis or the like for fault tolerance in case this service crashes for some reason... if not someone could
// potentially be waiting in perpetuity for their realm to come online...
var realm_history   = {};
var realms          = {};

var ocean_token     = "254c9a09018914f98dd83d0ab1670f307b036fe761dda0d7eaeee851a37eb1cd";
var realms_token    = "b2856c87d4416db5e3d1eaef2fbef317846b06549f1b5f3cce1ea9d639839224";
var SECURITY_TOKEN  = "2f15adf29c930d8281b0fb076b0a14062ef93d4d142f6f19f4cdbed71fff3394";
var debug_token     = "1e4651af36b170acdec7ede7268cbd63b490a57b1ccd4d4ddd8837c8eff2ddb9";
var play_token      = "e61f933bcc07050385b8cc08f9deee61de228b2ba31b8523bdc78230d1a72eb2";
var source_token    = "fb25e93db6100b687614730f8f317653bb53374015fc94144bd82c69dc4e6ea0";
var HOME_TOKEN      = "b2856c87d4416db5e3d1eaef2fbef317846b06549f1b5f3cce1ea9d639839224";
var DEMO_TOKEN      = "045603f288bcdb3391ba819eb9fc8346bc81f4276a7911471bfc5a1881ceff37";

var connection      = 'postgres://web:ENBRyvqa91MTzotLBppU@localhost:5432/gatekeeper';

var SESSION_LIST    = "sessions";            // Sessions added via /auth allowing access
var SESSION_MAP     = "session_to_user_map"; // Sessions mapped to user_id via ZSCORE
var USER_REALMS     = "user_realms";         // Realms owned by user_id
var ACTIVE_SESSIONS = "sessions_active";     // Sessions actually connected via SOCKET
var REALM_STATUS    = "realm_status";        // Realm status as it is being brought online


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

app.use( allowCrossDomain );
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies
app.use(cookieParser('Assembled Realms is a land without secrets...'));

app.set('view engine', 'ejs'); // set up EJS for templating

// Serve static files
app.use('/', express.static(__dirname + '/static'));

app.post('/auth', function httpPostAuth(req, res, next) {
  var auth = req.get('Authorization');

  if (auth !== SECURITY_TOKEN) {
    console.log('/api/auth - Bad auth token - ' + SECURITY_TOKEN);
    return res.status(401).send("Please don't try to break things :/");
  }
  
  var now         = Date.now();
  var php_sess    = req.body.php_sess;
  var user_id     = req.body.user_id;
  var displayname = req.body.displayname;
  var realm       = req.body.realm;
  //  realm = {id: xx, source: xx}
  
  var user = {
    id: user_id,
    display: displayname
  }
  
  if ((php_sess === undefined) || (user_id === undefined) || (realm === undefined) || (displayname === undefined)) {
    console.log('/auth - Missing params: ' + JSON.stringify(req.body));
    return res.status(500).send("Missing parameters, bruh.");
  }
  
  console.log("/auth requested: session: %s, user: %s, realm: %s, displayname: %s",
    php_sess, user_id, JSON.stringify(realm), displayname);
    
  db.get([USER_REALMS + '-' + user_id], function redisGetExistingAuth(error, reply) {
    if (error) {
      console.error(error);
      return res.status(500).send(error.message);
    }
        
    if (reply) {
      var realms = JSON.parse(reply);
      realms.push(realm);
    } else {
      var realms = [
        realm
      ];
    }
    
    db.multi()
      .zadd([SESSION_LIST, now, php_sess])    // Set session key and activity time for it
      .zadd([SESSION_MAP, user_id, php_sess]) // Map session key to user id
      .set([USER_REALMS + '-' + user_id, JSON.stringify(realms)])  // Add the user realms
      .exec(function (err, replies) {
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        console.log("/auth success, db replies: %s", JSON.stringify(replies));
        
        return res.send('OK');
      });
    
  });
  
});

app.get('/stats', function (req, res, next) {
  
  var servers = [];
  
  servers.push({
    url: "https://debug-01.assembledrealms.com/api/stats",
    token: debug_token
  });
  
  servers.push({
    url: "https://play-01.assembledrealms.com/api/stats",
    token: play_token
  });
  
  servers.push({
    url: "https://demo-01.assembledrealms.com/api/stats",
    token: DEMO_TOKEN
  });
  
  var data = {
    servers: []
  };
  
  async.each(servers, function(server, callback) {
    var serverData = {
      title:    server.url,
      queue:    []
    };
    var options = {
      url: server.url,
      headers: {
        'Authorization': server.token
      }
    };
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body)
        var responseData = JSON.parse(body);
        /*
        // Loop through [.zrange([SESSION_MAP, 0, -1, 'WITHSCORES'])]
        for (var q = 0; q < responseData[0].length - 1; q += 2) {
          var realmIDLookup = responseData[1].indexOf(responseData[0][q+1]);
          if (realmIDLookup > -1) {
            realmIDLookup = responseData[1][realmIDLookup+1];
          }
          serverData.sessions.push({
            userID:    responseData[0][q+1],
            sessionID: responseData[0][q],
            realmID:   realmIDLookup
          });
        }
        */
        
        serverData.realms = {};
        
        for (q = 0; q < responseData.active_sessions.length - 1; q+=2) {
          var userID  = responseData.active_sessions[q];
          var realmID = responseData.active_sessions[q+1];
          if (serverData.realms[realmID] == undefined) {
            serverData.realms[realmID] = [];
          }
          
          serverData.realms[realmID].push(userID);
        }
        
        serverData.stats          = responseData.system;
        serverData.stats.load     = (parseFloat(serverData.stats.load[2]) * 100).toFixed(2) + "%";
        serverData.stats.uptime   = moment.duration(parseInt(serverData.stats.uptime), "seconds").humanize();
        serverData.stats.users    = (responseData.active_sessions.length / 2);
        
        serverData.processes = responseData.processes;
        
        for (var p = 0; p < serverData.processes.length; p++) {
          serverData.processes[p].created_at = moment(serverData.processes[p].created_at).fromNow(true);
          
          if (serverData.processes[p].name === "realm-host") {
            serverData.processes[p].users = "N/A";
          } else {
            var realmID = serverData.processes[p].name.split('-')[1];
            var realmUsers = serverData.realms[realmID];
            serverData.processes[p].users = (realmUsers ? realmUsers.length : "0");
          }
        }
        
        data.servers.push(serverData);
        callback();
      } else {
        if (error) {
          callback(error);
        } else {
          callback({message: response.statusCode});
        }
      }
    })
  }, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send(err.message);
    }
    
    data.servers.sort(function(a,b) {return (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0);} );
    //console.log("Rendering: %s", JSON.stringify(data));
    res.render('stats', data);
  });
});

app.get('/history', function (req, res, next) {
  pg.connect(connection, function(error, client, done) {

		if (error) {
			console.error(error);
			return;
		}
    
    client.query('SELECT count(*) as count FROM history', function(error, result) {
      if (error) {
        console.error(error);
      }
      res.send(result.rows[0].count);
      done();
    });
    
  });
});

// PHP-session/auth wall
app.use(function(req, res, next) {

  var phpsession = req.cookies["PHPSESSID"];
  
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
      
      console.log("PHPSESH wall found user: " + reply);
      
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

// Deploy specfied realm to least congested shared play server
app.post('/launch/play/shared/:id', function (req, res, next) {
  var time        = new Date().getTime();
  var realm_id    = req.params.id;
  // TODO: Pick least congested
  var realm_host_num  = '01'; 
  var realm_host      = 'play-' + realm_host_num + '.assembledrealms.com';
  var realm;
  
  // Does this user have permission to modify this realm?
  db.get([USER_REALMS + '-' + req.user_id], function redisGetUserRealms(error, reply) {
    var realms = JSON.parse(reply);
    console.log('USER REALMS: ' + reply);
    
    for (var i = 0; i < realms.length; i++) {
      if (realms[i].id == realm_id) {
        realm = realms[i];
        break;
      }
    }
    
    if (realm) {
      
      var options = {
        url: 'https://source-' + realm.source + '.assembledrealms.com/api/project/' + realm.id + '/publish',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': source_token,
          'Accept': '*/*'
        },
        json: true,
        body: {
          address: realm_host, 
          shared: true, 
          minify: true
        }
      };
      
      console.log("Posting to source to initiate xfer, options: " + JSON.stringify(options));
      
      request.post(options, function(err, response, body) {
        
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
          // SUCCESSFULLY PUBLISH FROM SOURCE SERVER TO SHARED SERVER
          var options = {
            url: 'https://' + realm_host + '/api/launch/' + realm.id,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': play_token,
              'Accept': '*/*'
            },
            json: true
          };
          
          console.log("Posting to play-xx to initiate launch...");
          
          request.get(options, function(err, response, body) {
            
            if (err) {
              console.error(err);
              return res.status(500).send(err.message);
            }
            
            if ((response.statusCode > 199) && (response.statusCode < 300)) {
              // SUCCESSFULLY LAUNCHED ON PLAY-XX
              
              // UPDATE REALMS TABLE ON assembledrealms.com
              var options = {
                url: 'https://www.assembledrealms.com/external/gatekeeper.php',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': HOME_TOKEN,
                  'Accept': '*/*'
                },
                formData: {
                  directive: 'update_realm_status',
                  realm_id: realm.id,
                  realm_status: 1,
                  realm_host: realm_host_num
                }
              };
              
              request.post(options, function(err, response, body) {
        
                if (err) {
                  console.error(err);
                  return res.status(500).send(err.message);
                }
                
                if ((response.statusCode > 199) && (response.statusCode < 300)) {
                  return res.json({message: 'OK'});
                } else {
                  return res.status(500).send('Response fauilure: ' + response.statusCode);
                }
              });
              
            } else {
              console.log('Failure http code from launch request...');
              return res.json({error: 'Failure http code from launch request...'});
            }
            
            if (err) {
              console.error(err);
              return res.json({error: err.message});
            }
          });
          
        } else {
          // Successful request but failure on DO API side
          console.log("Failure message: " + body);
          return res.status(500).send(body);
        }
      });
      
    } else {
      return res.status(401).send("Unauthorized.");
    }
    
  });
});

app.get('/shutdown/play/shared/:id', function (req, res, next) {
  var time        = new Date().getTime();
  var realm_id    = req.params.id;
  // TODO: Pick least congested
  var realm_host  = 'play-' + '01' + '.assembledrealms.com';
  var realm;
  
  // Does this user have permission to modify this realm?
  db.get([USER_REALMS + '-' + req.user_id], function redisGetUserRealms(error, reply) {
    var realms = JSON.parse(reply);
    console.log('USER REALMS: ' + reply);
    
    for (var i = 0; i < realms.length; i++) {
      if (realms[i].id == realm_id) {
        realm = realms[i];
        break;
      }
    }
    
    if (realm) {
      // SUCCESSFULLY PUBLISH FROM SOURCE SERVER TO SHARED SERVER
      var options = {
        url: 'https://' + realm_host + '/api/shutdown/' + realm.id,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': play_token,
          'Accept': '*/*'
        },
        json: true
      };
      
      console.log("Posting to play-xx to initiate shutdown...");
      
      request.get(options, function(err, response, body) {
        
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
          // UPDATE REALMS TABLE ON assembledrealms.com
          var options = {
            url: 'https://www.assembledrealms.com/external/gatekeeper.php',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': HOME_TOKEN,
              'Accept': '*/*'
            },
            formData: {
              directive: 'update_realm_status',
              realm_id: realm.id,
              realm_status: 0
            }
          };
          
          request.post(options, function(err, response, body) {
    
            if (err) {
              console.error(err);
              return res.status(500).send(err.message);
            }
            
            if ((response.statusCode > 199) && (response.statusCode < 300)) {
              return res.json({message: 'OK'});
            } else {
              return res.status(500).send('Response fauilure: ' + response.statusCode);
            }
          });
          
        } else {
          console.log('Failure http code from launch request...');
          return res.status(500).send('Response fauilure: Failure http code from launch request...');
        }
        
        if (err) {
          console.error(err);
          return res.json({error: err.message});
        }
      });
      
    } else {
      return res.status(401).send("Unauthorized.");
    }
    
  });
});

// Deploy specfied realm to least congested shared debug server
app.post('/launch/debug/shared/:id', function (req, res, next) {
  var time        = new Date().getTime();
  var realm_id    = req.params.id;
  
  // TODO: Pick least congested
  var realm_host_num  = '01'; 
  var realm_host      = 'debug-' + realm_host_num + '.assembledrealms.com';
  var realm;
  
  // Does this user have permission to modify this realm?
  db.get([USER_REALMS + '-' + req.user_id], function redisGetUserRealms(error, reply) {
    var realms = JSON.parse(reply);
    console.log('USER REALMS: ' + reply);
    
    for (var i = 0; i < realms.length; i++) {
      if (realms[i].id == realm_id) {
        realm = realms[i];
        break;
      }
    }
    
    if (realm) {
      
      var options = {
        url: 'https://source-' + realm.source + '.assembledrealms.com/api/project/' + realm.id + '/publish',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': source_token,
          'Accept': '*/*'
        },
        json: true,
        body: {
          address: realm_host, 
          shared: true, 
          minify: false
        }
      };
      
      console.log("Posting to source to initiate xfer, options: " + JSON.stringify(options));
      
      request.post(options, function(err, response, body) {
        
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
          // SUCCESSFULLY PUBLISH FROM SOURCE SERVER TO SHARED SERVER
          var options = {
            url: 'https://' + realm_host + '/api/launch/' + realm.id,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': debug_token,
              'Accept': '*/*'
            },
            json: true
          };
          
          console.log("Posting to debug-xx to initiate launch...");
          
          request.get(options, function(err, response, body) {
            if ((response.statusCode > 199) && (response.statusCode < 300)) {
              // SUCCESSFULLY LAUNCHED ON DEBUG-XX  
              
              // UPDATE REALMS TABLE ON assembledrealms.com
              var options = {
                url: 'https://www.assembledrealms.com/external/gatekeeper.php',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': HOME_TOKEN,
                  'Accept': '*/*'
                },
                formData: {
                  directive: 'update_realm_debug',
                  realm_id: realm.id,
                  realm_host: realm_host_num
                }
              };
              
              request.post(options, function(err, response, body) {
        
                if (err) {
                  console.error(err);
                  return res.status(500).send(err.message);
                }
                
                if ((response.statusCode > 199) && (response.statusCode < 300)) {
                  return res.json({message: 'OK'});
                } else {
                  return res.status(500).send('Response fauilure: ' + response.statusCode);
                }
              });
              
            } else {
              console.log('Failure http code from launch request...');
              return res.json({error: 'Failure http code from launch request...'});
            }
            
            if (err) {
              console.error(err);
              return res.json({error: err.message});
            }
          });
          
        } else {
          // Successful request but failure on DO API side
          console.log("Failure message: " + body);
          return res.status(500).send(body);
        }
      });
      
    } else {
      return res.status(401).send("Unauthorized.");
    }
    
  });
});

// Start a new droplet and deploy that realm to it:
app.get('/launch/play/private/:id', function (req, res, next) {
    
  var auth        = req.get('Authorization');
  var id          = req.params.id;
  var realm_host  = 'realm-' + id + '.assembledrealms.com';
  var time        = new Date().getTime();
  
  if (auth !== SECURITY_TOKEN) {
      return res.status(401).send("Please don't try to break things :/");
  }
  
  console.log(new Date().toISOString() + ' Received valid request to /launch/' + id);
    
  var options = {
    url: 'https://api.digitalocean.com/v2/droplets',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ocean_token,
      'Accept': '*/*'
    },
    json: true,
    body: {
      name:     realm_host,
      region:   'nyc3',
      size:     '512mb',
      image:    '12588564'
    }
  };
    
  request.post(options, function(err, response, body) {
    console.log(new Date().toISOString() + " Got launch response from DO: " + response.statusCode + " for " + req.params.id);
    
    if ((response.statusCode > 199) && (response.statusCode < 300)) {
      // True success
      
      /*
      NOW THAT DNS IS UP, NO NEED TO WAIT FOR THE IP TO COME BACK, D.O. WILL AUTOMATICALLY ROUTE THIS REALM BY IT'S
      HOSTNAME TO IT'S IP
      db.multi()
        .hmset(["realm:" + id, "droplet", body.droplet.id, "requested", time, "address", ""])
        .zadd(["queue", time, id])
        .exec(function (error, replies) {
          if (error) {
            console.error(error);
            return res.status(500).send(error.message);
          }
          
          return res.json({message: 'OK'});
        });
      */
      
      return res.json({message: 'OK'});
      
    } else {
      // Successful request but failure on DO API side
      console.log("Failure message: " + body);
      return res.status(500).send(body);
    }
  });
    
});

app.get('/shutdown/play/private/:id', function (req, res, next) {
    
  // Check console logs...
  console.log(new Date().toISOString() + ' Received valid request to /shutdown/play/shared/' + req.params.id);
  
  if (realms[req.params.id]) {
    var options = {
      url: 'https://api.digitalocean.com/v2/droplets/' + realms[req.params.id],
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ocean_token,
          'Accept': '*/*'
      }
    };
    
    request.del(options, function(err, response, body) {
      console.log(new Date().toISOString() + " Got delete response from DO: " + response.statusCode + " for " + req.params.id);
      
      if ((response.statusCode > 199) && (response.statusCode < 300)) {
          // True success
          realms[req.params.id] = undefined;
          return res.json({message: 'OK'});
      } else {
          // Successful request but failure on DO API side
          console.log("Failure message: " + body);
          return res.status(401).send(body);
      }
    });
  } else {
    console.log(new Date().toISOString() + " : Delete request was missing a DO droplet ID from memory array...");
  }
    
});

// Hey!! Listen!
server.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});

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

https.createServer(options, app).listen(8000, function () {
  console.log("HTTPS started on port 8000");
}); //443

// Acquire stats every minute
// TODO: Move to stats app and run on second processor?
setInterval(function(){
  
  // TODO: Query www host for current servers on startup
  var servers = [
    {
      id:     1,
      url:    "https://debug-01.assembledrealms.com/api/stats",
      name:   "debug-01",
      token:  debug_token
    }, {
      id:     2,
      url:    "https://play-01.assembledrealms.com/api/stats",
      name:   "play-01",
      token:  play_token,
      track:  true
    }
  ];
  
  var url     = '';
  var token   = '';
  var host    = '';
  var time    = moment().format();
  var current = {};
  var updates = {};
  
  pg.connect(connection, function(error, client, done) {

		if (error) {
			console.error(error);
			return;
		}
    
    async.each(servers, function(server, callback) {
      var options = {
        url: server.url,
        headers: {
          'Authorization': server.token
        },
        timeout: 30000
      };
      
      request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var responseData   = JSON.parse(body);
          var connectedUsers = responseData.active_sessions.length / 2;
          var runningRealms  = responseData.processes.length - 1;
          var cpu            = Math.round(responseData.system.load[2] * 100);
          var memory         = Math.round(responseData.system.memory.percentUsed);
          
          client.query('INSERT INTO history (timestamp, cpu, memory, connected_users, running_realms, server_id) VALUES ($1, $2, $3, $4, $5, $6)', [time, cpu, memory, connectedUsers, runningRealms, server.id], function(error) {
            if (error) {
              console.error(error);
            }
            
            // If we need stats from this server, usually just play-XX servers
            if (server.track) {
              
              // Updating realm user counts in memory
              for (var q = 0; q < responseData.active_sessions.length - 1; q+=2) {
                var userID  = responseData.active_sessions[q];
                var realmID = responseData.active_sessions[q+1];
                if (current[realmID] == undefined) {
                  current[realmID] = 0;
                }
                
                current[realmID]++;
              }
              
              var current_keys = Object.keys(current);
              var history_keys = Object.keys(realm_history);
              
              console.log(server.name + ' - current keys: ' + JSON.stringify(current_keys));
              console.log(server.name + ' - history keys: ' + JSON.stringify(history_keys));
              
              if (history_keys.length === 0) {
                updates = current;
                realm_history = extend({}, current);
              } else {
              
                for (var i = 0; i < history_keys.length; i++) {
                  var realm_id = history_keys[i];
                  
                  if (current_keys.indexOf(realm_id) > -1) {
                    // If previously recorded user count found, server has at least 1 user
                    if (realm_history[realm_id] !== current[realm_id]) {
                      realm_history[realm_id] = current[realm_id];
                      updates[realm_id] = current[realm_id];
                    }
                  } else {
                    // Missing update from server, it's empty
                    delete realm_history[realm_id];
                    updates[realm_id] = 0;
                  }
                }
                
              }
              
              
            }
            
            callback();
          });
          
        } else {
          if (error) {
            if (error.code === 'ETIMEDOUT') {
              if (error.connect === true) {
                console.error(options.url + ' timed out establishing connection...');
              } else {
                console.error(options.url + ' timed out after establishing connection...');
              }
            }
          } else {
            console.error(options.url + '::' + response.statusCode);
          }
          
          callback();
        }
      });
    }, function (error) {
      if (error) {
        console.error(error);
        return;
      }
      
      // TODO: Update gatekeeper with usercounts...
      if (Object.keys(updates).length > 0) {
        var options = {
          url: 'https://www.assembledrealms.com/external/gatekeeper.php',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': HOME_TOKEN,
            'Accept': '*/*'
          },
          form: {
            directive: 'update_users',
            realm_updates: JSON.stringify(updates)
          }
        };
        request.post(options, function (error, response, body) {
          if (error) {
            console.error(error);
          }
          
          if (!response) {
            console.log('!== 200 reply when saving user counts');
          }
          
          done();
          collectingStats = false;
        });
      } else {        
        console.log("No need to update... ");
        done();
        collectingStats = false;
      }
    });

  });
  
}, 60000);


/*
var working = false;
// Run the check loop every ~10 seconds
setInterval(function(){
    
  if (working) {
    // If the previous iteration is taking more than 10 seconds, break:
    return;
    // I like this better than calling setTimeout at the end of the function because it allows for
    // less time between iterations
  } else {
    working = true;
  }
    
  var minimum = new Date().getTime() - 30000;
  var online  = [];
  
  db.zrangebyscore(["queue", "-inf", minimum], function (error, list) {
    async.each(list, function(item, callback) {
      db.hget(["realm:" + item, "droplet"], function (error, dropletID) {
        request.get({
          url: 'https://api.digitalocean.com/v2/droplets/' + dropletID,
          headers: {
            'Content-Type': 'application/json', 
            'Authorization': 'Bearer ' + ocean_token
          },
          json: true
        }, function(err, response, body) {
            
          if ((response.statusCode > 199) && (response.statusCode < 300)) {
            // True success
            try {
              if (body.droplet.networks.v4.length > 0) {
                var ip = body.droplet.networks.v4[0].ip_address;
                online.push( {id: item, address: ip} );
              }
            } catch (e) {
              // Maybe if we are not getting an address after 10 min send an alert email or something?
            }
          } else {
            // Successful request but failure on DO API side
            console.log("CHECKER ::: Failure message: " + body);
          }
          
          callback();
        });
      });
    }, function (error) {
      if (online.length > 0) {
        request.post({
          url: 'http://www.assembledrealms.com/external/gatekeeper.php',
          headers: {'Content-Type': 'application/json', 'Token': realms_token},
          json: true, body: online
        }, function(err, response, body) {
          if (body.message !== 'OK') {
            // TODO: QUEUE UP RETRY
            console.log(new Date().toISOString() + ' Failure to update assembledrealms...');
          }
        });
        
        var purge = db.multi();
        
        for (var i = 0; i < online.length; i++) {
          purge.zrem(["queue", online[i].id]);
          purge.hmset(["realm:" + id, "address", online[i].address])
        }
        
        purge.exec(function (error, replies) {
          
        });
          
      } else {
        working = false;
      }
    });
  });
    
}, 10000);
*/