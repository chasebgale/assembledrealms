<?php

  // A message sent to gatekeeper.assembledrealms.com telling it to watch the DO API ID of the realm (acquired during create request)
  // gatekeeper then adds the id to an array of id's it's checking every 10 seconds... once the realm is determined
  // to be up, gatekeeper calls back into THIS php on NFS to inject the address (ip) of the server into the DB...

  // TODO: Add realm alert message to user messages with realm came up alert
  
  function getallheaders() { 
      $headers = ''; 
      foreach ($_SERVER as $name => $value)  { 
          if (substr($name, 0, 5) == 'HTTP_') { 
              $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value; 
          } 
      } 
      return $headers; 
  } 
  
  $method         = $_SERVER['REQUEST_METHOD'];
  $self_token     = 'b2856c87d4416db5e3d1eaef2fbef317846b06549f1b5f3cce1ea9d639839224';
  $logfile        = 'gatekeeper.php.log';
  
  //$headers = getallheaders();
  if(isset($_SERVER['Authorization'])) {
    if ($_SERVER['Authorization'] == $self_token) {
      
      $realm_id  = $_POST['realm_id'];
      
      $db_host = "assembledrealms.db";    // Host address
      $db_name = "www";                   // Name of Database
      $db_user = "chasegale";             // Name of database user
      $db_pass = "iBWYeezUwM1lMXb9cDET";  // Password for database user

      $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
          
      if(mysqli_connect_errno()) {
          error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, $logfile);
      } else {
          
          $stmt = $mysqli->prepare("UPDATE realms
            SET status = 1
            WHERE
            id = ?");
          $stmt->bind_param("i", $realm_id);
          $stmt->execute();
          $stmt->close();
          
          mysqli_close($mysqli);
          
          echo json_encode( (object) ['message' => 'OK'] );
          
      }
    }
  } else {
    echo "Missing Auth Header";
    die();
  }
?>