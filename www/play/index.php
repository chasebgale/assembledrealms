<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    
    $page = 0;
    $count = 50;
    $sort = "ORDER BY loves DESC";
    $where = [];
    $whereSQL = "";
    $tempSQL = "";
    
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
    
    $tempSQL = "screenshots <> '[]'";
    if (isset($_POST['screenshots'])) {
      if ($_POST['screenshots'] == 'true') {
        array_push($where, $tempSQL);
      }
    }
    
    $tempSQL = "status > 0";
    if (isset($_POST['online'])) {
      if ($_POST['online'] == 'false') {
        $tempSQL = "status > -1";
      }
    }
    array_push($where, $tempSQL);
    
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
    
    if (!$stmt) {
      echo $SQL;
      die();
    }
    
    $result = $stmt->execute();
    $stmt->bind_result($id,
                       $user_id,
                       $title,
                       $description,
                       $engine,
                       $status,
                       $players_online,
                       $funds,
                       $screenshots,
                       $loves,
                       $url,
                       $comments,
                       $source,
                       $show_funding,
                       $address
                       );
            
    while ($stmt->fetch()){
        $row[] = array('id' => $id,
                       'user_id' => $user_id,
                       'title' => $title,
                       'description' => $description,
                       'engine' => $engine,
                       'status' => $status,
                       'players_online' => $players_online,
                       'funds' => $funds,
                       'screenshots' => $screenshots,
                       'loves' => $loves,
                       'url' => $url,
                       'comments' => $comments,
                       'source' => $source,
                       'show_funding' => $show_funding,
                       'address' => $address
                       );
    }
    $stmt->close();
    
    echo json_encode($row);
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content" class="container">
    
    <div class="well clearfix" style="margin-bottom: 40px; padding: 10px;">
        <div class="pull-left">
            <strong>Required:</strong>
            <div class="checkbox" style="display: inline; margin-left: 10px;"><label><input id="chkOnline" type="checkbox" value="" checked> Online</label></div>
            <div class="checkbox" style="display: inline; margin-left: 10px;"><label><input id="chkScreenshots" type="checkbox" value="" checked> Screenshots</label></div>
            <strong style=" margin-left: 16px;">Sort:</strong>
            <select id="selectSort" style="display: inline-block;">
                <option value="0">Loves</option>
                <option value="1">Users, Highest to Lowest</option>
                <option value="2">Users, Lowest to Highest</option>
                <option value="3" selected>Default, Alphabetical</option>
            </select>
        </div>
           
        <div class="pull-right">
            <button class="btn btn-default btn-xs" id="btnSearch">Update Search</button>
        </div>
    </div>
    
    <section id="realmList"></section>
        
</div>

<script id="realms_template" type="text/template">
    
    <div id="results">
    <% _.each( realms, function( realm ){ %>
    
      <div class="playListRealm">
        <a href="realm/<%- realm.id %>" style="color: inherit;">
        <div class="row">
          <div class="col-md-11">
            <!-- Title -->
            <div class="pull-left" style="min-width: 100px; max-width: 400px; margin-right: 20px;">
              <span class="realmTitle"><%- realm.title %></span>
            </div>
            
            <!-- Description -->
            <% if (realm.description) { %>
                <p class="text-justify"><%- realm.description %></p>
            <% } else { %>
                <p class="text-justify">&nbsp;</p>
            <% } %>
          </div>
          <div class="col-md-1">
            <!--  Online / Offline + users  -->
            <% if (realm.status == 1) { %>
              <span class="label-play-stats label label-success">Online <i class="fa fa-power-off fa-fw"></i></span>
            <% } else { %>
              <span class="label-play-stats label label-default">Offline <i class="fa fa-power-off fa-fw"></i></span>
            <% } %>
            <span class="label-play-stats label label-default"><%- realm.players_online %> <i class="fa fa-child fa-fw"></i></span>
            
            <!--  Loves -->
            <span class="label-play-stats label label-default"><%- realm.loves %> <i class="fa fa-heart fa-fw"></i></span>
          </div>
        </div>
        </a>
      <% if (realm.screenshots.length > 0) { %>
        <div>
        
        <!-- Screenshots are in the format {id}-{#}-thumb.jpg and {id}-{#}.jpg, e.g. 42-1.jpg and 42-1-thumb.jpg -->
        <% for (var i = 0; i < realm.screenshots.length; i++) { %>
          <div style="width: 161px; height: 160px; display: inline-block;">
            <a href="img/<%- realm.screenshots[i] + '.jpg' %>"
               data-toggle="lightbox"
               data-title="<%- realm.title + '<small> screenshot #' + (i + 1) + ' </small>' %>"
               data-parent=".wrapper-parent"
               data-gallery="<%- 'gallery-' + realm.id %>" class="thumbnail">
                <img src="img/<%- realm.screenshots[i] + '-thumb.jpg' %>">
            </a>
          </div>
        <% } %>
        
        </div>
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