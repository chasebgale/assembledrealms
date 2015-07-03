<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
    die();
}

$realmID = -1;
$sourceURL = '';

if ($method == 'POST') {
    $directive = $_POST['directive'];
    $realmID  = $_POST['realm_id'];
    
    if ($directive == 'debug') {
            
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_URL => $realm['address'] . '/auth/' . $loggedInUser->user_id . '/' . session_id()
        ));

        $url_from_auth = curl_exec($curl);
        
        echo $url_from_auth;
        die();
    }
    
    return;
}
if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realmID = $_SERVER['QUERY_STRING'];
    $realm = $loggedInUser->fetchRealm($realmID);
	$sourceURL = $realm['source'];

	if (($realmID < 0) || ($sourceURL == '')) {
		echo "realmID: " . $realmID;
		echo "sourceURL: " . $sourceURL;
		die();
	}
}
    
?>
<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Assembled Realms IDE</title>

    <link rel='shortcut icon' href='/img/favicon.png')'>

    <link rel='stylesheet' href="/css/jquery.treeview.css" />
    <link rel='stylesheet' href='/css/root.css' />
    <link rel='stylesheet' href='/build/css/style.css' />

    <link rel='stylesheet' href='//netdna.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.css' />
    <link rel='stylesheet' href='//netdna.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css'>
    <link rel='stylesheet' href='/css/bootstrap-theme.css' />

    <script src='/models/funcs.js' type='text/javascript'></script>
    <script src='/js/lodash.min.js'></script>
    
    <style>
        html, body {
            height:100%;
        }

        #commandBar {
            height: 26px;
            background-color: #777;
        }
        
        #commandBarButtons {
            float: left;
            margin-top: 2px;
            margin-left: 6px;
        }
        
        #commandBarButtons button {
            background: #777;
            color: #e0e0e0;
            border-color: #666;
            text-shadow: none;
        }
        
        #commandBarButtons button:hover {
            background: #555;
        }
        
        #commandBarButtons .spacer {
            display: inline-block;
            vertical-align: middle;
            background: #666;
            width: 2px;
            border-left: #888 1px solid;
            height: 18px;
            margin-left: 6px;
            margin-right: 6px;
        }
    </style>

</head>

<body style="padding: 0;">

<div id='wrapper'>
    
    <div style="width: 500px; display: none; margin: 0 auto; margin-top: 100px;" class="alert alert-danger" id="errorMessage"></div>

    <div id="loading" style="width: 500px; margin: 0 auto; margin-top: 100px;">
        <div class="progress progress-striped active">
            <div class="progress-bar"  role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
        <p style="text-align: center;">Your realm is loading, please wait...</p>
    </div>
    
    <section id="workspace" style="display: none;">
    
        <div id="commandBar">
            <div id="commandBarButtons">
                <button type="button" id="btnNewFile" class="btn btn-default btn-xs"><i class="fa fa-file-text-o fa-fw"></i> New File</button>
                <button type="button" id="btnNewFolder" class="btn btn-default btn-xs"><i class="fa fa-folder-o fa-fw"></i> New Folder</button>
                <button type="button" id="btnUploadResource" class="btn btn-default btn-xs"><i class="fa fa-upload fa-fw"></i> Upload File</button>
                <div class="spacer"></div>
                <button type="button" id="btnDebug" class="btn btn-default btn-xs"><i class="fa fa-caret-square-o-right fa-fw"></i> Debug</button>
                <button type="button" id="btnCommit" class="btn btn-default btn-xs"><i class="fa fa-cloud-upload fa-fw"></i> Commit</button>
				<div class="spacer"></div>
				<div class="btn-group">
					<button type="button" id="btnView" class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
					<i class="fa fa-eye"></i> Rendered Markdown <span class="caret"></span>
					</button>
					<ul id="ulView" class="dropdown-menu">
						<li id="tab-nav-editor" class="display: none;"><a href="#editor">Raw Text</a></li>
						<li id="tab-nav-image" style="display: none;"><a href="#image">Raw Image</a></li>
						<li id="tab-nav-map" style="display: none;"><a href="#map">Map Editor</a></li>
						<li id="tab-nav-markdown" style="display: none;"><a href="#markdown">Rendered Markdown</a></li>
						<li id="tab-nav-file" style="display: none;"><a href="#file">File Tools</a></li>
					</ul>
				</div>
            </div>
            <a href="http://www.assembledrealms.com" style="float: right;"><img src="/build/img/logo.png"></img></a>
        </div>
    
        <div id="tree">
            <ul id="explorer" class="filetree treeview">
            </ul>
        </div>
		
        <div id="tabs">
            <div class="tab-pane active" id="editor"></div>
			<div class="tab-pane" id="image"></div>
			<div class="tab-pane" id="map">
				<nav class="navbar navbar-light" role="navigation">
					<div class="container-fluid">
						<div class="collapse navbar-collapse">
							<ul class="nav navbar-nav" id="mapToolbar">
							</ul>
						</div>
					</div>
				</nav>
				<div id="mapContainer">
				
				</div>
				<div id="mapDetails">
				
				</div>
			</div>
			<div class="tab-pane" id="markdown"></div>
			<div class="tab-pane" id="file"></div>
        </div>

    </section>

    <!--
    <div class="modal fade tiles-modal-lg" id="modalTerrain" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header clearfix">
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title pull-left" style="width: 230px;">Select a tile from category: </h4>
		    <select id="categorySelection" class="form-control pull-left" style="display: inline-block; width: 125px; margin-top: -4px;">
			<option data-id="terrain">Terrain</option>
			<option data-id="objects">Objects</option>
		    </select>
                </div>
                <div class="modal-body">
		    <div class="tileContainer" id="terrain">
		    </div>
		    <div class="tileContainer" id="objects" style="display: none;">
		    </div>
                </div>
            </div>
        </div>
    </div>
    -->
    
    <div class="modal fade" id="modalNewFile" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Create New File...</h4>
                </div>
                <div class="modal-body">
		    <div class="form-group">
			<label for="newfileName">Filename:</label>
			<input type="text" class="form-control" id="newfileName" placeholder="Filename, i.e. 'types.js'">
		    </div>
		    <div class="form-group">
			<label for="newfileLocation">Location:</label>
			<div class="list-group" id="newfileLocation">
			    <a href="#" class="list-group-item active" data-path="">
				<i class="fa fa-folder-o"></i> /
			    </a>
			</div>
		    </div>
                </div>
		<div class="modal-footer">
		    <div id="newFileCreateAlert" class="alert alert-danger" style="display: none;"></div>
		    <button id="btnNewFileCreate" class="btn btn-default">Create</button>
		</div>
            </div>
        </div>
    </div>
    
    <div class="modal fade" id="modalCommit" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Committing Changes to GIT</h4>
                </div>
				<div class="modal-body">
					<ul id="commitProgressList"></ul>
					<textarea id="commitMessage" rows="6" cols="120" placeholder="(Optional) Add a short message describing the changes you have made. Useful if you need to look up this work later!"></textarea>
                </div>
				<div class="modal-footer">
					<span id="commitProgressMessage"></span>
					<button id="commitStart" type="button" class="btn btn-default">Commit</button>
				</div>
            </div>
        </div>
    </div>
    
    <div class="modal fade" id="modalDebug" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Publishing to Debug Server...</h4>
                </div>
                <div class="modal-body">
					<div id="debugProgressbar" class="progress progress-striped active">
						<div class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;"></div>
					</div>
					<ul id="debugProgressList"></ul>
				</div>
				<div class="modal-footer">
					<div id="debugAlert" class="alert alert-danger" style="display: none;"></div>
					<button id="debugClose" type="button" data-dismiss="modal" class="btn btn-default" disabled="disabled">Close</button>
				</div>
			</div>			
		</div>
	</div>
    
    <div class="modal fade" id="modalUploadResource" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
		    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    <h4 class="modal-title">Add Media</h4>
                </div>
                <div class="modal-body">
		    <div id="uploadAlert" class="alert" role="alert" style="display: none;">
		    </div>
		    <form id="uploadForm" method="post" action="upload" enctype="multipart/form-data">
			<input type="file" id="inputFile">
		    </form>
                </div>
		<div class="modal-footer">
		    <p class="text-justify">
			<strong>Please support the hard work of others.</strong>
			By clicking the "Upload!" button below you are certifying that the media you are
			adding is either your own work, the work of another that is under a license which
			allows distribution or belongs to the public domain. 
		    </p>
		    <div class="clear-fix">
			<div id="uploadProgressbar" class="progress progress-striped"
			     style="width: 85%; float: left; margin-top: 6px;">
			    <div id="uploadProgressbarFill" class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>
			</div>
			<button id="uploadStart" type="button" class="btn btn-default">Upload!</button>
		    </div>
		</div>
            </div>
        </div>
    </div>
    
    <script id="root_files_template" type="text/template">
        <% _.each( _.filter(model, function (obj) {return (obj.path.indexOf('/') === - 1) }), function(child) { %>
            <% if (child.hasChildren) { %>
                <li class='hasChildren closed' data-path='<%= child.path %>'>
                    <span class='folder'><%= child.name %></span>
                    <ul>
                        <%= templateChildFnFiles({'model': _.filter( model, function (obj) {
								return (child.path === obj.path.substr(0, obj.path.lastIndexOf('/')));
							}), 'templateChildFnFiles': templateChildFnFiles, 'full': model}) %>
                    </ul>
                </li>
            <% } else { %>
                <li><span class="file" data-id="<%= child.sha %>" data-path="<%= child.path %>"><%= child.name %></span></li>
            <% } %>
        <% }); %>
    </script>
    
    <script id="child_files_template" type="text/template">
        <% _.each(model, function(child) { %>
            <% if (child.hasChildren) { %>
                <li class='hasChildren closed' data-path='<%= child.path %>'>
                    <span class='folder'><%= child.name %></span>
                    <ul>
			<%= templateChildFnFiles({
			    'model': _.filter( full, function (obj) {
				return (child.path === obj.path.substr(0, obj.path.lastIndexOf('/')));
			    }),
			    'templateChildFnFiles': templateChildFnFiles,
			    'full': full
			}) %>
                    </ul>
                </li>
            <% } else { %>
                <li><span class="file" data-id="<%= child.sha %>" data-path="<%= child.path %>"><%= child.name %></span></li>
            <% } %>
        <% }); %>
    </script>
    
    
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
                <li><span class="file" data-id="<%= child.id %>" data-path="<%= child.path %>"><%= child.name %></span></li>
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

    <script id="resource_template" type="text/template">
        <h3><%- model.meta.image %></h3>
        <div class="container-fluid">
            <div class="row">
                <% if (model.frames) { %>
                    <% _.each(model.frames, function(frame, key) { %>
                        <div class="col-md-1 <%- model.meta.category %>"
			     data-id="<%- key %>"
			     data-offset-x="<%- frame.frame.x %>"
			     data-offset-y="<%- frame.frame.y %>"
			     style="background-image: url(<%- source %>);
				    background-position-x: <%- (frame.frame.x * -1) + 'px' %>;
				    background-position-y: <%- (frame.frame.y * -1) + 'px' %>;
				    width: <%- frame.frame.w + 'px' %>;
				    height: <%- frame.frame.h + 'px' %>; "></div>
                    <% }); %>
                <% } %>
            </div>
        </div>
    </script>
    
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
    <script src="//netdna.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>
    
    <script type="text/javascript">
        $(document).ready(function () {
            initialize(<?php echo $realmID; ?>, "<?php echo $sourceURL; ?>");
        });
    </script>

    <script src="/build/js/utilities.js"></script>
    <script src="/build/js/stats.min.js"></script>
    <script src="<?php echo 'http://' . $sourceURL . '/api/project/' . $realmID . '/file/raw/client/maps/editor.js'; ?>"></script>
    <script src="/build/js/ide.js"></script>
    <script src="/build/js/jquery.treeview.js"></script>
    <script src="/build/js/md5.js"></script>
    <script src="/build/js/marked.js"></script>
    <script src="/build/js/lz4.min.js"></script>
    
    <script src="/js/pixi.js"></script>
	<script src="/js/bigscreen.min.js"></script>
    <script src="/js/lodash.min.js"></script>
    <script src="/js/ace/src-min-noconflict/ace.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>