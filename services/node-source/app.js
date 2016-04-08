var express         = require('express')
var bodyParser      = require('body-parser')
var cookieParser 	  = require('cookie-parser');
var fs 			        = require('fs');
var project         = require('./routes/project')
var file            = require('./routes/file')
var rimraf 		      = require('rimraf');
var util            = require('util');
var https           = require('https');
var http            = require('http');
var app             = express();

var self_token  = "fb25e93db6100b687614730f8f317653bb53374015fc94144bd82c69dc4e6ea0";
var sessions    = {};

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://www.assembledrealms.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if ('OPTIONS' == req.method) return res.send(200);
    
    next();
});

/*
app.use(busboy({
  highWaterMark: 2 * 1024 * 1024,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}));
*/

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true
}));

// parse application/json
app.use(bodyParser.json())

app.use(cookieParser('Assembled Realms is a land without secrets...'));

app.get('/', function(req, res){
  res.send("assembledrealms api 0.1");  
});

// Monitor:
app.get('/api/stats', function (req, res, next) {
    var memory = process.memoryUsage();
    memory.uptime = process.uptime();
    
    res.json(memory);
});

app.post('/api/auth', function (req, res, next) {
    var auth = req.get('Authorization');

    if (auth !== self_token) {
        console.log('/api/auth - Bad auth token')
        return res.status(401).send("Please don't try to break things :/");
    }
    
    var php_sess    = req.body.php_sess;
    var user_id     = req.body.user_id;
    var realms      = req.body.realms;
    
  if ((php_sess === null) || (user_id === null) || (realms === null)) {
        console.log('/api/auth - Missing params: ' + JSON.stringify(req.body));
        return res.status(500).send("Missing parameters, bruh.");
    }
  
    sessions[php_sess] = {
        user_id: user_id,
        realms: realms,
        activity: Date.now()
    };
    
    console.log('Authorized [' + php_sess + ']: ' + JSON.stringify(sessions[php_sess]));
    
    return res.send('OK');
    
});

// GET'ing raw file doesn't need auth protection
app.get('/api/project/:id/file/raw/*', file.raw);

// PHP-session/auth wall
app.use(function(req, res, next){

    // Is this a server-to-server request?
    var auth = req.get('Authorization');
    if (auth === self_token) {
        // If the request is authorized, skip further checks:
        return next();
    }

    // Looks like we have a request from a user
    var phpsession  = req.cookies["PHPSESSID"];
    
    // Are we missing an assembledrealms.com sesh?
    if ((phpsession == undefined) || (phpsession == "")) {
        console.log(req.url + " - Missing phpsession...");
        return res.status(401).send("Please don't try to break things :/");
    }
    
    // /api/auth gets called by assembledrealms.com php and injects the user sesh, if it's
    // missing, call shennanigans 
    var php_sess = sessions[phpsession];
    if (php_sess === undefined) {
        console.log(req.url + " - Missing php_sess...");
        return res.status(401).send("Please don't try to break things :/");
    }
    
    var realm_id = parseInt(req.url.split('/')[3]);
    
    // Is this user authorized to modify the realm source?
    if (php_sess.realms.indexOf(realm_id) === -1) {
        return res.status(401).send("Please don't try to break things :/");
    }
    
    // If we are this far along, we are going to clear access, so update the activity
    php_sess.activity = Date.now();
    
    req.user_id = php_sess.user_id;
    
    next();
});

app.get('/api/project/:id/create/:engine', project.create);
app.get('/api/project/:id/open', project.open);
app.get('/api/project/:id/destroy', project.destroy);
app.get('/api/project/:id/history', project.history);

app.post('/api/project/:id/save', project.save);
app.post('/api/project/:id/debug', project.debug);
app.post('/api/project/:id/publish', project.publish);

app.get('/api/project/:id/file/open/:path', file.open);

app.post('/api/project/:id/file/create', file.create);
app.post('/api/project/:id/file/upload', file.upload);
app.post('/api/project/:id/file/remove', file.remove);
app.post('/api/project/:id/file/rename', file.rename);

app.post('/api/project/:id/folder/create', file.createFolder);
app.post('/api/project/:id/folder/remove', file.removeFolder);

app.use(function(err, req, res, next){
  console.error(err.message);
	console.error(err.stack);
  res.send(500, err.message);
});

var minute      = 60000;
var sixhours    = minute * 60 * 6;

var options = {
  key:  fs.readFileSync('/etc/pki/tls/certs/www.assembledrealms.com.key').toString(),
  cert: fs.readFileSync('/etc/pki/tls/certs/STAR_assembledrealms_com.crt').toString(),
  ca:   [
    fs.readFileSync('/etc/pki/tls/certs/AddTrustExternalCARoot.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSAAddTrustCA.crt').toString(),
    fs.readFileSync('/etc/pki/tls/certs/COMODORSADomainValidationSecureServerCA.crt').toString()
  ],
  passphrase: '8160'
};


http.createServer(app).listen(3000, function () {
  console.log("HTTP started on port 3000");
});

https.createServer(options, app).listen(8000, function () {
  console.log("HTTPS started on port 8000");
}); //443

// Run once a minute and check the sessions for inactivity
var sessionLoop = setInterval(function () {
    var keys = Object.keys(sessions);
    var now  = Date.now();
    for (var i = 0; i < keys.length; i++) {
        // If the session has been inactive for 6 hours, kill it
        if ((now - sessions[keys[i]].activity) > sixhours) {
            delete sessions[keys[i]];
        }
    }
}, minute);