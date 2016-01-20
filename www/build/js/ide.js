var __editor;
var __fileId;
var __renderer;
var __projectId;
var __projectURL;
var __checkInMsg;
var __trackedStorageId;
var __map;
var __processingFiles   = [];
var __trackedFiles      = [];
var __commitFiles       = [];
var __editSessions      = {};
var __mapDisplayed      = false;

function resize() {
    $("#editor").height( $("#tree").height() );
}

function initialize(projectID, projectDomain) {
    
    $.ajaxSetup({
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    });
    
    __projectId = projectID;
    __projectURL = 'http://' + projectDomain + '/api/project/' + __projectId;
    __trackedStorageId = __projectId + "-tracking";
    
    __editor = ace.edit("editor");
    __editor.setShowPrintMargin(false);
    
    var editorTheme = localStorage.getItem("editorTheme");
    if (editorTheme !== null) {
      __editor.setTheme('ace/theme/' + editorTheme);
      $("#btnEditorTheme").html(toTitleCase(editorTheme.replace(new RegExp("_", "g"), " ")) + ' <span class="caret"></span>');
    }
    
    var editorFontSize = localStorage.getItem("editorFontSize");
    if (editorFontSize !== null) {
      document.getElementById('editor').style.fontSize = editorFontSize;
      $("#btnEditorFontSize").html(editorFontSize + ' <span class="caret"></span>');
    }
    
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
    
    $('#ulEditorFontSize a').on("click", function (e) {
      e.preventDefault();
      document.getElementById('editor').style.fontSize = $(this).text();
      $("#btnEditorFontSize").html($(this).text() + ' <span class="caret"></span>');
      localStorage.setItem("editorFontSize",  $(this).text());
    });
    
    $('#ulEditorTheme a').on("click", function (e) {
      e.preventDefault();
      __editor.setTheme('ace/theme/' + $(this).text().toLowerCase().replace(new RegExp(" ", "g"), "_"));
      $("#btnEditorTheme").html($(this).text() + ' <span class="caret"></span>');
      localStorage.setItem("editorTheme",  $(this).text().toLowerCase().replace(new RegExp(" ", "g"), "_"));
    });

    $('#ulView a').on("click", function (e) {
        e.preventDefault();
        // Hide all tabs
      $("#tabs .tab-pane").hide();
		
      if ($(this).attr('href') == "#markdown") {
        $("#markdown").html(marked(__editor.getValue()));
      } else if ($(this).attr('href') == "#editor") {
        __editor.renderer.updateFull();
      }
      
      // show tab
      $($(this).attr('href')).show();
      
      $("#btnView").html('<i class="fa fa-eye"></i> ' + $(this).text() + ' <span class="caret"></span>');
    });
    
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
  
      $('#debugProgressList').append('<li>Selecting least congested server...</li>');
		
      $.ajax({
        url: 'editor.php',
        type: 'post',
        dataType: 'json',
        data: {directive: 'debug', realm_id: __projectId}
      })
      .done(function (data) {
			
        var address 	= data.address;
        var debug_url 	= 'http://www.assembledrealms.com/debug/realm/' + __projectId;
        
        $('#debugProgressList').append('<li>Compressing latest commit and delivering it to ' + address + '</li>');

        $.ajax({
          url: __projectURL + '/publish',
          type: 'post',
          dataType: 'text',
          data: {address: address, shared: true}
        })
        .done(function (data) {
          if (data === "OK") {
           
            $('#debugProgressList').append('<li>Published to debug server successfully!</li>');
            $('#debugProgressList').append('<li>Launching realm on ' + address + '</li>');
            
            $.ajax({
              url: 'http://' + address + '/launch/' + __projectId,
              type: 'get',
              dataType: 'text'
            })
            .done(function (data) {
              $('#debugProgressList').append('<li><strong>Success!</strong> Your debug URL: <a target="_blank" href="' + debug_url + '"><i class="fa fa-external-link"></i> ' + debug_url + '</a></li>');
            })
            .fail(function(data) {
              $('#debugProgressList').append('<li class="text-danger"><strong><i class="fa fa-exclamation-triangle"></i> Fatal Error:' + data.responseText + '</strong> Please try again in a few minutes, monkeys are furiously typing away to fix this problem.</li>');
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
      })
      .fail(function(d, textStatus, error) {
        console.log(textStatus);
        $('#debugAlert').html('<li class="text-danger"><strong><i class="fa fa-exclamation-triangle"></i> Error: </strong> ' + textStatus);
        $('#debugAlert').fadeIn();
        $('#debugClose').attr('disabled', false);
                // Update DOM to reflect we messed up:
                //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
      });
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
                $('#commitProgressMessage').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseText);
                
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
            
    $.ajax({
        url: __projectURL + '/open'
    })
    .done(function (data) {
        
        // Process folders first:
        var json = _.sortBy(data, function (item) {
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
        
    })
    .fail(function(d, textStatus, error) {
        $('#loading').fadeOut();
        $('#errorMessage').text(textStatus);
        $('#errorMessage').fadeIn();
    });
        
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

function render() {
  if (__mapDisplayed) {
    __map.render();
    requestAnimationFrame(render);
  }
}

function loadEditor(filename, content, displayRendered) {

  __editor.off("change", editor_onChange);
  
  var ext = filename.split('.').pop();
	var renderTarget;

  $("#ulView li").css('display', 'none');
  $("#tab-nav-editor").css('display', 'block');
  
  // Turn off the map render loop if we are switching off of the map
  if (__mapDisplayed) {
    __mapDisplayed = false;
  }
    
  var extension_to_mode = {
      'js':   'ace/mode/javascript',
      'json': 'ace/mode/json',
      'html': 'ace/mode/html',
      'md':   'ace/mode/plain_text'
  };
  
  switch (ext) {
    case "js":
      break;
    case "json":
      
      if (displayRendered === undefined) {
        displayRendered = true;
      }
      
      try {
        var parsed = JSON.parse(content);
        
        // TODO: This is a horrible, horrible test for 'are we looking at a map?'
        if (parsed.terrain) {
          $('#mapContainer').empty();
          __map = new Map(document.getElementById("mapContainer"), document.getElementById("mapToolbar"), parsed);
          __map.onInitialized = function () {
            __mapDisplayed = true;
            render();
          };
          __map.onResourceLoaded = function (json, source) {
            var template = $('#resource_template').html();
            var target = $('#' + json.meta.category);

            target.append(_.template(template, { model: json, source: source }));
          };
          __map.save = function () {
            var worker = {};
            worker.settings = __map.settings;
            worker.terrain = __map.terrain;
            worker.objects = __map.objects;
            worker.actors = __map.actors;

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
        break;
    case "md":
        if (displayRendered === undefined) {
            displayRendered = true;
        }
        
        //__editor.getSession().setMode("ace/mode/plain_text");
        //__editSessions[filename] = ace.createEditSession(content, "ace/mode/plain_text");
        
        $("#tab-nav-markdown").css('display', 'block');
        renderTarget = $("#tab-nav-markdown a:first");
        $("#markdown").html(marked(content));
        break;
  }
  
  if (!__editSessions[filename]) {
      __editSessions[filename] = ace.createEditSession(content, extension_to_mode[ext] ? extension_to_mode[ext] : 'ace/mode/plain_text');
  }
  
  __editSessions[filename].setUseSoftTabs(true);
  __editSessions[filename].setTabSize(2);
  __editSessions[filename].setUseWrapMode(true);
  __editor.setSession(__editSessions[filename]);
    
	$("#tabs .tab-pane").hide();
	
	if (displayRendered) {
		$(renderTarget.attr("href")).show();
    $('#editorOptions').hide();
		$("#btnView").html('<i class="fa fa-eye"></i> ' + renderTarget.text() + ' <span class="caret"></span>');
	} else {
		$($('#tab-nav-editor a:first').attr('href')).show();
    $("#editorOptions").fadeIn().css('display','inline-block');
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

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};