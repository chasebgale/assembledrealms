<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
  // TODO: Pick least congested server, if I'm lucky and anyone actually enjoys this :0
  $host       = "https://demo-01.assembledrealms.com";
  $session_id = session_id();  
  $realmID    = 1;
  $realm      = fetchRealm($realmID);
  
  if (!isUserLoggedIn()) {
    $user_id = 0;
  } else {
    $user_id = $loggedInUser->user_id;
  }
  
  if ($user_id === 0) {
    $display = ' ';
  } else {
    $display = $loggedInUser->displayname;
  }
  
  $owner      = ($realm['user_id'] == $user_id);
  $post_body  = http_build_query(array(
    'php_sess' => $session_id,
    'user_id' => $user_id,
    'owner' => $owner,
    'displayname' => $display
  ));
  
  $curl             = curl_init();
  $demo_token = "045603f288bcdb3391ba819eb9fc8346bc81f4276a7911471bfc5a1881ceff37";

  curl_setopt_array($curl, array(
    CURLOPT_HTTPHEADER        => array('Authorization: ' . $demo_token),
    CURLOPT_HEADER          => false,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => $post_body,
    CURLOPT_SSL_VERIFYHOST  => 0,
    CURLOPT_SSL_VERIFYPEER  => false,
    CURLOPT_URL                   => $host . '/api/auth/1'
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

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");
?>

<div id="intro" style="width: 100%; height: 100vh; background-size: cover; background-image:url('/img/front_page_background.png'); color: white;">
  <h1 class="text-center hide-for-play" style="padding-top: 100px;"><strong>BUILD AN AWESOME MMO IN YOUR BROWSER</strong></h1>
  <h3 class="text-center hide-for-play">QUICK-START FROM AN EXISTING GAME &#9642; DEVELOPER/COMMUNITY TOOLS</h3> <h3 class="text-center hide-for-play"><strong>CLIENT/SERVER CODE IN ONE LANGUAGE: JAVASCRIPT</strong></h3>
  <div id="play-now" class="hide-for-play" style="text-align: center;">
    <div id="previewEditor">
      <div>
        <a href="/img/ide_preview/js_editor.png"
           data-toggle="lightbox"
           data-title="IDE - JS Editor"
           data-parent=".wrapper-parent"
           data-gallery="previews" class="thumbnail">
            <img src="/img/ide_preview/js_editor-thumb.png">
        </a>
      </div>
      <div>
        <a href="/img/ide_preview/map_editor.png"
           data-toggle="lightbox"
           data-title="IDE - Map JSON Editor"
           data-parent=".wrapper-parent"
           data-gallery="previews" class="thumbnail">
            <img src="/img/ide_preview/map_editor-thumb.png">
        </a>
      </div>
      <div>
        <a href="/img/ide_preview/game.png"
           data-toggle="lightbox"
           data-title="<i class='fa fa-quote-left'></i> Gameplay <i class='fa fa-quote-right'></i>"
           data-parent=".wrapper-parent"
           data-gallery="previews" class="thumbnail">
            <img src="/img/ide_preview/game-thumb.png">
        </a>
      </div>
    </div>
    <div id="previewGame" style="display: inline-block; float: none;">
      <button id="play-now-link" class="btn btn-default">
        <i class="fa fa-expand fa-fw"></i> <strong>Play the demo game now!</strong> No registration needed.
      </button>
    </div>
  </div>
  <div id="realm-container" style="padding-top: 30px; display: none;">
    <div id="commandBar" style="margin: 0 auto; width: 896px; padding: 0; background: none;" class="clear-fix">
      <div id="commandBarButtons" class="pull-right">
        <button id="btn-demo-play" class="btn btn-default btn-xs" title="Register an account, then choose any game to play! Choose from the official version of this game or any user-created games!" data-toggle="tooltip" data-placement="bottom">
          <i class="fa fa-external-link fa-fw"></i> Play For Real
        </button>
        <button id="btn-demo-build" class="btn btn-default btn-xs" title="Something feels broken? Fix it. Awesome idea you want to add? Make it so." data-toggle="tooltip" data-placement="bottom">
          <i class="fa fa-external-link fa-fw"></i> Make Changes!
        </button>
        <button id="btn-fullscreen" class="btn btn-default btn-xs">
          <i class="fa fa-expand fa-fw"></i> Fullscreen
        </button>
      </div>
    </div>
    <div style="margin: 0 auto; width: 896px; padding: 0; background-color: #000;">
      <div id="realm" style="background-color: black; margin: 0; width: 896px; height: 504px; padding: 0; display: none;"></div>
      <div id="queue" style="margin: 0; width: 896px; height: 504px; padding: 0;"></div>
    </div>
  </div>
</div>

<div id="tabsContainer" style="background-color: white; display: none;">
  <div style="margin: 0 auto; width: 896px; padding: 0;">
    <ul id="tabs" class="nav nav-tabs" role="tablist">
      <li class="active"><a href="#tab_readme" role="tab" data-toggle="tab">Readme</a></li>
      <li class=""><a href="#tab_credits" role="tab" data-toggle="tab">Credits</a></li>
      <!--<li class=""><a href="#tab_comments" role="tab" data-toggle="tab">Comments</a></li>-->
    </ul>
    
    <!-- Tab panes -->
    <div class="tab-content" style="min-height: 400px; margin-top: 20px;">
      <div id="tab_readme" class="tab-pane active"></div>
      <div id="tab_credits" class="tab-pane"></div>
      <div id="tab_comments" class="tab-pane"></div>
    </div>
  </div>
</div>

<script id="comments_template" type="text/template">
    
  <% _.each( comments, function( comment ) { %>
      
    <% if (!comment.parent_id) { %>
    <li class="media">
      <a class="pull-left" href="/user/id/<%-comment.user_id%>">
        <img width="50" height="50" class="media-object" src="/img/profiles/<%- comment.user_id + ".jpg" %>">
      </a>
      <div class="media-body" data-id="<%- comment.id %>">
        <h4 class="media-heading">
          <small><i>
          <%= '<a href="/user/id/' + comment.user_id + '">' + comment.display_name + '</a> commented ' + moment(comment.timestamp + '+00:00').fromNow() %>
          <button class="btn btn-default btn-xs reply"><i class="fa fa-reply"></i></button>
          </i></small>
        </h4>
        <p><%- comment.content %></p>
      </div>
    </li>
    <% } %>
          
  <% }); %>

</script>

<script id="comment_reply_template" type="text/template">
    
  <div class="media">
    <a class="pull-left" href="/user/id/<%-comment.user_id%>">
      <img width="50" height="50" class="media-object" src="/img/profiles/<%- comment.user_id + ".jpg" %>">
    </a>
    <div class="media-body" data-id="<%- comment.id %>">
      <h4 class="media-heading">
        <small><i>
        <%= '<a href="/user/id/' + comment.user_id + '">' + comment.display_name + '</a> commented ' + moment(comment.timestamp + '+00:00').fromNow() %>
        <button class="btn btn-default btn-xs reply"><i class="fa fa-reply"></i></button>
        </i></small>
      </h4>
      <p><%- comment.content %></p>
    </div>
  </div>

</script>

<?php
require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");
?>

<script src="/play/js/marked.js"></script>
<script src="/play/js/ekko-lightbox.min.js" type="text/javascript" charset="utf-8"></script>
<script src="/js/pixi.min.js"></script>
<script src="/js/async.js"></script>
<script src="/demo/demo.js"></script>

<script>

  var REALM_ID  = 1;
  var REALM_URL = "https://demo-01.assembledrealms.com/realms/1/";

  $(function() {
        
    $("[data-toggle='tooltip']").tooltip();
    
    $(document).delegate("*[data-toggle='lightbox']", "click", function (event) {
      event.preventDefault();
      $(this).ekkoLightbox();
    });
    
    renderer = new marked.Renderer();
    renderer.table = function(header, body) {
      return "<table class='table table-striped'><thead>" + header + "</thead><tbody>" + body + "</tbody></table>";
    }

    marked.setOptions({
      sanitize: true,
      renderer: renderer
    });
    
    var templateFn = _.template($("#comments_template").html());
    var templateReplyFn = _.template($("#comment_reply_template").html());
    
    async.parallel([
      function(callback) {
        callback(null, true);
        /*
        $.post("/play/realm.php", { directive: "comment", realmID: REALM_ID })
        .done(function( data ) {
          if (data !== "null") {
            data = JSON.parse( data );
            $("#comments").html(templateFn({ "comments": data }));
            
            for (var i =0; i < data.length; i++) {
              if (data[i].parent_id) {
                var target = $("#comments").find("[data-id='" + data[i].parent_id + "']");
                target.append(templateReplyFn({"comment": data[i]}));
              }
            }
          } 
          callback(null, true);
        });
        */
      },
      function(callback){
        $.get(REALM_URL + "README.md", function (data) {
          $("#tab_readme").html(marked(data));
          callback(null, true);
        });
      },
      function(callback){
        $.get(REALM_URL + "CREDITS.md", function (data) {
          $("#tab_credits").html(marked(data));
          callback(null, true);
        });
      }
    ],
    function(err, results){
      //$("#intro").animate({height: "600px"}, 1000);
      //$("#tabsContainer").fadeIn();
      
      // $("#actionButtons").fadeIn();
    });
    
    $("#btn-fullscreen").click( function() {
      if (BigScreen.enabled) {
        var realm = document.getElementById('realm');
        BigScreen.request($('#realm').children()[0]);
        // You could also use .toggle(element, onEnter, onExit, onError)
      }
      else {
        // fallback for browsers that don't support full screen
      }
    });
    
    $("#btn-demo-play").click( function() {
      window.location.href = '/play';
    });
    
    $("#btn-demo-build").click( function() {
      window.location.href = '/build';
    });
    
    $("#play-now-link").click( function() {
      
      $(this).attr('disabled', true);
      $(this).html('<i class="fa fa-spinner fa-spin"></i> Loading...');
      
      $.post("/backdoor.php", {}, function (data) {
        
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
            $("#intro").animate({height: "600px"}, 1000);
            $("#tabsContainer").fadeIn();
          });
        });
      });      
    });
  });
</script>

</body>
</html>