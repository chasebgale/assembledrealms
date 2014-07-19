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

    <div class="panel panel-default">
        <div class="panel-heading">Realm Display Page</div>
        <div class="panel-body">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <div class="checkbox" style="display:inline">
                        <label>
                           <input type="checkbox" style="float:inherit;"/> Display Crowd Funding / Donations Section
                        </label>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h4>Markdown Source</h4>
                        </div>
                        <div class="col-md-6">
                            <h4>Display Preview</h4>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <textarea id="realmFundingSource" class="form-control" rows="20">
                                This is you're description.
                            </textarea>
                        </div>
                        <div class="col-md-6" id="realmFundingDisplay">
                            
                        </div>
                    </div>
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
            <button id="button-destroy-realm" data-id="<?php echo $realm["id"] ?>">Destroy Realm</button>
        </div>
    </div>

</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/manager.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
<script src="js/marked.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>