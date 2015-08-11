var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var server			= require('http').Server(app);
var request         = require('request');
var async           = require('async');

// TODO: For now we'll just keep the list of servers to check on in memory; however, this should really be stored
// in redis or the like for fault tolerance in case this service crashes for some reason... if not someone could
// potentially be waiting in perpetuity for their realm to come online...
var check_list      = [];
var ocean_token 	= "254c9a09018914f98dd83d0ab1670f307b036fe761dda0d7eaeee851a37eb1cd";
var realms_token    = "b2856c87d4416db5e3d1eaef2fbef317846b06549f1b5f3cce1ea9d639839224";
var self_token      = "2f15adf29c930d8281b0fb076b0a14062ef93d4d142f6f19f4cdbed71fff3394";

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

app.get('/launch/:id', function (req, res, next) {
    
    var auth = req.get('Authorization');

    console.log('### Received request to /launch/' + req.params.id + ' with authorization: ' + auth);

    if (auth !== self_token) {
        return res.status(401).send("Please don't try to break things :/");
    }
    
	var realm_host = 'realm-' + req.params.id + '.assembledrealms.com';
    
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
        console.log("Got response: " + response.statusCode + " for " + req.params.id);
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
            // True success
            check_list.push( {id: req.params.id, droplet: body.droplet.id, time: new Date().getTime()} );
            
            return res.json({message: 'OK'});
        } else {
            // Successful request but failure on DO API side
            console.log("Failure message: " + body);
            return res.json({message: 'FAILURE: ' + body});
        }
    });
    
});

// Hey!! Listen!
server.listen(3000, function(){
    console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});

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
    
    var ts = new Date().getTime();
    
    async.each(check_list, function(check_item, callback) {
        if ((ts - check_item.time) > 30000) {
            // If it's been a minimum of 30 seconds, we can try it:
            
            request.get({url: 'https://api.digitalocean.com/v2/droplets/' + check_item.droplet,
                        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ocean_token},
                        json: true}, function(err, response, body) {
                
                if ((response.statusCode > 199) && (response.statusCode < 300)) {
                    // True success
                    if (body.droplet.networks.v4[0].ip_address) {
                        check_item.address = body.droplet.networks.v4[0].ip_address;
                    }
                } else {
                    // Successful request but failure on DO API side
                    console.log("Failure message: " + body);
                }
                
                callback();
            });
            
        } else {
            callback();
        }
    }, function (err) {
        
        var online  = [];
        var i       = check_list.length;
        
        while (i--) {
            if (check_list[i].address) {
                // If we have an address property, the server is online
                online.push( {id: check_list[i].id, address: check_list[i].address} );
                check_list.splice(i, 1);
            }
        }
        
        if (online.length > 0) {
            
            request.post({url: 'http://www.assembledrealms.com/external/gatekeeper.php',
                        headers: {'Content-Type': 'application/json', 'Token': realms_token},
                        json: true, body: online}, function(err, response, body) {
                            
                if (body.message !== 'OK') {
                    // TODO: QUEUE UP RETRY
                }
            });
            
        } else {
            working = false;
        }
    });
    
}, 10000);