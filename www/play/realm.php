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
                    if ($loggedInUser->loveRealm($_POST['realmID'])) {
                        echo "OK";
                    }
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
  <div id="realmBar" class="center-block clearfix" style="margin-bottom: 40px;">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-10" style="padding-left: 0;"><h1 style="margin-top: 0;"><?=$realm['title']?></h1></div>
        <div class="col-md-2" style="padding-right: 0;">
          <h4 class="text-right"><small>
            <i class="fa fa-heart"></i>&nbsp;<span id="loveCount"><?=$realm['loves']?></span>
            &nbsp;&nbsp;
            <i class="fa fa-comments"></i>&nbsp;<span id="commentCount"><?=$realm['comments']?></span>
          </small></h4>
        </div>
      </div>      
    </div>

    <div class="media pull-left">
      <a class="pull-left" href="#">
      <?php if ($creator['has_image'] == 1) { ?>
        <img width="50" height="50" class="media-object" src="/img/profiles/<?=$realm['user_id'] . ".jpg?" . time() ?>">
      <?php } else { ?>
        <img width="50" height="50" class="media-object" src="/img/anonymous.png" />
      <?php } ?>
      </a>
      <div class="media-body">
        <h4 class="media-heading"><?=$realm['display_name']?><br />
        <small>published this realm on 12.03.14</small></h4>
      </div>
    </div>
      
    <div class="pull-right" id="actionButtons" style="display: none;">
    <?php if ($loved) { ?>
      <button id="btnLove" type="button" class="btn btn-default navbar-btn" disabled="disabled"><i class="fa fa-heart"></i> Loved!</button>
    <?php } else { ?>
      <button id="btnLove" type="button" class="btn btn-default navbar-btn" data-toggle="button"><i class="fa fa-heart-o"></i> Love</button>
    <?php } ?>  
      <button id="btnComment" type="button" class="btn btn-default navbar-btn"><i class="fa fa-comments-o"></i> Comment</button>
    </div>
  
  </div>
    
    <!--
    <?php
    $style = 'border: 0; width:896px; height:504px; display: block; margin: 0 auto;';
    if ($alert) {
      echo '<div style="background-color: #eee; ' . $style . '"><div class="absoluteCenter text-danger" style="margin-top: 215px; text-align: center; width: 400px;">' . $alert . '</div></div>';
    } else {
      echo '<div id="realm-container" style="' . $style . '">' . $resp . '</div>';
    }
    ?>
    -->
    
    <div id="realm-container">
      <div style="margin: 20px auto; width: 896px; padding: 0; background-color: black;">
        <div id="realm" style="margin: 0; width: 896px; height: 504px; padding: 0; display: none;"></div>
        <div id="queue" style="margin: 0; width: 896px; height: 504px; padding: 0;"></div>
      </div>
    </div>
  <div id="tabsContainer" style="display: none;">
        
		<ul id="tabs" class="nav nav-tabs" role="tablist" style="margin-top: 60px;">
			<li class="active"><a href="#tab_readme" role="tab" data-toggle="tab">Readme</a></li>
			<?php if ($realm['show_funding']) { ?>
			<li><a href="#tab_funding" role="tab" data-toggle="tab">Funding</a></li>
			<?php } ?>
			<li><a href="#tab_comments" role="tab" data-toggle="tab">Comments</a></li>
			<li><a href="#tab_credits" role="tab" data-toggle="tab">Credits</a></li>
		</ul>
    
		<!-- Tab panes -->
		<div class="tab-content">
    
			<div id="tab_readme" style="margin-top: 32px;" class="tab-pane active"></div>
		
			<?php if ($realm['show_funding']) { ?>
			<div id="tab_funding" class="tab-pane clearfix" style="margin-top: 32px;">
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
		
			<div id="tab_comments" class="tab-pane" style="margin-top: 32px;">
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

<script id="comments_template" type="text/template">
    
<% _.each( comments, function( comment ){ %>
    
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
   
  $.ajaxSetup({
    crossDomain: true,
    xhrFields: {
      withCredentials: true
    }
  });
    
  $(document).ready(function () {
    $.get("<?php echo $url_from_auth; ?>", function (data) {
      console.log("ON DOC READY HANDLER:");
      console.log(data);
      $("#realm-container").append(data);
    });
  });
    
</script>

</body>
</html>