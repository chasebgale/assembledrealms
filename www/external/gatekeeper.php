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
  $working_sql    = '';
  
  //$headers = getallheaders();
  if(isset($_SERVER['Authorization'])) {
    if ($_SERVER['Authorization'] == $self_token) {
      
      $directive = $_POST['directive'];
      
      $db_host = "assembledrealms.db";    // Host address
      $db_name = "www";                   // Name of Database
      $db_user = "chasegale";             // Name of database user
      $db_pass = "iBWYeezUwM1lMXb9cDET";  // Password for database user

      $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
          
      if(mysqli_connect_errno()) {
        error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, $logfile);
        die();
      }
      
      if ($directive === 'update_users') {
        $realm_updates = json_decode($_POST['realm_updates'], true);
        $working_sql = 'INSERT INTO realms (id, players_online) VALUES ';
        
        foreach ($realm_updates as $realm_id => $user_count) {
          
          // INSERT INTO table (id,Col1,Col2) VALUES (1,1,1),(2,2,3),(3,9,3),(4,10,12)
          // ON DUPLICATE KEY UPDATE Col1=VALUES(Col1),Col2=VALUES(Col2);
          $working_sql .= '(' . $realm_id . ', ' . $user_count . '),';
        }
        $working_sql = rtrim($working_sql, ',');
        
        $working_sql .= ' ON DUPLICATE KEY UPDATE players_online=VALUES(players_online)';
        
        error_log(date('[Y-m-d H:i e] ') . $working_sql . PHP_EOL, 3, $logfile);
        error_log($realm_updates . PHP_EOL, 3, $logfile);
        
        $stmt = $mysqli->prepare($working_sql);
        $stmt->execute();
        $stmt->close();
        
        echo json_encode( (object) ['message' => 'OK'] );
      }
      
      if ($directive === 'update_realm_status') {
      
        $realm_id     = $_POST['realm_id'];
        $realm_status = $_POST['realm_status'];
        $realm_host   = $_POST['realm_host'];

        $stmt = $mysqli->prepare("UPDATE realms
          SET status = ?, address = ?
          WHERE
          id = ?");
        $stmt->bind_param("isi", $realm_status, $realm_host, $realm_id);
        $stmt->execute();
        $stmt->close();
        
        if ($realm_status == 1) {
          $stmt = $mysqli->prepare("INSERT INTO realm_publishes (realm_id)
            VALUES (?)");
          $stmt->bind_param("i", $realm_id);
          $stmt->execute();
          $stmt->close();
        }
        
        echo json_encode( (object) ['message' => 'OK'] );
      }
      
      mysqli_close($mysqli);
      
    }
  } else {
    echo "Missing Auth Header";
    die();
  }
?>