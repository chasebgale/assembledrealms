
$(document).ready(function () {

    // VIEWS
    var templateFn = _.template($('#realms_template').html());

    // For now we fake data, in future this is in the result of an AJAX request:
    var responseJSON = [
        {
            'name': 'Ultima Re-Imagined',
            'status': 0, 
            'playersOnline': '0',
            'playersMax': '48',
            'funds': '$8.45',
            'likes': '22',
            'buildDate': '03/11/2014 01:22PM ET' 
        },
        {
            'name': 'Zombie Terrorizes Humans',
            'status': 1,
            'playersOnline': '22',
            'playersMax': '24',
            'funds': '$17.22',
            'likes': '08',
            'buildDate': '02/05/2014 09:49PM ET'
        }
    ];

    $("#existingRealmsList").html(templateFn({ 'realms': responseJSON }));

    $("#createRealm").on("click", function () {

        $.post("builder.php", { name: $("#realmName").val(), type: "0" })
        .done(function (data) {
            alert("Data Loaded: " + data);
        })
        .fail(function (error) {
            alert("Error: " + error);
        });

    });

});