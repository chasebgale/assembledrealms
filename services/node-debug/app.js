var express 	= require('express')
var bodyParser 	= require('body-parser')
var routes 		= require('./routes');
var app 		= express();
var morgan		= require('morgan');

// Serve up the realm files, when requested:
app.use('/', express.static(__dirname + '/realms'));

// Log to console
app.use(morgan('dev')); 	

// Hey!! Listen!
app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});