var express 		= require('express');
var bodyParser 		= require('body-parser');
var cookieParser 	= require('cookie-parser');
var app 			= express();
var moment 		    = require('moment');
var pm2             = require('pm2');
var walk            = require('walk');
var path            = require('path');
var redis 			= require('redis');
var http 			= require('http');
var fs              = require('fs');
var uuid 			= require('node-uuid');
var redisClient 	= redis.createClient();
var server			= http.Server(app);
var io 				= require('socket.io')(server);

var scripts   = [];

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); //'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

redisClient.flushdb();

app.use(allowCrossDomain);

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

app.use(cookieParser('Assembled Realms is a land without secrets...'));

// Catch redis errors
redisClient.on("error", function (err) {
    console.log("Error " + err);
});

app.set('view engine', 'ejs'); // set up EJS for templating

// SET AUTH:
// TODO: This should only be accessable from the assembledrealms.com apache server IP:
app.post('/auth/:id/set/:hash', function (req, res, next) {
    redisClient.set(req.params.hash, req.params.id, function(err, reply) {
        res.json({message: 'OK'});
    });
});

// CHECK AUTH:
app.get('/auth/:hash', function (req, res, next) {
    redisClient.get(req.params.hash, function(err, reply) {
        if (reply) {
            
            var clientID = reply;
            
            // Auth ID xxx-xxx-xxx-xxx exists
            redisClient.del(req.params.hash, function(err, reply) {
                // Now we have removed the key, serve up the html/template/etc:
                res.send('This will be a template.');
            });
            
        } else {
            // Auth key is missing from redis:
            res.json({message: 'Authentication failure.'});
        }
    });
});

app.post('/launch', function (req, res, next) {

	var realmApp    = '/var/www/realm/server/app.js';
    var realmErr    = '/var/www/logs/err.log';
    var realmOut    = '/var/www/logs/out.log';
    var running     = false;
    var i           = 0;
    
    var walker  = walk.walk('/var/www/realm/client/', { followLinks: false });

    walker.on('file', function(root, stat, next) {
        
        if (path.extname(stat.name) == '.js') {
            // Add this file to the list of files
            console.log("root: " + root + " , stat.name: " + stat.name);
            scripts.push("/" + path.join(root, stat.name));
        }
        next();
        
    });

    walker.on('end', function() {
        pm2.connect(function(err) {
            // Get all processes running
            pm2.list(function(err, process_list) {
                
                console.log('/launch called, searching if process is running:');
                
                for (i = 0; i < process_list.length; i++) {
                    if (process_list[i].name == "realm") {
                        console.log('Process is running!');
                        running = true;
                        break;
                    }
                }
                
                fs.truncate(realmErr, 0, function() {
                    fs.truncate(realmOut, 0, function() {
                        if (!running) {
                            // No existing realm server running, spool up new one:
                            var options = { name: 'realm', error_file: realmErr, out_file: realmOut};
                            
                            console.log("Starting app with the following options: " + JSON.stringify(options));
                            
                            pm2.start(realmApp, options, function(err, proc) {
                                
                                pm2.disconnect();
                                
                                if (err) {
                                    console.log(e.stack);
                                    return res.send('ERROR BOOTING: ' + err.message);
                                }

                                res.send('OK');
                            });
                        } else {
                            // Existing realm server found, restart it
                            pm2.restart(realmApp, function(err, proc) {
                                
                                pm2.disconnect();
                                
                                if (err) {
                                    console.log(e.stack);
                                    return res.send('ERROR BOOTING: ' + err.message);
                                }

                                res.send('OK');
                            });
                        }
                    });
                }); 
                
            });
        }); 
    });
    
});

app.get('/', function (req, res, next) {

    //res.cookie('realm-' + req.params.id + '-debug', guid, {domain: '.assembledrealms.com', maxAge: (hour_milli * 72)});
    res.render('realm', {scripts: scripts});

});

// Serve up the realm files, when requested:
// app.use('/realms', express.static(__dirname + '/realms'));

pm2.connect(function(err) {
	
    if (err) {
        console.log(err.message);
    }
    
	// Hey!! Listen!
	server.listen(3001, function(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
	
});