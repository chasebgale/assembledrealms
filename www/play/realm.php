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
        //       add messages to profile!
        $alert = "Realm is offline! :(.";
    }
    
} else {
    $alert = "Please stop tinkering.";
}

?>

<div id="content">
    <?php
    if ($alert) {
        echo "<h2>" . $alert . "</h2>";
    } else {
        echo '<iframe src="http://' . $realm['url'] . '"
                style="border: 0; width:800px; height:600px; display: block; margin: 0 auto;"></iframe>';   
    }
    ?>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

</body>
</html>