$(document).ready(function () {
   
   marked.setOptions({
      sanitize: true
   });
   
   $.ajax({
            url: 'http://www.assembledrealms.com/build/manager.php',
            type: 'post',
            dataType: 'json',
            data: {realm_id: realmID}
   })
   .done(function (data) {
      console.log(data);
      if (data.funding == null) {
         fetchFundingTemplate();
      } else {
      
      }

   })
   .fail(function(data) {
       console.log(data);
       $('#newFileCreateAlert').text('Network Error: ' + data.statusText);
       $('#newFileCreateAlert').fadeIn();
           // Update DOM to reflect we messed up:
           //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
   })
   
   $("#realmFundingSource").on("keyup", function (e) {
      
      fundingMarkdown($(this).val());
      
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
   
   $('#details-description').on("keyup", function (e) {
      enableSave();
   });
   
   $('#chkFunding').on("change", function (e) {
       
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
      $("#realmFundingSource").val( data );
      fundingMarkdown(data);
   });
}

function fetchDescriptionTemplate() {
   
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