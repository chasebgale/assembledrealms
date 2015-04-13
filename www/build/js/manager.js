var __newScreenshots = [];
var __removedScreenshots = [];

$(document).ready(function () {
   
    $('.monitored').on('change', function (e) {
        var prop = $(this).attr('data-id');
        __currentState[prop] = $(this).val();
        checkForChanges();
    });
   
    $("#button-destroy-realm").on("click", function (e) {

        e.preventDefault();
        var id = $(this).attr('data-id');

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/project/' + id + '/destroy',
            type: 'GET',
            dataType: 'json',
            success: function (data) {
            
            var parameters = {};
            parameters.directive = "destroy";
            parameters.realm_id = id;

            $.post("manager.php", parameters, function (data) {
                data = JSON.parse(data);
                if (data.message == "OK") {
                    window.location = "http://www.assembledrealms.com/build";
                }
            });

        }
        });
        
    });
   
    $("#savebutton").on('click', function (e) {
        var button = $(this);
      
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Save Changes!');

        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'save',
                realm_id: __realmID,
                description: $("#details-description").val(),
                funding: $("#chkFunding").is(":checked"),
                shots_added: __newScreenshots,
                shots_removed: __removedScreenshots
            }
        })
        .done(function (data) {
            console.log(data);
            __markdownCreateNewDB = false;
            enableSave();
        })
        .fail(function(data) {
            console.log(data);
            $('#newFileCreateAlert').text('Network Error: ' + data.statusText);
            $('#newFileCreateAlert').fadeIn();
            // Update DOM to reflect we messed up:
            //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        });
    });
   
    $("#screenshotsCol").on('click', '.removeScreenshot', function (e) {
        e.preventDefault();
        
        var target = $(this).parent().prev().attr('href').substr(10);
        
        if (target.substr(0, 7) !== 'staging') {
            // We only need to report existing shots to be removed, the staging area server side gets wiped daily
            __removedScreenshots.push(target);
        }
        
        $(this).parent().parent().fadeOut();
    });
   
    $("#upfile").on('change', function (e) {
       
        $("#upfile").attr('disabled', true);
        $("#uploadProgress").fadeIn();
        
        var formData = new FormData();
        formData.append('upfile', e.target.files[0]);
        formData.append("directive", "upload");
       
        $.ajax({
            url: "manager.php",
            type: "POST",
            data: formData,
            dataType: 'json',
            processData: false, // tell jQuery not to process the data
            contentType: false, // tell jQuery not to set contentType
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                // Upload progress
                xhr.upload.addEventListener("progress", function (evt) {
                    var percentComplete = Math.round((evt.loaded / evt.total) * 100);
                    $("#uploadProgressbar").attr('aria-valuenow', percentComplete).width(percentComplete + '%');
                }, false);
                return xhr;
            },
            success: function(data, textStatus, jqXHR) {
                if(data.message === 'OK') {
                    var newContent = '<div class="thumbnail screenshotHolder" style="display: inline-block; margin: 8px;">';
                    newContent += '<a href="/play/img/staging/' + data.guid + '.jpg" data-toggle="lightbox" data-title="NEW Screenshot" data-parent=".wrapper-parent" data-gallery="gallery-43">';
                    newContent += '<img src="/play/img/staging/' + data.guid + '-thumb.jpg"></a>';
                    newContent += '<div class="caption"><a href="#" class="btn removeScreenshot"><i class="fa fa-trash-o"></i> Remove</a></div></div>';
                    
                    $('.screenshotHolder:last').after(newContent);
                    
                    if ($('.screenShotHolder').length >= 6) {
                        $('#addNewShot').hide();
                    }
                    
                    $("#uploadScreenshotForm").get(0).reset();
                    $("#upfile").attr('disabled', false);
                    $("#uploadProgressbar").attr('aria-valuenow', 0).width('0%');
                    
                    __newScreenshots.push(data.guid);
                    
                }
                else
                {
                    // Handle errors here
                    console.log('ERRORS: ' + data.error);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle errors here
                console.log('ERRORS: ' + textStatus);
            }
        });
    });
   
});

function checkForChanges() {
   if (_.isEqual(__existingState, __currentState)) {
      disableSave();
   } else {
      enableSave();
   }
}

function enableSave() {
   var button = $('#savebutton');
      
   button.removeAttr('disabled');
   button.html('<i class="fa fa-exclamation-triangle"></i> Save Changes!');
}

function disableSave() {
   var button = $('#savebutton');
      
   button.attr('disabled', 'disabled');
   button.html('Save Changes!');
}