
var git = require('nodegit');

/*
 * GET home page.
 */

// This should be a parameter when we have more than one engine, duh!
var import_url = "https://github.com/chasebgale/assembledrealms-isometric.git";

// https://github.com/nodegit/nodegit/tree/master/example

exports.create = function(req, res, next){
        
  git.Repo.clone(import_url, "projects/" + req.params.id, null, function(error, repo) {
    if (error) return next(error);
    
    var formatted = {};
    formatted.message = "OK";
    
    res.json(formatted);
  });
  

};

exports.open = function(req, res){
  
  var files = [];
  var file = {};
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) throw error;
  
    repo.getMaster(function(error, branch) {
      if (error) throw error;
  
      branch.getTree(function(error, tree) {
        if (error) throw error;

        
        // `walk()` returns an event.
        
        var walker = tree.walk(false);
        walker.on('entry', function(entry) {
          file = {};
          file.path = entry.path();
          file.name = entry.name();
          file.sha = entry.sha();
          file.hasChildren = entry.isTree();
          
          files.push(file);
        });
        walker.on('end', function(errors, entries) {
          //console.log(entry.path());
          res.json(files);
        });
  
        // Don't forget to call `start()`!
        walker.start();
      
      });
      
    });
    
  });
}

exports.save = function(req, res){
  
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

exports.destroy = function(req, res){
  
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