<?php

    // Upon realm creation on NFS PHP side, we send a message to 
    // gatekeeper.assembledrealms.com telling it to watch the DO API ID of the realm (acquired during create request)
    // gatekeeper then adds the id to an array of id's it's checking every 10 seconds... once the realm is determined
    // to be up, gatekeeper calls back into THIS php on NFS to inject the address (ip) of the server into the DB...

    // TODO: Add realm alert message to user messages with realm came up alert
    
    if ($method == 'POST') {
        
        $realm_id = $_POST['id'];
        $address  = $_POST['address'];
        
        $db_host = "assembledrealms.db"; //Host address (most likely localhost)
        $db_name = "www"; //Name of Database
        $db_user = "chasegale"; //Name of database user
        $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user

        $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
            
        if(mysqli_connect_errno()) {
            error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, LOG_FILE);
            echo "ERROR";
        } else {
        
            $stmt = $mysqli->prepare("UPDATE realms
                                         SET address = ?
                                         WHERE
                                         id = ?");
            
            if (!$stmt) {
                error_log(date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error);
            }
            
            if (!$stmt->bind_param("si", $address, $realm_id)) {
                error_log(date('[Y-m-d H:i e] '). "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            if (!$stmt->execute()) {
                error_log(date('[Y-m-d H:i e] '). "Execute failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            $stmt->close();
            
            mysqli_close($mysqli);
            
            echo json_encode( (object) ['message' => 'OK'] );
            
        }
    }
?>