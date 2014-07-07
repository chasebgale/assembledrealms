<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    
    $page = 0;
    $count = 20;
    $sort = "ORDER BY loves DESC";
    $where = [];
    $whereSQL = "";
    
    if (isset($_POST['page'])) {
        if (is_numeric($_POST['page'])) {
            $page = $_POST['page'];
        }
    }
    
    if (isset($_POST['count'])) {
        if (is_numeric($_POST['count'])) {
            $count = $_POST['count'];
        }
    }
    
    if (isset($_POST['screenshots'])) {
        if ($_POST['screenshots'] == 'true') {
            array_push($where, "screenshots > 0");
        }
    }
    
    if (isset($_POST['online'])) {
        if ($_POST['online'] == 'true') {
            array_push($where, "status > 0");
        }
    }
    
    $whereCount = count($where);
    
    if ($whereCount) {
        $whereSQL = implode(" AND ", $where);
        $whereSQL = "WHERE " . $whereSQL;
    }
    
    if (isset($_POST['sort'])) {
        if (is_numeric($_POST['sort'])) {
            switch ($_POST['sort']) {
                case 0:
                    $sort = "ORDER BY loves DESC";
                    break;
                case 1:
                    $sort = "ORDER BY players_online DESC";
                    break;
                case 2:
                    $sort = "ORDER BY players_online ASC";
                    break;
            }
        }
    }
    
    global $mysqli,$db_table_prefix;
    
    $start = $page * $count;
    
    $SQL = "SELECT * FROM realms ";
    
    if ($whereSQL) {
        $SQL .= $whereSQL . " ";
    }
    
    $SQL .= $sort . " LIMIT " . $start . ", " . $count;
    
    $stmt = $mysqli->prepare($SQL);
    $result = $stmt->execute();
    $stmt->bind_result($id, $user_id, $title, $description, $status, $players_online, $funds, $screenshots, $loves, $url);
            
    while ($stmt->fetch()){
        $row[] = array('id' => $id, 'user_id' => $user_id, 'title' => $title, 'description' => $description, 'status' => $status, 'players_online' => $players_online, 'funds' => $funds, 'screenshots' => $screenshots, 'loves' => $loves, 'url' => $url);
    }
    $stmt->close();
    
    echo json_encode($row);
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content">
    
    <div class="well" style="margin-bottom: 40px;">
        <div class="row">
            <div class="col-xs-2">
                <div class="checkbox"><label><input id="chkOnline" type="checkbox" value=""> Online</label></div>
            </div>
            <div class="col-xs-2">
                <div class="checkbox"><label><input id="chkScreenshots" type="checkbox" value=""> Screenshots</label></div>
            </div>
            <div class="col-xs-2">
                <div class="checkbox"><label><input type="checkbox"> No Wait</label></div>
            </div>
            <div class="col-xs-3">
                <select class="form-control" id="selectSort">
                    <option value="0">Sort On: Loves</option>
                    <option value="1">Sort On: Users, Highest to Lowest</option>
                    <option value="2">Sort On: Users, Lowest to Highest</option>
                    <option value="3">Sort On: Reviews</option>
                </select>
            </div>
            <div class="col-xs-3">
                <button class="btn btn-default" id="btnSearch">Update Search</button>
            </div>
        </div>
    </div>
    
    <section id="realmList"></section>
        
</div>

<script id="realms_template" type="text/template">
    
    <div id="results">
    
    <% _.each( realms, function( realm ){ %>
    
        <div class="playListRealm">
            
            <!-- Title -->
            <!-- TODO: Realm url should be different if offline, else we are just forwarding them to an 'offline' message -->
            <a href="realm.php?<%- realm.id %>">
            <h3> <%- realm.title %>
            <div class="pull-right">
            <small>
            
            <!--  Online / Offline + users  -->
            <% if (realm.status == 1) { %>
                <span class="label label-success"><i class="fa fa-power-off"></i> Online</span>
                <span class="label label-default" style="margin-left: 6px;"><i class="fa fa-child"></i> <%- realm.players_online %></span>
            <% } else { %>
                <span class="label label-default"><i class="fa fa-power-off"></i> Offline</span>
            <% } %>
            
            <!--  Loves -->
                <span class="label label-default" style="margin-left: 6px;"><i class="fa fa-heart"></i> <%- realm.loves %></span>
                
            </small>
            </div>
            </h3>
            </a>
            
        <% if (realm.screenshots) { %>
            <div class="row wrapper-parent">
            
            <!-- Screenshots are in the format {id}-{#}-thumb.jpg and {id}-{#}.jpg, e.g. 42-1.jpg and 42-1-thumb.jpg -->
            <% for (var i = 0; i < realm.screenshots; i++) { %>
                <div class="col-md-2">
                    <a href="img/<%- realm.id + '-' + i + '.jpg' %>"
                       data-toggle="lightbox"
                       data-title="<%- realm.title + '<small> screenshot #' + (i + 1) + ' </small>' %>"
                       data-parent=".wrapper-parent"
                       data-gallery="<%- 'gallery-' + realm.id %>" class="thumbnail">
                        <img src="img/<%- realm.id + '-' + i + '-thumb.jpg' %>">
                    </a>
                </div>
            <% } %>
            
            </div>
        <% } %>
        
        <% if (realm.description) { %>
            <p class="text-justify"><%- realm.description %></p>
        <% } %>
            
        </div>
        
    <% }); %>
    
    </div>
    
    <% if (initial) { %>
        <ul id="realmPagination" class="pagination pagination-sm">
            <li><a id="prevPage" href="#">&laquo;</a></li>
        <% for (var i = 0; i < pages; i++) { %>
            <% if (i == page) { %>
                <li class="active pageNumber"><a href="#" data-page="<%- i %>"><%- (i + 1) %> <span class="sr-only">(current)</span></a></li>
            <% } else { %>
                <li><a class="pageNumber" href="#" data-page="<%- i %>"><%- (i + 1) %></a></li>
            <% } %>
        <% } %>
            <li><a id="nextPage" href="#">&raquo;</a></li>
        </ul>
    <% } %>
    
</script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/ekko-lightbox.min.js" type="text/javascript" charset="utf-8"></script>
<script src="js/index.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>