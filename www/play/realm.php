<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?1");
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
    $realm = $loggedInUser->fetchRealm($realmID);
    $loved = $loggedInUser->lovesRealm($realmID);
    
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
                    <i class="fa fa-heart"></i>&nbsp;<span id="loveCount"><?=$realm['loves']?></span>
                    &nbsp;&nbsp;
                    <i class="fa fa-comments"></i>&nbsp;<span id="commentCount"><?=$realm['comments']?></span>
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
        <?php if ($loved) { ?>
            <button id="btnLove" type="button" class="btn btn-default navbar-btn" disabled="disabled"><i class="fa fa-heart"></i> Loved!</button>
        <?php } else { ?>
            <button id="btnLove" type="button" class="btn btn-default navbar-btn" data-toggle="button"><i class="fa fa-heart-o"></i> Love</button>
        <?php } ?>
            
            <button id="btnComment" type="button" class="btn btn-default navbar-btn"><i class="fa fa-comments-o"></i> Comment</button>
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
    
    <?php if ($realm['show_funding']) { ?>
    <h4 class="text-muted" style="margin-top: 24px;">Funding</h4>
    <hr />
    <div id="funding"></div>
    <?php } ?>
    
    <h4 class="text-muted" style="padding-top: 24px;">Description</h4>
    <hr />
    <div id="description"></div>
    
    <h4 class="text-muted" style="padding-top: 24px;">Comments</h4>
    <hr />
    <button id="btnLoadComments" type="button" class="btn btn-default"><i class="fa fa-comments-o"></i> Load Comments</button>
    <div id="comment" style="display: none;" class="clearfix">
        <textarea class="form-control" rows="5" cols="100" id="commentContent" placeholder="Add your voice to the conversation..."></textarea>
        <button id="btnAddComment" style="margin-top: 10px;" class="btn btn-default pull-right">Add Comment</button>
    </div>
    
    <div>
        <ul id="comments" class="media-list" style="display:none;">
        </ul>
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

<script src="js/moment.min.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    
    $(document).ready(function () {
        
        var templateFn = _.template($('#comments_template').html());
        var templateReplyFn = _.template($('#comment_reply_template').html());
        
       $('#btnLove').on('click', function (e) {
        
            e.preventDefault();
            
            var button = $(this);
            
            $.post( "realm.php", { directive: "love", realmID: "<?=$realmID?>" })
                .done(function( data ) {
                    if (data !== "null") {
                        
                        button.html('<i class="fa fa-heart"></i>  Loved!');
                        button.prop("disabled",true);
                        
                        var loveCountSpan = $("#loveCount");
                        var loveCount = parseInt(loveCountSpan.text()) + 1;
                        
                        loveCountSpan.text(loveCount);

                    }
                });
            
            
            
       });
       
       $('#btnComment').on('click', function (e) {
            e.preventDefault();
            
            var button = $(this);
            
            button.attr('disabled', true);
            button.html('<i class="fa fa-cog fa-spin"></i> Comment');
            
            var loadButton = $('#loadComments');
            
            loadButton.attr('disabled', true);
            loadButton.html('<i class="fa fa-cog fa-spin"></i> Load Comments');
            
            loadComments();
                
       });
       
       $('#btnLoadComments').on('click', function (e) {
            e.preventDefault();
            
            var button = $(this);
            
            button.attr('disabled', true);
            button.html('<i class="fa fa-cog fa-spin"></i> Load Comments');
            
            var topButton = $('#btnComment');
            
            topButton.attr('disabled', true);
            topButton.html('<i class="fa fa-cog fa-spin"></i> Comment');
            
            loadComments();
       });
       
       $('#btnAddComment').on('click', function (e) {
        
            var button = $(this);
            button.attr('disabled', true);
            button.html('<i class="fa fa-cog fa-spin"></i> Add Comment');
            
            $.post( "realm.php", { directive: "comment", realmID: "<?=$realmID?>", comment: $('#commentContent').val() })
                .done(function( data ) {
                    if (data !== "null") {
                        
                        data = JSON.parse( data );
                        
                        $("#comments").append(templateFn({ 'comments': [data] }));
                        button.removeAttr('disabled');
                        button.html('Add Comment');
                        $('#commentContent').val('');
                        
                        // Scroll page to new comment:
                        $('html, body').animate({
                            scrollTop: $('#comments').find('[data-id="' + data.id + '"]').offset().top
                        }, 1000);

                    }
                });
            
       });
       
       $('#comments').on('click', '.reply', function (e) {
            var button = $(this);
            var contentBlock = button.closest('div [data-id]');
            var commentID = contentBlock.attr('data-id');
            
            var existingReplyToBlock = $('#replyTo');
            
            if (existingReplyToBlock.length > 0) {
                existingReplyToBlock.remove();
            }
            
            contentBlock.append('<div id="replyTo" style="display: none;" class="well clearfix">' +
                                '<textarea class="form-control" rows="5" cols="100" id="replyToCommentContent" placeholder="Add your voice to the conversation..."></textarea>' +
                                '<button id="replyToComment" data-id="' + commentID + '" style="margin-top: 10px;" class="btn btn-default pull-right">Add Comment</button>' +
                                '</div>'
                                );
            
            $('#replyTo').fadeIn();
       });
       
       $('#comments').on('click', '#replyToComment', function (e) {
            var button = $(this);
            
            button.attr('disabled', true);
            button.html('<i class="fa fa-cog fa-spin"></i> Add Comment');
            
            var commentID = button.attr('data-id');
            
            $.post( "realm.php", { directive: "comment", realmID: "<?=$realmID?>", comment: $('#replyToCommentContent').val(), parentID: commentID })
                .done(function( data ) {
                    if (data !== "null") {
                        
                        data = JSON.parse( data );
                        
                        var target = $('#comments').find('[data-id="' + commentID + '"]');
                        target.append(templateReplyFn({'comment': data}));
                        
                        $('#replyTo').remove();
                        
                        // Scroll page to new comment:
                        $('html, body').animate({
                            scrollTop: $('#comments').find('[data-id="' + data.id + '"]').offset().top
                        }, 1000);

                    }
                });
       });
       
       function loadComments() {
            $.post( "realm.php", { directive: "comment", realmID: "<?=$realmID?>" })
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
                
                $('#btnLoadComments').hide();
                $('#comments').fadeIn();
                $("#comment").fadeIn(400, function() {
                    // Scroll page to comments section:
                    $('html, body').animate({
                        scrollTop: $("#comment").offset().top - 100
                    }, 400);
                });
                
                $('#btnComment').html('<i class="fa fa-comments-o"></i> Comment');
                
            });
        }
       
    });
    
</script>

</body>
</html>