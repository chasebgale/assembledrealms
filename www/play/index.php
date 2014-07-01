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
$stmt->bind_result($id, $user_id, $title, $description, $status, $players_online, $funds);
        
while ($stmt->fetch()){
    $row[] = array('id' => $id, 'user_id' => $user_id, 'title' => $title, 'description' => $description, 'status' => $status, 'players_online' => $players_online, 'funds' => $funds);
    //$row['screenshots'] = 'one.jpg,two.jpg';
}
$stmt->close();

?>

<div id="content">
    
    <?php
        foreach($row as $realm) {
            $output = '<div>';
            
            // Title
            $output .= '<h3>' . $realm['title'] . '</h3>';
            
            //if ($realm['screenshots']) {
            if (true) {  
                $output .= '<div class="row">';
                
                // TODO: Do this for each (up to 4 screenshots)
                $output .= '<div class="col-md-2"><a href="#" class="thumbnail"><img src="img/thumb.jpg"></a></div>';
                $output .= '<div class="col-md-2"><a href="#" class="thumbnail"><img src="img/thumb.jpg"></a></div>';
                $output .= '<div class="col-md-2"><a href="#" class="thumbnail"><img src="img/thumb.jpg"></a></div>';
                $output .= '<div class="col-md-2"><a href="#" class="thumbnail"><img src="img/thumb.jpg"></a></div>';
                
                $output .= '</div>';
            }
            
            if ($realm['description']) {
                $output .= '<p>' . $realm['description'] . '</p>';
            }
            
            if ($realm['status'] == 0) {
                //$output .= '<i class="fa fa-power-off light"></i>';
            } else {
                //$output .= '<i class="fa fa-power-off online"></i>';
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