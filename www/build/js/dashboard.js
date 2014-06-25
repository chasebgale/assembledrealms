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
        
        var buttonOriginalContent = $(this).html();
        
        $(this).attr('disabled', 'disabled');
        $(this).html('<i class="fa fa-cog fa-spin"></i> Create');

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
            .fail(function() {
                // TODO: ALERT USER OF FAILURE
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