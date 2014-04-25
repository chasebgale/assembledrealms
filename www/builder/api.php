<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
	echo "No auth.";
	die(); 
}

$directive = $_POST['directive'];
$data = json_decode($_POST['payload'], true);

switch ($directive) {
	case "create":
        $loggedInUser->createRealm($data['gitlab_id'], $data['title'], $data['description']);
        break;
}

echo "OK";

?>