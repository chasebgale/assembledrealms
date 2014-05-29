<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
    die();
}

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realm = $loggedInUser->fetchRealm($_SERVER['QUERY_STRING']);
} else {
    echo "<h2>Please stop tinkering.</h2>";
    die();
}
    
?>

<div id="content">

    <h2>
        <?php echo $realm["title"] ?>
        <br />
        <small><?php echo $realm["description"] ?></small>
    </h2>

    <div class="panel panel-default">
        <div class="panel-heading">Primary Actions</div>
        <div class="panel-body">
            <button>Take Realm Offline</button>
            <button>Publish Latest Code (restarts realm)</button>
        </div>
    </div>

    <div class="panel panel-success">
        <div class="panel-heading">Funding</div>
        <div class="panel-body">
            <div class="checkbox">
                <label><input type="checkbox"> Allow crowd funding / donations</label>
            </div>

            <div class="row">
                <div class="col-md-6 col-md-offset-1">
                    <div class="checkbox"><label><input type="checkbox"> Show realm balance</label></div>
                </div>
            </div>
            
            <div class="checkbox">
                <label><input type="checkbox"> Alert me when realm balance is low</label>
            </div>
        </div>
    </div>

    <div class="panel panel-danger">
        <div class="panel-heading">
            <h3 class="realm-panel-title">Think-about-it-first Actions</h3>
        </div>
        <div class="panel-body">
            <button>Destroy Realm</button>
        </div>
    </div>

</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

</body>
</html>