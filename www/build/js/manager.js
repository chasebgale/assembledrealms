var __editorReadme;
var __editorFunding;
var __renderer;

$(document).ready(function () {
   
   __renderer = new marked.Renderer();
   
   __renderer.table = function(header, body) {
      return '<table class="table table-striped"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
   }
   
   marked.setOptions({
      sanitize: true,
      renderer: __renderer
   });
   
   __editorReadme = ace.edit("realmReadmeSource");
   __editorReadme.getSession().setMode("ace/mode/markdown");
   
   __editorFunding = ace.edit("realmFundingSource");
   __editorFunding.getSession().setMode("ace/mode/markdown");
   
   $.ajax({
            url: 'http://www.assembledrealms.com/build/manager.php',
            type: 'post',
            dataType: 'json',
            data: {directive: 'fetch', realm_id: __realmID}
   })
   .done(function (data) {
      console.log(data);
      
      if (data.funding == null) {
         fetchFundingTemplate();
      } else {
      
      }
      
      if (data.description == null) {
         fetchDescriptionTemplate();
      } else {
      
      }
      
      if (data.realm_id) {
         // If a realm_id came down, we need to update a record in the DB,
         // not create a new one...
         __markdownCreateNewDB = false;
      }

   })
   .fail(function(data) {
       console.log(data);
   });
   
   __editorFunding.getSession().on("change", function (e) {
      
      fundingMarkdown( __editorFunding.getValue() );
      
   });
   
   __editorReadme.getSession().on("change", function (e) {
      
      descriptionMarkdown( __editorReadme.getValue() );
      
   });
   
   $('.monitored').on('change', function (e) {
      var prop = $(this).attr('data-id');
      __currentState[prop] = $(this).val();
      checkForChanges();
   });
   
   $("#button-destroy-realm").on("click", function (e) {
    
        e.preventDefault();

        var token = getGitlabSession();
        var id = $(this).attr('data-id');

        $.ajax({
            url: 'http://debug-01.assembledrealms.com/api/project/' + id,
            type: 'DELETE',
            dataType: 'json',
            success: function (data) {
                
                var payload = {};
                payload.gitlab_id = gitlab_id;

                var parameters = {};
                parameters.directive = "destroy";
                parameters.payload = JSON.stringify(payload);

                $.post("api.php", parameters, function (data) {
                    if (data == "OK") {
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
                   markdown_create: __markdownCreateNewDB}
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
   
   $('#chkFunding').on("change", function (e) {
      
      var container = $('#realmFundingSource').closest('.panel-body');
      
      if ($(this).is(':checked') == false) {
         __editorFunding.setReadOnly(true);
         container.css('user-select', 'none');
         container.css('opacity', '0.3');
      } else {
         __editorFunding.setReadOnly(false);
         container.css('user-select', 'text');
         container.css('opacity', '1.0');
      }
   });
   
   if ($('#chkFunding').is(':checked') == false) {
      __editorFunding.setReadOnly(true);
      $('#realmFundingSource').closest('.panel-body').css('user-select', 'none');
   }
   
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