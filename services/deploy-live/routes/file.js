var git = require('nodegit');

// https://github.com/nodegit/nodegit/tree/master/example

exports.open = function(req, res){
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) throw error;
  
    var oid = git.Oid.fromString(req.params.sha);
  
    repo.getBlob(oid, function(error, blob) {
      if (error) throw error;
  
      console.log('Binary: ' + blob.isBinary() + ', Size: ' + blob.size());
  
      var formatted = {};
  
      // You can access a node.js Buffer with the raw contents of the blob directly.
      // Note that this buffer may not be contain ASCII data for certain blobs
      // (e.g. binary files).
      if (!blob.isBinary()) {
        //var buffer = blob.content();
        
        formatted.content = blob.toString();
        formatted.size = blob.size();
        formatted.message = "OK";
        
        res.json(formatted);
        
      } else {
        // TODO: Some text source files will be treated as binary if they have weird characters...
        // Solutions: A. Switch(file type) and return string if file type is source, i.e. .js, .json, regardless of encoding
        //            B. Figure out what characters flag file as binary and restrict those characters, i.e. enforce ASCII editing.
        
        //console.log('Binary Content: ' + blob.toString());
        //res.send("BINARY");
        
        formatted.content = blob.content().toString('base64');
        formatted.size = blob.size();
        formatted.message = "OK";
        
        res.json(formatted);
        
        //res.contentType = 'image/png';
        //res.contentLength = blob.size();
        //res.end(blob.content(), 'binary');
      }
      
  
      // If you know that the blob is UTF-8, however, 
      //console.log("Blob contents:", blob.toString().slice(0, 38));
    });
  
  });
}

exports.save = function(req, res){
  
  console.log("FILE SAVE: " + req.body[0].content);
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) throw error;
  
    repo.getMaster(function(error, branch) {
      if (error) throw error;
  
      branch.getTree(function(error, tree) {
        if (error) throw error;
          
        var builder = tree.builder();
        var buffer;
        
        req.body.forEach(function (entry) {
          buffer = new Buffer(entry.content);
          builder.insertBlob(entry.path, buffer, false)
        });
      
        builder.write(function(error, treeId) {
          if (error) throw error;
          
          var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
          var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
  
          repo.createCommit(null, author, committer, "message", treeId, [tree], function(error, commitId) {
            console.log("New Commit:", commitId.sha());
            
            var formatted = {};
            formatted.commit = commitId.sha();
            formatted.message = "OK";
            
            res.json(formatted);
            
          });
          
        });
        
      });
      
    });
  
  });
}