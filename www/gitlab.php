<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
  echo "No auth.";
  die(); 
}

//$username = sanitize(trim($_POST["username"]));
//$password = trim($_POST["password"]);

$new_project = sanitize(trim($_POST["name"]));

$curl = curl_init();
$admin_token = "iHrbUiraXaAaiDiNgMAV";

// FIRST: Create user in gitlab if need be

if ($loggedInUser->gitlab_password == "") {
        
    $generated_pass = randomPassword();
        
    $fields =  "email=" . $loggedInUser->email . "&";
    $fields .= "password=" . $generated_pass . "&";
    $fields .= "username=" . $loggedInUser->username . "&";
    $fields .= "name=" . $loggedInUser->displayname;
       
    curl_setopt_array($curl, array(
        CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_POST => 1,
        CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/users',
        CURLOPT_POSTFIELDS => $fields
    ));
        
    $resp = curl_exec($curl);
    
        
    // {"message":"400 (Bad request) \"name\" not given"}
    // TODO: JSON PARSE RESPONSE AND SEE IF WE HAVE A 'message' LIKE ABOVE, THIS INDICATES ERROR
    
    $loggedInUser->updateGitlab($generated_pass);
    
}


// SECOND: Create new project
$fields =  "user_id=" . $loggedInUser->username . "&";
$fields .= "name=" . $new_project;

curl_setopt_array($curl, array(
    CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_POST => 1,
    CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/projects/user/' . $loggedInUser->username,
    CURLOPT_POSTFIELDS => $fields
));

$resp = curl_exec($curl);


curl_close($curl);

?>