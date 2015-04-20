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
		$stmt = $mysqli->prepare("INSERT INTO realms (
			user_id,
			title,
			description,
            engine
			)
			VALUES (
			?,
			?,
			?,
            ?)");
		$stmt->bind_param("issi", $this->user_id, $title, $description, $engine);
		$stmt->execute();
		$inserted_id = $mysqli->insert_id;
		$stmt->close();
		
		return $inserted_id;
	}
	
	public function destroyRealm($realm_id)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("DELETE FROM realms
			WHERE user_id = ? AND
			id = ?");
		$stmt->bind_param("ii", $this->user_id, $realm_id);
		$stmt->execute();
		$stmt->close();	
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
    
	public function fetchRealmMarkdown($realm_id)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
					*
					FROM realm_markdown
					WHERE realm_id = ?"
			);
		$stmt->bind_param("i", $realm_id);
		$stmt->execute();
		$stmt->bind_result($id,
				   $realm_id_db,
				   $funding,
				   $description
				   );
		$stmt->fetch();
		$stmt->close();
		
		return array('id' => $id,
		     'realm_id' => $realm_id_db,
		     'funding' => $funding,
		     'description' => $description
		);
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
    
	public function fetchRealm($realm_id)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
				realms.*, uc_users.display_name
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
                   $engine,
				   $status,
				   $players,
				   $funds,
				   $screenshots,
				   $loves,
				   $url,
				   $comments,
				   $source,
				   $show_funding,
				   $display_name // DISPLAY NAME ALWAYS LAST (JOIN)
				   );
		$stmt->fetch();
		$stmt->close();
		return array('id' => $id,
			     'user_id' => $user_id,
			     'title' => $title,
			     'description' => $description,
                 'engine' => $engine,
			     'status' => $status,
			     'players' => $players,
			     'funds' => $funds,
			     'screenshots' => $screenshots,
			     'loves' => $loves,
			     'url' => $url,
			     'display_name' => $display_name,
			     'comments' => $comments,
			     'source' => $source,
			     'show_funding' => $show_funding
			     );
	}
    
    
	public function fetchRealms()
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT *
			FROM realms
			WHERE user_id = ?");
		$stmt->bind_param("i", $this->user_id);
		$stmt->execute();
        
		$stmt->bind_result($id,
				   $user_id,
				   $title,
				   $description,
                   $engine,
				   $status,
				   $players,
				   $funds,
				   $screenshots,
				   $loves,
				   $url,
				   $comments,
				   $source,
				   $show_funding
				   );
        
		while ($stmt->fetch()){
		    $row[] = array('id' => $id,
				   'user_id' => $user_id,
				   'title' => $title,
				   'description' => $description,
                   'engine' => $engine,
				   'status' => $status,
				   'players' => $players,
				   'funds' => $funds,
				   'screenshots' => $screenshots,
				   'loves' => $loves,
				   'url' => $url,
				   'comments' => $comments,
				   'source' => $source,
				   'show_funding' => $show_funding
				   );
		}
		$stmt->close();
		return ($row);
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