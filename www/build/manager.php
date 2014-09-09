<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
    die();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    $directive = $_POST['directive'];
    
    if ($directive == 'fetch') {
	$raw = $loggedInUser->fetchRealmMarkdown($_POST['realm_id']);
    
	echo json_encode($raw);
	die();
    }
    
    if ($directive == 'save') {
	
	global $mysqli;
        
        $output = '';
	
	if ($_POST['markdown_funding'] || $_POST['markdown_description']) {
            // INSERT OR CREATE REALM_MARKDOWN ROW
            if ($_POST['markdown_create'] == 'true') {
                    $stmt_markdown = $mysqli->prepare("INSERT INTO realm_markdown(
                                                            funding,
                                                            description,
                                                            realm_id
                                                            )
                                                            VALUES (
                                                            ?,
                                                            ?,
                                                            ?)"
                    );
            } else {
                    $stmt_markdown = $mysqli->prepare("UPDATE realm_markdown
                                                            SET 
                                                            funding = ?,
                                                            description = ?
                                                            WHERE
                                                            realm_id = ?"
                    );
            }
            
            $stmt_markdown->bind_param("ssi", $_POST['markdown_funding'], $_POST['markdown_description'], $_POST['realm_id']);
            $rc = $stmt_markdown->execute();
            
            if ( false===$rc ) {
                $output .= " Markdown.execute() failed: " . htmlspecialchars($stmt_markdown->error);
            } else {
                $output .= " Markdown updated.";
            }
            
            $stmt_markdown->close();
	}
        
        if (isset($_POST['funding'])) {
            $stmt = $mysqli->prepare("UPDATE realms
                                     SET show_funding = ?
                                     WHERE id = ?"
            );
            
            $funding = (int)($_POST['funding'] == 'true');
            
            $stmt->bind_param("ii", $funding, $_POST['realm_id']);
            $rc = $stmt->execute();
            
            if ( false===$rc ) {
                $output .= " Funding.execute() failed: " . htmlspecialchars($stmt->error);
            } else {
                $output .= " Funding updated.";
            }
            
            $stmt->close();
            
        }
        
        echo json_encode( (object) ['message' => $output] );
	die();
	
    }
    
    if ($directive == 'destroy') {
	if (isset($_POST['realm_id'])) {
	    $loggedInUser->destroyRealm($_POST['realm_id']);
	    echo json_encode( (object) ['message' => 'OK'] );
	    die();
	}	
    }
    
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

if (is_numeric($_SERVER['QUERY_STRING'])) {
    $realm = $loggedInUser->fetchRealm($_SERVER['QUERY_STRING']);
    
    $funding_opacity = "0.3";
    if ($realm["show_funding"]) {
	$funding_opacity = "1.0";
    }
} else {
    echo "<h2>Please stop tinkering.</h2>";
    die();
}
    
?>

<div id="content">

	<div class="row" style="padding-bottom: 26px;">
		<div class="col-md-8">
			<h2><?php echo $realm["title"] ?></h2>
		</div>
		<div id="savebar" class="col-md-4">
			<button id="savebutton" class="btn btn-default pull-right">Save Changes!</button>
		</div>
	</div>
	
	<h3 class="text-muted" style="padding-top: 26px; padding-bottom: 12px;">Actions</h3>

    <div class="panel panel-default">
        <div class="panel-heading">Primary</div>
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
    
    <div class="panel panel-danger">
        <div class="panel-heading">
            <h3 class="realm-panel-title">Think-about-it-first</h3>
        </div>
        <div class="panel-body">
            <button id="button-destroy-realm" data-id="<?php echo $realm["id"] ?>">Destroy Realm</button>
        </div>
    </div>
    
    <h3 class="text-muted" style="padding-top: 26px; padding-bottom: 12px;">Realm Listing</h3>
    
    <div class="panel panel-default">
        <div class="panel-heading">Realm Details</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Title</strong></p>
                </div>
                <div class="col-md-9">
                    <span><?php echo $realm["title"] ?></span>
                </div>
            </div>
            <div class="row" style="padding-top: 8px;">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Description</strong></p>
                </div>
                <div class="col-md-9">
                    <textarea id="details-description" class="form-control monitored" data-id="description" rows="4"><?php echo $realm["description"] ?></textarea>
                </div>
            </div>
        </div>
    </div>

    <h3 class="text-muted" style="padding-top: 26px; padding-bottom: 12px;">Realm Play Page</h3>
    
    <div class="panel panel-default">
        <div class="panel-heading">Realm README</div>
        <div class="panel-body">
            <h4 class="text-muted">Markdown Source</h4>
	    <div id="realmReadmeSource" style="height: 300px;"></div>
	    
	    <h4 class="text-muted">Display Preview</h4>
	    <div id="realmReadmeDisplay" style="width: 100%;">
	    </div>
        </div>
    </div>
    
    <div class="panel panel-default">
        <div class="panel-heading">
            <div class="checkbox" style="display:inline">
                <label>
                   <input id="chkFunding" type="checkbox" <?php if ($realm["show_funding"]) echo 'checked="checked"' ?> style="float:inherit;"/> Display Crowd Funding / Donations Section
                </label>
            </div>
        </div>
        <div class="panel-body" style="opacity: <?php echo $funding_opacity ?>;">
            <h4 class="text-muted">Markdown Source</h4>
            <div id="realmFundingSource" style="height: 400px;"></div>
                
            <h4 class="text-muted">Display Preview</h4>
            <div class="panel panel-success">
                <div class="panel-heading"><strong>FUNDING</strong></div>
                <div class="panel-body" class="clearfix">
                    <div id="realmFundingDisplay" style="float: left; width: 500px; height: 400px; overflow: hidden;"></div>
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
                                    <p class="form-control-static">$ 04.12</p>
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
            </div>
            
        </div>
    </div>

</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script type="text/javascript">
    var __markdownCreateNewDB = true;
    var __realmID = <?php echo $_SERVER['QUERY_STRING'] ?>;
    var __existingState = {
	description: "<?php echo $realm["description"] ?>",
	show_funding: <?php echo $realm["show_funding"] ?>
    };
    
    var __currentState = _.clone(__existingState, true);
</script>

<script src="js/manager.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
<script src="js/marked.js" type="text/javascript" charset="utf-8"></script>
<script src="/../js/ace/src-min-noconflict/ace.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>