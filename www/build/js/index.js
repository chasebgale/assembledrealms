$(document).ready(function () {

    // TODO: maybe put this in the page footer so it's done for every page?
    $.ajaxSetup({
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    });

    // VIEWS
    var templateFn = _.template($('#realms_template').html());

    var parameters = {};
    parameters.directive = "list";

    $.post("index.php", parameters, function (data) {
        if (data !== "null") {
            $("#existingRealmsTableBody").html(templateFn({ 'realms': JSON.parse( data ) }));
        } else {
            $("#existingRealmsTable").hide();
            $("#emptyAlert").show();
        }
        
        $("#existingRealms").fadeIn();
    });

    $("#buttonCreateProject").on('click', function (e) {
        e.preventDefault();
        
        $('#errorMessage').fadeOut();
        
        var buttonOriginalContent = $(this).html();
        var button = $("#buttonCreateProject");
        
        button.attr('disabled', 'disabled');
        button.html('<i class="fa fa-cog fa-spin"></i> Create');

        var parameters = {};
        parameters.directive = "create";
        parameters.title = $("#realmName").val();
        parameters.description = $("#realmDescription").val();
        parameters.engine = 0; //$("#realm-engine-carousel .carousel-indicators .active").index();

        $.post("http://www.assembledrealms.com/build/index.php", parameters, function ( response ) {
            var jqxhr = $.get( "http://source-" + response.source + ".assembledrealms.com/api/project/" + response.project_id + "/create/" + parameters.engine, function( sourceResponse ) {
                button.removeAttr('disabled');
                button.html('<span class="glyphicon glyphicon-flash"></span> Create');
                if (sourceResponse.message === "OK") {
                  
                  if ($("#existingRealmsTable").is(':hidden')) {
                    $("#emptyAlert").fadeOut();
                    $("#existingRealmsTable").show();
                  }
                  
                  var realmTableRow  = '<tr class="newRealmTableRow">';
                  realmTableRow     += '<td></td>';
                  realmTableRow     += '<td>' + response.project_id + '</td>';
                  realmTableRow     += '<td>' + parameters.title + '</td>';
                  realmTableRow     += '<td>N/A</td>';
                  realmTableRow     += '<td>$0.00</td>';
                  realmTableRow     += '<td>0</td>';
                  realmTableRow     += '<td>';
                  realmTableRow     += '<a class="btn btn-default btn-xs" target="_blank" href="editor/' + response.project_id + '/"><i class="fa fa-code"></i> Edit Code</a>&nbsp;';
                  realmTableRow     += '<a class="btn btn-default btn-xs" href="manager/' + response.project_id + '"><span class="glyphicon glyphicon-eye-open"></span> Manage</a>';
                  realmTableRow     += '</td></tr>';
                  
                  $('#existingRealmsTableBody').prepend(realmTableRow);
                
                  // window.open("http://www.assembledrealms.com/build/editor/" + response.project_id + "/", "_blank");
                }
            }, 'json')
            .fail(function(data) {
                button.removeAttr('disabled');
                button.html('<span class="glyphicon glyphicon-flash"></span> Create');
                
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