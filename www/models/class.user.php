<?php

class loggedInUser {
	public $email = NULL;
	public $hash_pw = NULL;
	public $user_id = NULL;
	public $gitlab_user = NULL;
	public $gitlab_password = NULL;
	public $gitlab_id = 0;
	
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
    
	//Update a users email
	public function updateGitlab($id, $password)
	{
		global $mysqli,$db_table_prefix;
		$this->gitlab_id = $id;
		$this->gitlab_password = $password;
		$stmt = $mysqli->prepare("UPDATE ".$db_table_prefix."users
			SET 
			gitlab_id = ?,
			gitlab_password = ?
			WHERE
			id = ?");
		$stmt->bind_param("isi", $id, $password, $this->user_id);
		$stmt->execute();
		$stmt->close();	
	}
    
	public function createRealm($title, $description)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("INSERT INTO realms (
			user_id,
			title,
			description
			)
			VALUES (
			?,
			?,
			?)");
		$stmt->bind_param("iss", $this->user_id, $title, $description);
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
		$stmt->bind_result($id, $user_id, $title, $description, $status, $players, $funds, $screenshots, $loves, $url, $comments, $display_name);
		$stmt->fetch();
		$stmt->close();
		return array('id' => $id,
			     'user_id' => $user_id,
			     'title' => $title,
			     'description' => $description,
			     'status' => $status,
			     'players' => $players,
			     'funds' => $funds,
			     'screenshots' => $screenshots,
			     'loves' => $loves,
			     'url' => $url,
			     'display_name' => $display_name,
			     'comments' => $comments
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
        
		$stmt->bind_result($id, $user_id, $title, $description, $status, $players, $funds, $screenshots, $loves, $url, $comments);
        
		while ($stmt->fetch()){
		    $row[] = array('id' => $id,
				   'user_id' => $user_id,
				   'title' => $title,
				   'description' => $description,
				   'status' => $status,
				   'players' => $players,
				   'funds' => $funds,
				   'screenshots' => $screenshots,
				   'loves' => $loves,
				   'url' => $url,
				   'comments' => $comments
				   );
		}
		$stmt->close();
		return ($row);
	}
	
	public function fetchRealmComments($realm_id)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("SELECT 
				realm_comments.*, uc_users.display_name
				FROM realm_comments
				INNER JOIN uc_users
				ON realm_comments.user_id = uc_users.id
				WHERE realm_comments.realm_id = ?"
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
	
	public function createRealmComment($realmID, $content)
	{
		global $mysqli,$db_table_prefix;
		$stmt = $mysqli->prepare("INSERT INTO realm_comments (
			realm_id,
			user_id,
			content
			)
			VALUES (
			?,
			?,
			?)");
		$stmt->bind_param("iis", $realmID, $this->user_id, $content);
		$stmt->execute();
		$inserted_id = $mysqli->insert_id;
		$stmt->close();
		
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