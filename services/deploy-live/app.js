
/**
 * Module dependencies.
 */

var express = require('express')
  , bodyParser = require('body-parser')
  , project = require('./routes/project');

var app = express();

// CORS

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

// Configuration

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser());
app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));

// Routes

app.get('/', function(req, res){
  res.send("assembledrealms api 0.1");  
});

app.get('/api/project/create/:id', project.create);
app.get('/api/project/open/:id', project.open);

app.listen(80, function(){
  console.log("Express server listening on port 80.");
});
