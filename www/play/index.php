<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

$page = 0;
$count = 20;

if (isset($_GET['page'])) {
    if (is_numeric($_GET['page'])) {
        $page = $_GET['page'];
    }
}

if (isset($_GET['count'])) {
    if (is_numeric($_GET['count'])) {
        $count = $_GET['count'];
    }
}

global $mysqli,$db_table_prefix;

// COUNT
$stmt = $mysqli->prepare("SELECT * FROM realms");
$result = $stmt->execute();
$stmt->store_result();
$totalrows = $stmt->num_rows;
$stmt->close();

$totalpages = ceil($totalrows / $count);
$start = $page * $count;

$stmt = $mysqli->prepare("SELECT * FROM realms LIMIT " . $start . ", " . $count);
$result = $stmt->execute();
$stmt->bind_result($id, $user_id, $title, $description, $status, $players_online, $funds, $screenshots);
        
while ($stmt->fetch()){
    $row[] = array('id' => $id, 'user_id' => $user_id, 'title' => $title, 'description' => $description, 'status' => $status, 'players_online' => $players_online, 'funds' => $funds, 'screenshots' => $screenshots);
}
$stmt->close();

?>

<div id="content">
    
    <div class="well" style="margin-bottom: 40px;">
        <div class="row">
            <div class="col-xs-2">
                <div class="checkbox"><label><input type="checkbox"> Online</label></div>
            </div>
            <div class="col-xs-2">
                <div class="checkbox"><label><input type="checkbox"> Screenshots</label></div>
            </div>
            <div class="col-xs-2">
                <div class="checkbox"><label><input type="checkbox"> No Wait</label></div>
            </div>
            <div class="col-xs-3">
                <select class="form-control">
                    <option>Sort On: Loves</option>
                    <option>Sort On: Users, Highest to Lowest</option>
                    <option>Sort On: Users, Lowest to Highest</option>
                    <option>Sort On: Reviews</option>
                </select>
            </div>
            <div class="col-xs-3">
                <button class="btn btn-default">Update Search</button>
            </div>
        </div>
    </div>
    
    <?php
    
        $alternate = false;
    
        foreach($row as $realm) {
            if ($alternate) {
                $output = '<div class="playListRealm" style="border: #eee solid 1px;">';
            } else {
                $output = '<div class="playListRealm">';
            }
            
            $alternate = !$alternate;
            
            // Title
            $output .= '<a href="realm/' . $realm['id'] . '"><h3>' . $realm['title'] . '<div class="pull-right"><small>';
            
            // Online / Offline + users
            if ($realm['status'] == 1) {
                $output .= '<span class="label label-success"><i class="fa fa-power-off"></i> Online</span>';
                $output .= '<span class="label label-default" style="margin-left: 6px;"><i class="fa fa-child"></i> ' . $realm['players_online'] . '</span>';
            } else {
                $output .= '<span class="label label-default"><i class="fa fa-power-off"></i> Offline</span>';
            }
            
            // Likes
            $output .= '<span class="label label-default" style="margin-left: 6px;"><i class="fa fa-heart"></i> 12</span>';
            $output .= '</small></div></h3></a>';
            
            if ($realm['screenshots']) {
                $output .= '<div class="row wrapper-parent">';
                
                // Screenshots are in the format {id}-{#}-thumb.jpg and {id}-{#}.jpg, e.g. 42-1.jpg and 42-1-thumb.jpg
                for ($i = 0; $i < $realm['screenshots']; $i++) {
                    $output .= '<div class="col-md-2">';
                    $output .= '<a href="img/' . $realm['id'] . '-' . $i . '.jpg" data-toggle="lightbox" data-title="' . $realm['title'] . ' <small> screenshot #' . ($i + 1) . ' </small>" data-parent=".wrapper-parent" data-gallery="gallery-' . $realm['id'] . '" class="thumbnail">';
                    $output .= '<img src="img/' . $realm['id'] . '-' . $i . '-thumb' . '.jpg"></a></div>';
                }
                
                $output .= '</div>';
            }
            
            if ($realm['description']) {
                $output .= '<p class="text-justify">' . $realm['description'] . '</p>';
            }
            
            $output .= '</div>';
            
            /*
            
            $output .= '<td>' . $realm['id'] . '</td>';
            
            $output .= '<td>' . $realm['published'] . '</td>';
            $output .= '<td>' . $realm['likes'] . '</td>';
            
            $output .= '</tr>';
            */
            
            echo $output;
        }
    ?>
    
    <ul class="pagination pagination-sm">
        <li><a href="#">&laquo;</a></li>
        <?php
            for ($i = 0; $i < $totalpages; $i++) {
                if ($i == $page) {
                    echo '<li class="active"><a href="#">' . ($i + 1) . ' <span class="sr-only">(current)</span></a></li>';
                } else {
                    echo '<li><a href="#">' . ($i + 1) . '</a></li>';
                }
            }
        ?>
        <li><a href="#">&raquo;</a></li>
    </ul>
        
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/ekko-lightbox.min.js" type="text/javascript" charset="utf-8"></script>

<script type="text/javascript">
    $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
        event.preventDefault();
        $(this).ekkoLightbox();
    }); 
</script>

</body>
</html>