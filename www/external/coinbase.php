<?php

    include 'internal.php';

    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['order']['custom'];
    $transaction_id = $data['order']['transaction']['id'];
    $deposit = $data['order']['total_payout']['cents'];
    $source = 1; // 1 for coinbase
    
    update_system($user_id, $transaction_id, $deposit, $source);
    
?>