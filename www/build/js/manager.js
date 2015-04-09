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
            data: {directive: 'save',
                   realm_id: __realmID,
                   markdown_funding: __editorFunding.getValue(),
                   markdown_description: __editorReadme.getValue(),
                   markdown_create: __markdownCreateNewDB,
                   funding: $("#chkFunding").is(":checked")
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
      })
      
      
   });
   
   $("#upfile").on('change', function (e) {
        var formData = new FormData();
        formData.append('upfile', e.target.files[0]);
        formData.append("directive", "upload");
        // formData.append("realm_id", __realmID);
       
        $.ajax({
            url: "manager.php",
            type: "POST",
            data: formData,
            dataType: 'json',
            processData: false, // tell jQuery not to process the data
            contentType: false, // tell jQuery not to set contentType
            success: function(data, textStatus, jqXHR) {
                if(data.message === 'OK') {
                    var newContent = '<div class="screenshotHolder" style="display: inline-block; margin: 8px;">';
                    newContent += '<a href="/play/img/staging/' + data.guid + '.jpg" data-toggle="lightbox" data-title="NEW Screenshot" data-parent=".wrapper-parent" data-gallery="gallery-43" class="thumbnail">';
                    newContent += '<img src="/play/img/staging/' + data.guid + '-thumb.jpg"></a></div>';
                    
                    $('.screenshotHolder:last').after(newContent);
                    
                    if ($('.screenShotHolder').length >= 6) {
                        $('#addNewShot').hide();
                    }
                    
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

function fundingMarkdown(data) {
   var variables = {};
   variables.funds = "$12.45";
   variables.priceHour = "$0.009";
   variables.priceDay = "$0.22";
   variables.fundsToTime = "9 days, 11 hours";
   
   var markedOutput = marked(data);
   
   _.forIn(variables, function(value, key) {
      markedOutput = markedOutput.replace('{' + key + '}', value);
   });
   
   $("#realmFundingDisplay").html( markedOutput );
}

function fetchFundingTemplate() {
   $.get( "/data/markdown/funding.markdown", function( data ) {
      __editorFunding.setValue(data);
      __existingState.markdown_funding = data;
      __currentState.markdown_funding = data;
      fundingMarkdown(data);
   });
}

function fetchDescriptionTemplate() {
   $.get( "/data/markdown/readme.markdown", function( data ) {
      __editorReadme.setValue(data);
      __existingState.markdown_readme = data;
      __currentState.markdown_readme = data;
      descriptionMarkdown(data);
   });
}

function descriptionMarkdown(data) {
   $("#realmReadmeDisplay").html( marked(data) );
}

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