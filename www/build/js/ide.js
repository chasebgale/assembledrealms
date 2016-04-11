var __editor;
var __fileId;
var __renderer;
var __projectId;
var __projectURL;
var __checkInMsg;
var __trackedStorageId;
var __map;
var __treeDropDown;
var __treeDropDownTarget;
var __treeDropDownButton;
var __tree;
var __processingFiles    = [];
var __trackedFiles       = [];
var __commitFiles        = [];
var __editSessions       = {};
var __mapDisplayed       = false;
var __commitOnDebug      = false;

var __modalSimpleOptions = {
  newFolder: {
    title: "Enter the new folder's name...",
    placeholder: "New Folder"
  },
  newFile: {
    title: "Enter the new file's name...",
    placeholder: "New File.js"
  },
  rename: {
    title: "Enter the new name..."
  }
};

// TODO: This mechanism feels lame
var REQUIRED = [
  'engine.js',
  'editor.js',
  'CREDITS.md',
  'FUNDING.md',
  'README.md',
  'WELCOME.md',
  'client',
  'server',
  'engine'
];

function resize() {
  var h = $("#tree").height();
  $("#editor").height(h);
  $("#ulEditorTheme").css('max-height', (h-10) + 'px');
  $("#ulEditorTheme").css('overflow-y', 'auto');
  
  $("#historyList").css('max-height', Math.round(h/2) + 'px');
  $("#historyList").css('overflow-y', 'auto');
}

function initialize(projectID, projectDomain) {
    
  // Do this explicitly - this is included with the default footer but the IDE uses
  // it's own layout
  $.ajaxSetup({
    crossDomain: true,
    xhrFields: {
        withCredentials: true
    }
  });
  
  __projectId = projectID;
  __projectURL = 'https://' + projectDomain + '/api/project/' + __projectId;
  __trackedStorageId = __projectId + "-tracking";
  
  __editor = ace.edit("editor");
  __editor.setShowPrintMargin(false);
  
  var editorTheme = localStorage.getItem("editorTheme");
  if (editorTheme !== null) {
    __editor.setTheme('ace/theme/' + editorTheme);
    $("#btnEditorTheme").html(editorTheme.replace(new RegExp("_", "g"), " ").toTitleCase() + ' <span class="caret"></span>');
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
    
    $("#treeLoadingFileIndicator").prependTo(root.parent()).show();

    var id      = root.attr('data-id');
    var path    = root.attr('data-path');
    var name = root.text().trim();

    loadRealmFile(id, path, name);

  });
  
  __treeDropDown       = $("#treeActionsDropDown");
  __treeDropDownButton = $("#treeActionsDropDownButton");
  
  __treeDropDown.dropdown();
  
  __treeDropDownButton.on("click", function (e) {
    var isFile      = __treeDropDownTarget.hasClass('file');
    var targetClass = isFile ? "fileOption" : "folderOption";
    var targetText  = __treeDropDownTarget.text();
    
    __modalSimpleOptions.rename.placeholder = targetText;
    __modalSimpleOptions.rename.val         = targetText;
    
    var readonly = false;
    if (REQUIRED.indexOf(targetText) > -1) {
      readonly = true;
    }
    
    // Setup dropdown menu for the correct target
    $("#treeActionsDropDown li").each(function() {
      
      var item = $(this);
      
      if (item.hasClass(targetClass)) {
        if (readonly && item.hasClass('fileOption')) {
          item.addClass('disabled');
        } else {
          item.removeClass('disabled');
        }
        item.show();
      } else {
        item.hide();
      }
    });
    
    // TODO: FIX FOLDER RENAMING
    if (!isFile) {
      $("#treeActionsDropDown a[data-action='rename']").parent().addClass('disabled');
    }
    
    $("#treeActionsDropDownButtonHidden").dropdown('toggle');
    e.stopImmediatePropagation();
    return false;
  });
  
  $("#explorer").on("mouseenter", ".folder, .file", function () {
    if (!__treeDropDown.hasClass("open")) {
      
      var item = $(this);
      if (REQUIRED.indexOf(item.text()) > -1) {
        if (item.hasClass('file')) {
          __treeDropDownButton.hide();
          return true;
        }
      }
      
      __treeDropDownTarget = $(this);
      
      __treeDropDownButton.prependTo(__treeDropDownTarget);
      __treeDropDownButton.show();
      
      var offset = __treeDropDownButton.offset();
      
      __treeDropDown.css('top', (offset.top + 16) + 'px');
      __treeDropDown.css('left', offset.left + 'px');
      __treeDropDown.show();
    }
  });
  
  $("#explorer").on("mouseleave", ".folder, .file", function () {
    if (!__treeDropDown.hasClass("open")) {
      __treeDropDown.hide();
    }
  });
  
  $("#explorer").on("mouseleave", function () {
    if (!__treeDropDown.hasClass("open")) {
      __treeDropDownButton.hide();
    }
  });
  
  $("#explorer").on("click", ".folder, .file", function () {
    if (__treeDropDown.hasClass("open")) {
      __treeDropDownTarget = $(this);
      
      __treeDropDownButton.appendTo(__treeDropDownTarget);
      __treeDropDownButton.show();
      
      var offset = __treeDropDownButton.offset();
      
      __treeDropDown.css('top', (offset.top + 16) + 'px');
      __treeDropDown.css('left', offset.left + 'px');
      __treeDropDown.show();
    }
  });
  
  $("#treeActionsDropDown a").on("click", function () {
    var self   = $(this);
    var target = self.attr('data-target');
    var action = self.attr('data-action');
    var modal  = $(target);
    
    if (__treeDropDownTarget.attr('data-path')) {
      // File
      var barePath  = __treeDropDownTarget.attr('data-path');
      var path      = "/" + barePath;
    } else {
      // Folder
      var barePath  = __treeDropDownTarget.parent().attr('data-path');
      var path = "/" + barePath + "/";
    }
    
    if (self.parent().hasClass('disabled')) {
      return false;
    }
    
    switch (target) {
      
      case "#modalFilename":
        var options = __modalSimpleOptions[action];
        var input   = modal.find('.form-control');
        
        modal.find('.modal-title').text(options.title);
        input.attr('placeholder', options.placeholder);
        if (options.val) {
          input.val(options.val);
        } else {
          input.val('');
        }
        
        $("#inputFilenameLabel").text(path);
        
        $("#buttonFilename").attr('data-action', action);
        
        // What task to perform per action type
        $("#buttonFilename").unbind('click').click(function() {
          var inputValue = input.val();
          var action     = $(this).attr('data-action');
          
          // Validate (no slashes allowed):
          if (inputValue.match(/[\/\\]/g)) {
            $("#alertFilename").text("Slashes are not valid characters...");
            $("#alertFilename").show();
            return;
          }
          
          if (inputValue.indexOf('..') > -1) {
            $("#alertFilename").text("Please don't recurse...");
            $("#alertFilename").show();
          }
          
          var button = $(this);
          button.attr('disabled', true);
          button.html('<i class="fa fa-cog fa-spin"></i> OK');

          switch (action) {
            case 'newFolder':
              var targetUrl = '/folder/create';
              var post      = {
                fullpath: path + inputValue
              };
              break;
            case 'newFile':
              var targetUrl = '/file/create';
              var post      = {
                fullpath: path + inputValue
              };
              break;
            case 'rename':
              var targetUrl = '/file/rename';
              var post      = {
                oldPath: barePath,
                newPath: barePath.substr(0, barePath.lastIndexOf('/') + 1) + inputValue
              };
              break;
          }
          
          $.ajax({
            url:        __projectURL + targetUrl,
            type:       'post',
            dataType:   'json',
            data:       post
          })
          .done(function (data) {
            console.log(data);
            if (data.message === "OK") {
              
              switch (action) {
                case 'newFolder':
                  addFolderToExplorer(barePath, inputValue);
                  break;
                case 'newFile':
                  addToExplorer(barePath, inputValue, data.sha);
                  break;
                case 'rename':
                  renameExplorerItem(barePath, inputValue, data.sha);
                  break;
              }

              modal.modal('hide');
              
            } else {
              $('#alertFilename').text('Delete Error: ' + data.message);
              $('#alertFilename').fadeIn();
            }
              
          })
          .fail(function(data) {
            console.log(data);
            $('#alertFilename').text('Network Error: ' + data.statusText);
            $('#alertFilename').fadeIn();
          })
          .always(function () {
            button.attr('disabled', false);
            button.html('OK');
          });
          
        });
        
        // Update the label with the new path
        $("#inputFilename").unbind('input').on('input', function () {
          var newPath = path + $(this).val();
          
          if (action === "newFolder") {
            newPath += "/";
          } else if (action === "rename") {
            var pathTrimmed = path.substr(0, path.length - 1);
            newPath = pathTrimmed.substr(0, pathTrimmed.lastIndexOf('/') + 1) + $(this).val();
          }
          
          $("#inputFilenameLabel").text(newPath);
        });
        
        break;
      
      case "#modalUploadResource":
        // Update the hidden field on the upload form to match our path
        $("#inputFilePath").attr('value', path);
        break;
        
      case "#modalDeleteConfirm":
        var deleteTargetType  = '';
        var deleteTarget      = '';
        
        // File or folder?
        if (__treeDropDownTarget.hasClass('file')) {
          path = __treeDropDownTarget.attr('data-path');
          deleteTargetType = 'file';
          $('#btnDelete').attr('data-id', __treeDropDownTarget.attr('data-id'));
        } else {
          path = __treeDropDownTarget.parent().attr('data-path');
          deleteTargetType = 'folder';
        }
        
        $('#btnDelete').attr('data-target', path);
        $('#btnDelete').attr('data-type', deleteTargetType);
        
        modal.find('.modal-title').text('Delete ' + deleteTargetType + '...?');
        modal.find('h5').html('Are you sure you want to delete:<br /><strong>' + path + '</strong>');
        break;
    }
    
    modal.modal('show');
  });
  
  $('#btnDelete').on("click", function (e) {
    e.preventDefault();
    
    var button  = $(this);
    var target  = button.attr('data-target');
    var type    = button.attr('data-type');
    var sha     = button.attr('data-id');
      
    button.attr('disabled', true);
    button.html('<i class="fa fa-cog fa-spin"></i> Delete');
    button.next().attr('disabled', true);
    
    if (type === "file") {
      var url = '/file/remove';
    } else if (type === "folder") {
      var url = '/folder/remove';
    }
    
    var post = {
      fullpath: target,
      type: type
    };
    
    $.ajax({
      url:        __projectURL + url,
      type:       'post',
      dataType:   'json',
      data:       post
    })
    .done(function (data) {
      console.log(data);
      if (data.message === "OK") {
        
        // Move the indicator off this DOM ele as it's about to have it's parent trashed
        $("#treeLoadingFileIndicator").appendTo($('body')).hide();
        __treeDropDownButton.appendTo($('body')).hide();
        
        if (type === "file") {
          var tracking_id = __projectId + '-' + target;
          sessionStorage.removeItem(tracking_id + '-commit-md5');
          sessionStorage.removeItem(tracking_id + '-name');
          sessionStorage.removeItem(tracking_id + '-path');
          sessionStorage.removeItem(tracking_id);
          
          var tracking  = JSON.parse(sessionStorage[__projectId + '-tracking']);
          var index     = tracking.indexOf(tracking_id);
          
          if (index !== -1) {
            tracking.splice(index, 1);
            sessionStorage[__projectId + '-tracking'] = JSON.stringify(tracking);
          }
          
          $("#tree [data-id='" + sha + "']").parent().remove();
          
          // Show welcome file after delete, if user was viewing deleted file
          if (__fileId === tracking_id) {
            var welcomeDOM = $('#explorer [data-path="WELCOME.md"]');
            if (welcomeDOM) {
              welcomeDOM.addClass('activefile');

              loadRealmFile(welcomeDOM.attr('data-id'), 'WELCOME.md', 'WELCOME.md', true);
            }
          }
        } else {
          
          // If actively viewed file is a child of the folder
          // we are removing, show welcome file
          if ($("#tree [data-path='" + target + "']").find('.activefile').length > 0) {
            var welcomeDOM = $('#explorer [data-path="WELCOME.md"]');
            if (welcomeDOM) {
              welcomeDOM.addClass('activefile');

              loadRealmFile(welcomeDOM.attr('data-id'), 'WELCOME.md', 'WELCOME.md', true);
            }
          }
          // REMOVE FOLDER
          $("#tree [data-path='" + target + "']").remove();
          // Reapply styles and event handlers
          __tree.applyClasses({}, __tree.data('toggler'));
        }
        
        $('#modalDeleteConfirm').modal('hide');
        $('#alertDelete').hide();
      } else {
        $('#alertDelete').text('Delete Error: ' + data.message);
        $('#alertDelete').fadeIn();
      }
        
    })
    .fail(function(data) {
      console.log(data);
      $('#alertDelete').text('Network Error: ' + data.statusText);
      $('#alertDelete').fadeIn();
    })
    .always(function () {
      button.attr('disabled', false);
      button.html('Delete');
      button.next().attr('disabled', false);
    });
    
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
      $("#markdown a").attr('target', '_blank');
    }
    
    if ($(this).attr('href') == "#editor") {
      $("#editorOptions").fadeIn().css('display','inline-block');
      __editor.renderer.updateFull();
    } else {
      $("#editorOptions").fadeOut();
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

  $("#btnHistory").on("click", function () {
    $('#tableHistoryContainer').html('<div style="margin: 0 auto; width: 100px; text-align: center; padding-top: 100px;"><i class="fa fa-spinner fa-pulse fa-3x"></i></div>');
    $('#modalHistory').modal('show');
    
    $.ajax({
      url: __projectURL + '/history',
      type: 'get',
      dataType: 'json'
    })
    .done(function (data) {
      var templateFnHistory = _.template($('#history_template').html());
      
      for (var i = 0; i < data.length; i++) {
        var id = data[i].author.substring(5);
        if (id === USER_ID) {
          data[i].author = USER_DISPLAY;
        } else {
          data[i].author = "Uknown";
        }
      }
      
      $('#tableHistoryContainer').html(templateFnHistory({'model': data}));
      
    })
    .fail(function(data, param1, param2) {
      console.log(data);
    });
  });
  
  $("#btnCommit").on("click", function () {
    listCommitFiles();
    $('#modalCommit').modal('show');
  });
  
  $("#btnDebug").on("click", function (e) {
    e.preventDefault(); 
    debug();
  });
  
  $('#commitStart').on('click', function () {
    $(this).attr('disabled', true);
    $(this).html('<i class="fa fa-cog fa-spin"></i> Commit');
    $("#commitProgressMessage").text('Initiating commit to branch.');
    commit();
  });

  $("#btnUploadResource").on("click", function () {
    var bar   = $('#uploadProgressbarFill');
    var alert = $('#uploadAlert');
    
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
    
    var upload  = document.getElementById('inputFile').files[0];
    var uri     = __projectURL + "/file/upload";
    var xhr     = new XMLHttpRequest();
    var fd      = new FormData();
    
    xhr.withCredentials = true;
    
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
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          var json = JSON.parse(xhr.responseText);
          if (json.message == "OK") {
            button.attr('disabled', false);
            
            $("#explorer .file").removeClass('activefile');
            addToExplorer(__treeDropDownTarget.parent().attr('data-path'), upload.name, json.sha);
            
            alert.addClass('alert-success');
            alert.html("<strong>" + upload.name + "</strong> was successfully added to your resource folder!");
            alert.fadeIn();
            $('#uploadForm').trigger('reset');
          }
        } else {
          button.attr('disabled', false);
          bar.addClass('progress-bar-danger');
          bar.text('Error occurred during upload...');
        }
      }
    };
    fd.append('file', upload);
    fd.append('field', $("#inputFilePath").attr('value'));
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
	console.log("Thanks for taking a look! I keep the IDE source unminified/uncompressed/unobfuscated so it's easier to learn.");
	console.log("Have fun and explore but please contact me if you find a (bug || exploit), you'll be rewarded! chase@assembledrealms.com");
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

function removeFromExplorer(sha) {
  var removeTarget = $("#tree").find('[data-id="' + sha + '"]');
  
  if (removeTarget) {
   
   var parentUL = removeTarget.closest('ul');
    removeTarget.parent().remove();
    
    // If we only have one item left, fix the hierchy display lines
    if (parentUL.children().length === 1) {
      parentUL.children().first().addClass('last');
    }
    
  }
}

function renameExplorerItem(oldPath, newName, sha) {
  var target = $('#explorer [data-path="' + oldPath + '"]');
  
  // Move the indicator off this DOM ele as it might be replaced
  $("#treeLoadingFileIndicator").appendTo($('body')).hide();
  __treeDropDownButton.appendTo($('body')).hide();
  
  if (target.is('li')) {
    // Folder
    target.children('span').text(newName);
  } else {
    // File
    target.text(newName);
    target.attr('data-id', sha);
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

// TODO - REPLACE THIS TREEVIEW WITH YOUR OWN, GETTING CRAZY
// path = client/engine
// name = new_folder
function addFolderToExplorer(path, name) {
  
  var inserted = false;
  var fullpath = path + "/" + name;
  
  var root  = $("#explorer [data-path='" + path + "']").children("ul");
  // Select subset of only folders:
  var items = root.children(".closed");
  
  var markup = '<li class="hasChildren closed expandable" data-path="' + fullpath + '"><div class="hitarea hasChildren-hitarea closed-hitarea expandable-hitarea"></div><span class="folder">' + name + '</span><ul style="display: none;"></ul></li>';
  
  items.each(function () {
    if ($(this).attr('data-path') > fullpath) {
      inserted = true;
      var dom = $(this).before(markup);
      return false;
    }
  });
  
  if (!inserted) {
    if (root.children('.closed').length > 0) {
      var lastFolder = root.children('.closed').last();
      lastFolder.removeClass('lastExpandable');
      lastFolder.children().first().removeClass('lastExpandable-hitarea');
      
      markup = '<li class="hasChildren closed expandable lastExpandable" data-path="' + fullpath + '"><div class="hitarea hasChildren-hitarea closed-hitarea expandable-hitarea lastExpandable-hitarea"></div><span class="folder">' + name + '</span><ul style="display: none;"></ul></li>';
      
      var dom = lastFolder.after(markup);
    } else {
      var dom = root.prepend(markup);
    }
  }
  
  //root.find("[data-path='" + path + "/" + name + "']").children('span').hoverClass();
  
  // Reapply styles and event handlers
  __tree.applyClasses({}, __tree.data('toggler'));
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

function buttonOverrideDebugWarning(cancel) {
  $('#commandBarStatus').fadeOut();
  if (!cancel) {
    debug(true);
  } else {
    var debugButton = $('#btnDebug');
    debugButton.attr('disabled', false);
    debugButton.html('<i class="fa fa-caret-square-o-right fa-fw"></i> Debug');
  }
}

function debug(force) {
  
  var debugButton = $('#btnDebug');
  debugButton.attr('disabled', true);
  debugButton.html('<i class="fa fa-spinner fa-pulse fa-fw"></i> Debug');
  
  var debugStatus = $('#commandBarStatus');
  debugStatus.removeClass('alert-warning alert-success alert-danger');
  
  if (!force) {
    if (commitRequired()) {
      debugButton.html('<i class="fa fa-spinner fa-fw"></i> Debug');
      debugStatus.addClass('alert-warning');
      debugStatus.html('Continue debugging without your <strong>uncommitted</strong> changes? ' + 
      '<a id="ignoreCommitAndDebug" class="btn btn-default btn-xs" href="#" role="button" onclick="buttonOverrideDebugWarning(false);return false;">YES</a> ' +
      '<a id="cancelDebug" class="btn btn-default btn-xs" href="#" role="button" onclick="buttonOverrideDebugWarning(true);return false;">NO</a> '
      );
      debugStatus.fadeIn();
      return;
    }
  }
  
  if (__commitOnDebug) {
    // User already pushed latest commit to debug...
    debugButton.html('<i class="fa fa-caret-square-o-right fa-fw"></i> Debug');
    debugButton.attr('disabled', false);
    
    debugStatus.addClass('alert-success');
    debugStatus.html('Success! Click here to launch in a new window: <a href="/debug/realm/' + __projectId + '" target="_blank"  class="alert-link">https://www.assembledrealms.com/debug/realm/' + __projectId + '</a>');
    debugStatus.fadeIn(function () {
      setTimeout(function () {
        debugStatus.fadeOut();
      }, 15000);
    });
    return;
  }
  
  $.ajax({
    url: '/build/editor.php',
    type: 'post',
    dataType: 'json',
    data: {directive: 'debug', realm_id: __projectId}
  })
  .done(function (data) {
  
    var address = data.address;
    
    $.ajax({
      url: address,
      type: 'post',
      dataType: 'text',
      data: {}
    })
    .done(function (data) {
      console.log(data);
      
      __commitOnDebug = true;
      
      debugButton.html('<i class="fa fa-caret-square-o-right fa-fw"></i> Debug');
      debugButton.attr('disabled', false);
      
      debugStatus.addClass('alert-success');
      debugStatus.html('Success! Click here to launch in a new window: <a href="/debug/realm/' + __projectId + '" target="_blank"  class="alert-link">https://www.assembledrealms.com/debug/realm/' + __projectId + '</a>');
      debugStatus.fadeIn(function () {
        setTimeout(function () {
          debugStatus.fadeOut();
        }, 15000);
      });
    })
    .fail(function(d, textStatus, error) {
      console.log(textStatus);
      debugButton.html('<i class="fa fa-caret-square-o-right fa-fw"></i> Debug');
      debugButton.attr('disabled', false);
    });
  })
  .fail(function(d, textStatus, error) {
    console.log(textStatus);
    debugButton.html('<i class="fa fa-caret-square-o-right fa-fw"></i> Debug');
    debugButton.attr('disabled', false);
  });
}

function commitRequired() {
    
  __commitableFiles = [];
  
  if (sessionStorage[__trackedStorageId]) {
    __processingFiles = JSON.parse(sessionStorage[__trackedStorageId]);
    
    var fileMD5;
    var file;
    var fileName;
    var filePath;
    
    if (_.isArray(__processingFiles)) {
      __processingFiles = $.grep(__processingFiles, function (fileId, i) {
    
        if (isImageFile(fileId)) {
          __commitableFiles.push({
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
            
            __commitableFiles.push({
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
  
  return (__commitableFiles.length > 0);
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
        
        __commitOnDebug = false;
        
        $('#modalCommit').modal('hide');
      },
      error: function (response) {
          
        // Update DOM to reflect we messed up:
        $('#commitProgressMessage').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseText);
        $('#commitStart').removeAttr('disabled');
        $('#commitStart').html('Commit');
          
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

    __tree = $("#explorer").treeview({
      animated: "fast"
    });
    
    $("#tree").scroll(function() {
      __treeDropDownButton.css('right', ($(this).scrollLeft() * -1) + 'px');
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
    $("#treeLoadingFileIndicator").fadeOut();
    return;
  } 
  
  $("#treeLoadingFileIndicator").show();

  // Binary formats (like images and audio) only have 'viewers' right now, no editors
  if (isImageFile(name)) {
    var imageSource = __projectURL + '/file/raw/' + encodeURIComponent(path);
    var image = $("<img src='" + imageSource + "' id='" + id + "' style='background-image: url(/build/img/transparent_display.gif);' />").on('load', function() {
      $("#image").empty();
      $("#image").append(image);
      displayImage();
      __fileId = tracking_id;
      $("#treeLoadingFileIndicator").fadeOut();
    });
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
    $("#treeLoadingFileIndicator").fadeOut();
      
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
  $('#editorOptions').hide();
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
      'md':   'ace/mode/markdown'
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
        $("#markdown a").attr('target', '_blank');
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