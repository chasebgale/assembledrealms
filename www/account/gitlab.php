<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
  echo "No auth.";
  die(); 
}

$response = "";

$curl = curl_init();
$admin_token = "iHrbUiraXaAaiDiNgMAV";

if ($loggedInUser->gitlab_id == 0) {
        
    $generated_pass = randomPassword();
        
    $fields =  "email=" . $loggedInUser->email . "&";
    $fields .= "password=" . $generated_pass . "&";
    $fields .= "username=" . $loggedInUser->gitlab_user . "&";
    $fields .= "name=" . $loggedInUser->displayname;
       
    curl_setopt_array($curl, array(
        CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_POST => 1,
        CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/users',
        CURLOPT_POSTFIELDS => $fields
    ));
        
    $resp = curl_exec($curl);
    $parsed = json_decode($resp, true);
        
    // {"message":"400 (Bad request) \"name\" not given"}
    // TODO: JSON PARSE RESPONSE AND SEE IF WE HAVE A 'message' LIKE ABOVE, THIS INDICATES ERROR
    
    $loggedInUser->updateGitlab($parsed["id"], $generated_pass);
    
}

echo '{"user_id":"' . $loggedInUser->gitlab_user . '","auth":"' . $loggedInUser->gitlab_password . '"}';

/* THIS SHOULD BE DONE HERE, HOWEVER THERE IS A BUG WHERE YOU CAN'T SET THE IMPORT_URL ON
 * A PROJECT YOU ARE CREATING FOR ANOTHER USER, SO INSTEAD WE ARE NOW RETURNING THE GITLAB
 * PASSWORD TO THE CLIENT AND USING AJAX CALLS FROM THE CLIENT TO ESTABLISH A SESSION AND
 * CREATE THE PROJECT

// Hardcoded to isometric for now
$engineURL = "https://github.com/chasebgale/assembledrealms-isometric.git";

// SECOND: Create new project 
$fields =  "user_id=" . $loggedInUser->gitlab_id . "&";
$fields .= "name=" . $new_project . "&";
$fields .= "import_url=" . $engineURL;

curl_setopt_array($curl, array(
    CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: ' . $admin_token),
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_POST => 1,
    CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/projects/user/' . $loggedInUser->gitlab_id,
    CURLOPT_POSTFIELDS => $fields
));

$resp = curl_exec($curl); 

$response .= "Action: Created project -- " . $resp;

curl_close($curl);

echo $response;
*/
?>