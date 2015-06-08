var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var morgan			= require('morgan');
var moment 		    = require('moment');
var forever 		= require('forever-monitor');
var walk            = require('walk');
var path            = require('path');
var redis 			= require('redis');

var redisClient 	= redis.createClient();
redisClient.flushdb();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

app.use(allowCrossDomain);

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

// Log to console
app.use(morgan('dev')); 	
app.set('view engine', 'ejs'); // set up EJS for templating

app.post('/launch', function (req, res, next) {

	var realmID = req.body.id;
	var realmApp = '/var/www/realms/' + realmID + '/server/app.js';

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

	child.start();
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
            console.log(scripts);
            res.render('realm', {id: req.params.id, port: port, scripts: scripts});
        });
		
		
		
    });

	
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

// Hey!! Listen!
app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});