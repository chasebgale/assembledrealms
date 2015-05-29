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
        
        if ($directive == 'markdown') {
            if (isset($_POST['realmID'])) {
                if (is_numeric($_POST['realmID'])) {
                    echo json_encode( $loggedInUser->fetchRealmMarkdown($_POST['realmID']) );
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
        $alert = "<h3 style='font-size: 52px; color: white; font-weight: bold;'><i class='fa fa-power-off'></i> OFFLINE</h3>";
    } else {
        // 1 - Generate GUID
        // 2 - Send GUID and user_id to realm
        // 3 - return iframe with realm url + '/auth/[GUID]'
        // 4 - realm looks up GUID, validates, then removes GUID from redis
        
        
        /* NOTE: url and address are different, in the DB a realm could have a url of 'debug-04.assembledrealms.com/45' or 'www.assembledrealms.com/play/realm/43', but the address will include the correct port the debug realm is listening on, or just the ip of the realm droplet we have brought up, i.e. debug-04.assembledrealms.com:4451 or 254.222.33.12
		
		Actually, the more I am thinking about it, address in the db should be an integer of the id on a realm_address table, containing realm_id, host, secret-key
        */
        if ($realm['address']) {
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
    $style = 'border: 0; width:896px; height:504px; display: block; margin: 0 auto;';
    if ($alert) {
        echo '<div style="background-color: #eee; ' . $style . '"><div class="absoluteCenter text-danger" style="margin-top: 215px; text-align: center; width: 400px;">' . $alert . '</div></div>';
    } else {
        echo '<iframe style="' . $style . '" src="' . $url_from_auth . '"></iframe>';   
    }
    ?>
    
    <div>
        
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

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    
    var __renderer;
    
    
    function fundingMarkdown(data) {
       var variables = {};
       variables.funds = "$12.45";
       variables.priceHour = "$0.009";
       variables.priceDay = "$0.22";
       variables.fundsToTime = "9 days, 11 hours";
       
       var markedOutput = marked(data);
       
       _.forIn(variables, function(value, key) {
          markedOutput = markedOutput.replace('{' + key + '}', value);
       });
       
       return markedOutput;
    }
    
    $(document).ready(function () {
        
        __renderer = new marked.Renderer();
   
        __renderer.table = function(header, body) {
           return '<table class="table table-striped"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
        }
        
        marked.setOptions({
           sanitize: true,
           renderer: __renderer
        });
        
        var templateFn = _.template($('#comments_template').html());
        var templateReplyFn = _.template($('#comment_reply_template').html());
        
        $.post( "realm.php", { directive: "markdown", realmID: "<?=$realmID?>" })
        .done(function( data ) {
            if (data !== "null") {
                
                data = JSON.parse( data );
                
                if (data.description) {
                    $("#tab_readme").html( marked(data.description) );
                }
                
                if (data.funding) {
                    $("#funding").html( fundingMarkdown(data.funding) );
                }

            }
        });
        
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
        });
        
        
        
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
            
            $('#tabs a[href="#tab_comments"]').tab('show');
            
            $('html, body').animate({
                scrollTop: $("#comment").offset().top - 100
            }, 400);
                
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
                        
                        // Update comment count:
                        var commentCountSpan = $("#commentCount");
                        var commentCount = parseInt(commentCountSpan.text()) + 1;
                        commentCountSpan.text(commentCount);
                        
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
       
    });
    
</script>

</body>
</html>