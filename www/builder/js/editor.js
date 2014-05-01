var __editor;

$(document).ready(function () {

    // Templates
    var templateFnInitial = _.template($('#files_template').html());
    var templateFnDynamic = _.template($('#files_dynamic_template').html());

    $("#explorer").html(templateFnInitial({ 'model': responseJSON, 'templateFnInitial': templateFnInitial }));

    $("#explorer").treeview({
        animated: "fast"
    });

    // Fetch folder contents:
    $("#explorer").on("click", ".no-data", function () {
        
        console.log(this);
        var root = $(this);
        var path = root.attr('data-path');
        var name = root.text().trim();
        var token = getGitlabSession();
        var gitlab_id = window.location.search.slice(1);

        var req = gitlab_id + '/repository/tree?id=' + gitlab_id +
                                              '&path=' + encodeURIComponent(path) +
                                              '&private_token=' + token;

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                console.log("Got files: " + data);
                var arrayLength = data.length;
                var formatted = { 'name': name, 'children': [] };
                
                for (var i = 0; i < arrayLength; i++) {
                    formatted.children[i] = { 'name': data[i].name, 'path': path + data[i].name, 'id': data[i].id };

                    if (data[i].type == "tree") {
                        formatted.children[i].hasChildren = true;
                        formatted.children[i].path += '/';
                    }
                }

                var branch = root.html(templateFnDynamic({ 'model': formatted, 'templateFnDynamic': templateFnDynamic })).parent();
                root.attr('class', 'collapsable open');
                $("#explorer").treeview({
                    add: branch
                });

            }
        });
    });

    // Fetch file:
    $("#explorer").on("click", ".file", function () {

        var root = $(this);

        $("#explorer .file").removeClass('activefile');
        root.addClass('activefile');

        var id      = root.attr('data-id');
        var path    = root.attr('data-path');
        var name    = root.text().trim();
        var token   = getGitlabSession();
        var ref     = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)

        var gitlab_id = window.location.search.slice(1);

        var req = gitlab_id + '/repository/files?id=' + gitlab_id +
                                              '&file_path=' + encodeURIComponent(path) +
                                              '&ref=' + ref + 
                                              '&private_token=' + token;

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                console.log(data);

                var plainText = "";

                if (data.encoding == "base64") {
                    plainText = decode_utf8(atob(data.content));
                }

                var ext = data.file_name.split('.').pop();

                switch (ext) {
                    case "js":
                        __editor.getSession().setMode("ace/mode/javascript");
                        break;
                    case "json":
                        __editor.getSession().setMode("ace/mode/json");
                        break;
                    case "html":
                        __editor.getSession().setMode("ace/mode/html");
                        break;
                    default:
                        __editor.getSession().setMode("ace/mode/plain_text");
                        break;
                }

                __editor.setValue(plainText);
                __editor.clearSelection();
                __editor.moveCursorTo(0, 0);
            }
        });

    });

    $('#mapTabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $('#mapTabs a:first').tab('show');

    //var editor = ace.edit("editor");
    //editor.getSession().setMode("ace/mode/javascript");

    $("#mapToolbar [data-toggle='tooltip']").tooltip();

    $.ajax({
        type: "GET",
        url: "map.json",
        dataType: "text",
        contentType: "text/plain; charset=utf-8",
        success: function (data, textStatus) {
            $("#editor").text(data);
            __editor = ace.edit("editor");
            Map.onTilesLoaded = function (json) {
                var template = $('#tiles_template').html();
                $("#tiles").append(_.template(template, { model: json }));
            };
            Map.onObjectsLoaded = function (json) {
                var template = $('#objects_template').html();
                $("#objects").append(_.template(template, { model: json }));
            };
            Map.init("map", JSON.parse(data));
            //Map.create(10, 10);
            requestAnimationFrame(animate);
        },
        error: function (data) {
            alert("error");
        }
    });

    $("#tiles").on("click", ".tileBox", function () {
        var tileKey = $(this).attr('data-id');
        Map.setBrush(Map.terrain, tileKey);

        var offset = parseInt($(this).attr('data-offset'));
        offset = offset / -2;

        $('#tileButton').css('background-image', $(this).css('background-image'));
        $('#tileButton').css('background-position-x', offset + 'px');
        setToolbarFocus($('#tileButton'));

        $('#modalTiles').modal('hide');
    });

    $("#objects").on("click", ".objectBox", function () {
        var objectKey = $(this).attr('data-id');
        Map.setBrush(Map.objects, objectKey);

        var offset = parseInt($(this).attr('data-offset'));
        offset = offset / -2;

        $('#objectButton').css('background-image', $(this).css('background-image'));
        $('#objectButton').css('background-position-x', offset + 'px');
        setToolbarFocus($('#objectButton'));

        $('#modalObjects').modal('hide');
    });

    $("#moveButton").on("click", function () {
        $("#mapMain").css('cursor', 'move');
    });

});

function setToolbarFocus(target) {
    $("#tileButton").removeClass('active');
    $("#objectButton").removeClass('active');

    target.button('toggle');
}

function animate() {

    requestAnimationFrame(animate);

    Map.render();

}

function encode_utf8(s) {
    return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
    return decodeURIComponent(escape(s));
}

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};