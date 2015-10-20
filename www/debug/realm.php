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

$alert = '';

if (is_numeric($_SERVER['QUERY_STRING'])) {
  $realmID = $_SERVER['QUERY_STRING'];
  $realm   = $loggedInUser->fetchRealm($realmID);
  
  if ($realm['status'] == 0) {
    // TODO: Alert realm owner someone tried to play when offline
    $alert = "<h3 style='font-size: 52px; color: white; font-weight: bold;'><i class='fa fa-power-off'></i> OFFLINE</h3>";
  } else {
/* 
  NOTE: url and address are different, in the DB a realm could have a url of 'debug-04.assembledrealms.com/45' or 'www.assembledrealms.com/play/realm/43', but the address will include the correct port the debug realm is listening on, or just the ip of the realm droplet we have brought up, i.e. debug-04.assembledrealms.com:4451 or 254.222.33.12
  
  Actually, the more I am thinking about it, address in the db should be an integer of the id on a realm_address table, containing realm_id, host, secret-key
*/
      
    if ($realm['level'] == 0) {
      // Free realm hosting
      $host       = "http://debug-" . $realm['address_debug'] . ".assembledrealms.com";
      $session_id = session_id();
      
      $post_body  = http_build_query(array('php_sess' => session_id(),
                                           'user_id' => $loggedInUser->user_id,
                                           'owner' => false
      ));
      
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
        CURLOPT_URL 			      => $host . '/auth'
      ));

      $resp       = curl_exec($curl);
      $httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
          
      curl_close($curl);
          
      if (($httpcode < 200) && ($httpcode > 299)) {
        // We have an error:
        error_log($httpcode . ": " . $resp, 3, $logfile);
        echo "Auth fail.";
        die();
      } else {
        $url_from_auth = $host . "/realms/play/" . $realmID;
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
    
} else {
    $alert = "Please stop tinkering.";
}

?>

<div id="content" class="container">
    
    <?php
    $style = 'border: 0; width:896px; height:504px; display: block; margin: 0 auto;';
    if ($alert) {
        echo '<div style="background-color: #eee; ' . $style . '"><div class="absoluteCenter text-danger" style="margin-top: 215px; text-align: center; width: 400px;">' . $alert . '</div></div>';
    } else {
		echo '<div id="realm-container" style="' . $style . '">' . $resp . '</div>';
	}
    ?>
    
</div>

<script src="/play/js/marked.js"></script>
<script src="/build/js/utilities.js"></script>
<script src="/js/keyboard.js"></script>
<script src="/js/pixi.min.js"></script>
<script src="/js/bigscreen.min.js"></script>
<script src="/js/async.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    
    var __renderer;
    
    var engine 		= undefined;		
    var	loading		= false;
    
    $(document).ready(function () {
		
      engine = new Engine();

      engine.loaded = function () {
        
        $("#loading").fadeOut(function () {
          $("#container").fadeIn();
        });
      
        animate();
      };
      
      engine.loading = function (e) {
        /*
          _numToLoad: 70
          _progressChunk: 1.4285714285714286
        */
        if (!loading) {
          loading = true;
          $("#loading_text").text("Downloading realm assets...");
        }
        
        var string_width = Math.floor(e.progress) + "%";
        
        $("#loading_progress").width(string_width);
        $("#loading_progress").text(string_width)
        $("#loading_progress").attr("aria-valuenow", Math.floor(e.progress));
      }
      
      function animate() {
        
        engine.render();
        requestAnimationFrame(animate);

      }
    
      engine.initialize( document.getElementById("realm") );
       
    });
    
</script>

</body>
</html>