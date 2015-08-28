<?php
    $db_host = "assembledrealms.db"; //Host address (most likely localhost)
    $db_name = "www"; //Name of Database
    $db_user = "chasegale"; //Name of database user
    $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user
    
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
    if(mysqli_connect_errno()) {
        $log_message = date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL;
        error_log($log_message, 3, LOG_FILE);
        mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
        die();
    } else {
        $stmt = $mysqli->prepare("UPDATE realms
                          SET funds = funds - 1
                          WHERE
                          status = 2 AND level > 0");
                          
        if (!$stmt) {
            $log_message = date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error;
            error_log($log_message);
            mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
            echo $log_message;
        } else {
            $stmt->execute();
            echo $stmt->affected_rows;
            $stmt->close();
        }
    }
    
    $mysqli->close();
?>