
var git = require('nodegit');

/*
 * GET home page.
 */

// This should be a parameter when we have more than one engine, duh!
var import_url = "https://github.com/chasebgale/assembledrealms-isometric.git";

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};

// https://github.com/nodegit/nodegit/tree/master/example

exports.create = function(req, res){
    //if (req.body.secret === 'k4c83jp9hJK5mo8cnTOqWGywP0vVikfkTDOJy3KpvryjMfr') {
        
        // req.body.url ~== http://source-01.assembledrealms.com/realmer-1/one-life-py405dki.git
        //                  git@source-01.assembledrealms.com:realmer-1/one-life-py405dki.git
        // (project clone url)
        
        // req.body.id ~== 12
        // (project id in gitlab)
        
        git.Repo.clone(import_url, "projects/" + req.params.id, null, function(err, repo) {
            if (err) {
                res.send(err.stack);
            } else {
                res.send("OK");
            }
        });
    //}
};