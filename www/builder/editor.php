<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");
    
?>

    <div id="loading" style="width: 500px; margin: 0 auto; margin-top: 100px;">
        <div class="progress progress-striped active">
            <div class="progress-bar"  role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
        <p style="text-align: center;">Your realm is loading, please wait...</p>
    </div>
    
    <section id="mapEdit" style="display: none;">
        <div id="leftBar">
            <button id="btnCommit" type="button" class="btn btn-default">
		<span class="glyphicon glyphicon-open"></span> Commit
	    </button>
	    <button type="button" class="btn btn-default">
		<span class="glyphicon glyphicon-play"></span> Debug
	    </button>
            <div id="tree" class="panel panel-default">
                <ul id="explorer" class="filetree treeview">
                </ul>
            </div>
        </div>
        <div id="tabs">
            <ul class="nav nav-tabs" id="mapTabs">
                <li id="tab-nav-editor" class="active"><a href="#editor" data-toggle="tab">Raw Text</a></li>
                <li id="tab-nav-map" style="display: none;"><a href="#map" data-toggle="tab">Map Editor</a></li>
                <li id="tab-nav-markdown" style="display: none;"><a href="#markdown" data-toggle="tab">Rendered Markdown</a></li>
            </ul>

            <div class="tab-content">

                <div class="tab-pane active" id="editor"></div>

                <div class="tab-pane" id="map">
                    <nav class="navbar navbar-light" role="navigation">
                        <div class="container-fluid">
                            <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
                                <ul class="nav navbar-nav" id="mapToolbar">
                                    <!--<button id="tileButton" type="button" class="btn btn-default navbar-btn" data-toggle="modal" data-target=".tiles-modal-lg"></button>-->
                                    <button type="button" class="btn btn-default navbar-btn" id="moveButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Navigate the map"><i class="fa fa-arrows"></i></button>
                                    <button type="button" class="btn btn-default navbar-btn" id="eraserButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Erase tiles"><i class="fa fa-eraser"></i></button>
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-default navbar-btn" id="tileButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Place terrain"></button>
                                        <button type="button" class="btn btn-default dropdown-toggle navbar-btn" data-toggle="modal" data-target=".tiles-modal-lg">
                                            <span class="caret"></span>
                                            <span class="sr-only">Toggle Dropdown</span>
                                        </button>
                                    </div>
										
										
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-default navbar-btn" id="objectButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Place objects over terrain"></button>
                                        <button type="button" class="btn btn-default dropdown-toggle navbar-btn" data-toggle="modal" data-target=".objects-modal-lg">
                                            <span class="caret"></span>
                                            <span class="sr-only">Toggle Dropdown</span>
                                        </button>
                                    </div>
                                </ul>
                            </div>
                        </div>
                    </nav>
                </div>

                <div class="tab-pane" id="markdown"></div>
            </div>
        </div>

    </section>


    <div class="modal fade tiles-modal-lg" id="modalTiles" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Select a tile...</h4>
                </div>
                <div class="modal-body" id="tiles">
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade objects-modal-lg" id="modalObjects" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Select an object...</h4>
                </div>
                <div class="modal-body" id="objects">
                </div>
            </div>
        </div>
    </div>
    
    <div class="modal fade objects-modal-lg" id="modalCommit" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h4 class="modal-title">Commit Progress - Branch: "working"</h4>
                </div>
                <div class="modal-body">
			<div id="commitProgressbar" class="progress progress-striped">
				<div class="progress-bar"  role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;">
				<span class="sr-only">Loading...</span>
			    </div>
			</div>
			<p id="commitProgressMessage" style="text-align: center;"></p>
			<ul id="commitProgressList"></ul>
                </div>
		<div class="modal-footer">
			<button id="closeCommit" type="button" disabled="disabled" class="btn btn-default" data-dismiss="modal">Close</button>
		</div>
            </div>
        </div>
    </div>
    
    <script id="files_template" type="text/template">
        <% _.each(model, function(child) { %>
            <% if (child.hasChildren) { %>
                <li class='hasChildren closed no-data' data-path='<%= child.path %>'>
                    <span class='folder'><%= child.name %></span>
                    <ul>
                        <li><span class="placeholder">&nbsp;</span></li>
                    </ul>
                </li>
            <% } else { %>
                <li><span class="file" data-id="<%- child.id %>" data-path="<%= child.path %>"><%- child.name %></span></li>
            <% } %>
        <% }); %>
    </script>
    
    <script id="files_dynamic_template" type="text/template">
        <% if (model.children) { %>
		<div class="hitarea collapsable-hitarea open-hitarea"></div>
        <span class='folder'><%= model.name %></span>
        <ul>
            <% _.each(model.children, function(child) { %>
            <%= templateFnDynamic({'model': child, 'templateFnDynamic': templateFnDynamic}) %>
            <% }); %>
        </ul>
        <% } else if (model.hasChildren) { %>
		<li class='hasChildren closed no-data' data-path='<%= model.path %>'>
			<div class="hitarea hasChildren-hitarea closed-hitarea"></div>
            <span class='folder'><%= model.name %></span>
            <ul>
                <li><span class="placeholder">&nbsp;</span></li>
            </ul>
        </li>
        <% } else { %>
        <li><span class="file" data-id="<%- model.id %>" data-path='<%= model.path %>'><%- model.name %></span></li>
        <% } %>
    </script>

    <script id="tiles_template" type="text/template">
        <h2><%- model.meta.image %></h2>
        <div class="container-fluid">
            <div class="row">
                <% if (model.frames) { %>
                    <% _.each(model.frames, function(frame, key) { %>
                        <div class="col-md-1 tileBox" data-id="<%- key %>" data-offset="<%- frame.frame.x %>" style="background-image: url(/www/js/editor/<%- model.meta.image %>); background-position-x: <%- (frame.frame.x * -1) + 'px' %>; width: <%- frame.frame.w + 'px' %>; height: <%- frame.frame.h + 'px' %>; "></div>
                    <% }); %>
                <% } %>
            </div>
        </div>
    </script>

    <script id="objects_template" type="text/template">
        <h2><%- model.meta.image %></h2>
        <div class="container-fluid">
            <div class="row">
                <% if (model.frames) { %>
                <% _.each(model.frames, function(frame, key) { %>
                <div class="col-md-1 objectBox" data-id="<%- key %>" data-offset="<%- frame.frame.x %>" style="background-image: url(/www/js/editor/<%- model.meta.image %>); background-position-x: <%- (frame.frame.x * -1) + 'px' %>; width: <%- frame.frame.w + 'px' %>; height: <%- frame.frame.h + 'px' %>; "></div>
                <% }); %>
                <% } %>
            </div>
        </div>
    </script>
    
    <script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
    <script src='//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js'></script>

    <script src="js/utilities.js"></script>
    <script src="js/stats.min.js"></script>
    <script src="js/map.editor.js"></script>
    <script src="js/editor.js"></script>
    <script src="js/jquery.treeview.js"></script>
    <script src="js/md5.js"></script>
    <script src="js/marked.js"></script>
    
    <script src="/../js/pixi.dev.js"></script>
    <script src="/../js/lodash.min.js"></script>
    <script src="/../js/ace/src-min-noconflict/ace.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>