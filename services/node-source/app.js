
/**
 * Module dependencies.
 */

var express = require('express')
  , bodyParser =  require('body-parser')
  , project =     require('./routes/project')
  , file =        require('./routes/file');

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

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true
}));

// parse application/json
app.use(bodyParser.json())

app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));

// Routes

app.get('/', function(req, res){
  res.send("assembledrealms api 0.1");  
});

app.get('/api/project/:id/create', project.create);
app.get('/api/project/:id/open', project.open);
app.get('/api/project/:id/destroy', project.destroy);
app.post('/api/project/:id/save', project.save);

app.get('/api/project/:id/file/open/:path', file.open);
app.post('/api/project/:id/file/create', file.create);

app.use(function(err, req, res, next){
    console.error(err.message);
    res.send(500, err.message);
});

app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});