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
    
    $headers = getallheaders();
    if(isset($headers['Token'])){
        $authorization = $headers['Token'];
    }
    
    if ($method == 'POST') {
        
        if ($authorization == $self_token) {
            try {
                $realms  = json_decode(file_get_contents('php://input'), true);
            } catch (Exception $e) {
                echo $e->getMessage();
                return;
            }
            $db_host = "assembledrealms.db";    // Host address
            $db_name = "www";                   // Name of Database
            $db_user = "chasegale";             // Name of database user
            $db_pass = "iBWYeezUwM1lMXb9cDET";  // Password for database user

            $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
                
            if(mysqli_connect_errno()) {
                error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, $logfile);
            } else {
                
                $stmt_raw = "INSERT INTO realms (id, status, address) VALUES ";
                
                foreach($realms as $realm) {
                    $stmt_raw .= "(" . $realm["id"] . ",1,'" . $realm["address"] . "'),";
                }
                
                $stmt_raw = rtrim($stmt_raw, ",");
                $stmt_raw .= " ON DUPLICATE KEY UPDATE status=VALUES(status),address=VALUES(address)";
                $stmt = $mysqli->prepare($stmt_raw);
                
                if (!$stmt) {
                    error_log(date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error . PHP_EOL . $stmt_raw . PHP_EOL, 3, $logfile);
                }
                
                /*
                if (!$stmt->bind_param("si", $address, $realm_id)) {
                    error_log(date('[Y-m-d H:i e] '). "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error);
                }
                */
                
                if (!$stmt->execute()) {
                    error_log(date('[Y-m-d H:i e] '). "Execute failed: (" . $stmt->errno . ") " . $stmt->error . PHP_EOL, 3, $logfile);
                }
                
                $stmt->close();
                
                mysqli_close($mysqli);
                
                echo json_encode( (object) ['message' => 'OK'] );
                
            }
        } else {
            echo 'UNAUTHORIZED ACCESS ATTEMPT, HEADERS: ' . json_encode($headers);
            error_log('UNAUTHORIZED ACCESS ATTEMPT, TOKEN: ' . $authorization . PHP_EOL, 3, $logfile);
        }
    } else {
        echo 'POST, PLEASE...';
    }
?>