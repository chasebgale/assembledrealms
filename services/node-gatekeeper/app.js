var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var http 			= require('http');
var https           = require('https');
var server			= http.Server(app);

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

app.post('/launch', function (req, res, next) {

	var realmID = req.body.id;
    
    var options = {
        hostname: 'api.digitalocean.com',
        port: 443,
        path: '/v2/droplets',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ocean_token,
            'Accept': '*/*'
        }
    };
    
    https.get(options, function(res) {
        console.log("Got response: " + res.statusCode);
        
        if ((res.statusCode > 199) && (res.statusCode < 300)) {
            // True success
        } else {
            // Successful request but failure on DO API side
            console.log("Got error response code: " + res.statusCode);
        }
        
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
    
});