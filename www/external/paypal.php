<?php

    include 'internal.php';
    
    // Read POST data
    // reading posted data directly from $_POST causes serialization
    // issues with array data in POST. Reading raw POST data from input stream instead.
    $raw_post_data = file_get_contents('php://input');
    $raw_post_array = explode('&', $raw_post_data);
    $myPost = array();
    foreach ($raw_post_array as $keyval) {
        $keyval = explode ('=', $keyval);
        if (count($keyval) == 2)
            $myPost[$keyval[0]] = urldecode($keyval[1]);
    }
    // read the post from PayPal system and add 'cmd'
    $req = 'cmd=_notify-validate';
    if(function_exists('get_magic_quotes_gpc')) {
        $get_magic_quotes_exists = true;
    }
    foreach ($myPost as $key => $value) {
        if($get_magic_quotes_exists == true && get_magic_quotes_gpc() == 1) {
            $value = urlencode(stripslashes($value));
        } else {
            $value = urlencode($value);
        }
        $req .= "&$key=$value";
    }
    // Post IPN data back to PayPal to validate the IPN data is genuine
    // Without this step anyone can fake IPN data
    if(USE_SANDBOX == true) {
        $paypal_url = "https://www.sandbox.paypal.com/cgi-bin/webscr";
    } else {
        $paypal_url = "https://www.paypal.com/cgi-bin/webscr";
    }
    $ch = curl_init($paypal_url);
    if ($ch == FALSE) {
        return FALSE;
    }
    curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER,1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $req);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_FORBID_REUSE, 1);
    if(DEBUG == true) {
        curl_setopt($ch, CURLOPT_HEADER, 1);
        curl_setopt($ch, CURLINFO_HEADER_OUT, 1);
    }
    // Set TCP timeout to 30 seconds
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Connection: Close'));
    $res = curl_exec($ch);
    if (curl_errno($ch) != 0) { // cURL error
        error_log(date('[Y-m-d H:i e] '). "Can't connect to PayPal to validate IPN message: " . curl_error($ch) . PHP_EOL, 3, LOG_FILE);   
        curl_close($ch);
        exit;
    } else {
            // Log the entire HTTP response if debug is switched on.
            if(DEBUG == true) {
                error_log(date('[Y-m-d H:i e] '). "HTTP request of validation request:". curl_getinfo($ch, CURLINFO_HEADER_OUT) ." for IPN payload: $req" . PHP_EOL, 3, LOG_FILE);
                error_log(date('[Y-m-d H:i e] '). "HTTP response of validation request: $res" . PHP_EOL, 3, LOG_FILE);
            }
            curl_close($ch);
    }
    // Inspect IPN validation result and act accordingly
    // Split response headers and payload, a better way for strcmp
    $tokens = explode("\r\n\r\n", trim($res));
    $res = trim(end($tokens));
    if (strcmp ($res, "VERIFIED") == 0) {
        // check whether the payment_status is Completed
        // check that txn_id has not been previously processed
        // check that receiver_email is your PayPal email
        // check that payment_amount/payment_currency are correct
        // process payment and mark item as paid.
        // assign posted variables to local variables
        //$item_name = $_POST['item_name'];
        //$item_number = $_POST['item_number'];
        //$payment_status = $_POST['payment_status'];
        //$payment_amount = $_POST['mc_gross'];
        //$payment_currency = $_POST['mc_currency'];
        //$txn_id = $_POST['txn_id'];
        //$receiver_email = $_POST['receiver_email'];
        //$payer_email = $_POST['payer_email'];
        
        $user_id = $_POST['custom'];
        $transaction_id = $_POST['txn_id'];
        $deposit = (floatval($_POST['mc_gross']) * 100) - (floatval($_POST['mc_fee']) * 100);
        $source = 0;
        
        update_system($user_id, $transaction_id, $deposit, $source);

        if(DEBUG == true) {
            error_log(date('[Y-m-d H:i e] '). "Verified IPN: $req ". PHP_EOL, 3, LOG_FILE);
        }
    } else if (strcmp ($res, "INVALID") == 0) {
        error_log(date('[Y-m-d H:i e] '). "Invalid IPN: $req" . PHP_EOL, 3, LOG_FILE);
    }
?>