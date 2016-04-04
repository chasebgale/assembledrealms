var renderer;
var timeoutID;
var timeoutInterval = 1;

var retryConnection = function() {
  $.get(AUTH_URL, function (data) {
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
  
  var templateFn = _.template($('#comments_template').html());
  var templateReplyFn = _.template($('#comment_reply_template').html());
  
  async.parallel([
    function(callback){
      $.post("/play/realm.php", { directive: "comment", realmID: REALM_ID })
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
      if (REALM_STATUS > 0) {
        $.get(REALM_URL + "README.md", function (data) {
          $("#tab_readme").html(marked(data));
          callback(null, true);
        });
      } else {
        callback(null, true);
      }
    },
    function(callback){
      if (REALM_STATUS > 0) {
        $.get(REALM_URL + "CREDITS.md", function (data) {
          $("#tab_credits").html(marked(data));
          callback(null, true);
        });
      } else {
        callback(null, true);
      }
    }
  ],
  function(err, results){
    $('#tabsContainer').fadeIn();
    $('#actionButtons').fadeIn();
  });
  
  if (REALM_STATUS > 0) {
    $.get(AUTH_URL, function (data) {
      $("#realm-container").append(data);
    });
  }
  
  $("#btnLove").on("click", function (e) {
    e.preventDefault();
    
    var self = $(this);
    self.html('<i class="fa fa-spinner fa-spin fa-fw"></i> Loving...');
    self.attr('disabled', true);
   
    $.post("/play/realm.php", {realmID: REALM_ID, directive: 'love'}, function(data) {
      // Love
      if (parseInt(data) > 1) {
        self.html('<i class="fa fa-fw fa-heart" style="color: pink;"></i> ' + data + '  Loves');
      } else {
        self.html('<i class="fa fa-fw fa-heart" style="color: pink;"></i> ' + data + '  Love');
      }
    });
  });
  
  $("#btnFullscreen").click( function(e) {
    e.preventDefault();
    if (BigScreen.enabled) {
      var realm = document.getElementById('realm');
      BigScreen.request($('#realm').children()[0]);
      // You could also use .toggle(element, onEnter, onExit, onError)
    }
    else {
      // fallback for browsers that don't support full screen
    }
  });
  
  $("#replyToCommentContent").on("focus", function () {    
    if (REALM_STATUS > 0) {
      engine.watch(false);
    }
  });
  
  $("#commentContent").on("focus", function () {    
    if (REALM_STATUS > 0) {
      engine.watch(false);
    }
  });
  
  $("#realm").on("click", function (e) {
    $(":focus").blur();
    engine.watch(true);
    
    $("html, body").animate({
      scrollTop: ($("#realm-container").offset().top - 34)
    }, 750);
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
    button.html('<i class="fa fa-cog fa-spin"></i> Adding Comment');
    
    $.post( "/play/realm.php", { directive: "comment", realmID: REALM_ID, comment: $('#commentContent').val() })
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
    
    $.post( "/play/realm.php", { directive: "comment", realmID: REALM_ID, comment: $("#replyToCommentContent").val(), parentID: commentID })
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