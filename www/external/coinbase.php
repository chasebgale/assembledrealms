<?php

    $db_host = "assembledrealms.db"; //Host address (most likely localhost)
    $db_name = "www"; //Name of Database
    $db_user = "chasegale"; //Name of database user
    $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user
    
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    if(mysqli_connect_errno()) {
        echo "Connection Failed: " . mysqli_connect_errno();
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['order']['custom'];
    $deposit = $data['order']['total_payout']['cents'];
    $source = 1; // 1 for coinbase
    
    $stmt = $mysqli->prepare("INSERT INTO user_deposits (
			user_id,
			amount,
			source
			)
			VALUES (
			?,
			?,
            ?)");
    $stmt->bind_param("iii", $user_id, $deposit, $source);
    $stmt->execute();
    $stmt->close();
    
?>