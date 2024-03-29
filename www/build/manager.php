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
  
  if ($directive == 'deposit') {
      if (isset($_POST['amount'])) {
          if ($loggedInUser->depositToRealm($realm_id, $_POST['amount'])) {
              echo json_encode( (object) ['message' => 'OK'] );
              die();
          } else {
              echo json_encode( (object) ['message' => 'FAILURE'] );
              die();
          }
      }
  }
  
  if ($directive == 'save') {

    global $mysqli;
    
    if (isset($_POST['funding']) && isset($_POST['description'])) {
      $stmt = $mysqli->prepare("UPDATE realms 
                                SET description = ?, show_funding = ?
                                WHERE id = ?");
                              
      if ($stmt == false) {
        echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
        die();
      }
      
      $funding = (int)($_POST['funding'] == 'true');
      
      $stmt->bind_param("sii", $_POST['description'], $funding, $realm_id);
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
  
  if ($directive == 'offline') {
    
      $success = $loggedInUser->authGatekeeper($realm_id);
      if ($success !== false) {
          echo json_encode( (object) ['message' => 'OK'] );
      } else {
          echo json_encode( (object) ['message' => 'FAILURE'] );
      }
      die();
  }
  
  if ($directive == 'online') {
    $server_type = $_POST['server'];
    
    if ($loggedInUser->authGatekeeper($realm_id)) {
    
      // TODO: THIS SHOULD SEND A MESSAGE TO GATEWAY TO LAUNCH, EVEN WITH A 
      // SHARED REALM, ASYNC, THAT WAY GATEWAY CAN FIND THE LEAST USED SERVER BY
      // CHECKING THE STATS FROM THE JOB THAT RUNS EVERY ~10 MIN
      $success = $loggedInUser->onlineRealm($realm_id, $server_type);
      
      if ($success === true) {
        echo json_encode( (object) ['message' => 'OK'] );
      } else {
        echo json_encode( (object) ['message' => 'FAILURE'] );
      }
      die();
    } else {
      echo json_encode( (object) ['message' => 'FAILURE'] );
    }
  }
  
  if ($directive == 'destroy') {
      $loggedInUser->destroyRealm($realm_id);
      echo json_encode( (object) ['message' => 'OK'] );
      die();
  }
  
  if ($directive == 'upload') {
    try {
        
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

      $filename   = generateRandomString();
      $img        = $_FILES['upfile']['tmp_name'];
      $dst        = '/home/public/play/img/' . $filename . '.jpg';
      $dst_thumb  = '/home/public/play/img/' . $filename . '-thumb.jpg';
      
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
      
      imagejpeg($tmp, $dst, 90);
      imagedestroy($tmp);
      
      imagejpeg($tmp_thumb, $dst_thumb);
      imagedestroy($tmp_thumb);
      
      // Add new shot to DB, first select existing shots:
      $stmt = $mysqli->prepare("SELECT screenshots FROM realms WHERE id = ?");
                              
      if ($stmt == false) {
          echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
          die();
      }
      
      $stmt->bind_param("i", $realm_id);
      $rc = $stmt->execute();
      $stmt->bind_result($json_screenshots);
      $stmt->fetch();
      
      if ( false===$rc ) {
          echo json_encode( (object) ['message' => 'Realm update failed: ' . htmlspecialchars($stmt->error)] );
          die();
      }
      $stmt->close();
      
      $screenshots = json_decode($json_screenshots);
      
      // Now add new shot to array and push back to DB:
      $screenshots[] = $filename;
      $stmt = $mysqli->prepare("UPDATE realms 
                                SET screenshots = ?
                                WHERE id = ?");
                              
      if ($stmt == false) {
          echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
          die();
      }
      
      $stmt->bind_param("si", json_encode($screenshots), $realm_id);
      $rc = $stmt->execute();
      
      if ( false===$rc ) {
          echo json_encode( (object) ['message' => 'Realm update failed: ' . htmlspecialchars($stmt->error)] );
          die();
      }
      
      $stmt->close();
      
      echo json_encode( (object) ['message' => 'OK', "filename" => $filename] );
      die();
    
    } catch (RuntimeException $e) {
      echo $e->getMessage();
      die();
    }
  }
  
  if ($directive == 'remove_screenshot') {
    $filename  = $_POST['filename'];
    
    // First select existing shots:
    $stmt = $mysqli->prepare("SELECT screenshots FROM realms WHERE id = ?");
                            
    if ($stmt == false) {
        echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
        die();
    }
    
    $stmt->bind_param("i", $realm_id);
    $rc = $stmt->execute();
    $stmt->bind_result($json_screenshots);
    $stmt->fetch();
    
    if ( false===$rc ) {
        echo json_encode( (object) ['message' => 'Realm update failed: ' . htmlspecialchars($stmt->error)] );
        die();
    }
    $stmt->close();
    
    $screenshots = json_decode($json_screenshots);
    
    // Now remove screenshot from array and push back to DB:
    $index = array_search($filename, $screenshots);
    if ($index !== false) {
      unset($screenshots[$index]);
    }

    $stmt = $mysqli->prepare("UPDATE realms 
                              SET screenshots = ?
                              WHERE id = ?");
                            
    if ($stmt == false) {
        echo json_encode( (object) ['message' => htmlspecialchars($mysqli->error)] );
        die();
    }
    
    $stmt->bind_param("si", json_encode(array_values($screenshots)), $realm_id);
    $rc = $stmt->execute();
    
    if ( false===$rc ) {
        echo json_encode( (object) ['message' => 'Realm update failed: ' . htmlspecialchars($stmt->error)] );
        die();
    }
    
    $stmt->close();
    
    // If we are this far, the DB is clear of the file reference, let's remove the actual file
    unlink('/home/public/play/img/' . $filename . '.jpg');
    unlink('/home/public/play/img/' . $filename . '-thumb.jpg');
    
    echo json_encode( (object) ['message' => 'OK'] );
    die();
  }
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realm        = $loggedInUser->fetchRealm($_SERVER['QUERY_STRING']);
    $screenshots  = json_decode($realm["screenshots"]);
    $published    = $loggedInUser->fetchRealmPublish($_SERVER['QUERY_STRING']);
    
    $funding_opacity = "0.3";
    if ($realm["show_funding"]) {
        $funding_opacity = "1.0";
    }
    
    $realm_funds = money_format("%!n", ($realm["funds"] / 100));
    $realm_cents = intval($realm["funds"]);
} else {
    echo "<h2>Please stop tinkering.</h2>";
    die();
}
    
?>

<div id="content" class="container">

  <h1><?php echo $realm["title"] ?>
    <small>
      <span style="margin-left: 12px;"><i class="fa fa-child fa-fw"></i> <?=(($realm["players"]) ? $realm["players"] : "N/A")?></span>
      <span style="margin-left: 12px;"><i class="fa fa-heart fa-fw"></i> <?php echo $realm["loves"] ?></span>
    </small>
  </h1>
  
	<div id="realmActionItems">
		<div class="row">
			<div class="col-md-4">
        <div class="well">
          <ul>
            <li><strong>Funding</strong></li>
            <li><span id="realmFunds">$ <?php echo $realm_funds ?></span></li>
            <li><button class="btn btn-default" data-toggle="modal" data-target="#modalDeposit">Deposit Funds</button></li>
          </ul>
        </div>
      </div>
      <div class="col-md-4">
        <div class="well">
          <ul>
            <li><strong>Server</strong></li>
            <li>
              <span id="realmStatus">
                <?php if ($realm["status"] < 1) { ?>
                    Offline
                <?php } else if ($realm["status"] == 1) { ?>
                    <span class='label label-success'><i class='fa fa-power-off'></i> Online</span>
                <?php } else if ($realm["status"] == 2) { ?>
                    <span class='label label-warning'><i class='fa fa-cog fa-spin'></i> Booting</span>
                <?php } ?>
              </span>
            </li>
            <!--
            <li>
              <div id="chart-container" style="opacity: 0.25; background-color: #4C4C4C; padding: 0; height: 42px; text-align: right; display: inline-block; vertical-align: top;" class="pull-right">
                <div style="display: inline-block; font-size: 0.75em; vertical-align: top; margin-top: 6px;">
                  <span style="color: #ffffff;"><span id="cpu_display"></span> CPU <i class="fa fa-square"></i></span>
                  <br />
                  <span style="color: #00ff00;"><span id="mem_display"></span> MB <i class="fa fa-square"></i></span>
                </div>
                <div style="display: inline-block;">
                  <canvas id="chart-server" width="200" height="42" style="display: inline-block;"></canvas>
                </div>
              </div>
            </li>
            -->
            <li>
              <?php 
                if ($realm["status"] < 1) {
                  echo '<button id="onlineOfflineBtn" class="btn btn-default" data-toggle="modal" data-target="#modalTakeRealmOnline">Take Realm Online</button>';
                } else {
                  echo '<button id="onlineOfflineBtn" class="btn btn-default" data-toggle="modal" data-target="#modalTakeRealmOffline">Take Realm Offline</button>';
                }
              ?>
            </li>
            <li><button class="btn btn-danger" id="button-destroy-realm" data-toggle="modal" data-target="#modalDestroy"><i class="fa fa-exclamation-triangle"></i> Destroy Realm</button></li>
          </ul>
        </div>
      </div>
      <div class="col-md-4">
        <div class="well">
          <ul>
            <li><strong>Code</strong></li>
            <li><span id="publish-date"><?=$published?></span></li>
            <?php if ($realm["status"] > -1) { ?>
            <li><button class="btn btn-default" id="publish-latest-code">Publish Latest Code</button></li>
            <?php } else { ?>
            <li><button class="btn btn-default" id="publish-latest-code" disabled="true">Publish Latest Code</button></li>
            <?php } ?>
            <li><button class="btn btn-default" disabled><i class="fa fa-reply"></i> Restore to Version</button></li>
          </ul>
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
            $screenshot_count = 0;
            foreach ($screenshots as $screenshot) {
              $screenshot_count++;
              echo '<div class="thumbnail screenshotHolder" data-id="' . $screenshot . '" style="display: inline-block; margin: 8px;">';
              echo '<a href="/play/img/' . $screenshot . '.jpg" data-toggle="lightbox" ';
              echo 'data-title="' . $realm["title"] . '<small> screenshot #' . $screenshot_count . '</small>" data-parent=".wrapper-parent" ';
              echo 'data-gallery="gallery-' . $realm["id"] . '"> ';
              echo '<img src="/play/img/' . $screenshot . '-thumb.jpg"></a>'; 
              echo '<div class="caption"><a href="#" class="btn removeScreenshot" data-id="' . $screenshot . '"><i class="fa fa-trash-o"></i> Remove</a></div></div>';
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
            if (count($screenshots) < 6) {
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
        <h4 class="modal-title">Bring Realm Online</h4>
      </div>
      <div class="modal-body" id="modalTakeRealmOnlineContent">
        <?php if ($realm_cents < 25) { ?>
        <div class="alert alert-warning" role="alert">
          <strong>Heads Up!</strong> Your realm needs at least $0.25 of funds before you're able to launch a private server.
        </div>
        <?php } ?>
        <div class="row" style="padding-top: 8px;">
          <div class="col-md-6">
            <!-- FREE SERVER -->
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="radio">
                  <label>
                    <input type="radio" name="serverTypeRadios" id="typeFree" value="0" checked>
                    <span class="h4">Shared Server</span>
                  </label>
                </div>
              </div>
              <div class="panel-body">
                <h4>Free</h4>
              </div>
              <ul class="list-group">
                <li class="list-group-item">Max simultaneous users: 10</li>
                <li class="list-group-item">Resources shared among all online realms on server</li>
                <li class="list-group-item">Players will queue globally, i.e. server player limit shared between realms</li>
                <li class="list-group-item">Realm background processing will stop if no players are online</li>
              </ul>
            </div>
          </div>
          <div class="col-md-6">
            <!-- PAID SERVER -->
            <div class="panel panel-default">
              <div class="panel-heading">
              <?php if ($realm_cents < 25) { ?>
                <div class="radio disabled">
                  <label>
                    <input type="radio" name="serverTypeRadios" id="typePaid1" value="1" disabled>
                    <span class="h4"><s>Small Private Server</s></span>
                  </label>
                </div>
              <?php } else { ?>
                <div class="radio">
                  <label>
                    <input type="radio" name="serverTypeRadios" id="typePaid1" value="1">
                    <span class="h4">Small Private Server</span>
                  </label>
                </div>
              <?php } ?>
              </div>
              <div class="panel-body">
                <h4>$0.01 per hour <small>(1 cent)</small></h4>
              </div>
              <ul class="list-group">
                <li class="list-group-item">Max simultaneous users: Up to you</li>
                <li class="list-group-item">512MB Memory, 1 Core Processor, 20GB SSD</li>
                <li class="list-group-item">Players will only wait if you have max users</li>
                <li class="list-group-item">Realm is only stopped by you, allowing for static worlds</li>
                <li class="list-group-item" style="display: none;">More control, including options for invite-only and unlisted</li>
              </ul>                        
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div id="realmOnlineAlert" class="alert alert-danger" style="display: none;"></div>
        <button id="takeRealmOnline" type="button" class="btn btn-default">Bring Online</button>
        <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times"></i> Cancel</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="modalTakeRealmOffline" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h4 class="modal-title">Take Realm Offline</h4>
      </div>
      <div class="modal-body" id="modalTakeRealmOfflineContent">
        <p><strong>Are you sure?</strong> All users will be disconnected and your realm page will indicate your server is offline.</p>
      </div>
      <div class="modal-footer">
        <div id="realmOfflineAlert" class="alert alert-danger" style="display: none;"></div>
        <button id="takeRealmOffline" type="button" class="btn btn-default">Yes</button>
        <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times"></i> Cancel</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="modalDestroy" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">Destroy Realm</h4>
            </div>
            <div class="modal-body" id="modalTakeRealmOfflineContent">
                <p><strong>Are you sure? 100% sure?</strong> This action is permanent. Your realm source code will not be able to be recovered. You might want to download a backup of the code before doing this. Just saying.</p>
            </div>
            <div class="modal-footer">
                <div id="realmOfflineAlert" class="alert alert-danger" style="display: none;"></div>
                <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times"></i> Cancel</button>
                <button id="destroyRealmConfirm" data-id="<?php echo $realm['id'] ?>" type="button" class="btn btn-default">Delete this sucker!</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="modalDeposit" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">Deposit Funds</h4>
            </div>
            <div class="modal-body" id="modalDepositContent">
                <div class="row" style="padding-top: 8px;">
                    <div class="col-md-3">
                        <p class="text-right text-muted"><strong>Deposit Amount:</strong></p>
                    </div>
                    <div class="col-md-9">
                        <div class="input-group">
                            <i class="fa fa-usd input-group-addon"></i>
                            <input class="form-control" type="number" id="depositAmount" value="0.00" step=".01" style="display: inline-block; width: 75px; vertical-align: top;">
                            <input type="range" min="0" max="<?php echo $loggedInUser->funds() ?>" value="0" id="depositAmountSlider" step=".01" style="display: inline-block; width: 250px; margin-left: 4px; margin-top: 4px;">
                        </div>
                    </div>
                </div>
                <div class="row" style="padding-top: 8px;">
                    <div class="col-md-3">
                        <p class="text-right text-muted"><strong>Realm Funds After Deposit:</strong></p>
                    </div>
                    <div class="col-md-9">
                        <span id="realmFundsAfter">$<?php echo money_format("%!n", ($realm["funds"] / 100)) ?></span>
                    </div>
                </div>
                <div class="row" style="padding-top: 8px;">
                    <div class="col-md-3">
                        <p class="text-right text-muted"><strong>Realm Lifespan After Deposit:</strong></p>
                    </div>
                    <div class="col-md-9">
                        <span id="realmLifespan">0 days, 0 hours</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div id="depositAlert" class="alert alert-danger" style="display: none;"></div>
                <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times"></i> Cancel</button>
                <button id="depositButton" type="button" class="btn btn-default">Approve Deposit</button>
            </div>
        </div>
    </div>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">

  $(document).delegate('*[data-toggle="lightbox"]', 'click', function(e) {
    e.preventDefault();
    $(this).ekkoLightbox();
  });
    
<?php if ($published) { ?>
    $("#publish-date").text(
      moment($("#publish-date").text()+ " +0000").format("MMMM Do YYYY, h:mm:ss a")
    );
<? } ?>

  var __markdownCreateNewDB = true;
  var __realmID = <?php echo $_SERVER['QUERY_STRING'] ?>;
  var __realmFunds = parseFloat("<?php echo $realm["funds"] ?>");
  var __realmOnline = parseInt(<?php echo $realm["status"] ?>);
  var __realmLevel = parseInt(<?php echo $realm["level"] ?>);
  var __realmSource = "<?php echo $realm["source"] ?>";
  var __existingState = {
    description: "<?php echo htmlspecialchars($realm['description'], ENT_QUOTES, 'UTF-8'); ?>",
    show_funding: <?php echo $realm["show_funding"] ?>
  };
    
  var __currentState = _.clone(__existingState, true);
    
  $('.row').css('margin-bottom', '12px');
</script>

<script src="/build/js/manager.js" type="text/javascript" charset="utf-8"></script>
<script src="/build/js/utilities.js" type="text/javascript" charset="utf-8"></script>
<script src="/build/js/ekko-lightbox.min.js" type="text/javascript" charset="utf-8"></script>
<script src="/js/smoothie.js" type="text/javascript" charset="utf-8"></script>

<script src="https://cdn.socket.io/socket.io-1.3.5.js"></script>

</body>
</html>