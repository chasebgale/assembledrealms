
var clone = require('nodegit').Repo.clone;

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};

// https://github.com/nodegit/nodegit/tree/master/example

exports.api = function(req, res){
    //if (req.body.secret === 'k4c83jp9hJK5mo8cnTOqWGywP0vVikfkTDOJy3KpvryjMfr') {
        
        // req.body.url ~== http://source-01.assembledrealms.com/realmer-1/one-life-py405dki.git
        //                  git@source-01.assembledrealms.com:realmer-1/one-life-py405dki.git
        // (project clone url)
        
        // req.body.id ~== 12
        // (project id in gitlab)
        
        clone("http://source-01.assembledrealms.com/realmer-1/one-life-py405dki.git?private_token=iHrbUiraXaAaiDiNgMAV", "tmp", null, function(err, repo) {
            if (err) {
                res.send(err.stack);
            } else {
                res.send("OK");
            }
        });
    //}
};