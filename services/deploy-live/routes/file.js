var git = require('nodegit');

// https://github.com/nodegit/nodegit/tree/master/example

exports.open = function(req, res){
  
  var files = [];
  var file = {};
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) throw error;
  
    var oid = git.Oid.fromString(req.params.sha);
  
    repo.getBlob(oid, function(error, blob) {
      if (error) throw error;
  
      console.log(blob.size());
  
      // You can access a node.js Buffer with the raw contents of the blob directly.
      // Note that this buffer may not be contain ASCII data for certain blobs
      // (e.g. binary files).
      var buffer = blob.content();
  
      // If you know that the blob is UTF-8, however, 
      console.log("Blob contents:", blob.toString().slice(0, 38));
    });
  
  /*
    repo.getMaster(function(error, branch) {
      if (error) throw error;
  
      branch.getTree(function(error, tree) {
        if (error) throw error;
        
        var oidFromSHA = git.Oid.fromString(req.params.sha);
        console.log('OID SHA:' + oidFromSHA.sha());
    
        tree.entryByOid(oidFromSHA, function (error, entry) {
          if (error) throw error;
          
          entry.getBlob(function(error, blob) {
            if (error) throw error;
    
            console.log(entry.name(), entry.sha(), blob.size() + 'b');
            console.log('========================================================\n\n');
            var firstTenLines = blob.toString().split('\n').slice(0, 10).join('\n');
            console.log(firstTenLines);
            console.log('...');
          });
          
        });
      
      });
      
    });
    */
  
  });
  
  

}