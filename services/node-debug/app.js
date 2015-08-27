var express 		= require('express');
var bodyParser 		= require('body-parser');
var cookieParser 	= require('cookie-parser');
var app 			= express();
var morgan			= require('morgan');
var moment 		    = require('moment');
var pm2             = require('pm2');
var walk            = require('walk');
var path            = require('path');
var redis 			= require('redis');
var http 			= require('http');
var uuid 			= require('node-uuid');
var redisClient 	= redis.createClient();
var server			= http.Server(app);
var io 				= require('socket.io')(server);

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

// Log to console
app.use(morgan('dev')); 	
app.set('view engine', 'ejs'); // set up EJS for templating

app.post('/launch', function (req, res, next) {

	var realmID     = req.body.id;
	var realmApp    = '/var/www/realms/' + realmID + '/server/app.js';
    var found_proc  = [];
    var close_proc  = [];
	
    pm2.connect(function(err) {
        
        // Get all processes running
        pm2.list(function(err, process_list) {
            
            console.log('/launch called, running processes:');
            
            // Search for running instance of requested realm
            process_list.forEach(function(proc) {
                console.log('checking: ' + proc.name);
                if (proc.name == realmID) {
                    found_proc.push(proc);
                }
                
                redisClient.get(realmID + "-clients",  function (error, reply) {
		
                    if (error) {
                        continue;
                    }
                    
                    // If the server is empty, shut it down:
                    // TODO: Maybe check the last activity time and only shudown proc if it's been idle for
                    // over 5-10 minutes or something...
                    if (reply == 0) {
                        close_proc.push(proc);
                    }
                    
                });
                
            });
            
            console.log('found ' + found_proc.length);
            console.log('idle ' + close_proc.length);
            
            close_proc.forEach(function(proc) {
                pm2.stop(proc, function(err, proc) {
                    if (err) {
                        console.log("Attempted to stop " + proc + " but errored: " + err.stack);
                    }                   
                });
            });
            
            if (found_proc.length === 0) {
                // No existing realm server running, spool up new one:
                pm2.start(realmApp, { name: realmID, scriptArgs: ['debug'] }, function(err, proc) {
					
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

var scripts   = [];

app.get('/realms/:id', function (req, res, next) {

	redisClient.get(req.params.id, function (error, reply) {
		
		if (error) {
			return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
        }
		
		if (reply == null) {
            return res.render('error', {message: "REDIS has no knowledge of this realm..."});
        }
        
        scripts   = [];
        
        var port = reply.toString().replace(/(\r\n|\n|\r)/gm,"");
        
        // Update the last access time so it doesn't get shutdown for inactivity:
        // (NOW WE ARE DOING THIS IN THE APP ITSELF)
        // redisClient.set(req.params.id + '-time', new Date().toString());
        
        // For now, grab all the required libs each time we prep the view, in the future,
        // do this once when '/launch' is called and store the array in redis...
        var walker  = walk.walk('./realms/' + req.params.id + '/client/', { followLinks: false });

        walker.on('file', function(root, stat, next) {
            
            if (path.extname(stat.name) == '.js') {
                // Add this file to the list of files
                console.log("root: " + root + " , stat.name: " + stat.name);
                scripts.push("/" + path.join(root, stat.name));
            }
            next();
            
        });

        walker.on('end', function() {
            
			// Generate GUID and set cookie:
			var guid        = uuid.v1();
            var target      = 'realm-' + req.params.id + '-debug';
            var hour_milli  = 3600000;
            
            if (req.cookies[target]) {
                // If we already have a guid cookie, use it so we get our existing character in the realm
                guid = req.cookies[target];
            }
			
			http.get({port: port, path: "/auth/new/" + guid}, function(realm_response) {
				if (realm_response.statusCode == 200) {
					
					res.cookie('realm-' + req.params.id + '-debug', guid, {domain: '.assembledrealms.com', maxAge: (hour_milli * 72)});
					res.render('realm', {id: req.params.id, host: req.headers.host, port: port, scripts: scripts});
				
				} else {
					
					var body = '';
					response.on('data', function(d) {
						body += d;
					});
					response.on('end', function() {
						return res.status(500).send(body);
					});
					
				}
			}).on('error', function(e) {
				console.log("Got error: " + e.message);
				return res.status(500).send(e.message);
			});
			
        });
		
    });

	
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

pm2.connect(function(err) {
	
    if (err) {
        console.log(err.message);
    }
    
	// Hey!! Listen!
	server.listen(3000, function(){
	  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
	});
	
});