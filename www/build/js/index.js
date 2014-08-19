$(document).ready(function () {

    // VIEWS
    var templateFn = _.template($('#realms_template').html());

    var parameters = {};
    parameters.directive = "realms";

    $.post("api.php", parameters, function (data) {
        if (data !== "null") {
            $("#existingRealmsTableBody").html(templateFn({ 'realms': JSON.parse( data ) }));
            $("#existingRealms").fadeIn();
        }
    });

    $("#buttonCreateProject").on('click', function (e) {
        e.preventDefault();
        
        $('#errorMessage').fadeOut();
        
        var buttonOriginalContent = $(this).html();
        var button = $("#buttonCreateProject");
        
        button.attr('disabled', 'disabled');
        button.html('<i class="fa fa-cog fa-spin"></i> Create');

        /*
        var payload = {};
        payload.title = $("#realmName").val();
        payload.description = $("#realmDescription").val();
        payload.import_url = "https://github.com/chasebgale/assembledrealms-isometric.git";
*/
        var parameters = {};
        parameters.directive = "create";
        parameters.title = $("#realmName").val();
        parameters.description = $("#realmDescription").val();

        $.post("http://www.assembledrealms.com/build/index.php", parameters, function ( response ) {
            var jqxhr = $.get( "http://source-01.assembledrealms.com/api/project/" + response.project_id + "/create", function( sourceResponse ) {
                if (sourceResponse.message === "OK") {
                    window.location = "http://www.assembledrealms.com/build/editor.php?" + response.project_id;
                }
            }, 'json')
            .fail(function(data) {
                button.removeAttr('disabled');
                button.html('Create');
                
                // TODO: Friendly error display, real error should be logged in datastore
                $('#errorMessage').text(data.status + ': ' + data.responseText);
                $('#errorMessage').fadeIn();
            });
        }, 'json');

    });

});

function makeRandomness() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 8; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}