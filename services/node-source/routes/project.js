var ncp 		= require('ncp').ncp;
var async 		= require('async');
var git 		= require('nodegit');
var Promise     = require("nodegit-promise");
var fs 			= require('fs');
var path 		= require('path');
var utilities 	= require('../utilities');
var dir 		= require('node-dir');
var rimraf 		= require('rimraf');
var ssh2 		= require("ssh2");
var lz4         = require('lz4');
var busboy      = require('connect-busboy');
var archiver 	= require('archiver');
var compressor  = require('node-minify');

var engines = [__dirname + "/../projects/assembledrealms-topdown",
               __dirname + "/../projects/assembledrealms-isometric"];

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
    
    console.log("Create called with params: %s", JSON.stringify(req.params));

    var destination = __dirname + '/../projects/' + req.params.id;
    var source = engines[req.params.engine];
    var repository;
    var index;
    
    console.log("'Create' request in progress, source = %s, destination = %s", source, destination);
  
    fs.mkdir(destination, 0777, function (error) {
        if (error) return next(error);
    
        fs.readdir(source, function (error, files) {
            if (error) return next(error);
  
            var items = files.filter(function (file) {
                if (file == '.git') {
                    return false;
                }
                return true;
            }).forEach(function (file) {
                dirs.push([
                    source + '/' + file,
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
          
                    git.Repository.init(__dirname + "/../projects/" + req.params.id, 0)
                        .then(function(repo) {
                            repository = repo;
                            return repo.openIndex();
                        })
                        .then(function(idx) {
                            index = idx;
                            return idx.read();
                        })
                        .then(function() {
                            async.forEach(files, function(file, callback) { 
                                index.addByPath(file);
                                callback();
                            }, function (error) {
                                if (error) return next(error);
                                
                                return index.write();
                            });
                        })
                        .then(function() {
                            return index.writeTree();
                        })
                        .then(function(oid) {
                            var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                            var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                            // Since we're creating an inital commit, it has no parents. Note that unlike
                            // normal we don't get the head either, because there isn't one yet.
                            return repository.createCommit("HEAD", author, committer, "message", oid, []);
                        })
                    .done(function(commitId) {
                        utilities.logMessage('Created REPO: ' + __dirname + "/../projects/" + req.params.id + " with commit id: " + commitId);
                                
                        var formatted = {};
                        formatted.message = "OK";
                        
                        res.json(formatted);
                    });
            
                }); // dir.files
            }); // async
        }); // fs.readdir
    }); // fx.mkdir
}

exports.open = function(req, res, next){
  
    var files = [];
    var file = {};
    var repo;

    git.Repository.open(__dirname + '/../projects/' + req.params.id)
        .then(function(repo) {
            return repo.getMasterCommit();
        })
        .then(function(firstCommitOnMaster) {
          return firstCommitOnMaster.getTree();
        })
        .then(function(tree) {
            // `walk()` returns an event.
            var walker = tree.walk(false);
            walker.on('entry', function(entry) {
                file = {};
                file.path = entry.path();
                file.name = entry.filename();
                file.sha = entry.sha();
                file.hasChildren = entry.isTree();

                files.push(file);
            });

            walker.on('end', function(errors, entries) {
                utilities.logMessage('Opened REPO: ' + __dirname + "/../projects/" + req.params.id);
                res.json(files);
            });
            
            // Don't forget to call `start()`!
            walker.start();
        })
    .done();
}

exports.save = function(req, res, next) {
    
    var destination = __dirname + "/../projects/" + req.params.id;
    var commit_message = '';
    var files = [];
    var repository;
    var index;
    var oid;
    
    req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        
        if (mimetype == 'text/plain') {
            
            // Text just gets written to disk
            file.pipe(fs.createWriteStream(path.join(destination, fieldname)));
            files.push(fieldname);
            
        } else {
            // application/octet-binary means our data is compressed with LZ4
            
            // skip file until decode works:
            file.resume();
            
            /*
            var decoder = lz4.createDecoderStream();
            
            var output = fs.createWriteStream(__dirname + "/../projects/" + req.params.id + '/client/resource/' + filename);
            output.on('close', function () {    
                console.log("Decode Finished of " + filename);              
            });
            
            file.pipe(decoder).pipe(output);
            */
        }
    });
    
    req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
        console.log('Field [' + fieldname + ']: value: ' + val);
        
        if (fieldname == 'message') {
            commit_message = val;
        } else if (fieldname == 'resource') {
			// Uploaded resource pointer string
			files.push(val);
		}
      
    });
    
    req.busboy.on('finish', function() {
        console.log('Done parsing form, now committing...');
        
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
                async.forEach(files, function(file, callback) { 
                    index.addByPath(file);
                    callback();
                }, function (error) {
                    if (error) return next(error);
                    
                    return index.write();
                });
            })
            .then(function() {
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
                var author = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");
                var committer = git.Signature.now("Chase Gale", "chase.b.gale@gmail.com");

                return repository.createCommit("HEAD", author, committer, commit_message, oid, [parent]);
            })
        .done(function(commitId) {
            console.log("New Commit: ", commitId);
            var formatted = {};
            formatted.commit = commitId;
            formatted.message = "OK";

            res.json(formatted);
        });
    });
    
    req.pipe(req.busboy);
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

  utilities.logMessage('PUSHING TO DEBUG - ' + req.params.id);
  
  // TODO: Implement this:
  
  // The caller to this url (source-XX.assembledrealms.com/api/project/:id/debug) also passes a post:
  // -- ip: either the ip of the least used debug-xx server OR if the user has a server up for this realm, 
  //        it would be that realm's ip
  // -- hosted: true if the user has a private realm server up, this is used to change the destination folders
  var internal_ip   = req.body.ip;
  var realm_hosted  = req.body.hosted;
  
  // END TODO
  
  var conn  = new ssh2();
  var project   = __dirname + "/../projects/" + req.params.id + "/";
  var zip = __dirname + "/../archive/" + req.params.id + ".zip";
  var destination = realm_hosted ? "/var/www/realm-debug/realm.zip" : "/var/www/realms/"+ req.params.id + ".zip";
  var files = [];
  
  var output = fs.createWriteStream(zip);
  var archive = archiver('zip');
  
  output.on('close', function() {
    console.log('ZIP :: ' + archive.pointer() + ' total bytes after compression.');
    
    conn.on('ready', function() {
      console.log('SSH2 :: Connection established.');
      conn.sftp(function(error, sftp) {
        if (error) return next(error);
        
        sftp.fastPut(zip, destination, function (error) {
          if (error) return next(error);
          console.log('SSH2 :: Zip upload complete.');
          
          conn.exec('unzip -o /var/www/realms/' + req.params.id + ' -d /var/www/realms/' + req.params.id, function(error, stream) {
            if (error) return next(error);
            
            stream.on('exit', function(code, signal) {
              
			  conn.exec('rm -f /var/www/realms/' + req.params.id + '.zip', function(error, stream) {
			    if (error) return next(error);
				
				stream.on('exit', function(code, signal) {
				  // Hmm
				}).on('close', function() {
				  console.log('SSH2 - DELETE :: Success.');
				  conn.end();
				}).stderr.on('data', function(data) {
				  console.log('DELETE STDERR: ' + data);
				});
				
			  });
			  
              res.send('OK');
            }).on('close', function() {
              console.log('SSH2 - UNZIP :: Decompressed successfully.');
            }).stderr.on('data', function(data) {
              console.log('STDERR: ' + data);
            });
            
          });
          
        });
        
      });
    }).connect({
      host: '10.132.227.95', // internal IP of debug-01, TODO: choose internal ip of least loaded debug server
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

exports.publish = function(req, res, next) {
    
  // TODO: Should this be accomplished using git remote pull from the realm...?
  
  var realm_id		= req.params.id;
  var address 		= req.body.address; // play-**/debug-**.assembledrealms.com or IP of realm droplet
  var shared  		= req.body.shared;	// true if destination is play-**.assembledrealms.com, false if droplet
  var minify        = (req.body.minify === undefined) ? false : req.body.minify;
  
  utilities.logMessage('PUBLISHING: ' + realm_id + ' to ' + address);
  
  if ((address == undefined) || (shared == undefined)) {
	  return next(new Error("Missing parameters..."));
  }
  
  var conn  		= new ssh2();
  var project   	= __dirname + "/../projects/" + realm_id + "/";
  var zip 			= __dirname + "/../archive/" + realm_id + ".zip";
  var destination 	= "/var/www/realms/"+ realm_id + ".zip";
  var output 		= fs.createWriteStream(zip);
  var archive 		= archiver('zip');
  var files			= [];
  
  var usr			= "web";
  var pwd			= shared ? "87141eeda7861e0b41801ad48ff19904" : "0S0Wjf4vYvJ3QJx6yBci";
  
  utilities.logMessage('pwd: ' + pwd);
  
  output.on('close', function() {
    console.log('ZIP :: ' + archive.pointer() + ' total bytes after compression.');
    
    conn.on('ready', function() {
      console.log('SSH2 :: Connection established.');
      conn.sftp(function(error, sftp) {
        if (error) return next(error);
        
        sftp.fastPut(zip, destination, function (error) {
          if (error) return next(error);
          console.log('SSH2 :: Zip upload complete.');
          
          conn.exec('unzip -o /var/www/realms/' + realm_id + ' -d /var/www/realms/' + realm_id, function(error, stream) {
            if (error) return next(error);
            
            stream.on('exit', function(code, signal) {
              
			  conn.exec('rm -f /var/www/realms/' + realm_id + '.zip', function(error, stream) {
			    if (error) return next(error);
				
				stream.on('exit', function(code, signal) {
				  // Hmm
				}).on('close', function() {
				  console.log('SSH2 - DELETE :: Success.');
				  conn.end();
				}).stderr.on('data', function(data) {
				  console.log('DELETE STDERR: ' + data);
				});
				
			  });
			  
              res.send('OK');
            }).on('close', function() {
              console.log('SSH2 - UNZIP :: Decompressed successfully.');
            }).stderr.on('data', function(data) {
              console.log('STDERR: ' + data);
            });
            
          });
          
        });
        
      });
    }).connect({
      host: address, //'104.131.114.6',
      port: 22,
      username: usr,
      password: pwd
    });
    
  });
  
  
  
  archive.on('error', function(error) {
    if (error) return next(error);
  });
  
  archive.pipe(output);
  
    if (minify) {
        new compressor.minify({
            type: 'uglifyjs',
            fileIn: project + 'client/**/*.js',
            fileOut: project + 'client/engine.min.js',
            callback: function(err, min){
                if (err) {
                    console.log(err);
                }
                
                archive.bulk([
                    { expand: true, cwd: project, src: ['**', '!.git']}
                ]);

                archive.finalize();
                
            }
        });
    } else {
        archive.bulk([
            { expand: true, cwd: project, src: ['**', '!.git']}
        ]);

        archive.finalize();
    }

}