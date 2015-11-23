var express     = require('express');
var bodyParser  = require('body-parser');
var app         = express();
var server      = require('http').Server(app);
var request     = require('request');
var async       = require('async');
var moment      = require('moment');
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

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

app.use( allowCrossDomain );
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

app.set('view engine', 'ejs'); // set up EJS for templating

// Serve static files
app.use('/', express.static(__dirname + '/static'));

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

app.get('/launch/:id', function (req, res, next) {
    
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