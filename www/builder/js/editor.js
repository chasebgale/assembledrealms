$(document).ready(function () {

    // UI
    $('#mapTabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('#mapTabs a:first').tab('show');

    // VIEWS
    var templateFn = _.template($('#files_template').html());
    var templateFnDynamic = _.template($('#files_dynamic_template').html());

    $("#explorer").html(templateFn({ 'model': responseJSON, 'templateFn': templateFn }));

    $("#explorer").treeview({
        animated: "fast" /*,
        url: "api.php",
        ajax: {
            data: {
                "directive": "files",
                "gitlab_id": window.location.search.slice(1)
            },
            type: "post"
        }*/
    });

    $("#explorer .file").on("click", function () {
        console.log(this);
        $("#explorer .file").removeClass('activefile');
        $(this).addClass('activefile');
    });

    $("#explorer .hasChildren").on("click", function () {
        
        console.log(this);
        var path = encodeURIComponent($(this).attr('data-path'));
        var name = $(this).text().trim();
        var token = getGitlabSession();
        var gitlab_id = window.location.search.slice(1);

        var req = gitlab_id + '/repository/tree?id=' + gitlab_id +
                                              '&path=' + path + 
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
                    formatted.children[i] = { 'name': data[i].name, 'path': path + data[i].name + '/', 'id': data[i].id };

                    if (data[i].type == "tree") {
                        formatted.children[i].hasChildren = true;
                    }
                }

                var branch = $(this).html(templateFnDynamic({ 'model': formatted, 'templateFnDynamic': templateFnDynamic }));
                $("#explorer").treeview({
                    add: branch
                });

            }
        });
    });

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
            var editor = ace.edit("editor");
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