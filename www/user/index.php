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

<div id="content">
    
    <div class="media">
        <div class="pull-left">
            <img src="/img/profiles/<?=$userID . ".jpg?" . time() ?>" />
        </div>
        
        <div class="media-body">
            <h3 class="media-heading">
                <?= $user["display_name"] ?><br />
                <small><?= $user["title"] ?></small>
            </h3>
        </div>
    </div>
    
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

</body>
</html>