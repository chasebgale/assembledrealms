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
    </h2>

    <div class="panel panel-default">
        <div class="panel-heading">Primary Actions</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <button>Take Realm Offline</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">This is a description of what the button does. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed augue nisl, pretium at sapien nec, commodo venenatis augue. Nulla aliquet et mi et iaculis. Aliquam auctor felis quis euismod bibendum. Duis vel libero cursus, varius sem quis, malesuada leo.</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <button>Publish Latest Code</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Restarts realm. etc. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed augue nisl, pretium at sapien nec, commodo venenatis augue. Nulla aliquet et mi et iaculis. Aliquam auctor felis quis euismod bibendum. Duis vel libero cursus, varius sem quis, malesuada leo.</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="panel panel-default">
        <div class="panel-heading">Realm Details</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right"><strong>Title</strong></p>
                </div>
                <div class="col-md-9">
                    <span><?php echo $realm["title"] ?></span>
                </div>
            </div>
            <div class="row" style="padding-top: 8px;">
                <div class="col-md-3">
                    <p class="text-right"><strong>Description</strong></p>
                </div>
                <div class="col-md-9">
                    <p class="text-justify"><?php echo $realm["description"] ?></p>
                </div>
            </div>
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