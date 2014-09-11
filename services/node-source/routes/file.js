var git = require('nodegit'),
    path = require('path'),
    utilities = require('../utilities'),
    fs = require('fs');

// https://github.com/nodegit/nodegit/tree/master/example

var EOL = require('os').EOL;

exports.raw = function(req, res, next){
  var path_decode = decodeURIComponent(req.params.path);
  
  var options = {
    root: __dirname + "/../projects/" + req.params.id + "/",
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };
  
  res.sendfile(path_decode, options, function (error) {
    if (error) return next(error);
    
    utilities.logMessage('RAW FILE REQUEST FILLED: ' + path_decode);
  });
}

exports.open = function(req, res, next){
  
  var path_decode = decodeURIComponent(req.params.path);
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) return next(error);
    
    git.Reference.oidForName(repo, 'HEAD', function(error, head) {
      if (error) return next(error);
      
      repo.getCommit(head, function(error, commit) {
        if (error) return next(error);
        
        commit.getEntry(path_decode, function(error, entry) {
          if (error) return next(error);
    
          entry.getBlob(function(error, blob) {
            
            
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
            
            utilities.logMessage('Opened FILE: ' + path_decode + EOL +
                                 'Binary: ' + blob.isBinary() + ', Size: ' + (blob.size() / 1000) + 'kB');
            
            
          });
          
        });
      });
    });
  });
}

exports.create = function(req, res) {
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) throw error;
    
    var fileName = req.body.fullpath;
    var fileContent = "// Auto generated: " + new Date().getTime();
    
    //create the file in the repo's workdir
    fs.writeFile(path.join(repo.workdir(), fileName), fileContent, function(writeError) {
      if (writeError) throw writeError;
  
      //add the file to the index...
      repo.openIndex(function(openIndexError, index) {
        if (openIndexError) throw openIndexError;
  
        index.read(function(readError) {
          if (readError) throw readError;
  
          index.addByPath(fileName, function(addByPathError) {
            if (addByPathError) throw addByPathError;
  
            index.write(function(writeError) {
              if (writeError) throw writeError;
  
              index.writeTree(function(writeTreeError, oid) {
                if (writeTreeError) throw writeTreeError;
  
                //get HEAD
                git.Reference.oidForName(repo, 'HEAD', function(oidForName, head) {
                  if (oidForName) throw oidForName;
  
                  //get latest commit (will be the parent commit)
                  repo.getCommit(head, function(getCommitError, parent) {
                    if (getCommitError) throw getCommitError;
                    var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                    var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
  
                    //commit
                    repo.createCommit('HEAD', author, committer, 'message', oid, [parent], function(error, commitId) {
                      
                      repo.getCommit(commitId, function(getCommitError, latest) {
                        if (getCommitError) throw getCommitError;
                        
                        latest.getEntry(fileName, function(error, entry) {
                          if (error) throw error;
                          
                          utilities.logMessage('Created FILE: ' + entry.oid().sha() + ' (' + fileName + ')');
                          
                          var formatted = {};
                          formatted.commit = commitId.sha();
                          formatted.sha = entry.oid().sha();
                          formatted.message = "OK";
                          formatted.content = fileContent;
                          
                          res.json(formatted);
                          
                        });
                        
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
    
  });
}