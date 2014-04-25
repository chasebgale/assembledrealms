<?php

require_once("/home/public/models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
	echo "No auth.";
	die(); 
}

$gitlab_project_id = $_SERVER['QUERY_STRING'];

$curl = curl_init();
$admin_token = "iHrbUiraXaAaiDiNgMAV";

curl_setopt_array($curl, array(
    CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/projects/' . $gitlab_project_id . '/repository/tree?id=' . $gitlab_project_id
));

$resp = curl_exec($curl);

echo $resp;
    
?>