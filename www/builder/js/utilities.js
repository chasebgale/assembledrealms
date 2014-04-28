var _token = null;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getGitlabSession() {

    // This cookie approach is awesome but gitlab trashes sessions too fast
    //var cached = readCookie("gitlab");

    if (_token) {
        return _token;
    } else {

        var parsed;

        var result = $.ajax({
            type: "POST",
            url: "/gitlab.php",
            async: false,
            cache: false
        });

        
        if (result.status == 200) {
            parsed = JSON.parse(result.responseText);
        }

        var parameters = {};
        parameters.login = parsed.user_id;
        parameters.password = parsed.auth;

        result = null;

        result = $.ajax({
            type: "POST",
            url: "http://source-01.assembledrealms.com/api/v3/session",
            data: parameters,
            async: false,
            cache: false
        });

        if (result.status == 201) {
            parsed = JSON.parse(result.responseText);
            //createCookie("gitlab", parsed.private_token, 1);
            _token = parsed.private_token;
            return _token;
        }

        return null;

        /*
        $.post("/gitlab.php", function (data) {

            data = JSON.parse(data);

            console.log("Got auth, user_id: " + data.user_id + ", auth: " + data.auth);

            

            console.log(result);

            .done(function (data) {

                console.log("Got session, private_token: " + data.private_token);

                createCookie("gitlab", data.private_token, 1);

                return data.private_token;
            })
            .fail(function (data) {
                console.log("FAIL: " + data);
            });
            
        });*/

    }
}

function createCookie(name, value, days) {
    var expires;

    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = escape(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return unescape(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}