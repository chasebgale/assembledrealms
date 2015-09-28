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
var db 	            = redis.createClient();
var server			= http.Server(app);
var io 				= require('socket.io')(server);
var request			= require('request');

var self_token      = "1e4651af36b170acdec7ede7268cbd63b490a57b1ccd4d4ddd8837c8eff2ddb9";

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); //'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

db.flushdb();

app.use(allowCrossDomain);

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

app.use(cookieParser('Assembled Realms is a land without secrets...'));

// Catch redis errors
db.on("error", function (err) {
    console.log("Error " + err);
});

app.set('view engine', 'ejs'); // set up EJS for templating

app.post('/launch/:id', function (req, res, next) {

    var auth = req.get('Authorization');

    if (auth !== self_token) {
        return res.status(401).send("Please don't try to break things :/");
    }

	var realmID     = req.params.id;
	var realmApp    = '/var/www/realms/' + realmID + '/server/app.js';
    var realmErr    = '/var/www/logs/' + realmID + '-err.log';
    var realmOut    = '/var/www/logs/' + realmID + '-out.log';
    var found_proc  = [];
    var close_proc  = [];
    
    var destination 	= req.body.destination; // 01, 02, XX, etc... inserted here: debug-XX.assembledrealms.com
    var source  		= req.body.source;	    // 01, 02, XX, etc... inserted here: source-XX.assembledrealms.com
	
    if ((destination === undefined) || (source === undefined)) {
        console.log("/launch called with missing body...");
        return res.status(500).send("Please don't tinker...");
    }
    
    var pm2_launch = function (callback) {
        // Get all processes running
        pm2.list(function(err, process_list) {
            
            // Search for running instance of requested realm
            process_list.forEach(function(proc) {
                console.log('checking: ' + proc.name);
                if (proc.name == realmID) {
                    found_proc.push(proc);
                    return;
                }
                
                db.get(realmID + "-clients",  function (error, reply) {
        
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
                pm2.stop(proc, function(err, proc) {
                    if (err) {
                        console.log("Attempted to stop " + proc + " but errored: " + err.stack);
                    }                   
                });
            });
            
            fs.truncate(realmErr, 0, function(){
                fs.truncate(realmOut, 0, function(){
                    if (found_proc.length === 0) {
                        // No existing realm server running, spool up new one:
                        // var options = { name: realmID, scriptArgs: ['debug'], error_file: realmErr, out_file: realmOut};
                        var options = { name: realmID, error_file: realmErr, out_file: realmOut};
                        
                        console.log("Starting app with the following options: " + JSON.stringify(options));
                        
                        pm2.start(realmApp, options, function(err, proc) {
                           
                            if (err) {
                                callback(err);
                            }

                            callback();
                        });
                    } else {
                        // Existing realm server found, restart it
                        pm2.restart(realmApp, function(err, proc) {
                            
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
    
    request.post('http://source-' + source + '.assembledrealms.com/api/project/' + realmID + '/publish',
				{ form: { address: 'debug-' + destination + '.assembledrealms.com', shared: true} },
				function (error, response, body) {
			
		if (error) {
			return res.status(500).send(error.stack);
		}
		
		if (response.statusCode !== 200) {
			return res.status(500).send(body);
		}
		
		console.log("Got valid response, calling pm2_launch");
		
		pm2_launch(function (err) {
			if (err) {
				return res.status(500).send(err.stack);
			}
			
			return res.send('OK');
		});
	});
    
});

var scripts   = [];

app.get('/realms/:id', function (req, res, next) {

	db.get(req.params.id, function (error, reply) {
		
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
        // db.set(req.params.id + '-time', new Date().toString());
        
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