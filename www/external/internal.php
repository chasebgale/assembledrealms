<?php

    // Set this to 0 once you go live or don't require logging.
    define("DEBUG", 1);
    // Set to 0 once you're ready to go live
    define("USE_SANDBOX", 1);

    define("LOG_FILE", "./failures.log");

    $db_host = "assembledrealms.db"; //Host address (most likely localhost)
    $db_name = "www"; //Name of Database
    $db_user = "chasegale"; //Name of database user
    $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user

    function update_system($user_id, $transaction_id, $deposit, $source) {
        
        $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        if(mysqli_connect_errno()) {
            error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, LOG_FILE);
        } else {
            
            $mysqli->autocommit(FALSE);
            
            $stmt = $mysqli->prepare("INSERT INTO user_deposits (
                user_id,
                transaction_id,
                amount,
                source
                )
                VALUES (
                ?,
                ?,
                ?,
                ?)");
                
            if (!$stmt) {
                error_log(date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error);
            }
                
            if (!$stmt->bind_param("isii", $user_id, $transaction_id, $deposit, $source)) {
                error_log(date('[Y-m-d H:i e] '). "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            if (!$stmt->execute()) {
                error_log(date('[Y-m-d H:i e] '). "Execute failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            $stmt->close();
            
            $stmt = $mysqli->prepare("UPDATE uc_users
                SET funds = funds + ?
                WHERE
                id = ?
                ");
                
            if (!$stmt) {
                error_log(date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error);
            }
                
            if (!$stmt->bind_param("ii", $deposit, $user_id)) {
                error_log(date('[Y-m-d H:i e] '). "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            if (!$stmt->execute()) {
                error_log(date('[Y-m-d H:i e] '). "Execute failed: (" . $stmt->errno . ") " . $stmt->error);
            }
            
            $stmt->close();
            
            if (!$mysqli->commit()) {
                error_log(date('[Y-m-d H:i e] '). "Commit failed: (" . $mysqli->errno . ") " . $mysqli->error);
            }
			$mysqli->autocommit(TRUE);
            
        }
    }
?>