var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , url = require("url")
  , fs = require('fs')
  , path = require("path")
  , qs = require('querystring')

app.listen(80);

function handler(request, response) {

    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), uri);

    console.log("REQUEST: " + request.method);

    if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {

            var POST = qs.parse(body);
            // use POST

            fs.writeFile("map.json", POST.map, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");

                    response.writeHead(200);
                    response.write("OK");
                    response.end();
                }
            });

        });
    } else {

        fs.exists(filename, function (exists) {
            if (!exists) {
                response.writeHead(404, { "Content-Type": "text/plain" });
                response.write("404 Not Found\n");
                response.end();
                return;
            }

            if (fs.statSync(filename).isDirectory()) filename += '/index.html';

            fs.readFile(filename, "binary", function (err, file) {
                if (err) {
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.write(err + "\n");
                    response.end();
                    return;
                }

                if (filename.indexOf(".json") > -1) {
                    response.writeHead(200, { "Content-Type": "application/json" });
                    response.write(file, "binary");
                    
                } else {
                    response.writeHead(200);
                    response.write(file, "binary");
                }
                
                response.end();
            });
        });
    }
}

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});