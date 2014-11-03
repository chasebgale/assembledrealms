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

	<h2><?php echo $realm["title"] ?></h2>

    <div class="panel panel-default">
        <div class="panel-heading">Actions</div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-3">
                    <button class="btn btn-default pull-right">Take Realm Offline</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">This is a description of what the button does. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed augue nisl, pretium at sapien nec, commodo venenatis augue. Nulla aliquet et mi et iaculis. Aliquam auctor felis quis euismod bibendum. Duis vel libero cursus, varius sem quis, malesuada leo.</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <button class="btn btn-default pull-right">Publish Latest Code</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Restarts realm. etc. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed augue nisl, pretium at sapien nec, commodo venenatis augue. Nulla aliquet et mi et iaculis. Aliquam auctor felis quis euismod bibendum. Duis vel libero cursus, varius sem quis, malesuada leo.</p>
                </div>
            </div>
			<div class="row">
                <div class="col-md-3">
                    <button class="btn btn-danger pull-right" id="button-destroy-realm" data-id="<?php echo $realm["id"] ?>"><i class="fa fa-exclamation-triangle"></i> Destroy Realm</button>
                </div>
                <div class="col-md-9">
                    <p class="text-justify">Think about this first.</p>
                </div>
            </div>
        </div>
    </div>
    
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
			<div class="row" style="padding-top: 8px;">
                <div class="col-md-3">
                    <p class="text-right text-muted"><strong>Display Crowd Funding / Donations Section</strong></p>
                </div>
                <div class="col-md-9">
                    <div class="checkbox" style="display:inline">
						<label>
						   <input id="chkFunding" type="checkbox" <?php if ($realm["show_funding"]) echo 'checked="checked"' ?> style="float:inherit;"/>
						</label>
					</div>
                </div>
            </div>
        </div>
		<div class="panel-footer">
			<button id="savebutton" class="btn btn-default pull-right">Save Changes!</button>
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