
/**
 * Module dependencies.
 */

var express = require('express')
  , bodyParser = require('body-parser')
  , routes = require('./routes');

var app = express();

// Configuration

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser());
app.use(express.static(__dirname + '/public'));

// Routes

app.get('/', routes.index);
app.get('/api', routes.api);

app.listen(80, function(){
  console.log("Express server listening on port 80.");
});
