var __editor;
var __fileId;
var __projectId;
var __trackedFiles = [];
var __trackedStorageId;

var __checkInMsg;

var __processingFiles = [];

$(document).ready(function () {
    
    __projectId = window.location.search.slice(1);

    __trackedStorageId = __projectId + "-tracking";

    if (sessionStorage[__trackedStorageId]) {
        __trackedFiles = JSON.parse(sessionStorage[__trackedStorageId]);
    }

    // Templates
    var templateFnInitial = _.template($('#files_template').html());
    var templateFnDynamic = _.template($('#files_dynamic_template').html());

    $("#explorer").html(templateFnInitial({ 'model': loadRealmRoot(), 'templateFnInitial': templateFnInitial }));

    $("#explorer").treeview({
        animated: "fast"
    });

    // Fetch folder contents:
    $("#explorer").on("click", ".no-data", function () {
        
        var root = $(this);
        var path = root.attr('data-path');
        var name = root.text().trim();
        var token = getGitlabSession();

        var req = __projectId + '/repository/tree?id=' + __projectId +
                                              '&path=' + encodeURIComponent(path) +
                                              '&private_token=' + token;

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                console.log("Got files: " + data);
                var arrayLength = data.length;
                var formatted = { 'name': name, 'children': [] };
                
                for (var i = 0; i < arrayLength; i++) {
                    formatted.children[i] = { 'name': data[i].name, 'path': path + data[i].name, 'id': data[i].id };

                    if (data[i].type == "tree") {
                        formatted.children[i].hasChildren = true;
                        formatted.children[i].path += '/';
                    }
                }

                var branch = root.html(templateFnDynamic({ 'model': formatted, 'templateFnDynamic': templateFnDynamic })).parent();
                root.attr('class', 'collapsable open');
                $("#explorer").treeview({
                    add: branch
                });

            }
        });
    });

    // Fetch file:
    $("#explorer").on("click", ".file", function () {

        var root = $(this);

        __editor.off("change", editor_onChange);

        $("#explorer .file").removeClass('activefile');
        root.addClass('activefile');

        var id      = root.attr('data-id');
        var path    = root.attr('data-path');
        var name = root.text().trim();

        var storageId = __projectId + "-" + id;

        loadRealmFile(storageId, path, name);

    });

    __editor = ace.edit("editor");

    var readmeDOM = $('#explorer [data-path="README.md"');
    readmeDOM.addClass('activefile');

    loadRealmFile(__projectId + "-" + readmeDOM.attr('data-id'), 'README.md', 'README.md');

    $('#mapTabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $('#tab-nav-markdown a:first').on('shown.bs.tab', function (e) {
        //e.target // activated tab
        //e.relatedTarget // previous tab
        $("#markdown").html(marked(__editor.getValue()));
    });

    $('#tab-nav-markdown a:first').tab('show');

    // TOOLTIPS:
    $("#mapToolbar [data-toggle='tooltip']").tooltip();

    $("#terrain").on("click", ".terrain", function () {
        var tileKey = $(this).attr('data-id');
        Map.setBrush(Map.terrain, tileKey);

        var offset = parseInt($(this).attr('data-offset'));
        offset = offset / -2;

        $('#tileButton').css('background-image', $(this).css('background-image'));
        $('#tileButton').css('background-position-x', offset + 'px');
        setToolbarFocus($('#tileButton'));

        $('#modalTerrain').modal('hide');
    });

    $("#objects").on("click", ".objects", function () {
        var objectKey = $(this).attr('data-id');
        Map.setBrush(Map.objects, objectKey);

        var offset = parseInt($(this).attr('data-offset'));
        offset = offset / -2;

        $('#objectButton').css('background-image', $(this).css('background-image'));
        $('#objectButton').css('background-position-x', offset + 'px');
        setToolbarFocus($('#objectButton'));

        $('#modalObjects').modal('hide');
    });

    $("#moveButton").on("click", function () {
        $("#mapMain").css('cursor', 'move');
    });

    $("#btnCommit").on("click", function () {
        $("#commitProgressMessage").text('Initiating commit to branch.');
        $('#commitProgressbar').addClass('active');
        $('#modalCommit').modal('show');
        commit();
    });
    
    $("#loading").fadeOut(500, function () {
        $("#mapEdit").fadeIn();
    });
    
    Map.onResourceLoaded = function (json, base64Image) {
        var template = $('#resource_template').html();
        var target = $('#' + json.meta.category);
        
        target.append(_.template(template, { model: json, source: base64Image }));
    };

});

function commit() {
    if (sessionStorage[__trackedStorageId]) {
        __processingFiles = JSON.parse(sessionStorage[__trackedStorageId]);
        var fileMD5;
        var file;
        var fileName;
        var filePath;
        
        var commitProgressList = $("#commitProgressList");
        commitProgressList.empty();
        
        $('#closeCommit').attr('disabled', 'disabled');
        
        __checkInMsg = "Pushed: " + Date.now();
        
        if (_.isArray(__processingFiles)) {
            __processingFiles = $.grep(__processingFiles, function (fileId, i) {
                file = sessionStorage[fileId];
                fileName = sessionStorage[fileId + '-name'];
                filePath = sessionStorage[fileId + '-path'];
                fileMD5 = sessionStorage[fileId + '-commit-md5'];
                
                commitProgressList.append('<li id="' + fileId + '"><span style="font-weight: bold; width: 200px; display: inline-block;">' + fileName + ': </span><span></span></li>');
                
                if (md5(file) !== fileMD5) {
                    // Push to gitlab
                    $('#' + fileId + ' span:last').html('<i class="fa fa-cog fa-spin"></i> Pushing to git.');
                    
                    updateRealmFile(fileId, filePath, file);
                    
                    return true;
                } else {
                    $('#' + fileId).css('color', '#999');
                    $('#' + fileId + ' span:last').text('No local changes, no action taken.');
                    return false;
                }
            });
        }
        
        if (__processingFiles.length === 0) {
            $('#commitProgressbar').removeClass('active');
            $('#closeCommit').removeAttr('disabled');
            $("#commitProgressMessage").text('No commit, realm branch is up to date.');
        } else {
            $("#commitProgressMessage").text('Uploading source files to git.');
        }
        
    }
}

function loadRealmRoot() {

    var token = getGitlabSession();

    var req = __projectId + '/repository/tree?id=' + __projectId +
                                          '&private_token=' + token;

    var resp = $.ajax({
        url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
        type: 'get',
        dataType: 'json',
        async: false
    }).responseText;

    var json = JSON.parse(resp);

    _.each(json, function (value) {

        value.path = value.name;

        if (value.type == "tree") {
            value.hasChildren = true;
            value.path += '/';
        }
    });

    console.log(json);

    return json;
}

function loadRealmFile(id, path, name) {

    if (sessionStorage[id]) {

        loadEditor(name, sessionStorage[id]);
        __fileId = id;

    } else {

        var token = getGitlabSession();
        var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)

        var req = __projectId + '/repository/files?id=' + __projectId +
                                              '&file_path=' + encodeURIComponent(path) +
                                              '&ref=' + ref +
                                              '&private_token=' + token;

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
            type: 'get',
            dataType: 'json',
            success: function (data) {

                var plainText = "";

                if (data.encoding == "base64") {
                    // The replace regex removes whitespace from the raw base64.
                    // Of course, Only IE blows up and needs this addition: .replace(/\s/g, '')
                    plainText = decode_utf8(atob(data.content.replace(/\s/g, '')));
                }

                sessionStorage[id] = plainText;
                sessionStorage[id + '-name'] = name;
                sessionStorage[id + '-path'] = path;
                sessionStorage[id + '-commit-md5'] = md5(plainText);

                __trackedFiles.push(id);
                sessionStorage[__trackedStorageId] = JSON.stringify(__trackedFiles);

                loadEditor(data.file_name, plainText);
                __fileId = id;

            }
        });

    }
}

function realmResourceURL(path) {
    // /projects//id/repository/blobs//sha
    // http://source-01.assembledrealms.com/api/v3/projects/12/repository/blobs/master?id=12&filepath=client%2Fsprites%2Fzombie_0.png&private_token=o4sq1j9WsQXqhxuyis5Z

    var token = getGitlabSession();
    var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)
    
    var req = __projectId + '/repository/blobs/' + ref + '?id=' + __projectId +
                                          '&filepath=' + encodeURIComponent(path) +
                                          '&private_token=' + token;
    
    return 'http://source-01.assembledrealms.com/api/v3/projects/' + req;
    
}


function realmResourceURL_WORKAROUND(path) {
    // Gitlab doesn't return CORS headers (Access-Control-Allow-Origin) for image blobs,
    // So for now we have to load the full json file details and pull out the encoded image
    // content...
    
    var token = getGitlabSession();
    var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)
    
    var req = __projectId + '/repository/files?id=' + __projectId +
                                              '&file_path=' + encodeURIComponent(path) +
                                              '&ref=' + ref +
                                              '&private_token=' + token;
    
    return 'http://source-01.assembledrealms.com/api/v3/projects/' + req;
    
}

function updateRealmFile(id, path, content) {
    
    var token = getGitlabSession();
    var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)

    var data = {
        file_path: path,
        branch_name: ref,
        encoding: 'base64',
        content: btoa(encode_utf8(content)),
        commit_message: __checkInMsg,
        private_token: token
    };
    
    var req = __projectId + '/repository/files';
    
    $.ajax({
        url: 'http://source-01.assembledrealms.com/api/v3/projects//' + req,
        type: 'put',
        dataType: 'json',
        contentType: 'application/json',
        headers: {
                "PRIVATE-TOKEN": token
        },
        data: JSON.stringify(data),
        success: function (response) {
            
            // Update sessionStorage with new MD5
            sessionStorage[id + '-commit-md5'] = md5(sessionStorage[id]);
            
            // Update DOM to reflect we completed ok:
            $('#' + id + ' span:last').html('<i class="fa fa-thumbs-up"></i> Success!');

        },
        error: function (response) {
            
            // Update DOM to reflect we messed up:
            $('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
            
        },
        complete: function (response) {
            // Remove file from processing queue
            __processingFiles = _.without(__processingFiles, id);
            
            if (__processingFiles.length === 0) {
                $('#commitProgressbar').removeClass('active');
                $('#closeCommit').removeAttr('disabled');
                $("#commitProgressMessage").text('Commit completed.');
            }
        }
    });
}

function loadEditor(filename, content) {

    __editor.off("change", editor_onChange);
    var ext = filename.split('.').pop();

    $("#mapTabs li").css('display', 'none');
    $("#tab-nav-editor").css('display', 'block');

    
    
        /*
    $.ajax({
        type: "GET",
        url: "map.json",
        dataType: "text",
        contentType: "text/plain; charset=utf-8",
        success: function (data, textStatus) {
            $("#editor").text(data);
            __editor = ace.edit("editor");
            Map.onTilesLoaded = function (json) {
                var template = $('#tiles_template').html();
                $("#tiles").append(_.template(template, { model: json }));
            };
            Map.onObjectsLoaded = function (json) {
                var template = $('#objects_template').html();
                $("#objects").append(_.template(template, { model: json }));
            };
            Map.init("map", JSON.parse(data));
            //Map.create(10, 10);
            requestAnimationFrame(animate);
        },
        error: function (data) {
            alert("error");
        }
    });
    */
    
    
    
    switch (ext) {
        case "js":
            __editor.getSession().setMode("ace/mode/javascript");
            break;
        case "json":
            __editor.getSession().setMode("ace/mode/json");
            
            try {
                var parsed = JSON.parse(content);
                
                if (parsed.terrain) {
                    Map.init("map", parsed);
                    $("#tab-nav-map").css('display', 'block');
                    requestAnimationFrame(animate);
                }
            } catch (e) {
                console.log(e);
            }
            
            break;
        case "html":
            __editor.getSession().setMode("ace/mode/html");
            break;
        case "md":
            __editor.getSession().setMode("ace/mode/plain_text");
            $("#tab-nav-markdown").css('display', 'block');
            $("#markdown").html(marked(content));
            break;
        default:
            __editor.getSession().setMode("ace/mode/plain_text");
            break;
    }

    $('#tab-nav-editor a:first').tab('show');

    __editor.setValue(content);
    __editor.clearSelection();
    __editor.moveCursorTo(0, 0);

    __editor.on("change", editor_onChange);
}

function editor_onChange(e) {
    sessionStorage[__fileId] = __editor.getValue();
}

function setToolbarFocus(target) {
    $("#tileButton").removeClass('active');
    $("#objectButton").removeClass('active');

    target.button('toggle');
}

function animate() {

    requestAnimationFrame(animate);

    Map.render();

}

function encode_utf8(s) {
    return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
    return decodeURIComponent(escape(s));
}

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};