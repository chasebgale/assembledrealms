<?php

    // Set this to 0 once you go live or don't require logging.
    define("DEBUG", 1);
    // Set to 0 once you're ready to go live
    define("USE_SANDBOX", 1);

    define("LOG_FILE", "./failures.log");

    

    function update_system($user_id, $transaction_id, $deposit, $source) {
        
        $db_host = "assembledrealms.db"; //Host address (most likely localhost)
        $db_name = "www"; //Name of Database
        $db_user = "chasegale"; //Name of database user
        $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user
        
        $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        if(mysqli_connect_errno()) {
            error_log(date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL, 3, LOG_FILE);
        } else {
            
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
            $stmt->bind_param("isii", $user_id, $transaction_id, $deposit, $source);
            $stmt->execute();
            $stmt->close();
            
        }
    }
?>