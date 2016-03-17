<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    
    if (is_numeric($_SERVER['QUERY_STRING'])) {
        $realmID = $_SERVER['QUERY_STRING'];
    } else {
        $realmID = '';
    }
    header("Location: /account/register.php?1" . $realmID);
    die();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    
  if (isset($_POST['directive'])) {
      
    $directive = $_POST['directive'];
    
    if ($directive == 'comment') {
        if (isset($_POST['realmID'])) {
            if (is_numeric($_POST['realmID'])) {
        
                if (isset($_POST['comment'])) {
                    // POST COMMENT
                    if (isset($_POST['parentID'])) {
                        $row = $loggedInUser->createRealmComment($_POST['realmID'], $_POST['comment'], $_POST['parentID']);
                    } else {
                        $row = $loggedInUser->createRealmComment($_POST['realmID'], $_POST['comment']);
                    }
                    echo json_encode($row);
                } else {
                    // FETCH COMMENTS
                    $row = $loggedInUser->fetchRealmComments($_POST['realmID']);
                    echo json_encode($row);
                }
                
            }
        }
    }
    
    if ($directive == 'love') {
      if (isset($_POST['realmID'])) {
        if (is_numeric($_POST['realmID'])) {
          echo $loggedInUser->loveRealm($_POST['realmID']);
        }
      }
    }
      
  }
  
  die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

$alert = '';

if (is_numeric($_SERVER['QUERY_STRING'])) {
  $realmID = $_SERVER['QUERY_STRING'];
  $realm   = $loggedInUser->fetchRealm($realmID);
  $loved   = $loggedInUser->lovesRealm($realmID);
  $publish = $loggedInUser->fetchRealmPublish($realmID);
  
  $creator = fetchUserDetails(NULL, NULL, $realm['user_id']);
  
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
      $host       = "https://play-" . $realm['address'] . ".assembledrealms.com";
      $session_id = session_id();
      $user_id    = $loggedInUser->user_id;
      $owner      = ($realm['user_id'] == $user_id);
      
      $post_body  = http_build_query(array(
        'php_sess'   => $session_id,
        'user_id'    => $loggedInUser->user_id,
        'user_name'  => $loggedInUser->displayname,
        'user_image' => $loggedInUser->user_image,
        'owner'      => $owner
      ));
      
      $curl 			= curl_init();
      $play_token = "e61f933bcc07050385b8cc08f9deee61de228b2ba31b8523bdc78230d1a72eb2";

      curl_setopt_array($curl, array(
        CURLOPT_HTTPHEADER 		  => array('Authorization: ' . $play_token),
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
          
      if (($httpcode < 200) && ($httpcode > 299)) {
        // We have an error:
        error_log($httpcode . ": " . $resp, 3, $logfile);
        echo "Auth fail.";
        die();
      } else {
        $url_from_auth = $host . "/realms/" . $realmID;
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
  
  <div id="realmBar" class="center-block clearfix" style="margin-bottom: 20px; width: 896px;">
    <div class="row">
    
      <div class="col-md-6">
        <h1 style="margin-top: 0;"><?=$realm['title']?></h1>
      </div>
      
      <div class="col-md-6">
        <div class="media pull-right">
          <a class="pull-right" href="#">
          <?php if ($creator['has_image'] == 1) { ?>
            <img width="50" height="50" class="media-object" src="/img/profiles/<?=$realm['user_id'] . ".jpg?" . time() ?>" />
          <?php } else { ?>
            <img width="50" height="50" class="media-object" src="/img/anonymous.png" />
          <?php } ?>
          </a>
          <div class="media-body">
            <h4 class="media-heading text-right" style="line-height: 1.25em;">
              <small>created by</small> <span><?=$realm['display_name']?><br></span>
              <span style="display: none;">
                <small>published on <span id="publish-date"><?=$publish?></span></small>
              </span>
            </h4>
          </div>
        </div>
      </div>
      
    </div>
  </div>

  <div id="realm-container">
    <div style="margin: 0 auto; width: 896px; padding: 0; background-color: black;">
      <div id="commandBar">
        <div id="commandBarButtons" class="clearfix" style="margin: 0; padding-top: 2px; padding-left: 6px; padding-right: 6px; width: 100%;">
          <?php if ($loved) { ?>
            <button type="button" id="btnLove" class="btn btn-default btn-xs" disabled="true">
              <i class="fa fa-fw fa-heart" style="color: pink;"></i> <?=($realm['loves'] > 1) ? $realm['loves'] . ' Loves' : $realm['loves'] . ' Love' ?>
            </button>
          <?php } else { ?>
            <button type="button" id="btnLove" class="btn btn-default btn-xs" data-toggle="button"><i class="fa fa-heart-o"></i> <?=($realm['loves'] > 1) ? $realm['loves'] . ' Loves' : $realm['loves'] . ' Love' ?></button>
          <?php } ?>  
          <div class="spacer"></div>
          <button type="button" id="btnComment" class="btn btn-default btn-xs">
            <i class="fa fa-comments fa-fw"></i> <?=$realm['comments']?> Comments
          </button>
          <button type="button" id="btnFullscreen" class="btn btn-default btn-xs pull-right">
            <i class="fa fa-expand fa-fw"></i> Fullscreen
          </button>
        </div>
      </div>
      <div id="realm" style="margin: 0; width: 896px; height: 504px; padding: 0; display: none;"></div>
      <div id="queue" style="margin: 0; width: 896px; height: 504px; padding: 0;">
        <div style="padding-top: 216px; text-align: center; color: white;">
          <h3><i class="fa fa-spinner fa-spin fa-fw"></i> Connecting...</h3>
        </div>
      </div>
    </div>
  </div>
  
  <div id="tabsContainer" style="display: none;">
    <div style="margin: 0 auto; width: 896px; padding: 0;">
      <ul id="tabs" class="nav nav-tabs" role="tablist">
        <li class="active"><a href="#tab_readme" role="tab" data-toggle="tab">Readme</a></li>
        <?php if ($realm['show_funding']) { ?>
        <li><a href="#tab_funding" role="tab" data-toggle="tab">Funding</a></li>
        <?php } ?>
        <li><a href="#tab_comments" role="tab" data-toggle="tab">Comments</a></li>
        <li><a href="#tab_credits" role="tab" data-toggle="tab">Credits</a></li>
      </ul>
    
      <!-- Tab panes -->
      <div class="tab-content" style="min-height: 400px; margin-top: 20px;">
      
        <div id="tab_readme" class="tab-pane active"></div>
      
        <?php if ($realm['show_funding']) { ?>
        <div id="tab_funding" class="tab-pane clearfix">
          <div id="funding"></div>
          <div id="realmFundingDonate" style="float: right;">
            <form class="form-horizontal" role="form">
              <div class="form-group">
                <label class="col-sm-6 control-label">
                  <img src="/img/profiles/<?=$loggedInUser->user_id . ".jpg?" . time() ?>" />
                </label>
                <div class="col-sm-6">
                  <p class="form-control-static"><?=$loggedInUser->displayname?></p>
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-6 control-label">Account Balance</label>
                <div class="col-sm-6">
                  <p class="form-control-static">$ <?=$loggedInUser->funds()?></p>
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-6 control-label" for="donationAmount">Donation Amount</label>
                <div class="col-sm-6 left-inner-addon">
                  <span>$</span>
                  <input id="donationAmount" type="text" class="form-control" style="display: inline; width: 92%;" />
                </div>
              </div>
              <button type="button" class="btn btn-default pull-right">Donate</button>
            </form>
          </div>
        </div>
        <?php } ?>
      
        <div id="tab_comments" class="tab-pane">
          <div id="comment" style="margin-top: 0px;" class="clearfix">
            <textarea class="form-control" rows="5" cols="100" id="commentContent" placeholder="Add your voice to the conversation..."></textarea>
            <button id="btnAddComment" style="margin-top: 10px;" class="btn btn-default pull-right">Add Comment</button>
          </div>
          
          <div>
            <ul id="comments" class="media-list">
            </ul>
          </div>    
        </div>
        
        <div id="tab_credits" class="tab-pane"></div>
      
      </div>
    </div>
	</div>
</div>

<script id="comments_template" type="text/template">
    
  <% _.each( comments, function( comment ) { %>
      
    <% if (!comment.parent_id) { %>
    <li class="media">
      <a class="pull-left" href="/user/?<%-comment.user_id%>">
        <img width="50" height="50" class="media-object" src="/img/profiles/<%- comment.user_id + ".jpg" %>">
      </a>
      <div class="media-body" data-id="<%- comment.id %>">
        <h4 class="media-heading">
          <small><i>
          <%= '<a href="/user/?' + comment.user_id + '">' + comment.display_name + '</a> commented ' + moment(comment.timestamp + '+00:00').fromNow() %>
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
    <a class="pull-left" href="/user/?<%-comment.user_id%>">
      <img width="50" height="50" class="media-object" src="/img/profiles/<%- comment.user_id + ".jpg" %>">
    </a>
    <div class="media-body" data-id="<%- comment.id %>">
      <h4 class="media-heading">
        <small><i>
        <%= '<a href="/user/?' + comment.user_id + '">' + comment.display_name + '</a> commented ' + moment(comment.timestamp + '+00:00').fromNow() %>
        <button class="btn btn-default btn-xs reply"><i class="fa fa-reply"></i></button>
        </i></small>
      </h4>
      <p><%- comment.content %></p>
    </div>
  </div>

</script>

<script src="/play/js/marked.js"></script>
<script src="/build/js/utilities.js"></script>
<script src="/js/keyboard.js"></script>
<script src="/js/pixi.min.js"></script>
<script src="/js/bigscreen.min.js"></script>
<script src="/js/async.js"></script>
<script src="/play/js/play.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
   
  var REALM_ID  = "<?=$realmID?>";
  var REALM_URL = "<?php echo "https://play-" . $realm['address'] . ".assembledrealms.com/realms/" . $realmID . "/" ?>";
  var renderer;
  var timeoutID;
  var timeoutInterval = 1;
   
  $.ajaxSetup({
    crossDomain: true,
    xhrFields: {
      withCredentials: true
    }
  });
  
  var retryConnection = function() {
    $.get("<?php echo $url_from_auth; ?>", function (data) {
      $("#realm-container").append(data);
    });
  };
    
  $(document).ready(function () {
    
    $("#publish-date").text(
      moment($("#publish-date").text()+ " +0000").format("MMMM Do YYYY, h:mm:ss a")
    );
    
    $("#publish-date").parent().parent().fadeIn();
    
    renderer = new marked.Renderer();
    renderer.table = function(header, body) {
      return '<table class="table table-striped"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
    }

    marked.setOptions({
      sanitize: true,
      renderer: renderer
    });
    
    async.parallel([
      function(callback){
        $.post( "realm.php", { directive: "comment", realmID: REALM_ID })
          .done(function( data ) {
            if (data !== "null") {
              data = JSON.parse( data );
              $("#comments").html(templateFn({ 'comments': data }));
              
              for (var i =0; i < data.length; i++) {
                if (data[i].parent_id) {
                  var target = $('#comments').find('[data-id="' + data[i].parent_id + '"]');
                  target.append(templateReplyFn({'comment': data[i]}));
                }
              }
            } 
            callback(null, true);
          });
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
      $('#tabsContainer').fadeIn();
      $('#actionButtons').fadeIn();
    });
        
    $.get("<?php echo $url_from_auth; ?>", function (data) {
      $("#realm-container").append(data);
    });
    
    $("#btnLove").on("click", function (e) {
      e.preventDefault();
      
      var self = $(this);
      
      self.html('<i class="fa fa-spinner fa-spin fa-fw"></i> Loving...');
      self.attr('disabled', true);
      
      //realmID
      $.post(window.location, {realmID: <?=$realmID?>, directive: 'love'}, function(data) {
        // Love
        if (parseInt(data) > 1) {
          self.html('<i class="fa fa-fw fa-heart" style="color: pink;"></i> ' + data + '  Loves');
        } else {
          self.html('<i class="fa fa-fw fa-heart" style="color: pink;"></i> ' + data + '  Love');
        }
      });
    });
    
    $("#btnFullscreen").click( function() {
      if (BigScreen.enabled) {
        var realm = document.getElementById('realm');
        BigScreen.request($('#realm').children()[0]);
        // You could also use .toggle(element, onEnter, onExit, onError)
      }
      else {
        // fallback for browsers that don't support full screen
      }
    });
    
  });
    
</script>

</body>
</html>