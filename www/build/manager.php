<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
    die();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    $directive = $_POST['directive'];
    $realm_id  = $_POST['realm_id'];
    
    if ($loggedInUser->isRealmOwner($realm_id) === false) {
        echo json_encode( (object) ['message' => 'Not Authorized.'] );
        die();
    }
    
    if ($directive == 'fetch') {
        $raw = $loggedInUser->fetchRealmMarkdown($_POST['realm_id']);
        
        echo json_encode($raw);
        die();
    }
    
    if ($directive == 'save') {
	
        global $mysqli;
        
        if (isset($_POST['shots_removed']) || isset($_POST['shots'])) {
            $removed_arr = $_POST['shots_removed'];
            $newShotOrder = $_POST['shots'];
            
            if ($removed_arr) {
                foreach ($removed_arr as $value) {
                    unlink('/home/public/play/img/' . $_POST['realm_id'] . '-' . $value . '.jpg');
                }
            }
            
            $size = count($newShotOrder);
            
            for($i = 0; $i < $size; ++$i) {
                if (startsWith($newShotOrder[$i], 'staging')) {
                    rename('/home/public/play/img/' . $newShotOrder[$i] . '.jpg',
                           '/home/public/play/img/' . $_POST['realm_id'] . '-' . $i . '.jpg');
                           
                    rename('/home/public/play/img/' . $newShotOrder[$i] . '-thumb.jpg',
                           '/home/public/play/img/' . $_POST['realm_id'] . '-' . $i . '-thumb.jpg');
                           
                } else {
                    if ($i != $newShotOrder[$i]) {
                        rename('/home/public/play/img/' . $_POST['realm_id'] . '-' . $newShotOrder[$i] . '.jpg',
                               '/home/public/play/img/' . $_POST['realm_id'] . '-' . $i . '.jpg');
                               
                        rename('/home/public/play/img/' . $_POST['realm_id'] . '-' . $newShotOrder[$i] . '-thumb.jpg',
                               '/home/public/play/img/' . $_POST['realm_id'] . '-' . $i . '-thumb.jpg');
                    }
                }
            }
        }
        
        if (isset($_POST['funding']) && isset($_POST['description'])) {
            $stmt = $mysqli->prepare("UPDATE realms 
                                        SET description = ?, show_funding = ?, screenshots = ?
                                        WHERE id = ?");
                                    
            if ($stmt == false) {
                echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
                die();
            }
            
            $funding = (int)($_POST['funding'] == 'true');
            
            $stmt->bind_param("siii", $_POST['description'], $funding, $size, $_POST['realm_id']);
            $rc = $stmt->execute();
            
            if ( false===$rc ) {
                echo json_encode( (object) ['message' => 'Realm update failed: ' . htmlspecialchars($stmt->error)] );
                die();
            }
            
            $stmt->close();
            
        }
        
        echo json_encode( (object) ['message' => 'OK'] );
        die();
	
    }
    
    if ($directive == 'destroy') {
        if (isset($_POST['realm_id'])) {
            $loggedInUser->destroyRealm($_POST['realm_id']);
            echo json_encode( (object) ['message' => 'OK'] );
            die();
        }	
    }
    
    if ($directive == 'upload') {
        try {
            
            /*
            if (!isset($_POST['realm_id'])) {
                throw new RuntimeException('No Realm ID.');
            }
            */
            
            // Undefined | Multiple Files | $_FILES Corruption Attack
            // If this request falls under any of them, treat it invalid.
            if (!isset($_FILES['upfile']['error']) || is_array($_FILES['upfile']['error'])) {
                throw new RuntimeException('Invalid parameters. ' . print_r($_FILES['upfile']));
            }
        
            // Check $_FILES['upfile']['error'] value.
            switch ($_FILES['upfile']['error']) {
                case UPLOAD_ERR_OK:
                    break;
                case UPLOAD_ERR_NO_FILE:
                    throw new RuntimeException('No file sent.');
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    throw new RuntimeException('Exceeded filesize limit.');
                default:
                    throw new RuntimeException('Unknown errors.');
            }
            
            // Check filesize. 
            if ($_FILES['upfile']['size'] > 2000000) {
                throw new RuntimeException('Exceeded filesize limit.');
            }
            
            $img = $_FILES['upfile']['tmp_name'];
            
            $guid = sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
            
            $dst        = '/home/public/play/img/staging/' . $guid . '.jpg';
            $dst_thumb  = '/home/public/play/img/staging/' . $guid . '-thumb.jpg';
            
            //$dst_number = $loggedInUser->fetchRealmScreenshots($_POST['realm_id']);
            //$dst        = '/home/public/play/img/' . $_POST['realm_id'] . '-' . $dst_number . '.jpg';
            //$dst_thumb  = '/home/public/play/img/' . $_POST['realm_id'] . '-' . $dst_number . '-thumb.jpg';
            
            if (($img_info = getimagesize($img)) === FALSE) {
                throw new RuntimeException('Invalid file format.');
            }
            
            $width = $img_info[0];
            $height = $img_info[1];
            
            switch ($img_info[2]) {
                case IMAGETYPE_GIF  : $src = imagecreatefromgif($img);  break;
                case IMAGETYPE_JPEG : $src = imagecreatefromjpeg($img); break;
                case IMAGETYPE_PNG  : $src = imagecreatefrompng($img);  break;
                default : throw new RuntimeException("Unknown filetype");
            }
            
            //calculate resized image picture dimensions 
            $thumb_size = 150;
            $original_ratio = $width/$height;
            $targetWidth = $targetHeight = min($thumb_size, max($width, $height));

            if ($ratio < 1) {
                $targetWidth = $targetHeight * $original_ratio;
            } else {
                $targetHeight = $targetWidth / $original_ratio;
            }
            
            //calculate picture position 'in center' of new image.
            $int_width = ($thumb_size - $targetWidth)/2;
            $int_height = ($thumb_size - $targetHeight)/2;        
        
            $tmp = imagecreatetruecolor($width, $height);
            $tmp_thumb = imagecreatetruecolor($thumb_size, $thumb_size);
        
            // Full Size JPEG:
            imagecopyresampled($tmp, $src, 0, 0, 0, 0, $width, $height, $width, $height);
            
            // Thumb:
            imagecopyresampled($tmp_thumb, $src, $int_width, $int_height, 0, 0, $targetWidth, $targetHeight, $width, $height);
            
            imagejpeg($tmp, $dst);
            imagedestroy($tmp);
            
            imagejpeg($tmp_thumb, $dst_thumb);
            imagedestroy($tmp_thumb);
            
            echo json_encode( (object) ['message' => 'OK', 'guid' => $guid] );
            die();
        
        } catch (RuntimeException $e) {
            echo $e->getMessage();
            die();
        }
    }
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realm = $loggedInUser->fetchRealm($_SERVER['QUERY_STRING']);
    
    $funding_opacity = "0.3";
    if ($realm["show_funding"]) {
	$funding_opacity = "1.0";
    }
} else {
    echo "<h2>Please stop tinkering.</h2>";
    die();
}
    
?>

<div id="content">

	<h2><?php echo $realm["title"] ?></h2>
    
    <div class="panel panel-default">
        <div class="panel-heading">Status</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Balance</strong></p>
                </div>
                <div class="col-md-9">
                    <span class="h3">$ <?php echo $realm["funds"] ?></span>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Server</strong></p>
                </div>
                <div class="col-md-9">
                    <span class="h3"><?php echo ($realm["status"] == 0 ? "Offline" : "Online") ?></small></span>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Code</strong></p>
                </div>
                <div class="col-md-9">
                    <span class="h3">Built 03/22/2015 02:22 PM: "Commit Message"</span>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Loves</strong></p>
                </div>
                <div class="col-md-9">
                    <span class="h3"><?php echo $realm["loves"] ?></span>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Comments</strong></p>
                </div>
                <div class="col-md-9">
                    <span class="h3"><?php echo $realm["comments"] ?></span>
                </div>
            </div>
        </div>
    </div>

    <div class="panel panel-default">
        <div class="panel-heading">Actions</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <button class="btn btn-default pull-right" data-toggle="modal" data-target="#modalDeposit">Deposit Funds</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Transfer funds from your personal account. Your realm's bank has a balance of <strong>$ <?php echo $realm["funds"] ?></strong>.</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <?php 
                        if ($realm["status"] == 0) {
                            echo '<button class="btn btn-default pull-right" data-toggle="modal" data-target="#modalTakeRealmOnline">Take Realm Online</button>';
                        } else {
                            echo '<button class="btn btn-default pull-right">Take Realm Offline</button>';
                        }
                    ?>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">
                    <?php 
                        if ($realm["status"] == 0) {
                            echo 'Your realm is currently <strong>offline</strong>. Click this button to allow other users to connect to your realm and enjoy the fruits of your hard work!';
                        } else {
                            echo 'Your realm is current <strong>Online</strong>. Click this button to bring the server offline.';
                        }
                    ?>
                    </p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <button class="btn btn-default pull-right">Publish Latest Code</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Loads the latest committed code onto your realm; if online, it will be restarted automatically.</p>
                </div>
            </div>
			<div class="row">
                <div class="col-md-3">
                    <button class="btn btn-danger pull-right" id="button-destroy-realm" data-id="<?php echo $realm["id"] ?>"><i class="fa fa-exclamation-triangle"></i> Destroy Realm</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Think about this first. Destroyed realms can not be recovered.</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="panel panel-default">
        <div class="panel-heading">Display Settings</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Title</strong></p>
                </div>
                <div class="col-md-9">
                    <span><?php echo $realm["title"] ?></span>
                </div>
            </div>
            <div class="row" style="padding-top: 8px;">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Description</strong></p>
                </div>
                <div class="col-md-9">
                    <textarea id="details-description" class="form-control monitored" data-id="description" rows="4"><?php echo $realm["description"] ?></textarea>
                </div>
            </div>
			<div class="row" style="padding-top: 8px;">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Display Crowd Funding</strong></p>
                </div>
                <div class="col-md-9">
                    <div class="checkbox" style="display:inline">
						<label>
						   <input id="chkFunding" type="checkbox" <?php if ($realm["show_funding"]) echo 'checked="checked"' ?> style="float:inherit;"/>
						</label>
					</div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Screenshots</strong></p>
                </div>
                <div class="col-md-9" id="screenshotsCol">
                    <!-- Screenshots are in the format {id}-{#}-thumb.jpg and {id}-{#}.jpg, e.g. 42-1.jpg and 42-1-thumb.jpg -->
                    <?php
                        for ($i = 0; $i < intval($realm["screenshots"]); $i++) {
                            echo '<div class="thumbnail screenshotHolder" data-id="' . $i . '" style="display: inline-block; margin: 8px;">';
                            echo '<a href="/play/img/' . $realm["id"] . '-' . $i . '.jpg" data-toggle="lightbox" ';
                            echo 'data-title="' . $realm["title"] . '<small> screenshot #' . ($i + 1) . ' </small>" data-parent=".wrapper-parent" ';
                            echo 'data-gallery="gallery-' . $realm["id"] . '"> ';
                            echo '<img src="/play/img/' . $realm["id"] . '-' . $i . '-thumb.jpg"></a>'; 
                            echo '<div class="caption"><a href="#" class="btn removeScreenshot" data-id="' . $i . '"><i class="fa fa-trash-o"></i> Remove</a></div></div>';
                        }
                    ?>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>&nbsp;</strong></p>
                </div>
                <div class="col-md-9">
                    <?php
                        if (intval($realm["screenshots"]) < 6) {
                            echo '<div id="addNewShot" style="display: inline-block; margin: 8px; vertical-align: top;">';
                            echo '<form enctype="multipart/form-data" action="" method="POST" role="form" id="uploadScreenshotForm">
                                    <div class="form-group">
                                        <label for="upfile">Add a new screenshot:</label>
                                        <input type="hidden" name="MAX_FILE_SIZE" value="200000" />
                                        <input name="upfile" id="upfile" type="file" accept="image/gif, image/png, image/jpeg" />
                                    </div>
                                </form>';
                            echo '<div id="uploadProgress" class="progress" style="width: 200px; display: none;">
                                    <div id="uploadProgressbar" class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">
                                    </div>
                                 </div>';
                            echo '</div>';
                        }
                    ?>
                </div>
            </div>
        </div>
		<div class="panel-footer clearfix">
			<button id="savebutton" class="btn btn-default pull-right">Save Changes!</button>
		</div>
    </div>
</div>

<div class="modal fade" id="modalTakeRealmOnline" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">Deposit $2.50</h4>
            </div>
            <div class="modal-body" id="modalDepositFundsContent">
                <ol>
					<li>
						<span>Select a server:</span>
						<div class="dropdown">
							<button class="btn btn-default dropdown-toggle" type="button" id="dropdownServerType" data-toggle="dropdown" aria-expanded="true">
							Free, 
							<span class="caret"></span>
							</button>
							<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownServerType">
								<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>
								<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Another action</a></li>
								<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Something else here</a></li>
								<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Separated link</a></li>
							</ul>
						</div>
					</li>
				</ol>
            </div>
        </div>
    </div>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">

    $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
        event.preventDefault();
        $(this).ekkoLightbox();
    });

    var __markdownCreateNewDB = true;
    var __realmID = <?php echo $_SERVER['QUERY_STRING'] ?>;
    var __existingState = {
	description: "<?php echo $realm["description"] ?>",
	show_funding: <?php echo $realm["show_funding"] ?>
    };
    
    var __currentState = _.clone(__existingState, true);
    
    $('.row').css('margin-bottom', '12px');
</script>

<script src="js/manager.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
<script src="js/ekko-lightbox.min.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>