/*
 * https://github.com/nodegit/nodegit
 *
 */

var app = require('http').createServer(handler)
  , url = require("url")
  , clone = require("nodegit").Repo.clone;
  

app.listen(80);

function handler(request, response) {

    if (request.method == 'GET') {
        
    }
    
}
