<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
  $user_id  = $_POST['user_id'];
  $realms   = fetchUserRealms($user_id);
  if ($realms) {
    echo json_encode($realms);
  } else {
    echo 'null';
  }
  die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

$alert = '';

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $userID = $_SERVER['QUERY_STRING'];
    $user = fetchUserDetails(NULL, NULL, $userID);
    
} else {
    $alert = "Please stop tinkering.";
}

?>

<div id="content" class="container">
    
    <h2><?= $user["display_name"] ?> <small> <?= $user["title"] ?></small></h2>
    <div class="media">
        <div class="pull-left">
          <?php if ($user['has_image'] == 1) { ?>
            <img src="/img/profiles/<?=$userID . ".jpg?" . time() ?>" />
          <?php } else { ?>
            <img src="/img/anonymous.png" />
          <?php } ?>
        </div>
        
        <div id="blurb" class="media-body"><?=fetchUserBlurb($userID)?></div>
    </div>
    
    <h2>&nbsp;</h2>
    <div id="userRealms" style="display: none; padding-bottom: 40px;"></div>
    
</div>

<script id="realms_template" type="text/template">
    
  <div id="results">
    <% _.each( realms, function( realm ){ %>
    <div class="playListRealm">
      <a href="/play/realm/<%- realm.id %>" style="color: inherit;">
      <div class="row">
        <div class="col-md-11">
          <!-- Title -->
          <div class="pull-left" style="min-width: 100px; max-width: 400px; margin-right: 20px;">
            <span class="realmTitle"><%- realm.title %></span>
          </div>
          
          <!-- Description -->
          <% if (realm.description) { %>
              <p class="text-justify"><%- realm.description %></p>
          <% } else { %>
              <p class="text-justify">&nbsp;</p>
          <% } %>
        </div>
        <div class="col-md-1">
          <!--  Online / Offline + users  -->
          <% if (realm.status == 1) { %>
            <span class="label-play-stats label label-success">Online <i class="fa fa-power-off fa-fw"></i></span>
          <% } else { %>
            <span class="label-play-stats label label-default">Offline <i class="fa fa-power-off fa-fw"></i></span>
          <% } %>
          <span class="label-play-stats label label-default"><%- realm.players %> <i class="fa fa-child fa-fw"></i></span>
          
          <!--  Loves -->
          <span class="label-play-stats label label-default"><%- realm.loves %> <i class="fa fa-heart fa-fw"></i></span>
        </div>
      </div>
      </a>
      
      <% if (realm.screenshots.length > 0) { %>
      <div>
<!-- Screenshots are in the format {id}-{#}-thumb.jpg and {id}-{#}.jpg, e.g. 42-1.jpg and 42-1-thumb.jpg -->
        <% for (var i = 0; i < realm.screenshots.length; i++) { %>
        <div style="width: 161px; height: 160px; display: inline-block;">
          <a href="/play/img/<%- realm.screenshots[i] + '.jpg' %>"
             data-toggle="lightbox"
             data-title="<%- realm.title + '<small> screenshot #' + (i + 1) + ' </small>' %>"
             data-parent=".wrapper-parent"
             data-gallery="<%- 'gallery-' + realm.id %>" class="thumbnail">
              <img src="/play/img/<%- realm.screenshots[i] + '-thumb.jpg' %>">
          </a>
        </div>
        <% } %>
      </div>
      <% } %>
    </div>
    <% }); %>
  </div>
    
</script>

<script src="/build/js/marked.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">

  $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
    event.preventDefault();
    $(this).ekkoLightbox();
  });

  $(document).ready(function () {
    $("#blurb").html(marked($("#blurb").text()));
    
    var templateFn = _.template($('#realms_template').html());
    
    var parameters = {};
    parameters.directive  = "list";
    parameters.user_id    = <?=$userID?>;
    
    $.post("/user/id.php", parameters, function (data) {
      if (data !== "null") {
        
        data = JSON.parse( data );
        
        _.forEach(data, function (realm) {
          realm.screenshots = JSON.parse(realm.screenshots);
        });
        
        $("#userRealms").html(templateFn({ 'realms': data }));
      } else {
        $("#userRealms").prev().hide();
        $("#userRealms").hide();
      }
      
      $("#userRealms").fadeIn();
    });
    
  });
</script>

</body>
</html>