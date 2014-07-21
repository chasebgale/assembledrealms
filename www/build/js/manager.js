$(document).ready(function () {
   
   marked.setOptions({
      sanitize: true
   });
   
   $("#realmFundingSource").on("keyup", function (e) {
      
      var variables = {};
      variables.funds = "$12.45";
      variables.priceHour = "$0.009";
      variables.priceDay = "$0.22";
      variables.fundsToTime = "9 days, 11 hours";
      
      var markedOutput = marked($(this).val());
      
      _.forIn(variables, function(value, key) {
         markedOutput = markedOutput.replace('{' + key + '}', value);
      });
      
      $("#realmFundingDisplay").html( markedOutput );
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
    
});