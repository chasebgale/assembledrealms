<?php

    include 'internal.php';
	
	$user_id = $_POST['custom'];
	$transaction_id = $_POST['txn_id'];
	$deposit = (floatval($_POST['mc_gross']) * 100) - (floatval($_POST['mc_fee']) * 100);
	$source = 0;
	
	update_system($user_id, $transaction_id, $deposit, $source);
	
?>