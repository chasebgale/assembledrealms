/*

Realm-Broker handles all the auth, security, etc functions for a realm's app.js file, outside of 
the editable layer the end-user has access to.

*/

var express 	= require('express');
var app 		= express();
var server 		= require('http').Server(app);
var redis       = require('redis');
var client      = redis.createClient();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}
app.use(allowCrossDomain);

// SET AUTH:
// TODO: This should only be accessable from the assembledrealms.com apache server IP:
app.post('/auth/:id/set/:hash', function (req, res, next) {
    client.set(req.params.hash, req.params.id, function(err, reply) {
        res.json({message: 'OK'});
    });
});

// CHECK AUTH:
app.get('/auth/:hash', function (req, res, next) {
    client.get(req.params.hash, function(err, reply) {
        if (reply) {
            
            var clientID = reply;
            
            // Auth ID xxx-xxx-xxx-xxx exists
            client.del(req.params.hash, function(err, reply) {
                // Now we have removed the key, serve up the html/template/etc:
                res.send('This will be a template.');
            });
            
        } else {
            // Auth key is missing from redis:
            res.json({message: 'Authentication failure.'});
        }
    });
});