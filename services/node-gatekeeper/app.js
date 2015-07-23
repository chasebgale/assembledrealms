var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var server			= http.Server(app);
var request         = require('request');

// TODO: For now we'll just keep the list of servers to check on in memory; however, this should really be stored
// in redis or the like for fault tolerance in case this service crashes for some reason... if not someone could
// potentially be waiting in perpetuity for thier realm to come online...
var check_list      = [];
var ocean_token 	= "254c9a09018914f98dd83d0ab1670f307b036fe761dda0d7eaeee851a37eb1cd";

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

// TODO: Make sure only assembledrealms.com can call this
app.get('/launch/:id', function (req, res, next) {
    
    console.log('### Received request to /launch/' + req.params.id);

	var realm_host = 'realm-' + req.params.id + '.assembledrealms.com';
    
    var options = {
        url: 'https://api.digitalocean.com/v2/droplets',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ocean_token,
            'Accept': '*/*'
        },
        form: {
            name:     realm_host,
            region:   'nyc3',
            size:     '512mb',
            image:    '12588564'
        }
    };
    
    request.post(options, function(err, response, body) {
        console.log("Got response: " + response.statusCode);
        
        if ((response.statusCode > 199) && (response.statusCode < 300)) {
            // True success
        } else {
            // Successful request but failure on DO API side
            console.log("Got error response code: " + response.statusCode);
        }
    });
    
});

// Hey!! Listen!
server.listen(3000, function(){
    console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});