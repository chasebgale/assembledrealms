<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
	echo "No auth.";
	die(); 
}

$directive = $_POST['directive'];

if ($_POST['payload']) {
    $data = json_decode($_POST['payload'], true);
}

switch ($directive) {

    case "create":
	$project_id = $loggedInUser->createRealm($data['title'], $data['description']);

	// $data['import_url']
	// TODO: USE INTERNAL IP!!!
	// TODO: PASS REALM TYPE/ENGINE ID
	
	echo $project_id;
	
        die();
        break;
    case "destroy":
	$loggedInUser->destroyRealm($data['gitlab_id']);
	echo "OK";
	die();
	break;
    case "realms":
	$raw = $loggedInUser->fetchRealms();
	
	if (!is_null($raw)) {
		$out = array_values($raw);
	} else {
		//$out = "";
	}
        
        echo json_encode($out);
        die();
        break;
    case "files":
        $curl = curl_init();
        $admin_token = "iHrbUiraXaAaiDiNgMAV";
        
        $req = $_POST['gitlab_id'] . '/repository/tree?id=' . $_POST['gitlab_id'];
        
        if ($_POST['root']) {
            $req .= "&path=" . $_POST['root'] . "/";
        }

        curl_setopt_array($curl, array(
            CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/projects/' . $req
        ));

        $resp = curl_exec($curl);

        //$parsed = json_decode($resp, true);
        echo $resp;
        die();
        break;
}



?>