var express 		= require('express');
var bodyParser 		= require('body-parser');
var app 			= express();
var morgan			= require('morgan');
var forever 		= require('forever-monitor');

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
			// Send the port back to the client
			console.log('Realm ' + realmApp + ' has started on port ' + split[1]);
			res.send(split[1]);
		}
	});

	child.start();
});

app.get('/realms/:id', function (req, res, next) {
	res.render('realm.jade');
});

// Serve up the realm files, when requested:
app.use('/realms', express.static(__dirname + '/realms'));

// Hey!! Listen!
app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});