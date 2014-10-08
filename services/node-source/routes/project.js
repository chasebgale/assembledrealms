var ncp 		= require('ncp').ncp
  , async 		= require('async')
  , git 		= require('nodegit')
  , fs 			= require('fs')
  , path 		= require('path')
  , utilities 	= require('../utilities')
  , dir 		= require('node-dir')
  , rimraf 		= require('rimraf')
  , ssh2 		= require("ssh2")
  , archiver 	= require('archiver');

// This should be a parameter when we have more than one engine, duh!
var import_local = __dirname + "/../projects/assembledrealms-isometric";

var copyDirAsync = function (dir, done) {
  ncp(dir[0], dir[1], function (err) {
    if (err) return done(err);
    done();
  });
}

var writeFileAsync = function (file, done) {
  fs.writeFile(file[1], file[2], function(writeError) {
    if (writeError) return done(writeError);
    done();
  });
}

exports.create = function(req, res, next){
  
  var dirs = [];
  var destination = __dirname + '/../projects/' + req.params.id;
  
  
  fs.mkdir(destination, 0777, function (error) {

    if (error) return next(error);
    
    fs.readdir(import_local, function (error, files) {
      
      if (error) return next(error);
  
      var items = files.filter(function (file) {
        
        // TODO: Don't use SYNC file operations!
        if (fs.statSync(import_local + '/' + file).isFile()) {
          return false;
        }
        
        if (file == '.git') {
          return false;
        }
        
        return true;
        
      }).forEach(function (file) {
          dirs.push([
                    import_local + '/' + file,
                    destination + '/' + file
                    ]);
      });
      
      async.each(dirs, copyDirAsync, function(error){
        if (error) return next(error);
        
        dir.files(__dirname + "/../projects/" + req.params.id, function(error, files) {
          if (error) return next(error);
          
          var remove = '/var/www/projects/' + req.params.id + '/';
          var removeIdx = remove.length;
          
          files = files.map(function(file) {
            return file.substring(removeIdx);
          });
          
          git.Repo.init(__dirname + "/../projects/" + req.params.id, false, function(error, repo) {
            if (error) return next(error);
            
            repo.openIndex(function(error, index) {
              if (error) return next(error);
        
              index.read(function(error) {
                if (error) return next(error);
                
                // Stage the files with 'git add' (equivalant)
                async.forEach(files, function(file, callback) { 
                  
                  index.addByPath(file, function(error) {
                    if (error) return next(error);
                    
                    callback();
                  });
                  
                }, function (error) {
                  if (error) return next(error);
                  
                  index.write(function(error) {
                    if (error) return next(error);
        
                    index.writeTree(function(error, oid) {
                      if (error) return next(error);
                      
                      var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                      var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
    
                      //commit
                      repo.createCommit('HEAD', author, committer, 'message', oid, [], function(error, commitId) {
                        
                        if (error) return next(error);
                        
                        utilities.logMessage('Created REPO: ' + __dirname + "/../projects/" + req.params.id);
                        
                        var formatted = {};
                        formatted.message = "OK";
                        
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
  
  
  
};

exports.open = function(req, res, next){
  
  var files = [];
  var file = {};
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) return next(error);
  
    repo.getMaster(function(error, branch) {
      if (error) return next(error);
  
      branch.getTree(function(error, tree) {
        if (error) return next(error);
        
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
          utilities.logMessage('Opened REPO: ' + __dirname + "/../projects/" + req.params.id);
          
          res.json(files);
        });
  
        // Don't forget to call `start()`!
        walker.start();
      
      });
      
    });
    
  });
}

exports.save = function(req, res, next){
  
  var files = [];
  var filesDisplay = [];
  
  git.Repo.open(__dirname + "/../projects/" + req.params.id, function(error, repo) {
    if (error) return next(error);
    
    req.body.forEach(function (entry) {
      files.push([
        entry.path,
        path.join(repo.workdir(), entry.path),
        entry.content
      ]);
      
      filesDisplay.push(entry.path);
    });
    
    async.each(files, writeFileAsync, function(error){
      if (error) return next(error);
    
      repo.openIndex(function(openIndexError, index) {
        if (openIndexError) return next(openIndexError);
  
        index.read(function(readError) {
          if (readError) return next(readError);
          
          files.forEach(function (entry) {
            index.addByPath(entry[0], function(addByPathError) {
              if (addByPathError) return next(addByPathError);
            });
          });
          
          index.write(function(writeError) {
            if (writeError) return next(writeError);

            index.writeTree(function(writeTreeError, oid) {
              if (writeTreeError) return next(writeTreeError);

              //get HEAD
              git.Reference.oidForName(repo, 'HEAD', function(oidForName, head) {
                if (oidForName) return next(oidForName);

                //get latest commit (will be the parent commit)
                repo.getCommit(head, function(getCommitError, parent) {
                  if (getCommitError) return next(getCommitError);
                  var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                  var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");

                  //commit
                  repo.createCommit('HEAD', author, committer, 'message', oid, [parent], function(error, commitId) {
                    if (error) return next(error);
                    
                    utilities.logMessage('Commit (' + commitId.sha() + ') to REPO: ' + __dirname + "/../projects/" + req.params.id);
                    console.log('Files: ' + filesDisplay.toString());
                    
                    var formatted = {};
                    formatted.commit = commitId.sha();
                    formatted.message = "OK";
                    
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
}

exports.destroy = function(req, res, next){
  
  rimraf(__dirname + "/../projects/" + req.params.id, function(error) {
    if (error) return next(error);
    
    utilities.logMessage('DESTROYED repo: ' + req.params.id);
    
    var formatted = {};
    formatted.message = "OK";
    
    res.json(formatted);
    
  });
  
}

exports.debug = function(req, res, next) {
  
  // FOR NOW USING HARD-CODED INTERNAL IP ADDY.
  // TODO: IN THE FUTURE, MAYBE LOOK UP THIS INTERNAL
  // IP ADDRESS USING THE DIGITAL OCEAN API? MAYBE DO IT
  // EVERY HOUR AND UPDATE A VARIABLE SO IT'S NOT HIT FOR
  // EVERY REQUEST? MAYBE IT ONLY CHECKS THE D/O API IF IT
  // FAILS? THINK ABOUT ALL THIS STUFF.
  
  utilities.logMessage('PUSHING TO DEBUG, repo: ' + req.params.id);
  
  var conn  = new ssh2();
  var project   = __dirname + "/../projects/" + req.params.id + "/";
  var zip = __dirname + "/../archive/" + req.params.id + ".zip";
  var destination = "/var/www/realms/"+ req.params.id + ".zip";
  var files = [];
  
  var output = fs.createWriteStream(zip);
  var archive = archiver('zip');
  
  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
    
    conn.on('ready', function() {
      console.log('Connection :: ready');
      conn.sftp(function(error, sftp) {
        if (error) return next(error);
        
        sftp.fastPut(zip, destination, function (error) {
          if (error) return next(error);
          console.log('fastPut :: complete');
          
          conn.exec('unzip -o /var/www/realms/' + req.params.id + ' -d /var/www/realms/' + req.params.id, function(error, stream) {
            if (error) return next(error);
            
            stream.on('exit', function(code, signal) {
              console.log('UNZIP :: exit :: code: ' + code + ', signal: ' + signal);
			  
			  conn.exec('rm -f /var/www/realms/' + req.params.id + '.zip', function(error, stream) {
			    if (error) return next(error);
				
				stream.on('exit', function(code, signal) {
				  console.log('DELETE :: exit');
				}).on('close', function() {
				  console.log('DELETE :: close');
				  conn.end();
				}).stderr.on('data', function(data) {
				  console.log('DELETE STDERR: ' + data);
				});
				
			  });
			  
              res.send('OK');
            }).on('close', function() {
              console.log('UNZIP :: close');
              //conn.end();
            }).stderr.on('data', function(data) {
              console.log('STDERR: ' + data);
            });
            
          });
          
        });
        
      });
    }).connect({
      host: '104.131.114.6',
      port: 22,
      username: 'web',
      password: '87141eeda7861e0b41801ad48ff19904'
    });
    
  });
  
  archive.on('error', function(error) {
    if (error) return next(error);
  });
  
  archive.pipe(output);
  
  archive.bulk([
    { expand: true, cwd: project, src: ['**', '!.git']}
  ]);
  
  archive.finalize();

}