<?php

class loggedInUser {
	public $email = NULL;
	public $hash_pw = NULL;
	public $user_id = NULL;
    public $user_image = NULL;
	
	//Simple function to update the last sign in of a user
	public function updateLastSignIn()
	{
		global $mysqli,$db_table_prefix;
		$time = time();
		$stmt = $mysqli->prepare("UPDATE ".$db_table_prefix."users
			SET
			last_sign_in_stamp = ?
			WHERE
			id = ?");
		$stmt->bind_param("ii", $time, $this->user_id);
		$stmt->execute();
		$stmt->close();	
	}
	
	//Return the timestamp when the user registered
	public function signupTimeStamp()
	{
		global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("SELECT sign_up_stamp
			FROM ".$db_table_prefix."users
			WHERE id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
		$stmt->bind_result($timestamp);
		$stmt->fetch();
		$stmt->close();
		return ($timestamp);
	}
    
    // Return amount of unread messages:
    public function unreadMessages()
	{
		global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("SELECT unread_messages
			FROM ".$db_table_prefix."users
			WHERE id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
		$stmt->bind_result($unread);
		$stmt->fetch();
		$stmt->close();
		return ($unread);
	}
    
    public function clearMessages()
	{
		global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("UPDATE ".$db_table_prefix."users 
            SET
            unread_messages = 0
			WHERE id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
		$stmt->close();
		return true;
	}
	
    public function funds()
	{
		global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("SELECT funds
			FROM ".$db_table_prefix."users
			WHERE id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
		$stmt->bind_result($funds);
		$stmt->fetch();
		$stmt->close();
        
        $funds = money_format("%!n", ($funds / 100));
        
		return ($funds);
	}
    
	//Update a users password
	public function updatePassword($pass)
	{
		global $mysqli,$db_table_prefix;
		$secure_pass = generateHash($pass);
		$this->hash_pw = $secure_pass;
		$stmt = $mysqli->prepare("UPDATE ".$db_table_prefix."users
			SET
			password = ? 
			WHERE
			id = ?");
		$stmt->bind_param("si", $secure_pass, $this->user_id);
		$stmt->execute();
		$stmt->close();	
	}
	
	//Update a users email
	public function updateEmail($email)
	{
		global $mysqli,$db_table_prefix;
		$this->email = $email;
		$stmt = $mysqli->prepare("UPDATE ".$db_table_prefix."users
			SET 
			email = ?
			WHERE
			id = ?");
		$stmt->bind_param("si", $email, $this->user_id);
		$stmt->execute();
		$stmt->close();	
	}
    
    public function isRealmOwner($realm_id) {
        global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT * FROM realms
                                    WHERE user_id = ? AND
                                    id = ?");
		$stmt->bind_param("ii", $this->user_id, $realm_id);
		$stmt->execute();
        $stmt->store_result();
        $stmt->fetch();
        $count = $stmt->num_rows();
		$stmt->close();

        if ($count > 0) {
            return true;
        } else {
            return false;
        }
        
    }
    
	public function createRealm($title, $description, $engine)
	{
		global $mysqli,$db_table_prefix;
        
    $source_server = "02"; // TODO: Have a function here that picks the server under the least load
    $status = -1;   
     
		$stmt = $mysqli->prepare("INSERT INTO realms (
			user_id,
			title,
			description,
      source,
      status
			)
			VALUES (
			?,
			?,
			?,
      ?,
      ?)");
		$stmt->bind_param("isssi", $this->user_id, $title, $description, $source_server, $status);
		$stmt->execute();
		$inserted_id = $mysqli->insert_id;
		$stmt->close();
		
    // TODO!!! TODO!!! Update source-xx auth to allow user access to new realm id
    $realms     = $this->fetchRealmIDs();
    $sourceURL  = "source-" . $source_server . ".assembledrealms.com";
    $target_url = "http://" . $sourceURL . "/api/auth";
    $auth_token = "fb25e93db6100b687614730f8f317653bb53374015fc94144bd82c69dc4e6ea0";
    
    $post_body  = json_encode(array('php_sess' => session_id(),
                                         'user_id' => $this->user_id,
                                         'realms' => $realms
    ));
    
    $curl = curl_init();
    
    curl_setopt_array($curl, array(
        CURLOPT_HTTPHEADER 		=> array('Authorization: ' . $auth_token, 'Content-Type: application/json'),
        CURLOPT_HEADER          => false,
        CURLOPT_RETURNTRANSFER 	=> true,
        CURLOPT_POST            => true,
        CURLOPT_POSTFIELDS      => $post_body,
        CURLOPT_SSL_VERIFYHOST 	=> 0,
        CURLOPT_SSL_VERIFYPEER 	=> false,
        CURLOPT_URL 			=> $target_url
    ));

    $resp       = curl_exec($curl);
    $httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
    
    curl_close($curl);
    
    if (($httpcode < 200) && ($httpcode > 299)) {
        return false;
    }
        
		return array($inserted_id, $source_server);
	}
	
	public function destroyRealm($realm_id)
	{
		// Realms with status -99 are flagged for deletion,
		// TODO: Record the current date so we can remove after 30 days or something
		
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("UPDATE realms
						 SET status = -99
						 WHERE
						 id = ?");
        $stmt->bind_param("i", $realm_id);
        $stmt->execute();
        $stmt->close();
		
        /*
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("DELETE FROM realms
			WHERE user_id = ? AND
			id = ?");
		$stmt->bind_param("ii", $this->user_id, $realm_id);
		$stmt->execute();
		$stmt->close();
		*/		
	}

  public function updateRealmDebug($realm_id, $debug_server) {
		global $mysqli;
    
    $stmt = $mysqli->prepare("UPDATE realms
                              SET address_debug = ?
                              WHERE
                              id = ?");
    $stmt->bind_param("si", $debug_server, $realm_id);
    $stmt->execute();
    $stmt->close();
    return true;
  }
  
  public function onlineRealm($realm_id, $realm_level) {
		global $mysqli,$db_table_prefix;
        
    // Set status to 'SPOOLING'
    $status = -2;
    
    $stmt = $mysqli->prepare("UPDATE realms
                  SET status = ?, level = ?
                  WHERE
                  id = ?");
    $stmt->bind_param("iii", $status, $realm_level, $realm_id);
    $stmt->execute();
    $stmt->close();
    
    return true;
	}
    
  // TODO: This should be called once at user log-in, and again when they create new realms
  public function authGatekeeper($realm_id) {
    global $mysqli,$db_table_prefix;
        
    $curl 		    = curl_init();
		$realm_source = $this->fetchRealmSourceServer($realm_id);
    $logfile 	    = '/home/tmp/gatekeeper_outbound.log';
    $target_url   = "https://gatekeeper.assembledrealms.com/auth";
    $auth_token	  = "2f15adf29c930d8281b0fb076b0a14062ef93d4d142f6f19f4cdbed71fff3394";
    
    $realm = array(
      'id'      => $realm_id,
      'source'  => $realm_source
    );
    
    $post_body  = json_encode(array(
      'php_sess' => session_id(),
      'user_id' => $this->user_id,
      'realm' => $realm
    ));
    
    curl_setopt_array($curl, array(
      CURLOPT_HTTPHEADER 		=> array(
        'Authorization: ' . $auth_token, 
        'Content-Type: application/json'
      ),
      CURLOPT_HEADER          => true,
      CURLOPT_RETURNTRANSFER 	=> true,
      CURLOPT_SSL_VERIFYHOST 	=> 0,
      CURLOPT_SSL_VERIFYPEER 	=> false,
      CURLOPT_POST            => true,
      CURLOPT_POSTFIELDS      => $post_body,
      CURLOPT_URL 			      => $target_url
    ));

		$resp       = curl_exec($curl);
		$httpcode   = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
		
		curl_close($curl);
		
		if (($httpcode < 200) && ($httpcode > 299)) {
			// We have an error:
			error_log($httpcode . ": " . $resp, 3, $logfile);
			return false;
		}
    
    return true;
  }
    
  public function depositToRealm($realm_id, $amount) {
    global $mysqli,$db_table_prefix;
        
    $stmt = $mysqli->prepare("SELECT funds
			FROM ".$db_table_prefix."users
			WHERE id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
		$stmt->bind_result($funds);
		$stmt->fetch();
		$stmt->close();
        
    if ($amount > $funds) {
        return false;
    }
    
    $mysqli->autocommit(FALSE);

    // Update realm funds
    $stmt = $mysqli->prepare("UPDATE realms
         SET funds = funds + ?
         WHERE
         id = ?");
    $stmt->bind_param("ii", $amount, $realm_id);
    $stmt->execute();
    $stmt->close();
        
    // Update user funds
    $stmt = $mysqli->prepare("UPDATE uc_users
      SET funds = funds - ?
      WHERE
      id = ?");
    $stmt->bind_param("ii", $amount, $this->user_id);
    $stmt->execute();
    $stmt->close();
      
      // Log the deposit
    $stmt = $mysqli->prepare("INSERT INTO realm_deposits
      (realm_id, user_id, amount)
      VALUES
      (?, ?, ?)"
    );
    $stmt->bind_param("iii", $realm_id, $this->user_id, $amount);
    $stmt->execute();
    $stmt->close();
    
    $mysqli->commit();
    $mysqli->autocommit(TRUE);
    
    return true;
  }
    
    public function fetchRealmScreenshots($realm_id) {
        global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("SELECT screenshots
			FROM realms
			WHERE id = ?");
		$stmt->bind_param("i", $realm_id);
		$stmt->execute();
		$stmt->bind_result($screenshots);
		$stmt->fetch();
		$stmt->close();
		return ($screenshots);
    }
    
	public function fetchRealm($realm_id) {
        
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
      realms.id,
      realms.user_id,
      realms.title,
      realms.description,
      realms.level,
      realms.status,
      realms.players_online,
      realms.funds,
      realms.screenshots,
      realms.loves,
      realms.comments,
      realms.source,
      realms.show_funding,
      realms.address,
      realms.address_debug,
      uc_users.display_name
      FROM realms
      INNER JOIN uc_users
      ON realms.user_id = uc_users.id
      WHERE realms.id = ?"
    );
		$stmt->bind_param("i", $realm_id);
		$stmt->execute();
		$stmt->bind_result($id,
      $user_id,
      $title,
      $description,
      $level,
      $status,
      $players,
      $funds,
      $screenshots,
      $loves,
      $comments,
      $source,
      $show_funding,
      $address,
      $address_debug,
      $display_name // DISPLAY NAME ALWAYS LAST (JOIN)
				   );
		$stmt->fetch();
		$stmt->close();
		return array('id' => $id,
			     'user_id' => $user_id,
			     'title' => $title,
			     'description' => $description,
                 'level' => $level,
			     'status' => $status,
			     'players' => $players,
			     'funds' => $funds,
			     'screenshots' => $screenshots,
			     'loves' => $loves,
			     'display_name' => $display_name,
			     'comments' => $comments,
			     'source' => $source,
			     'show_funding' => $show_funding,
                 'address' => $address,
                 'address_debug' => $address_debug
			     );
	}
    
    
	public function fetchRealms()
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT
			id,
			user_id,
			title,
			description,
			level,
			status,
			players_online,
			funds,
			screenshots,
			loves,
			comments,
			source,
			show_funding,
			address,
      address_debug
			FROM realms
			WHERE user_id = ? AND status > -10");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
        
		$stmt->bind_result($id,
				   $user_id,
				   $title,
				   $description,
                   $level,
				   $status,
				   $players,
				   $funds,
				   $screenshots,
				   $loves,
				   $comments,
				   $source,
				   $show_funding,
                   $address,
                   $address_debug
				   );
        
		while ($stmt->fetch()){
		    $row[] = array('id' => $id,
				   'user_id' => $user_id,
				   'title' => $title,
				   'description' => $description,
                   'level' => $level,
				   'status' => $status,
				   'players' => $players,
				   'funds' => $funds,
				   'screenshots' => $screenshots,
				   'loves' => $loves,
				   'comments' => $comments,
				   'source' => $source,
				   'show_funding' => $show_funding,
                   'address' => $address,
                   'address_debug' => $address_debug
				   );
		}
		$stmt->close();
		return ($row);
	}
	
    public function fetchRealmIDs()
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT
			id
			FROM realms
			WHERE user_id = ? AND status > -10");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
        
		$stmt->bind_result($id);
        
		while ($stmt->fetch()){
		    $row[] = $id;
		}
		$stmt->close();
		return ($row);
	}
  
  public function fetchRealmSourceServer($realm_id) {
    global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
      realms.source
      FROM realms
      WHERE realms.id = ?"
    );
		$stmt->bind_param("i", $realm_id);
		$stmt->execute();
		$stmt->bind_result($source);
		$stmt->fetch();
		$stmt->close();
    
    return $source;
  }
  
	public function lovesRealm($realm_id)
	{
		global $mysqli,$db_table_prefix;
		
		$love = false;
		
		$stmt = $mysqli->prepare("SELECT 
				id
				FROM realm_loves
				WHERE realm_id = ? 
				AND user_id = ?"
			);
		$stmt->bind_param("ii", $realm_id, $this->user_id);
		$stmt->execute();
		$stmt->store_result();
		$stmt->bind_result($id);
		$stmt->fetch();
		
		if ($stmt->num_rows > 0){
			$love = true;
		}
		
		$stmt->close();
		
		return ($love);
	}
	
	public function loveRealm($realm_id)
	{
		global $mysqli,$db_table_prefix;
		
		if (!$this->lovesRealm($realm_id)) {
			
			$mysqli->autocommit(FALSE);
			
			$stmt = $mysqli->prepare("INSERT INTO realm_loves 
				(realm_id, user_id)
				VALUES
				(?, ?)"
			);
			$stmt->bind_param("ii", $realm_id, $this->user_id);
			$stmt->execute();
			$stmt->close();
			
			$stmt = $mysqli->prepare("UPDATE realms
						 SET loves = loves + 1
						 WHERE
						 id = ?");
			$stmt->bind_param("i", $realm_id);
			$stmt->execute();
			$stmt->close();
			
			$mysqli->commit();
			$mysqli->autocommit(TRUE);
		}
		
		return true;
	}
	
	public function fetchRealmComments($realm_id)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
				realm_comments.*, uc_users.display_name
				FROM realm_comments
				INNER JOIN uc_users
				ON realm_comments.user_id = uc_users.id
				WHERE realm_comments.realm_id = ?
				ORDER BY id ASC"
				);
		$stmt->bind_param("i", $realm_id);
		$stmt->execute();
        
		$stmt->bind_result($id, $realm_id, $user_id, $parent_id, $content, $timestamp, $display_name);
        
		while ($stmt->fetch()){
		    $row[] = array('id' => $id,
				   'realm_id' => $realm_id,
				   'user_id' => $user_id,
				   'parent_id' => $parent_id,
				   'content' => $content,
				   'timestamp' => $timestamp,
				   'display_name' => $display_name
				   );
		}
		$stmt->close();
		return ($row);
	}
	
	public function createRealmComment($realmID, $content, $parentID = NULL)
	{
		global $mysqli,$db_table_prefix;
        
        $mysqli->autocommit(FALSE);
        
        $stmt = $mysqli->prepare("UPDATE realms
                 SET comments = comments + 1
                 WHERE
                 id = ?");
        $stmt->bind_param("i", $realmID);
        $stmt->execute();
        $stmt->close();
        
		$stmt = $mysqli->prepare("INSERT INTO realm_comments (
			realm_id,
			user_id,
			content,
			parent_id
			)
			VALUES (
			?,
			?,
			?,
			?)");
		$stmt->bind_param("iisi", $realmID, $this->user_id, $content, $parentID);
		$stmt->execute();
		$inserted_id = $mysqli->insert_id;
		$stmt->close();
        
        $mysqli->commit();
        $mysqli->autocommit(TRUE);
		
		$stmt = $mysqli->prepare("SELECT 
				realm_comments.*, uc_users.display_name
				FROM realm_comments
				INNER JOIN uc_users
				ON realm_comments.user_id = uc_users.id
				WHERE realm_comments.id = ?"
				);
		$stmt->bind_param("i", $inserted_id);
		$stmt->execute();
		$stmt->bind_result($id, $realm_id, $user_id, $parent_id, $content, $timestamp, $display_name);
		$stmt->fetch();
		$stmt->close();
        
		return array('id' => $id,
				'realm_id' => $realm_id,
				'user_id' => $user_id,
				'parent_id' => $parent_id,
				'content' => $content,
				'timestamp' => $timestamp,
				'display_name' => $display_name
				);
	}
	
    public function fetchBlurb() {
        global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("SELECT 
				description
				FROM user_blurbs
				WHERE user_id = ?"
			);
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
        $stmt->bind_result($description);
		$stmt->fetch();
		$stmt->close();
		
		return ($description);
    }
    
    public function updateBlurb($description) {
        global $mysqli,$db_table_prefix;
		
		$stmt = $mysqli->prepare("INSERT INTO user_blurbs (user_id, description) VALUES(?, ?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), description=VALUES(description)");
		$stmt->bind_param("is", $this->user_id, $description);
		$stmt->execute();
		$stmt->close();
		
		return true;
    }
    
	//Is a user has a permission
	public function checkPermission($permission)
	{
		global $mysqli,$db_table_prefix,$master_account;
		
		//Grant access if master user
		
		$stmt = $mysqli->prepare("SELECT id 
			FROM ".$db_table_prefix."user_permission_matches
			WHERE user_id = ?
			AND permission_id = ?
			LIMIT 1
			");
		$access = 0;
		foreach($permission as $check){
			if ($access == 0){
				$stmt->bind_param("ii", $this->user_id, $check);
				$stmt->execute();
				$stmt->store_result();
				if ($stmt->num_rows > 0){
					$access = 1;
				}
			}
		}
		if ($access == 1)
		{
			return true;
		}
		if ($this->user_id == $master_account){
			return true;	
		}
		else
		{
			return false;	
		}
		$stmt->close();
	}
	
	//Logout
	public function userLogOut()
	{
		destroySession("userCakeUser");
	}	
}

?>