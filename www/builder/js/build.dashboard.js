
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

    $("#existingRealms").html(templateFn({ 'realms': responseJSON }));

    $("#buttonCreateProject").on('click', function (e) {
        e.preventDefault();

        $.post("/gitlab.php", function (data) {

            data = JSON.parse(data);

            console.log("Got auth, user_id: " + data.user_id + ", auth: " + data.auth);

            var parameters = {};
            parameters.login = data.user_id;
            parameters.password = data.auth;

            $.post("http://source-01.assembledrealms.com/api/v3/session", parameters, function (data) {

                console.log("Got session, private_token: " + data.private_token);

                var parameters = {};
                parameters.name = $("#realmName").val();
                parameters.import_url = "https://github.com/chasebgale/assembledrealms-isometric.git";


                $.ajax({
                    url: 'http://source-01.assembledrealms.com/api/v3/projects',
                    type: 'post',
                    data: parameters,
                    headers: {
                        "PRIVATE-TOKEN": data.private_token
                    },
                    dataType: 'json',
                    success: function (data) {
                        console.log("Got project, url: " + data.web_url);

                        // TODO: Insert new record into db: core/realms
                    }
                });

                /*
                $.post("http://source-01.assembledrealms.com/api/v3/projects", parameters, function (data) {
                    console.log("Got project, url: " + data.web_url);
                });
                */
            });

        });

    });

});