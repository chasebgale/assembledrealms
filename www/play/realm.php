<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?1");
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

$alert = '';

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realmID = $_SERVER['QUERY_STRING'];
    $realm = $loggedInUser->fetchRealm($realmID);
    
    if ($realm['status'] == 0) {
        // TODO: Alert realm owner someone tried to play when offline,
        //       (add messages/alerts to profile!)
        $alert = "Realm is offline! <i class='fa fa-frown-o'></i>";
    }
    
} else {
    $alert = "Please stop tinkering.";
}

?>

<div id="content">
    
    
    <div id="realmBar" class="center-block clearfix" style="margin-bottom: 40px;">
        
        <div class="container-fluid">

        <div class="row">
            <div class="col-md-2">&nbsp;</div>
            <div class="col-md-8"><h2 class="text-center" style="margin-top: 0;"><?=$realm['title']?></h2></div>
            <div class="col-md-2" style="padding-right: 0;">
                <h4 class="text-right"><small>
                    <i class="fa fa-heart"></i> <?=$realm['loves']?>
                    &nbsp;&nbsp;
                    <i class="fa fa-comments"></i> <?=$realm['comments']?>
                </small></h4></div>
        </div>
        
        </div>

        <div class="media pull-left">
            <a class="pull-left" href="#">
                <img width="50" height="50" class="media-object" src="/img/profiles/<?=$realm['user_id'] . ".jpg?" . time() ?>">
            </a>
            <div class="media-body">
                <h4 class="media-heading"><?=$realm['display_name']?><br />
                <small>published this realm on 12.03.14</small></h4>
            </div>
        </div>
        
        <div class="pull-right">
            <button id="btnLove" type="button" class="btn btn-default navbar-btn" data-toggle="button"><i class="fa fa-heart-o"></i> Love</button>
            <button type="button" class="btn btn-default navbar-btn"><i class="fa fa-comments-o"></i> Comment</button>
        </div>
            
        <!--
        <div class="container">
            <button type="button" class="btn btn-default navbar-btn" data-toggle="button"><i class="fa fa-heart-o"></i> Love</button>
            <button type="button" class="btn btn-default navbar-btn active" data-toggle="button"><i class="fa fa-heart"></i>  Loved!</button>
        </div>
    
        Array ( [id] => 43 [user_id] => 1 [title] => Just Another REALM [description] => This is a short description, I don't really feel like writing one. [status] => 1 [players] => 8 [funds] => 0.00 [screenshots] => 2 [loves] => 14 [url] => debug-01.assembledrealms.com ) 1
        -->
    </div>
    
    <?php
    if ($alert) {
        echo "<h2>" . $alert . "</h2>";
    } else {
        echo '<iframe src="http://' . $realm['url'] . '"
                style="border: 0; width:800px; height:600px; display: block; margin: 0 auto;"></iframe>';   
    }
    ?>

    <div id="comments">
        
    </div>
</div>

<script id="realms_template" type="text/template">
    
    <ul class="media-list">
    
    <% _.each( comments, function( comment ){ %>
    
        
    <li class="media">
        <a class="pull-left" href="#">
        <img class="media-object" src="" alt="">
        </a>
        <div class="media-body">
        <p>Comment</p>
        </div>
    </li>

        
    <% }); %>

    </ul>
    
</script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    $(document).ready(function () {
       $('#btnLove').on('click', function (e) {
            e.preventDefault();
            
            var button = $(this);
            
            if (!button.hasClass('active')) {
                button.html('<i class="fa fa-heart"></i>  Loved!');
                button.prop("disabled",true);
            }
            
       });
    });
</script>

</body>
</html>