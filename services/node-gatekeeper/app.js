var express     = require('express');
var bodyParser  = require('body-parser');
var app         = express();
var server      = require('http').Server(app);
var request     = require('request');
var async       = require('async');
var moment      = require('moment');
var pg          = require('pg');

//var redis 			= require('redis');
//var db 	        = redis.createClient();

// TODO: For now we'll just keep the list of servers to check on in memory; however, this should really be stored
// in redis or the like for fault tolerance in case this service crashes for some reason... if not someone could
// potentially be waiting in perpetuity for their realm to come online...
var check_list      = [];
var realms          = {};

var ocean_token     = "254c9a09018914f98dd83d0ab1670f307b036fe761dda0d7eaeee851a37eb1cd";
var realms_token    = "b2856c87d4416db5e3d1eaef2fbef317846b06549f1b5f3cce1ea9d639839224";
var self_token      = "2f15adf29c930d8281b0fb076b0a14062ef93d4d142f6f19f4cdbed71fff3394";
var debug_token     = "1e4651af36b170acdec7ede7268cbd63b490a57b1ccd4d4ddd8837c8eff2ddb9";
var play_token      = "e61f933bcc07050385b8cc08f9deee61de228b2ba31b8523bdc78230d1a72eb2";
var source_token    = "fb25e93db6100b687614730f8f317653bb53374015fc94144bd82c69dc4e6ea0";

var connection      = 'postgres://web:ENBRyvqa91MTzotLBppU@localhost:5432/gatekeeper';

var SESSION_LIST    = "sessions";            // Sessions added via /auth allowing access
var SESSION_MAP     = "session_to_user_map"; // Sessions mapped to user_id via ZSCORE
var USER_REALMS     = "user_realms";         // Realms owned by user_id
var ACTIVE_SESSIONS = "sessions_active";     // Sessions actually connected via SOCKET

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

//  options is an object for easy serialization\deserialization from redis
var launch_shared = function (options, retry) {
  //  options = {
  //    realm_id,
  //    source_server
  //  }
  //  retry = boolean true or undefined, if true we are launching from
  //  the redis queue and something broke or timed-out on the initial pass
  
  
};

app.use( allowCrossDomain );
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

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
  var realms      = req.body.realms;
  //  realms = [ {id: xx, source: xx} ]
  
  
  if ((php_sess === undefined) || (user_id === undefined) || (realms === undefined)) {
    console.log('/auth - Missing params: ' + JSON.stringify(req.body));
    return res.status(500).send("Missing parameters, bruh.");
  }
  
  console.log("/auth requested: session: %s, user: %s, realms: %s",
    php_sess, user_id, realms);
  
  db.multi()
    .zadd([SESSION_LIST, now, php_sess])     	   // Set session key and activity time for it
    .zadd([SESSION_MAP, user_id, php_sess])      // Map session key to user id
    .zadd([USER_REALMS, JSON.stringify(realms), user_id])  // Add the user realms
    .exec(function (err, replies) {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }
      console.log("/auth success, db replies: %s", JSON.stringify(replies));
      
      return res.send('OK');
    });
});

app.get('/stats', function (req, res, next) {
  
  var servers = [];
  servers.push("http://debug-01.assembledrealms.com/stats");
  
  var data = {
    servers: []
  };
  
  async.each(servers, function(address, callback) {
    var serverData = {
      title:    address,
      queue:    []
    };
    var options = {
      url: address,
      headers: {
        'Authorization': debug_token
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
            serverData.processes[p].users = serverData.realms[realmID];
          }
        }
        
        data.servers.push(serverData);
        callback();
      } else {
        callback();
      }
    })
  }, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send(err.message);
    }
    console.log("Rendering: %s", JSON.stringify(data));
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

app.post('/test', function (req, res, next) {
  res.send('OK');
  res.end();
  
  setTimeout(function () {
    console.log('this happened after');
  }, 100);
  
});

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

// Deploy specfied realm to least congested shared play server
app.post('/launch/play/shared/:id', function (req, res, next) {
  var time        = new Date().getTime();
  var realm_id    = req.params.id;
  // TODO: Pick least congested
  var realm_host  = 'http://play-' + '01' + '.assembledrealms.com';
  var authorized  = false;
  var realm;
  
  // Does this user have permission to modify this realm?
  db.zscore([USER_REALMS, req.user_id], function redisGetUserRealms(error, reply) {
    var realms = JSON.parse(reply);
    
    for (var i = 0; i < realms.length; i++) {
      if (realms[i].id == realm_id) {
        authorized = true;
        realm = realms[i];
        break;
      }
    }
    
    if (authorized) {
      
      var options = {
        url: 'http://source-' + realm.source + '.assembledrealms.com/api/project/' + realm.id + '/publish',
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
      
      request.post(options, function(err, response, body) {
        console.log(new Date().toISOString() + " Got launch response from DO: " + response.statusCode + " for " + req.params.id);
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
          
          return res.json({message: 'OK'});
          
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

// Start a new droplet and deploy that realm to it:
app.get('/launch/play/private/:id', function (req, res, next) {
    
  var auth        = req.get('Authorization');
  var id          = req.params.id;
  var realm_host  = 'realm-' + id + '.assembledrealms.com';
  var time        = new Date().getTime();
  
  if (auth !== self_token) {
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

app.get('/shutdown/:id', function (req, res, next) {
    
  var auth = req.get('Authorization');

  if (auth !== self_token) {
    return res.status(401).send("Please don't try to break things :/");
  }
  
  // Check console logs...
  console.log(new Date().toISOString() + ' Received valid request to /shutdown/' + req.params.id);
  
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

// Acquire stats every minute
setInterval(function(){
  var servers = [];
  var url     = '';
  var token   = '';
  var time    = moment().format();
  
  pg.connect(connection, function(error, client, done) {

		if (error) {
			console.error(error);
			return;
		}
    
    var query = client.query('SELECT * FROM servers WHERE online = true');

    query.on('error', function(error) {
      console.error(error);
			return;
    });
    
    query.on('row', function(row) {
      if (row.type == 0) {
        url   = 'http://debug-';
        token = debug_token;
      } else {
        url   = 'http://play-';
        token = debug_token;
      }
      url += row.host + '.assembledrealms.com/stats';
      
      servers.push({
        id:    row.id,
        url:   url,
        token: token
      });
    });
    
    query.on('end', function() {
      
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
              callback();
            });

          } else {
            
            if (error.code === 'ETIMEDOUT') {
              if (error.connect === true) {
                console.error(options.url + ' timed out establishing connection...');
              } else {
                console.error(options.url + ' timed out after establishing connection...');
              }
            }
            
            callback();
          }
        });
      }, function (error) {
        if (error) {
          console.error(error);
          return;
        }
        
        done();
        collectingStats = false;
        
      });
      
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