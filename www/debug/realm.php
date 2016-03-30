<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    
    if (is_numeric($_SERVER['QUERY_STRING'])) {
        $realmID = $_SERVER['QUERY_STRING'];
    } else {
        $realmID = '';
        // Delete this comment
    }
    header("Location: /account/register.php?1" . $realmID);
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

$alert    = '';
$logfile  = '/home/tmp/realm_debug.log';

if (is_numeric($_SERVER['QUERY_STRING'])) {
  $realmID = $_SERVER['QUERY_STRING'];
  $realm   = $loggedInUser->fetchRealm($realmID);
/* 
  NOTE: url and address are different, in the DB a realm could have a url of 'debug-04.assembledrealms.com/45' or 'www.assembledrealms.com/play/realm/43', but the address will include the correct port the debug realm is listening on, or just the ip of the realm droplet we have brought up, i.e. debug-04.assembledrealms.com:4451 or 254.222.33.12
  
  Actually, the more I am thinking about it, address in the db should be an integer of the id on a realm_address table, containing realm_id, host, secret-key
*/
      
  if ($realm['level'] == 0) {
    // Free realm hosting
    $host       = "https://debug-" . $realm['address_debug'] . ".assembledrealms.com";
    $session_id = session_id();
    $user_id    = $loggedInUser->user_id;
    
    $owner      = ($realm['user_id'] == $user_id);
    
    $post_body  = http_build_query(array('php_sess' => $session_id,
                                         'user_id' => $user_id,
                                         'displayname' => $loggedInUser->displayname,
                                         'owner' => $owner
    ));
    
    error_log("Initiating auth to: " . $host . " with sesh: " . $session_id . " and id: " . $user_id . "\n", 3, $logfile);
    
    $curl 			= curl_init();
    $debug_token = "1e4651af36b170acdec7ede7268cbd63b490a57b1ccd4d4ddd8837c8eff2ddb9";

    curl_setopt_array($curl, array(
      CURLOPT_HTTPHEADER 		  => array('Authorization: ' . $debug_token),
      CURLOPT_HEADER          => false,
      CURLOPT_RETURNTRANSFER 	=> true,
      CURLOPT_POST            => true,
      CURLOPT_POSTFIELDS      => $post_body,
      CURLOPT_SSL_VERIFYHOST 	=> 0,
      CURLOPT_SSL_VERIFYPEER 	=> false,
      CURLOPT_URL 			      => $host . '/api/auth/' . $realmID
    ));

    $resp       = curl_exec($curl);
    $httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
        
    curl_close($curl);
    
    error_log("Curl response body: " . $resp . "\n", 3, $logfile);
        
    if (($httpcode < 200) && ($httpcode > 299)) {
      // We have an error:
      error_log($httpcode . ": " . $resp, 3, $logfile);
      echo "Auth fail.";
      die();
    } else {
      $url_from_auth = $host . "/realms/" . $realmID . "/";
    }
        
  } else {
    // Paid realm hosting has an IP, not a subdomain of assembledrealms.com, so we won't get php sesh info in the headers,
    // so we generate a GUID and use that...
    $guid = GUID();
    
    $curl = curl_init();
    curl_setopt_array($curl, array(
      CURLOPT_RETURNTRANSFER => 1,
      CURLOPT_URL => $realm['address'] . '/auth/{secret-key}/' . $loggedInUser->user_id . '/' . $guid
    ));

    $url_from_auth = curl_exec($curl);
  }

}

?>

<div id="realm-container" style="padding-top: 20px;">
  <div id="container">
    <div style="margin: 20px auto; width: 896px; padding: 0; background-color: black;">
<?php if ($owner) { ?>
      <div id="commandBar">
        <div id="commandBarButtons">
          <button type="button" id="btnReboot" class="btn btn-default btn-xs">
            <i class="fa fa-refresh fa-fw"></i> Reboot
          </button>
          <button type="button" id="btnCommand" class="btn btn-default btn-xs">
            <i class="fa fa-keyboard-o fa-fw"></i> Message -> Server
          </button>
          <div class="spacer"></div>
          <button type="button" id="btnScreenshot" class="btn btn-default btn-xs">
            <i class="fa fa-camera-retro fa-fw"></i> Take Screenshot
          </button>
          <div class="spacer"></div>
          <button type="button" id="btnFPS" class="btn btn-default btn-xs active">
            <i class="fa fa-check-square-o fa-fw"></i> Client Stats
          </button>
          <button type="button" id="btnServerDiagnostics" class="btn btn-default btn-xs active">
            <i class="fa fa-check-square-o fa-fw"></i> Server Stats
          </button>
        </div>
      </div>
<?php } ?>
      <div id="realm" style="margin: 0; width: 896px; height: 504px; padding: 0; display: none;"></div>
      <div id="queue" style="margin: 0; width: 896px; height: 504px; padding: 0;"></div>
<?php if ($owner) { ?>
      <div id="statsBar" class="clearfix">
        <div class="statsBarItem">
          <div style="font-size: 0.75em; vertical-align: top;">
            <span style="color: #999;">SERVER</span>
            <br />
            <span style="color: #ffffff;"><span id="cpu_display"></span> CPU <i class="fa fa-square"></i></span>
            <br />
            <span style="color: #00ff00;"><span id="mem_display"></span> MB <i class="fa fa-square"></i></span>
          </div>
        </div>
        <div id="statsServer" class="statsBarItem">
          <canvas id="chart-server" width="300" height="48" style="display: inline-block;"></canvas>
        </div>
        <div class="spacer"></div>
        <div class="statsBarItem">
          <div style="display: inline-block; font-size: 0.75em; vertical-align: top;">
            <span style="color: #999;">CLIENT</span>
            <br />
            <span style="color: #ffffff; font-size: 0.65em;">(click to change)</span>
          </div>
        </div>
        <div id="statsClient" class="statsBarItem">
        </div>
      </div>
<?php } ?>
    </div>
  </div>
</div>

<script src="/build/js/stats.min.js"></script>
<script src="/build/js/utilities.js"></script>
<script src="/js/pixi.js"></script>
<script src="/js/bigscreen.min.js"></script>
<script src="/js/async.js"></script>
<script src="/js/smoothie.js"></script>
<script src="/debug/debug.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
   
  $.ajaxSetup({
      crossDomain: true,
      xhrFields: {
          withCredentials: true
      }
  });
    
  $(document).ready(function () {
    $.get("<?php echo $url_from_auth; ?>", function (data) {
      $("#realm-container").append(data);
      
      $("#btnFPS").on("click", function (e) {
        var self = $(this);

        if (displayClientStats) {
          // Turn off:
          $("#statsClient").prev().hide();
          $("#statsClient").hide();
          displayClientStats = false;
          self.removeClass("active");
          self.html('<i class="fa fa-square-o fa-fw"></i> FPS');
        } else {
          // Turn on:
          $("#statsClient").prev().show();
          $("#statsClient").show();
          displayClientStats = true;
          self.addClass("active");
          self.html('<i class="fa fa-check-square-o fa-fw"></i> FPS');
        }
      });

      $("#btnServerDiagnostics").on("click", function (e) {

        var self = $(this);

        if (displayServerStats) {
          // Turn off:
          $("#statsServer").prev().hide();
          $("#statsServer").hide();
          displayServerStats = false;
          self.removeClass("active");
          self.html('<i class="fa fa-square-o fa-fw"></i> Server CPU MB');
        } else {
          // Turn on:
          $("#statsServer").prev().show();
          $("#statsServer").show();
          displayServerStats = true;
          self.addClass("active");
          self.html('<i class="fa fa-check-square-o fa-fw"></i> Server CPU MB');
        }
        
        engine.debug(displayServerStats);
      });
      
    });
  });
    
</script>

</body>
</html>