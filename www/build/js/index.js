$(document).ready(function () {

    // VIEWS
    var templateFn = _.template($('#realms_template').html());

    var parameters = {};
    parameters.directive = "realms";

    $.post("api.php", parameters, function (data) {
        $("#existingRealmsTableBody").html(templateFn({ 'realms': JSON.parse( data ) }));
    });

    $("#buttonCreateProject").on('click', function (e) {
        e.preventDefault();
        
        $('#errorMessage').fadeOut();
        
        var buttonOriginalContent = $(this).html();
        var button = $("#buttonCreateProject");
        
        button.attr('disabled', 'disabled');
        button.html('<i class="fa fa-cog fa-spin"></i> Create');

        var payload = {};
        payload.title = $("#realmName").val();
        payload.description = $("#realmDescription").val();
        payload.import_url = "https://github.com/chasebgale/assembledrealms-isometric.git";

        var parameters = {};
        parameters.directive = "create";
        parameters.payload = JSON.stringify(payload);

        $.post("api.php", parameters, function ( apiResponse ) {
            var jqxhr = $.get( "http://debug-01.assembledrealms.com/api/project/" + apiResponse + "/create", function( gitResponse ) {
                if (gitResponse === "OK") {
                    window.location = "http://www.assembledrealms.com/build/editor.php?" + apiResponse;
                }
            })
            .fail(function(data) {
                button.removeAttr('disabled');
                button.html('Create');
                
                // TODO: Friendly error display, real error should be logged in datastore
                $('#errorMessage').text(data.status + ': ' + data.responseText);
                $('#errorMessage').fadeIn();
            });
        });

    });

});

function makeRandomness() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 8; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}