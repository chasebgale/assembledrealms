
/**
 * Module dependencies.
 */

var express = require('express')
  , bodyParser =  require('body-parser')
  , project =     require('./routes/project')
  , file =        require('./routes/file')
  , busboy =      require('connect-busboy')
  , util =        require('util');

var app = express();

// CORS

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
}

// Configuration

//app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');

app.use(allowCrossDomain);

app.use(busboy({
  highWaterMark: 2 * 1024 * 1024,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}));

// parse application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded({
//  extended: true
//}));

// parse application/json
app.use(bodyParser.json())

// Routes

app.get('/', function(req, res){
  res.send("assembledrealms api 0.1");  
});

app.get('/api/project/:id/create', project.create);
app.get('/api/project/:id/open', project.open);
app.get('/api/project/:id/destroy', project.destroy);
app.post('/api/project/:id/save', project.save);

app.get('/api/project/:id/file/open/:path', file.open);
app.get('/api/project/:id/file/raw/*', file.raw);
app.post('/api/project/:id/file/create', file.create);
app.post('/api/project/:id/file/upload', file.upload);

// Monitor:
app.get('/api/stats', function (req, res, next) {
    var memory = process.memoryUsage();
    memory.uptime = process.uptime();
    
    res.json(memory);
});

app.use(function(err, req, res, next){
    console.error(err.message);
    res.send(500, err.message);
});

app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});