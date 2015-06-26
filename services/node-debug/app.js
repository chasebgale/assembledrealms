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

var realms			= {};

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
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
            });
            
            console.log('found ' + found_proc.length);
            
            if (found_proc.length === 0) {
                // No existing realm server running, spool up new one:
                pm2.start(realmApp, { name: realmID, scriptArgs: ['debug'] }, function(err, proc) {
                    if (err) {
                        res.send('ERROR BOOTING: ' + err.message);
                        throw new Error('err');
                    }

                    res.send('OK');
                });
            } else {
                // Existing realm server found, restart it
                pm2.restart(realmApp, function(err, proc) {
                    if (err) {
                        res.send('ERROR BOOTING: ' + err.message);
                        throw new Error('err');
                    }

                    res.send('OK');
                });
            }
        });
        
    });
    
    /*
	if (realms[realmID] === undefined) {
		
		// TODO: Right here, check if the memory for the server can handle adding another
		// child process and if not, perhaps KILL the longest-idle existing child?

		var child = new (forever.Monitor)(realmApp, {
			max: 1,
			silent: false,
			options: ['debug']
		});

		child.on('exit', function () {
			console.log('Realm ' + realmApp + ' has exited.');
			res.send('ERROR BOOTING...');
		});
		
		child.on('stdout', function (data) {
			console.log('Realm ' + realmID + ' stdout: ' + data);
			var split = data.toString().split(' ');
			if (split[0] == 'port:') {
				console.log('Realm ' + realmApp + ' has started on port ' + split[1]);
				
				// Remember the port, using the id as the key:
				redisClient.set(realmID, split[1].trim());
				redisClient.set(realmID + '-time', new Date().toString());
				res.send('OK');
			}
		});
		
		realms[realmID] = child;

		child.start();
	} else {
		var child = realms[realmID];
		
		child.on('exit', function () {
			console.log('Realm ' + realmApp + ' has exited.');
			res.send('ERROR BOOTING...');
		});
		
		child.on('stdout', function (data) {
			console.log('Realm ' + realmID + ' stdout: ' + data);
			var split = data.toString().split(' ');
			if (split[0] == 'port:') {
				console.log('Realm ' + realmApp + ' has started on port ' + split[1]);
				
				// Remember the port, using the id as the key:
				redisClient.set(realmID, split[1].trim());
				redisClient.set(realmID + '-time', new Date().toString());
				res.send('OK');
			}
		});
		
		child.restart();
	}
    */
});

var scripts   = [];

app.get('/realms/:id', function (req, res, next) {

	redisClient.get(req.params.id, function (error, reply) {

        if (reply == null) {
            // TODO: Modify these errors/realm ejs to show these errors all pretty like
            return res.send("Backend for realm is down...");
        }
		
		if (error) {
            return res.send("Redis is down...");
        }
        
        scripts   = [];
        
        var port = reply.toString().replace(/(\r\n|\n|\r)/gm,"");
        
        // Update the last access time so it doesn't get shutdown for inactivity:
        redisClient.set(req.params.id + '-time', new Date().toString());
        
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
					res.render('realm', {id: req.params.id, port: port, scripts: scripts});
				
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

app.get('/realms/:id/stats', function (req, res, next) {
    pm2.connect(function(err) {
        
        pm2.describe(req.params.id, function (err, list) {
            if (err) {
                return res.send(err.message);
            } 
            return res.json(list);
        });
        
    });
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

// Hey!! Listen!
app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});