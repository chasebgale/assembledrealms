$(document).ready(function () {
   
   $("#button-destroy-realm").on("click", function (e) {
    
        e.preventDefault();

        var token = getGitlabSession();
        var gitlab_id = $(this).attr('data-id');

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + gitlab_id,
            type: 'DELETE',
            headers: {
                "PRIVATE-TOKEN": token
            },
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