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
        $loggedInUser->createRealm($data['gitlab_id'], $data['title'], $data['description']);
        echo "OK";
        die();
        break;
    case "destroy":
	$loggedInUser->destroyRealm($data['gitlab_id']);
	echo "OK";
	die();
	break;
    case "realms":
        $out = array_values($loggedInUser->fetchRealms());
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