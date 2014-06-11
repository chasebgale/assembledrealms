$(document).ready(function () {

    // VIEWS
    var templateFn = _.template($('#realms_template').html());

    // For now we fake data, in future this is in the result of an AJAX request:
    /*
    var responseJSON = [
        {
            'name': 'Ultima Re-Imagined',
            'id': 8,
            'status': 0, 
            'playersOnline': '0',
            'playersMax': '48',
            'funds': '$8.45',
            'likes': '22',
            'buildDate': '03/11/2014 01:22PM ET' 
        },
        {
            'name': 'Zombie Terrorizes Humans',
            'id': 8,
            'status': 1,
            'playersOnline': '22',
            'playersMax': '24',
            'funds': '$17.22',
            'likes': '08',
            'buildDate': '02/05/2014 09:49PM ET'
        }
    ];
    */

    var parameters = {};
    parameters.directive = "realms";

    $.post("api.php", parameters, function (data) {
        $("#existingRealms").html(templateFn({ 'realms': JSON.parse( data ) }));
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
            var jqxhr = $.get( "http://debug-01.assembledrealms.com/api/project/create/" + apiResponse, function( gitResponse ) {
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