var __editor;
var __fileId;
var __renderer;
var __projectId;
var __projectURL;
var __checkInMsg;
var __trackedStorageId;
var __processingFiles   = [];
var __trackedFiles      = [];
var __commitFiles       = [];

function resize() {
    $("#editor").height( $("#tree").height() );
}

function initialize(projectID, projectDomain) {
    
    __projectId = projectID;
    __projectURL = 'http://' + projectDomain + '/api/project/' + __projectId;
    __trackedStorageId = __projectId + "-tracking";
    
    __editor = ace.edit("editor");
    __editor.setShowPrintMargin(false);
    
    __renderer = new marked.Renderer();
    __renderer.table = function(header, body) {
        return '<table class="table table-striped"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
    }

    marked.setOptions({
        sanitize: true,
        renderer: __renderer
    });

    if (sessionStorage[__trackedStorageId]) {
        __trackedFiles = JSON.parse(sessionStorage[__trackedStorageId]);
    }
    
    
    
    $( window ).resize(function() {
        resize();
    });
    
    $("#explorer").on("click", ".file", function () {

        var root = $(this);

        __editor.off("change", editor_onChange);

        $("#explorer .file").removeClass('activefile');
        root.addClass('activefile');

        var id      = root.attr('data-id');
        var path    = root.attr('data-path');
        var name = root.text().trim();

        loadRealmFile(id, path, name);

    });

    $('#ulView a').on("click", function (e) {
        e.preventDefault();
        // Hide all tabs
		$("#tabs .tab-pane").hide();
		
		if ($(this).attr('href') == "#markdown") {
			$("#markdown").html(marked(__editor.getValue()));
		} else if ($(this).attr('href') == "#editor") {
			__editor.renderer.updateFull()
		}
		
		// show tab
		$($(this).attr('href')).show();
		
		$("#btnView").html('<i class="fa fa-eye"></i> ' + $(this).text() + ' <span class="caret"></span>');
    });

/*
    
    
    $("#terrain").on("click", ".terrain", function () {
        var tileKey = $(this).attr('data-id');
        Map.setBrush(Map.terrain, tileKey);
        Map.setMode(Map.MODE_PAINT);

        var offset_x = parseInt($(this).attr('data-offset-x'));
        var offset_y = parseInt($(this).attr('data-offset-y'));
        var frame = Map.frames[tileKey];
        
        var canvas = document.getElementById('brush');
        var context = canvas.getContext('2d');

        var imageObj = new Image();
        imageObj.onload = function() {
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // draw cropped image
            var sourceX = offset_x;
            var sourceY = offset_y;
            var sourceWidth = frame.frame.w;
            var sourceHeight = frame.frame.h;
            var destWidth = 0;
            var destHeight = 0;
            
            if (sourceWidth >= sourceHeight) {
                destWidth = canvas.width;
                destHeight = sourceHeight * (canvas.width / sourceWidth);
            } else {
                destHeight = canvas.height;
                destWidth = sourceWidth * (canvas.height / sourceHeight);
            }
            
            var destX = canvas.width / 2 - destWidth / 2;
            var destY = canvas.height / 2 - destHeight / 2;
    
            context.drawImage(imageObj, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
        };
        imageObj.src = $(this).css('background-image').slice(4, -1);

        $('#modalTerrain').modal('hide');
        $('#addBrush').fadeIn().css("display","inline-block");
    });

    $("#objects").on("click", ".objects", function () {
        var tileKey = $(this).attr('data-id');
        Map.setBrush(Map.objects, tileKey);
        Map.setMode(Map.MODE_PAINT);

        var offset_x = parseInt($(this).attr('data-offset-x'));
        var offset_y = parseInt($(this).attr('data-offset-y'));
        var frame = Map.frames[tileKey];
        
        var canvas = document.getElementById('brush');
        var context = canvas.getContext('2d');

        var imageObj = new Image();
        imageObj.onload = function() {
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // draw cropped image
            var sourceX = offset_x;
            var sourceY = offset_y;
            var sourceWidth = frame.frame.w;
            var sourceHeight = frame.frame.h;
            var destWidth = 0;
            var destHeight = 0;
            
            if (sourceWidth >= sourceHeight) {
                destWidth = canvas.width;
                destHeight = sourceHeight * (canvas.width / sourceWidth);
            } else {
                destHeight = canvas.height;
                destWidth = sourceWidth * (canvas.height / sourceHeight);
            }
            
            var destX = canvas.width / 2 - destWidth / 2;
            var destY = canvas.height / 2 - destHeight / 2;
    
            context.drawImage(imageObj, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
        };
        imageObj.src = $(this).css('background-image').slice(4, -1);

        $('#modalTerrain').modal('hide');
        $('#addBrush').fadeIn().css("display","inline-block");
    });
    
    $("#moveButton").on("click", function () {
        
        
        Map.setCursor('cursor_hand');
        Map.setMode(Map.MODE_MOVE);
        
        resetToolBar();
        $(this).addClass('active');
    
    });
    
    $("#eraserButton").on("click", function () {
       
        Map.setCursor('cursor_eraser');
        Map.setMode(Map.MODE_DELETE);
       
        resetToolBar();
        $(this).addClass('active');
       
    });

    $("#addButton").on("click", function () {
       
        Map.setCursor('cursor_pencil');
        Map.setMode(Map.MODE_PAINT);
        
        resetToolBar();
        $(this).addClass('active');
        
        if (Map.brush.tile === undefined) {
            $("#modalTerrain").modal("show");
        } else {
            if ($("#addBrush").is(':hidden')) {
                $("#addBrush").fadeIn();
            }
        }
        
    });
    */
    
    $("#categorySelection").on('change', function () {
       var category = '#' + $(this).find(":selected").attr('data-id');
       
        $('#modalTerrain .tileContainer').fadeOut(function () {
            $(category).fadeIn();
        });
       
    });

    $("#btnCommit").on("click", function () {
        //$('#commitProgressbar').addClass('active');
        
        listCommitFiles();
        $('#modalCommit').modal('show');
        
    });
    
    $("#btnDebug").on("click", function () {
        
        if ($('#debugProgressbar').hasClass('active') == false) {
            $('#debugProgressbar').addClass('active');
        }
        
        $('#debugProgressList').empty();
        
        $('#modalDebug').modal('show');
		$('#debugProgressList').append('<li>Establishing a connection to your debug server...</li>');
		var debugURL = 'http://debug-01.assembledrealms.com/realms/' + __projectId;
		var launchURL = 'http://debug-01.assembledrealms.com/launch';
		
		//debugProgressList
		$.ajax({
            url: __projectURL + '/debug',
            type: 'post',
            dataType: 'text'
        })
        .done(function (data) {
            if (data === "OK") {
           
                $('#debugProgressList').append('<li>Published to debug server successfully!</li>');
				$('#debugProgressList').append('<li>Launching realm on your debug server...</li>');
				
				$.ajax({
					url: launchURL,
					type: 'post',
					dataType: 'text',
					data: {id: __projectId}
				})
				.done(function (data) {
					if (data.substr(0, 2) === "OK") {
						$('#debugProgressList').append('<li>Your debug URL is <a href="' + debugURL + '">' + debugURL + '</a>!</li>');
					} else {
                        $('#debugProgressList').append('<li class="text-danger"><strong><i class="fa fa-exclamation-triangle"></i> ' + data + '</strong> Please try again in a few minutes, monkeys are furiously typing away to fix this problem.</li>');
                    }
				})
                .fail(function(data) {
                    $('#debugProgressList').append('<li class="text-danger"><strong><i class="fa fa-exclamation-triangle"></i> Fatal Error!</strong> Please try again in a few minutes, monkeys are furiously typing away to fix this problem.</li>');
                })
				.always(function() {
					$('#debugClose').attr('disabled', false);
                    $('#debugProgressbar').removeClass('active');
				});
            }
        })
        .fail(function(d, textStatus, error) {
            console.log(textStatus);
            $('#debugAlert').html('<li class="text-danger"><strong><i class="fa fa-exclamation-triangle"></i> Error: </strong> ' + textStatus);
            $('#debugAlert').fadeIn();
			$('#debugClose').attr('disabled', false);
                // Update DOM to reflect we messed up:
                //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        });
		
		$('#debugProgressList').append('<li>Compressing source package and delivering it...</li>');
		
    });
    
    $('#commitStart').on('click', function () {
        $(this).attr('disabled', true);
        $(this).html('<i class="fa fa-cog fa-spin"></i> Commit');
        $("#commitProgressMessage").text('Initiating commit to branch.');
        commit();
    });
    
    $("#btnNewFile").on("click", function () {
        $('#modalNewFile').modal('show');
    });
    
    $("#btnUploadResource").on("click", function () {
        
        var bar =       $('#uploadProgressbarFill');
        var alert =     $('#uploadAlert');
        
        bar.width("0%");
        bar.text("");
        alert.hide();
        alert.removeClass('alert-success alert-danger');
        alert.text("");
        
        $('#modalUploadResource').modal('show');
    });
    
    $("#newfileLocation").on("click", "a", function (e) {
        e.preventDefault();
        
        $("#newfileLocation a").removeClass("active");
        $(this).addClass("active");
        
    });
    
    $("#uploadStart").on("click", function (e) {
        e.preventDefault();
    
        var button =    $(this);
        var progress =  $('#uploadProgressbar');
        var bar =       $('#uploadProgressbarFill');
        var alert =     $('#uploadAlert');
        
        bar.width("0%");
        alert.hide();
        alert.removeClass('alert-success alert-danger');
        alert.text("");
        
        button.attr('disabled', true);
        
        var upload = document.getElementById('inputFile').files[0];
        var uri = __projectURL + "/file/upload";
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
        
        xhr.open("POST", uri, true);
        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                //evt.loaded the bytes browser receive
                //evt.total the total bytes seted by the header
                var percentComplete = Math.round((event.loaded / event.total) * 100) + "%";  
                bar.width(percentComplete);
                bar.text(percentComplete);
            } 
        };
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                
                var json = JSON.parse(xhr.responseText);
                if (json.message == "OK") {
                    button.attr('disabled', false);
                    
					$("#explorer .file").removeClass('activefile');
                    addToExplorer('client/resource', upload.name, '');
                    
                    alert.addClass('alert-success');
                    alert.html("<strong>" + upload.name + "</strong> was successfully added to your resource folder!");
                    alert.fadeIn();
                    $('#uploadForm').trigger('reset');
                }
            } else {
                
            }
        };
        fd.append('file', upload);
        xhr.send(fd);
        
    });
    
    $("#btnNewFileCreate").on("click", function (e) {
        e.preventDefault();
    
        var button = $(this);
        
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Create');
        
        var selectedFolder = $("#newfileLocation .active");
        var path = selectedFolder.attr("data-path");
        var name = $("#newfileName").val();
        var post = {};
        
        if (path === "") {
            post.fullpath = name;
        } else {
            post.fullpath = path + '/' + name;
        }
        
        $.ajax({
            url: __projectURL + '/file/create',
            type: 'post',
            dataType: 'json',
            data: post
        })
        .done(function (data) {
            console.log(data);
            if (data.message === "OK") {
                
                __editor.off("change", editor_onChange);
                $("#explorer .file").removeClass('activefile');
                
                addToExplorer(path, name, data.sha);
                
                /*
                if (path === "") {
                    $("#explorer").append('<li><span class="file activefile" data-id="' + data.sha + '" data-path="' + name + '">' + name + '</span></li>');
                } else {
                    var parentFolder = $("#explorer [data-path='" + path + "']").children("ul");
                    parentFolder.append('<li><span class="file activefile" data-id="' + data.sha + '" data-path="' + path + "/" + name + '">' + name + '</span></li>');
                }
                */
                
                var tracking_id = __projectId + '-' + data.sha;
                
                // Add entries to session storage
                sessionStorage[tracking_id] = data.content;
                sessionStorage[tracking_id + '-name'] = name;
                sessionStorage[tracking_id + '-path'] = path + '/' + name;
                sessionStorage[tracking_id + '-commit-md5'] = md5(data.content);
                
                // Update tracked files array in session storage
                __trackedFiles.push(tracking_id);
                sessionStorage[__trackedStorageId] = JSON.stringify(__trackedFiles);
                
                // Display new file and update UI
                loadEditor(name, data.content);
                __fileId = tracking_id;
                
                $('#modalNewFile').modal('hide');
                $('#newFileCreateAlert').hide();
            } else {
                $('#newFileCreateAlert').text('Creation Error: ' + data.message);
                $('#newFileCreateAlert').fadeIn();
            }
            
        })
        .fail(function(data) {
            console.log(data);
            $('#newFileCreateAlert').text('Network Error: ' + data.statusText);
            $('#newFileCreateAlert').fadeIn();
                // Update DOM to reflect we messed up:
                //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        })
        .always(function () {
            button.attr('disabled', false);
            button.html('Create');
        });
        
        
        
    });
    
    //$("#mapToolbar [data-toggle='tooltip']").tooltip();
    
    Map.onResourceLoaded = function (json, source) {
        var template = $('#resource_template').html();
        var target = $('#' + json.meta.category);
        
        target.append(_.template(template, { model: json, source: source }));
    };

    loadRealmRoot();
	
	// Tooltips
	$("[data-toggle='tooltip']").tooltip();
	
	console.log("____ ____ ____ ____ _  _ ___  _    ____ ___     ____ ____ ____ _    _  _ ____");
	console.log("|__| [__  [__  |___ |\\\/| |__] |    |___ |  \\\    |__/ |___ |__| |    |\\\/| [__ ");
	console.log("|  | ___] ___] |___ |  | |__] |___ |___ |__/    |  \\\ |___ |  | |___ |  | ___]");
	console.log(" ");
	console.log("Thanks for taking a look!");
	console.log("Please contact me if you find a bug or an exploit, you'll be rewarded! chase@assembledrealms.com");
}

function lz4Compress(data) {
    var Buffer = require('buffer').Buffer;
    var LZ4 = require('lz4');
    var input = new Buffer(data);
    var maxOutputSize = LZ4.encodeBound(input.length);
    var output = new Buffer(maxOutputSize);
    var outputSize = LZ4.encodeBlock( input, output );
    
    if (outputSize > 0) {
        output = output.slice(0, outputSize);
        //var outputB64 = btoa( encodeURIComponent(output) );
        
        //console.log('output (' + output.length + 'bytes un-encoded, ' + outputB64.length + ' bytes encoded): ' + outputB64);
        
        return output;
    }
}

function resetToolBar() {
    $("#mapToolbar .navbar-btn").removeClass('active');
    
    if ($("#addBrush").is(':visible')) {
        $("#addBrush").fadeOut();
    }
}

function addToExplorer(path, name, sha) {
    
    var root;
    var inserted = false;
    
    if (path === "") {
        root = $("#explorer");
    } else {
        root = $("#explorer [data-path='" + path + "']").children("ul");
    }
    
    // Select subset of only files, not folders:
    var items = root.children().not(".hasChildren");
    
    items.each(function () {
        if ($(this).text() > name) {
            inserted = true;
            $(this).before('<li><span class="file activefile" data-id="' + sha + '" data-path="' + path + "/" + name + '">' + name + '</span></li>');
            return false;
        }
    });
    
    if (!inserted) {
        root.children().removeClass('last lastExpandable');
        root.append('<li class="last"><span class="file activefile" data-id="' + sha + '" data-path="' + path + "/" + name + '">' + name + '</span></li>');
    } else {
		loadRealmFile(sha, path + "/" + name, name);
	}
}

function listCommitFiles() {
    
    __commitFiles = [];
    
    if (sessionStorage[__trackedStorageId]) {
        __processingFiles = JSON.parse(sessionStorage[__trackedStorageId]);
        
        var fileMD5;
        var file;
        var fileName;
        var filePath;
    
        var commitProgressList = $("#commitProgressList");
        commitProgressList.empty();
        
        if (_.isArray(__processingFiles)) {
            __processingFiles = $.grep(__processingFiles, function (fileId, i) {
				
				if (isImageFile(fileId)) {
					commitProgressList.append('<li><span style="font-weight: bold; width: 200px; display: inline-block;">' + fileId + '</span><span></span></li>');
					__commitFiles.push({
						name: fileId,
						resource: true
					});
					return true;
				} else {
				
					file = sessionStorage[fileId];
					fileName = sessionStorage[fileId + '-name'];
					filePath = sessionStorage[fileId + '-path'];
					fileMD5 = sessionStorage[fileId + '-commit-md5'];
                
					if (md5(file) !== fileMD5) {
						// Push to git
						commitProgressList.append('<li id="' + fileId + '"><span style="font-weight: bold; width: 200px; display: inline-block;">' + fileName + '</span><span></span></li>');
						
						__commitFiles.push({
							content: file,
							name: fileName,
							path: filePath,
							sha: fileId,
							resource: false
						});
						
						return true;
					} else {
						return false;
					}
				}
            });
        }
    }
}

function commit() {
    
    __checkInMsg = $('#commitMessage').val();
    
    if (__processingFiles.length === 0) {
        //$('#commitProgressbar').removeClass('active');
        $('#commitStart').removeAttr('disabled');
        $("#commitProgressMessage").text('No commit, realm branch is up to date.');
    } else {
        $("#commitProgressMessage").text('Uploading source files to git.');
        
        var formData = new FormData();
        
        _.each(__commitFiles, function (file) {
			if (file.resource) {
				formData.append("resource", file.name);
			} else {
				formData.append(file.path, new Blob([file.content], {type: 'text/plain'}));
			}
        });
        
        formData.append("message", __checkInMsg);
        
        $.ajax({
            url: __projectURL + '/save',
            type: "POST",
            data: formData,
            processData: false,  // tell jQuery not to process the data
            contentType: false,   // tell jQuery not to set contentType
            success: function (response) {
                
                _.each(__commitFiles, function (file) {
                    // Update sessionStorage with new MD5
					if (!file.resource) {
						sessionStorage[file.sha + '-commit-md5'] = md5(sessionStorage[file.sha]);
					}
                });
                
                // Update DOM to reflect we completed ok:
                //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-up"></i> Success!');
    
                //$('#commitProgressbar').removeClass('active');
                $('#commitStart').removeAttr('disabled');
                $('#commitStart').html('Commit');
                $("#commitProgressMessage").text('');
                
                $('#modalCommit').modal('hide');
            },
            error: function (response) {
                
                // Update DOM to reflect we messed up:
                $('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
                
            }
        });
        
        
        
        
        
        
        
        /*
        $.ajax({
            url: __projectURL + '/save',
            type: 'post',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(__commitFiles),
            success: function (response) {
                
                _.each(filesToCommit, function (file) {
                    // Update sessionStorage with new MD5
                    sessionStorage[__projectId + '-' + file.sha + '-commit-md5'] = md5(sessionStorage[__projectId + '-' + file.sha]);
                });
                
                // Update DOM to reflect we completed ok:
                //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-up"></i> Success!');
    
                //$('#commitProgressbar').removeClass('active');
                $('#commitStart').removeAttr('disabled');
                $('#commitStart').html('Commit');
                $("#commitProgressMessage").text('');
                
                $('#modalCommit').modal('hide');
            },
            error: function (response) {
                
                // Update DOM to reflect we messed up:
                $('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
                
            },
            complete: function (response) {
            }
        });
        */
    }
}

function loadRealmRoot() {
            
    var resp = $.ajax({
        url: __projectURL + '/open',
        type: 'get',
        dataType: 'json',
        async: false
    });
    
    // Server is up, error in server code
    if (resp.status == 500) {
        $('#loading').fadeOut();
        $('#errorMessage').text(resp.responseText);
        $('#errorMessage').fadeIn();
        return;
    }
    
    // Server is down, GET failed
    if (resp.status == 0) {
        $('#loading').fadeOut();
        $('#errorMessage').text(resp.statusText);
        $('#errorMessage').fadeIn();
        return;
    }
    
    if ((resp.responseText === null) || (resp.responseText === undefined)) {
        // Retry:
        
        // __waitTime = __waitTime * 2;
        // setTimeout(loadRealmRoot, __waitTime);
        
    } else {
        
        var json = resp.responseJSON;
        
        // Process folders first:
        json = _.sortBy(json, function (item) {
            return !item.hasChildren;
        });
        
        var templateFnFiles = _.template($('#root_files_template').html());
        var templateChildFnFiles = _.template($('#child_files_template').html());
        
        $("#explorer").html(templateFnFiles({ 'model': json, 'templateChildFnFiles': templateChildFnFiles }));

        $("#explorer").treeview({
            animated: "fast"
        });
        
        var folderList = $('#newfileLocation');
        
        _.each(json, function (val) {
           if (val.hasChildren) {
                folderList.append('<a href="#" class="list-group-item" data-path="' + val.path + '"><i class="fa fa-folder-o"></i> /' + val.path + '</a>');
            }
        });
        
        // Initial file display
        var welcomeDOM = $('#explorer [data-path="WELCOME.md"]');
        if (welcomeDOM) {
            welcomeDOM.addClass('activefile');
        
            loadRealmFile(welcomeDOM.attr('data-id'), 'WELCOME.md', 'WELCOME.md', true);
        }
        
        $("#loading").fadeOut(500, function () {
            $("#workspace").fadeIn();
            resize();
        });
        
    }
}

function loadRealmFile(id, path, name, rendered) {

    var tracking_id = __projectId + '-' + path;

    // Resource already loaded? If so, skip straight to displaying it
    if (sessionStorage[tracking_id + '-name']) {
        loadEditor(tracking_id, sessionStorage[tracking_id], rendered);
        __fileId = tracking_id;
        return;
    } 

    // Binary formats (like images and audio) only have 'viewers' right now, no editors
    if (isImageFile(name)) {
                
        $('#image').children('img').each(function(i) { 
            $(this).hide();
        });
        
        $("#image").append("<img src='" + __projectURL + '/file/raw/' + encodeURIComponent(path) + "' id='" + id + "' style='background-image: url(/build/img/transparent_display.gif);' />");
        
        displayImage();
        return;
    }
    
    // If we're this far, we need to load up some ascii
    $.ajax({
        url: __projectURL + '/file/raw/' + encodeURIComponent(path),
        type: 'get',
        dataType: 'text'
    })
    .done(function (data) {
        
        sessionStorage[tracking_id] = data;
        sessionStorage[tracking_id + '-name'] = name;
        sessionStorage[tracking_id + '-path'] = path;
        sessionStorage[tracking_id + '-commit-md5'] = md5(data);

        __trackedFiles.push(tracking_id);
        sessionStorage[__trackedStorageId] = JSON.stringify(__trackedFiles);

        loadEditor(tracking_id, data, rendered); // (name,
        __fileId = tracking_id;
        
    })
    .fail(function(data, param1, param2) {
        console.log(data);
            // Update DOM to reflect we messed up:
            //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
    });
        
}

function realmResourceURL(path) {

    var req = '/file/raw/' + path;
    
    return __projectURL + req;
    
}

function displayImage() {
    $("#ulView li").css('display', 'none');
    $("#tabs .tab-pane").hide();
    $("#btnView").html('<i class="fa fa-eye"></i> Raw Image <span class="caret"></span>');
    
    $("#tab-nav-image").css('display', 'block');
    $('#image').show();
}

function isImageFile(name) {
	var ext = name.split('.').pop();
	if ($.inArray(ext, ["png", "jpg", "jpeg"]) > -1) {
		return true;
	}
	return false;
}

var __editSessions = {};

function loadEditor(filename, content, displayRendered) {

    __editor.off("change", editor_onChange);
    var ext = filename.split('.').pop();
	
	var renderTarget;

    $("#ulView li").css('display', 'none');
    
    if (isImageFile(filename)) {

        $("#tab-nav-image").css('display', 'block');
		$('#tab-nav-image a:first').tab('show');
		return;   
    }
        
    $("#tab-nav-editor").css('display', 'block');
    
    var extension_to_mode = {
        'js':   'ace/mode/javascript',
        'json': 'ace/mode/json',
        'html': 'ace/mode/html',
        'md':   'ace/mode/plain_text'
    };
    
    if (!__editSessions[filename]) {
        __editSessions[filename] = ace.createEditSession(content, extension_to_mode[ext] ? extension_to_mode[ext] : 'ace/mode/plain_text');
    }
    
    switch (ext) {
        case "js":
            //__editor.getSession().setMode("ace/mode/javascript");
            __editSessions[filename] = ace.createEditSession(content, "ace/mode/javascript");
            break;
        case "json":
            //__editor.getSession().setMode("ace/mode/json");
            
            if (displayRendered === undefined) {
                displayRendered = true;
            }
            
            try {
                var parsed = JSON.parse(content);
                
                // TODO: This is a horrible, horrible test for 'are we looking at a map?'
                if (parsed.terrain) {
                    Map.init("mapContainer", parsed);
                    Map.save = function () {
                        var worker = {};
                        worker.settings = Map.settings;
                        worker.terrain = Map.terrain;
                        worker.objects = Map.objects;
                        worker.actors = Map.actors;

                        sessionStorage[__fileId] = JSON.stringify(worker);
                        
                        // Format the JSON so a human can read it:
                        content = JSON.stringify(parsed, function(key, value) { 
                            if (key === "index") { 
                                return '(tile locations ommitted for readability)'; 
                            } else { 
                                return value; 
                            } 
                        }, '\t');
                        
                        __editor.setValue(content);
                    };
                    
                    // Format the JSON so a human can read it:
                    content = JSON.stringify(parsed, function(key, value) { 
                        if (key === "index") { 
                            return '(tile locations ommitted for readability)'; 
                        } else { 
                            return value; 
                        } 
                    }, '\t');
                    
                    $("#mapToolbar [data-toggle='tooltip']").tooltip();
                    $("#tab-nav-map").css('display', 'block');
                    renderTarget = $("#tab-nav-map a:first");
                }
                
                __editSessions[filename] = ace.createEditSession(content, "ace/mode/json");
                
            } catch (e) {
                console.log(e);
            }
            
            break;
        case "html":
            //__editor.getSession().setMode("ace/mode/html");
            __editSessions[filename] = ace.createEditSession(content, "ace/mode/html");
            break;
        case "md":
            if (displayRendered === undefined) {
                displayRendered = true;
            }
            
            //__editor.getSession().setMode("ace/mode/plain_text");
            __editSessions[filename] = ace.createEditSession(content, "ace/mode/plain_text");
            
            $("#tab-nav-markdown").css('display', 'block');
            renderTarget = $("#tab-nav-markdown a:first");
            $("#markdown").html(marked(content));
            break;
        default:
            __editSessions[filename] = ace.createEditSession(content, "ace/mode/plain_text");
            break;
    }
    
    
    __editor.setSession(__editSessions[filename]);
    
	$("#tabs .tab-pane").hide();
	
	if (displayRendered) {
		// TODO: Switch between rendered things. 
		$(renderTarget.attr("href")).show();
		$("#btnView").html('<i class="fa fa-eye"></i> ' + renderTarget.text() + ' <span class="caret"></span>');
	} else {
		$($('#tab-nav-editor a:first').attr('href')).show();
		$("#btnView").html('<i class="fa fa-eye"></i> ' + $('#tab-nav-editor a:first').text() + ' <span class="caret"></span>');
	}
	
    __editor.on("change", editor_onChange);
}

function editor_onChange(e) {
    
    if ((sessionStorage[__fileId + "-path"].indexOf("/maps/") > -1) && (sessionStorage[__fileId + "-path"].indexOf(".json") > -1)) {
        
        // TODO: Special handling is needed for json under the '/maps/' directory, the sessionStorage value
        // is the full value of the map; however, the displayed value in the editor has the 'index' property of each
        // root object, i.e. 'objects' and 'terrain' replace with "ommitted for sanity" so we don't have thousands of tile
        // locations markers displayed in the editor...
        // SOLUTION: Merge the editable values in the editor with the stored values for the 'index' values in session storage
        
		//var newMap = JSON.parse(__editor.getValue());
        //var oldMap = JSON.parse(sessionStorage[__fileId]);
        
    } else {
        sessionStorage[__fileId] = __editor.getValue();
    }
}

function setToolbarFocus(target) {
    $("#tileButton").removeClass('active');
    $("#objectButton").removeClass('active');

    target.button('toggle');
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