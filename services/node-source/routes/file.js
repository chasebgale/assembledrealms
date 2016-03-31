var git       = require('nodegit');
var Promise   = require("nodegit-promise");
var path      = require('path');
var utilities = require('../utilities');
var fs        = require('fs');
var Busboy    = require('busboy');
var EOL       = require('os').EOL;
var inspect   = require('util').inspect;

exports.raw = function(req, res, next){
  
  utilities.logMessage('RAW FILE REQUEST: ' + req.params[0]);
  
  var options = {
    root: __dirname + "/../projects/" + req.params.id + "/",
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };
  
  res.sendfile(req.params[0], options, function (error) {
    if (error) return next(error);
    
    console.log('RAW FILE REQUEST FILLED');
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

exports.create = function(req, res, next) {
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) return next(error);
    
    var fileName = req.body.fullpath;
    var fileContent = "// Auto generated: " + new Date().getTime();
    
    //create the file in the repo's workdir
    fs.writeFile(path.join(repo.workdir(), fileName), fileContent, function(error) {
      if (error) return next(error);
  
      //add the file to the index...
      repo.openIndex(function(error, index) {
        if (error) return next(error);
  
        index.read(function(error) {
          if (error) return next(error);
  
          index.addByPath(fileName, function(error) {
            if (error) return next(error);
  
            index.write(function(error) {
              if (error) return next(error);
  
              index.writeTree(function(error, oid) {
                if (error) return next(error);
  
                //get HEAD
                git.Reference.oidForName(repo, 'HEAD', function(error, head) {
                  if (error) return next(error);
  
                  //get latest commit (will be the parent commit)
                  repo.getCommit(head, function(error, parent) {
                    if (error) return next(error);
                    var userid    = "user_" + req.user_id;
                    var author    = git.Signature.now(userid, userid + "@assembledrealms.com");
                    var committer = git.Signature.now(userid, userid + "@assembledrealms.com");
  
                    //commit
                    repo.createCommit('HEAD', author, committer, 'message', oid, [parent], function(error, commitId) {
                      if (error) return next(error);
                      
                      repo.getCommit(commitId, function(error, latest) {
                        if (error) return next(error);
                        
                        latest.getEntry(fileName, function(error, entry) {
                          if (error) return next(error);
                          
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

exports.remove = function(req, res, next) {
  
  var path = req.body.path;
  var type = req.body.type;
  
  var repository;
  var index;
  var oid;
  var sha;
  
  console.log("Received request to delete: " + path);
  
  git.Repository.open(__dirname + '/../projects/' + req.params.id)
  .then(function(repo) {
    repository = repo;
    return repo.openIndex();
  })
  .then(function(idx) {
    index = idx;
    return idx.read();
  })
  .then(function() {
    // Delete file/folder from physical disk
    var fullPath = __dirname + "/../projects/" + req.params.id + "/" + path;
    if (type == "folder") {
      // TODO: Only works on empty directories
      fs.rmdir(fullPath, function (err) {
        if (err) {
          console.error(err);
        }
        return true;
      });
    } else {
      fs.unlink(fullPath, function (err) {
        if (err) {
          console.error(err);
        }
        return true;
      });
    }
  })
  .then(function() {
    var result;
    
    if (type == "folder") {
      var stage = index.entryStage(path);
      result = index.removeDirectory(path, stage);
    } else {
      result = index.removeByPath(path);
    }
    
    index.write();
    return index.writeTree();
  })
  .then(function(oidResult) {
    oid = oidResult;
    return git.Reference.nameToId(repository, "HEAD");
  })
  .then(function(head) {
    return repository.getCommit(head);
  })
  .then(function(parent) {
    var userid          = "user_" + req.user_id;
    var author          = git.Signature.now(userid, userid + "@assembledrealms.com");
    var committer       = git.Signature.now(userid, userid + "@assembledrealms.com");
    var commit_message  = 'Deleted: ' + path;

    return repository.createCommit("HEAD", author, committer, commit_message, oid, [parent]);
  })
  .then(function(commitId) {
    return repository.getCommit(commitId);
  })
  .then(function(latest) {
    return latest.sha();
  })
  .done(function(sha) {
    utilities.logMessage('Deleted: ' + path);
                
    var formatted     = {};
    formatted.commit  = sha;
    formatted.message = "OK";
    
    return res.json(formatted);
  });
}

exports.upload = function(req, res, next) {

  var repository;
  var index;
  var oid;
  var sha;
  
  var uploadFilename;
  var uploadFilepath;
  
  var busboy = new Busboy({ headers: req.headers });
  
  busboy.on('field', function(fieldname, val) {
    uploadFilepath = val;
    console.log('Field [' + fieldname + ']: value: ' + uploadFilepath);
  });
  
  busboy.on('file', function (fieldname, file, filename) {
    console.log("Uploading: " + filename + " to: " + __dirname + "/../uploads/" + req.params.id + '/' + filename);
    
    file.on('end', function() {
      console.log("Upload Finished of " + filename);  
      uploadFilename = filename;
    });

    //Path where image will be uploaded
    var fstream = fs.createWriteStream(__dirname + "/../uploads/" + req.params.id + '-' + filename);
    
    file.pipe(fstream);
  });

  busboy.on('finish', function(err) {
    
    if (err) {
      console.error(err);
    }
    
    var fullPath = uploadFilepath.substr(1) + uploadFilename;
    
    var oldPath = __dirname + "/../uploads/" + req.params.id + '-' + uploadFilename;
    var newPath = __dirname + "/../projects/" + req.params.id + '/' + fullPath;
    
    console.log('finished with form parsing, no moving "' + oldPath + '" to "' + newPath + '"');
    
    fs.rename(oldPath, newPath, function (error) {
      
      if (error) {
        console.error(error);
      }
      
      git.Repository.open(__dirname + '/../projects/' + req.params.id)
      .then(function(repo) {
        repository = repo;
        return repo.openIndex();
      })
      .then(function(idx) {
        index = idx;
        return idx.read();
      })
      .then(function() {
        index.addByPath(fullPath);
        index.write();
        return index.writeTree();
      })
      .then(function(oidResult) {
        oid = oidResult;
        return git.Reference.nameToId(repository, "HEAD");
      })
      .then(function(head) {
        return repository.getCommit(head);
      })
      .then(function(parent) {
        var userid          = "user_" + req.user_id;
        var author          = git.Signature.now(userid, userid + "@assembledrealms.com");
        var committer       = git.Signature.now(userid, userid + "@assembledrealms.com");
        var commit_message  = 'uploaded ' + fullPath;

        return repository.createCommit("HEAD", author, committer, commit_message, oid, [parent]);
      })
      .then(function(commitId) {
        return repository.getCommit(commitId);
      })
      .then(function(latest) {
        sha = latest.sha();
        return latest.getEntry(fullPath);
      })
      .done(function(entry) {
        utilities.logMessage('Added RESOURCE: ' + entry.sha() + ' (' + fullPath + ')');
                    
        var formatted = {};
        formatted.commit = sha;
        formatted.sha = entry.sha();
        formatted.message = "OK";
        
        return res.json(formatted);
      });
      
    });
  });
  
  req.pipe(busboy);
}