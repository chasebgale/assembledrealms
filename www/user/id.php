<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
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
    
</div>

<script src="/build/js/marked.js"></script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    $(document).ready(function () {
        $("#blurb").html(marked($("#blurb").text()));
    });
</script>

</body>
</html>