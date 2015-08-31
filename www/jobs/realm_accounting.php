<?php
    $db_host = "assembledrealms.db"; //Host address (most likely localhost)
    $db_name = "www"; //Name of Database
    $db_user = "chasegale"; //Name of database user
    $db_pass = "iBWYeezUwM1lMXb9cDET"; //Password for database user
    
    $gatekeeper_token   = "2f15adf29c930d8281b0fb076b0a14062ef93d4d142f6f19f4cdbed71fff3394";
    $logfile            = '/home/tmp/accounting_gatekeeper_outbound.log';
    
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
    if(mysqli_connect_errno()) {
        $log_message = date('[Y-m-d H:i e] '). "DB Connection Failed: " . mysqli_connect_errno() . PHP_EOL;
        error_log($log_message, 3, LOG_FILE);
        mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
        die();
    } else {
        
        // Update funds count for realms still online
        $stmt = $mysqli->prepare("UPDATE realms
                          SET funds = funds - 1
                          WHERE
                          status = 1 AND level > 0");
                          
        if (!$stmt) {
            $log_message = date('[Y-m-d H:i e] '). "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error;
            error_log($log_message);
            mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
            echo $log_message;
            die();
        } else {
            $stmt->execute();
            echo $stmt->affected_rows . ' realms were debited $0.01 successfully.';
            $stmt->close();
        }
        
        // Shutdown any realms that have gotten to zero balance, do this second as when the realm first came online, 
        // it was charged a penny for less than an hour, so at the end we make up for that 
        $stmt = $mysqli->prepare("SELECT id
                                  FROM realms
                                  WHERE funds = 0 AND status = 1 AND level = 1");
        
        if (!$stmt) {
            $log_message = date('[Y-m-d H:i e] '). "Prepare failed for under .25 check: (" . $mysqli->errno . ") " . $mysqli->error;
            error_log($log_message);
            mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
            echo $log_message;
            die();
        } else {
            $stmt->execute();
            
            $stmt->bind_result($id);
                  
            $curl = curl_init();
                   
            while ($stmt->fetch()){

                curl_setopt_array($curl, array(
                    CURLOPT_HTTPHEADER 		=> array('Authorization: ' . $gatekeeper_token),
                    CURLOPT_HEADER          => true,
                    CURLOPT_RETURNTRANSFER 	=> true,
                    CURLOPT_SSL_VERIFYHOST 	=> 0,
                    CURLOPT_SSL_VERIFYPEER 	=> false,
                    CURLOPT_URL 			=> 'http://gatekeeper.assembledrealms.com/shutdown/' . $realm_id
                ));

                $resp       = curl_exec($curl);
                $httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
                
                if (($httpcode < 200) && ($httpcode > 299)) {
                    // We have an error:
                    error_log($httpcode . ": " . $resp, 3, $logfile);
                    //return false;
                } else {
                    // We should alert the user that his or her realm is down,
                    // also alerts for < 0.25 should be added
                }
            }
            
            curl_close($curl);
            $stmt->close();
        }
        
        // Update realms that have no money left, for now just trust that the DO API requests to delete the droplets worked...
        $stmt = $mysqli->prepare("UPDATE realms
                                  SET status = 0
                                  WHERE funds = 0 AND status = 1 AND level = 1");
        
        if (!$stmt) {
            $log_message = date('[Y-m-d H:i e] '). "Prepare failed for updating broke realms: (" . $mysqli->errno . ") " . $mysqli->error;
            error_log($log_message);
            mail('alerts@assembledrealms.com', 'ACCOUNTING FAILURE', $log_message);
            echo $log_message;
            die();
        } else {
            $stmt->execute();
        }
    }
    
    $mysqli->close();
?>