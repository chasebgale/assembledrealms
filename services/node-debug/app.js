var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var morgan			= require('morgan');
var forever 		= require('forever-monitor');
var redis 			= require("redis");
var redisClient 	= redis.createClient();

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
app.set('view engine', 'jade'); // set up jade for templating

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
	});
	
	child.on('stdout', function (data) {
		console.log('Realm ' + realmID + ' stdout: ' + data);
		var split = data.toString().split(' ');
		if (split[0] == 'port:') {
			console.log('Realm ' + realmApp + ' has started on port ' + split[1]);
			
			// Remember the port, using the id as the key:
			redisClient.set(realmID, split[1]);
			res.send('OK');
		}
	});

	child.start();
});

app.get('/realms/:id', function (req, res, next) {

	redisClient.get(req.params.id, function (error, reply) {
        console.log(reply.toString()); // Will print `OK`
		
		if (error) next(error);
		
		res.render('realm.jade', {id: req.params.id, port: reply.toString()});
		
    });

	
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

// Hey!! Listen!
app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});