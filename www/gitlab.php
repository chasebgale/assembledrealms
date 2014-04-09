<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
  echo "<h1>You must be logged in to access our build tools!</h1>";
  die(); 
}

//$username = sanitize(trim($_POST["username"]));
//$password = trim($_POST["password"]);
  
if ($loggedInUser->gitlab_password == "") {

    $curl = curl_init();
        
    $generated_pass = randomPassword();
        
    $fields =  "email=" . $loggedInUser->email . "&";
    $fields .= "password=" . $generated_pass . "&";
    $fields .= "username=" . $loggedInUser->username . "&";
    $fields .= "name=" . $loggedInUser->displayname;
       
    curl_setopt_array($curl, array(
        CURLOPT_HTTPHEADER => array('PRIVATE-TOKEN: iHrbUiraXaAaiDiNgMAV'),
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_POST => 1,
        CURLOPT_URL => 'http://source-01.assembledrealms.com/api/v3/users',
        CURLOPT_POSTFIELDS => $fields
    ));
        
    $resp = curl_exec($curl);
    curl_close($curl);
        
    // {"message":"400 (Bad request) \"name\" not given"}
    // TODO: JSON PARSE RESPONSE AND SEE IF WE HAVE A 'message' LIKE ABOVE, THIS INDICATES ERROR
    
}


    
   


?>