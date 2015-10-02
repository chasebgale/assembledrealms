var express 		= require('express');
var bodyParser 		= require('body-parser');
var cookieParser 	= require('cookie-parser');
var app 			= express();
var moment 		    = require('moment');
var pm2             = require('pm2');
var walk            = require('walk');
var path            = require('path');
var querystring     = require('querystring');
var redis 			= require('redis');
var http 			= require('http');
var fs              = require('fs');
var uuid 			= require('node-uuid');
var db 				= redis.createClient();
var server			= http.Server(app);
var io 				= require('socket.io')(server);
var request			= require('request');

var self_token      = "e61f933bcc07050385b8cc08f9deee61de228b2ba31b8523bdc78230d1a72eb2";

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); //'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
};

var queue_position = function (phpsession) {
    // Find our place in the queue
    var position = -1;
    for (var q = 0; q < queue.length; q++) {
        if (queue[q].session == phpsession) {
            position = q + 1;
            break;
        }
    }
    
    return position;
};

var queue_insert = function (phpsession, user_id, user_name, user_image, realm_id) {
    queue.push({
        session: phpsession, 
        user_id: user_id, 
        user_name: user_name, 
        user_image: user_image,
        realm: realm_id
    });
};

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
    
    var destination 	= req.body.destination; // 01, 02, XX, etc... inserted here: play-XX.assembledrealms.com
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
				{ 
                    form: { address: 'play-' + destination + '.assembledrealms.com', shared: true, minify: true},
                    headers: {
                        'Authorization': 'fb25e93db6100b687614730f8f317653bb53374015fc94144bd82c69dc4e6ea0'
                    }
                },
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

app.get('/shutdown/:id', function (req, res, next) {

	var auth = req.get('Authorization');

    if (auth !== self_token) {
		console.log('/shutdown auth failure...');
        return res.status(401).send("Please don't try to break things :/");
    }
	
	console.log('/shutdown/' + req.params.id + ' called...');

	var realmID     = req.params.id;
    var realmApp    = '/var/www/realms/' + realmID + '/server/app.js';

    pm2.stop(realmApp, function(err, proc) {
        if (err) {
            console.log("Attempted to stop " + realmID + " but errored: " + err.stack);
            return res.send(err.stack);
        }                  
        return res.send('OK');
    });
});

app.post('/auth', function (req, res, next) {
    
    var auth = req.get('Authorization');

    if (auth !== self_token) {
        return res.status(401).send("Please don't try to break things :/");
    }
    
    var phpsession  = req.body.session;
    var user_id     = req.body.user_id;
    var user_name   = req.body.user_name;
    var user_image  = req.body.user_image;
    var realm_id    = req.body.realm_id;
    
    console.log('AUTH REQUEST: ' + JSON.stringify(req.body));
    
	var pos = queue_position(phpsession);
	
	if (pos == -1) {
		queue_insert(phpsession, user_id, user_name, user_image, realm_id);
		
		// uuid needs to be a combo of realm and user as user can have characters on multiple realms
		var uuid = "r_" + realm_id + "u_" + user_id;
		var sess = "s_" + phpsession;
		
		db.get(uuid, function(error, reply) {
			
			if (error) {
				console.error(error);
				return res.status(500).send(error.message);
			}
			
			if (reply === null) {
				db.set(uuid, "new", function (error) {
					if (error) {
						console.error(error);
						return res.status(500).send(error.message);
					}
				});
			}
				
			db.get(sess, function(error, reply) {
				
				if (error) {
					console.error(error);
					return res.status(500).send(error.message);
				}
				
				if (reply === null) {
					db.set(sess, uuid, function (error) {
			
						if (error) {
							console.error(error);
							return res.status(500).send(error.message);
						}
						
						
						
						db.get(realm_id, function (error, reply) {
		
							if (error) {
								return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
							}
							
							if (reply == null) {
								return res.render('error', {message: "REDIS has no knowledge of this realm..."});
							}
							
							var scripts   = [];
							
							var port = reply.toString().replace(/(\r\n|\n|\r)/gm,"");
							
							// Update the last access time so it doesn't get shutdown for inactivity:
							// (NOW WE ARE DOING THIS IN THE APP ITSELF)
							// redisClient.set(req.params.id + '-time', new Date().toString());
							
							// For now, grab all the required libs each time we prep the view, in the future,
							// do this once when '/launch' is called and store the array in redis...
							var walker  = walk.walk('./realms/' + realm_id + '/client/', { followLinks: false });

							walker.on('file', function(root, stat, next) {
								
								if (path.extname(stat.name) == '.js') {
									// Add this file to the list of files
									console.log("root: " + root + " , stat.name: " + stat.name);
									scripts.push("//" + req.headers.host + "/" + path.join(root, stat.name));
								}
								next();
								
							});

							walker.on('end', function() {
								res.render('realm', {id: realm_id, host: req.headers.host, port: port, scripts: scripts});
							});
						});
						
						
						
						
						
						
					});
				}
			});
		});
		
    } else {
		queue[pos] = {
			session: phpsession, 
			user_id: user_id, 
			user_name: user_name, 
			user_image: user_image,
			realm: realm_id
		};
		
		
		
		db.get(realm_id, function (error, reply) {
		
			if (error) {
				return res.render('error', {message: "REDIS appears to be down or unresponsive..."});
			}
			
			if (reply == null) {
				return res.render('error', {message: "REDIS has no knowledge of this realm..."});
			}
			
			var scripts   = [];
			
			var port = reply.toString().replace(/(\r\n|\n|\r)/gm,"");
			
			// Update the last access time so it doesn't get shutdown for inactivity:
			// (NOW WE ARE DOING THIS IN THE APP ITSELF)
			// redisClient.set(req.params.id + '-time', new Date().toString());
			
			// For now, grab all the required libs each time we prep the view, in the future,
			// do this once when '/launch' is called and store the array in redis...
			var walker  = walk.walk('./realms/' + realm_id + '/client/', { followLinks: false });

			walker.on('file', function(root, stat, next) {
				
				if (path.extname(stat.name) == '.js') {
					// Add this file to the list of files
					console.log("root: " + root + " , stat.name: " + stat.name);
					scripts.push("//" + req.headers.host + "/" + path.join(root, stat.name));
				}
				next();
				
			});

			walker.on('end', function() {
				res.render('realm', {id: realm_id, host: req.headers.host, port: port, scripts: scripts});
			});
		});
		
		
		
		
	}
    
});

//var scripts   		= [];
var clients			= {};
var client_count	= 0;
var queue			= [];

app.get('/realms/:id', function (req, res, next) {
    
    var phpsession = req.cookies["PHPSESSID"];
    
    // Are we missing an assembledrealms.com sesh?
    if ((phpsession == undefined) || (phpsession == "")) {
        return res.render('error', {message: "Not authorized..."});
    }
    
    // /auth gets called by assembledrealms.com php and injects the user into the queue, if it's
    // missing, call shennanigans 
    if (queue_position(phpsession) == -1) {
        return res.render('error', {message: "Not authorized...."});
    }
	
	// TODO: How many connected clients can the server handle? Between all hosted realms?
	if (client_count > 5) {
		return res.render('queue', {id: req.params.id, host: req.headers.host});
	}
	
    // If we got this far, we have a free spot so redirect the user to the real realm play
	res.redirect('/realms/play/' + req.params.id);

});

// Redirected here by queue js inside iframe
app.get('/realms/play/:id', function (req, res, next) {
	
	var phpsession 	= req.cookies["PHPSESSID"];
	var pos 		= queue_position(phpsession);
	
	// Are we missing an assembledrealms.com sesh?
    if ((phpsession == undefined) || (phpsession == "")) {
        return res.render('error', {message: "Not authorized..."});
    }
	
	if (pos == -1) {
        return res.render('error', {message: "Not authorized... (" + phpsession + ")"});
    }
	
	queue.splice(pos, 1);
	
});

app.get('/internal/disconnect/:id', function (req, res, next) {
	if (clients[req.params.id] == undefined) {
		clients[req.params.id] = 0;
	} else {
		if (clients[req.params.id] > 0) {
			clients[req.params.id] = clients[req.params.id] - 1;
			client_count--;
		}
	}
	
	if (queue.length > 0) {
		queue[0].emit("enter");
	}
	
	return res.send(client_count);
});

app.get('/internal/connect/:id', function (req, res, next) {
	if (clients[req.params.id] == undefined) {
		clients[req.params.id] = 1;
	} else {
		clients[req.params.id] = clients[req.params.id] + 1;
	}
	client_count++;
	return res.send(client_count);
});

io.on('connection', function (socket) {
	
    // Grab our PHP Sesh key, if it exists
    var phpsession = '';
    var cookies = "; " + socket.request.headers.cookie;
    var parts = cookies.split("; PHPSESSID=");
    
    if (parts.length == 2) {
        phpsession = parts.pop().split(";").shift();
    } else {
        // If the client is missing our phpsesh, kill it
        socket.emit({error: "Missing auth..."});
        return socket.close();
    }
    
	// Find our place in the queue
    var position = queue_position(phpsession); 
    socket.emit("stats", {position: position});
	
	socket.on('disconnect', function () {
        
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