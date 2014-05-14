var __editor;
var __fileId;
var __projectId;
var __trackedFiles = [];
var __trackedStorageId;

$(document).ready(function () {
    
    __projectId = window.location.search.slice(1);

    __trackedStorageId = __projectId + "-tracking";

    if (localStorage[__trackedStorageId]) {
        __trackedFiles = JSON.parse(localStorage[__trackedStorageId]);
    }

    // Templates
    var templateFnInitial = _.template($('#files_template').html());
    var templateFnDynamic = _.template($('#files_dynamic_template').html());

    $("#explorer").html(templateFnInitial({ 'model': loadRealmRoot(), 'templateFnInitial': templateFnInitial }));

    $("#explorer").treeview({
        animated: "fast"
    });

    // Fetch folder contents:
    $("#explorer").on("click", ".no-data", function () {
        
        var root = $(this);
        var path = root.attr('data-path');
        var name = root.text().trim();
        var token = getGitlabSession();

        var req = __projectId + '/repository/tree?id=' + __projectId +
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

        __editor.off("change", editor_onChange);

        $("#explorer .file").removeClass('activefile');
        root.addClass('activefile');

        var id      = root.attr('data-id');
        var path    = root.attr('data-path');
        var name = root.text().trim();

        var storageId = __projectId + "-" + id;

        if (localStorage[storageId]) {

            loadEditor(name, localStorage[storageId]);
            __fileId = id;

        } else {

            var token = getGitlabSession();
            var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)

            var req = __projectId + '/repository/files?id=' + __projectId +
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

                    localStorage[storageId] = plainText;
                    localStorage[storageId + '-commit-md5'] = md5(plainText);

                    __trackedFiles.push(id);
                    localStorage[__trackedStorageId] = JSON.stringify(__trackedFiles);

                    loadEditor(data.file_name, plainText);
                    __fileId = id;

                }
            });

        }


    });

    __editor = ace.edit("editor");

    var readmeDOM = $('#explorer [data-path="README.md"');
    readmeDOM.addClass('activefile');

    loadRealmFile(readmeDOM.attr('data-id'), 'README.md', 'README.md');

    $('#mapTabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $('#tab-nav-markdown a:first').tab('show');

    $('#tab-nav-markdown a:first').on('shown.bs.tab', function (e) {
        //e.target // activated tab
        //e.relatedTarget // previous tab
        $("#markdown").html(marked(__editor.getValue()));
    });

    //var editor = ace.edit("editor");
    //editor.getSession().setMode("ace/mode/javascript");

    $("#mapToolbar [data-toggle='tooltip']").tooltip();

    /*
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
    */

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

    $("#loading").fadeOut(500, function () {
        $("#mapEdit").fadeIn();
    });

});

function loadRealmRoot() {

    var token = getGitlabSession();

    var req = __projectId + '/repository/tree?id=' + __projectId +
                                          '&private_token=' + token;

    var resp = $.ajax({
        url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
        type: 'get',
        dataType: 'json',
        async: false
    }).responseText;

    var json = JSON.parse(resp);

    _.each(json, function (value) {

        value.path = value.name;

        if (value.type == "tree") {
            value.hasChildren = true;
            value.path += '/';
        }
    });

    console.log(json);

    return json;
}

function loadRealmFile(id, path, name) {

    if (localStorage[id]) {

        loadEditor(name, localStorage[id]);
        __fileId = id;

    } else {

        var token = getGitlabSession();
        var ref = "master"; // For now hit master, in the future, pull from working branch (master is the current production copy of the realm)

        var req = __projectId + '/repository/files?id=' + __projectId +
                                              '&file_path=' + encodeURIComponent(path) +
                                              '&ref=' + ref +
                                              '&private_token=' + token;

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/v3/projects/' + req,
            type: 'get',
            dataType: 'json',
            success: function (data) {

                var plainText = "";

                if (data.encoding == "base64") {
                    plainText = decode_utf8(atob(data.content));
                }

                localStorage[id] = plainText;
                localStorage[id + '-commit-md5'] = md5(plainText);

                loadEditor(data.file_name, plainText);
                __fileId = id;

            }
        });

    }
}

function loadEditor(filename, content) {

    __editor.off("change", editor_onChange);
    var ext = filename.split('.').pop();

    $("#mapTabs li").css('display', 'none');
    $("#tab-nav-editor").css('display', 'block');

    switch (ext) {
        case "js":
            __editor.getSession().setMode("ace/mode/javascript");
            break;
        case "json":
            __editor.getSession().setMode("ace/mode/json");
            $("#tab-nav-map").css('display', 'block');
            break;
        case "html":
            __editor.getSession().setMode("ace/mode/html");
            break;
        case "md":
            __editor.getSession().setMode("ace/mode/plain_text");
            $("#tab-nav-markdown").css('display', 'block');
            $("#markdown").html(marked(content));
            break;
        default:
            __editor.getSession().setMode("ace/mode/plain_text");
            break;
    }

    $('#tab-nav-editor a:first').tab('show');

    __editor.setValue(content);
    __editor.clearSelection();
    __editor.moveCursorTo(0, 0);

    __editor.on("change", editor_onChange);
}

function editor_onChange(e) {
    localStorage[__fileId] = __editor.getValue();
}

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