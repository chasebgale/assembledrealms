<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
  // TODO: Pick least congested server, if I'm lucky and anyone actually enjoys this :0
  $host       = "http://demo-01.assembledrealms.com";
  $session_id = session_id();  
  $realmID    = 1;
  $realm      = fetchRealm($realmID);
  
  if (!isUserLoggedIn()) {
    $user_id = 0;
  } else {
    $user_id = $loggedInUser->user_id;
  }
  
  $owner      = ($realm['user_id'] == $user_id);
  $post_body  = http_build_query(array(
    'php_sess' => $session_id,
    'user_id' => $user_id,
    'owner' => $owner
  ));
  
  $curl 			= curl_init();
  $demo_token = "045603f288bcdb3391ba819eb9fc8346bc81f4276a7911471bfc5a1881ceff37";

  curl_setopt_array($curl, array(
    CURLOPT_HTTPHEADER 		  => array('Authorization: ' . $demo_token),
    CURLOPT_HEADER          => false,
    CURLOPT_RETURNTRANSFER 	=> true,
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => $post_body,
    CURLOPT_SSL_VERIFYHOST 	=> 0,
    CURLOPT_SSL_VERIFYPEER 	=> false,
    CURLOPT_URL 			      => $host . '/auth/'
  ));

  $resp       = curl_exec($curl);
  $httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
      
  curl_close($curl);
  
  // error_log("Curl response body: " . $resp . "\n", 3, $logfile);
      
  if (($httpcode < 200) && ($httpcode > 299)) {
    // We have an error:
    // error_log($httpcode . ": " . $resp, 3, $logfile);
    echo "Auth fail.";
    die();
  } else {
    echo json_encode(array ('server' => $host . "/realms/1", 'raw' => $resp));
    die();
  }
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");
?>

<div id="intro" style="width: 100%; height: 100vh; background-size: cover; background-image:url('/img/front_page_background.png'); color: white;">
  <h1 class="text-center hide-for-play" style="padding-top: 100px;"><strong>BUILD AN AWESOME MMO IN YOUR BROWSER</strong></h1>
  <h3 class="text-center hide-for-play">QUICK-START FROM AN EXISTING GAME &#9642; DEVELOPER/COMMUNITY TOOLS</h3> <h3 class="text-center hide-for-play"><strong>CLIENT/SERVER CODE IN ONE LANGUAGE: JAVASCRIPT</strong></h3>
  <div id="play-now" class="hide-for-play">
    <a id="play-now-link" href="#" style="color: #999;">
      <h1 class="text-center">
        <strong>PLAY</strong>
      </h1>
      <p class="text-center" style="font-size: 0.75em;">(The Game In The Background)</p>
      <h1 class="text-center" style="margin-top: 4px; margin-bottom: 20px;">
        <strong>NOW</strong>
      </h1>
    </a>
  </div>
  <div id="realm-container" style="padding-top: 20px; display: none;">
    <div style="margin: 20px auto; width: 896px; padding: 0; background-color: black;">
      <div id="realm" style="margin: 0; width: 896px; height: 504px; padding: 0; display: none;"></div>
      <div id="queue" style="margin: 0; width: 896px; height: 504px; padding: 0;"></div>
    </div>
  </div>
</div>
</div>

<script src="/js/pixi.min.js"></script>
<script src="/js/async.js"></script>
<script src="/demo/demo.js"></script>

<?php
require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");
?>

<script>
  $(function() {
    
    $.ajaxSetup({
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    });
    
    $("#play-now-link").click( function() {
      $.post("/index_new.php", {}, function (data) {
        
        // TODO: Jquery ajax should be doing this automagically?
        data = JSON.parse(data);
        console.log(data);
        
        if (!data) {
          console.log('// TODO: handle this. whoops.');
          return;
        }
        
        if (!data.server) {
          console.log('// TODO: handle this. whoops.');
          return;
        }
        
        $.get(data.server, function (html) {
          $("#realm-container").append(html);
          
          $("#intro .hide-for-play").fadeOut( function () {
            $("#realm-container").fadeIn();
          });
        });
      });      
    });
  });
</script>

</body>
</html>


