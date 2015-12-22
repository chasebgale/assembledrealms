<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

//Prevent the user visiting the logged in page if he/she is already logged in
if(isUserLoggedIn()) { header("Location: /account"); die(); }

//Forms posted
if(!empty($_POST)) {
	$errors = array();
	$email = trim($_POST["email"]);
	$displayname = trim($_POST["displayname"]);
	$password = trim($_POST["password"]);
	$confirm_pass = trim($_POST["passwordc"]);
	$directive = trim($_POST["directive"]);
	
	if ($directive === 'register') {
		if(minMaxRange(1,50,$displayname))
		{
			$errors[] = '"displayname":"' . lang("ACCOUNT_DISPLAY_CHAR_LIMIT",array(5,25)) . '"';
		}
		if(!ctype_alnum(str_replace(array(' ', "_", '-'), '', $displayname))){
			$errors[] = '"displayname":"' . lang("ACCOUNT_DISPLAY_INVALID_CHARACTERS") . '"';
		}
		if(minMaxRange(6,50,$password) && minMaxRange(8,50,$confirm_pass))
		{
			$errors[] = '"password":"' . lang("ACCOUNT_PASS_CHAR_LIMIT",array(6,50)) . '"';
		}
		else if($password != $confirm_pass)
		{
			$errors[] = '"password":"' . lang("ACCOUNT_PASS_MISMATCH") . '"';
		}
		if(!isValidEmail($email))
		{
			$errors[] = '"email":"' . lang("ACCOUNT_INVALID_EMAIL") . '"';
		}
		//End data validation
		if(count($errors) == 0)
		{	
			//Construct a user object
			$user = new User($displayname,$password,$email);
			
			//Checking this flag tells us whether there were any errors such as possible data duplication occured
			if(!$user->status)
			{
				if($user->displayname_taken) $errors[] = '"displayname":"' . lang("ACCOUNT_DISPLAYNAME_IN_USE",array($displayname)) . '"';
				if($user->email_taken) 	  $errors[] = '"email":"' . lang("ACCOUNT_EMAIL_IN_USE",array($email)) . '"';		
			}
			else
			{
				//Attempt to add the user to the database, carry out finishing  tasks like emailing the user (if required)
				if(!$user->userCakeAddUser())
				{
					if($user->mail_failure) $errors[] = '"generic":"' . lang("MAIL_ERROR") . '"';	
					if($user->sql_failure)  $errors[] = '"generic":"' . lang("SQL_ERROR") . '"';	
				}
			}
		}
	    
		if(count($errors) == 0) {
		
			$successes[] = $user->success;
		
			// Log the user in:
			$userdetails = fetchUserDetails($email);
			
			$loggedInUser = new loggedInUser();
			$loggedInUser->email = $userdetails["email"];
			$loggedInUser->user_id = $userdetails["id"];
			$loggedInUser->hash_pw = $userdetails["password"];
			$loggedInUser->title = $userdetails["title"];
			$loggedInUser->displayname = $userdetails["display_name"];
            $loggedInUser->user_image = '/img/anonymous.png';
			
			//Update last sign in
			$loggedInUser->updateLastSignIn();
			$_SESSION["userCakeUser"] = $loggedInUser;
			
			//Redirect to user account page
			echo "OK";
			die();
		
		} else {
		
			$returnJSON = "{" . $errors[0];
			
			for ($i = 1; $i < count($errors); ++$i) {
			    $returnJSON .= "," . $errors[$i];
			}
			
			$returnJSON .= "}";
			
			echo $returnJSON;
			die();
		}
	}
	
	if ($directive === 'login') {
		if($email == "")
		{
			$errors[] = lang("ACCOUNT_SPECIFY_USERNAME");
		}
		if($password == "")
		{
			$errors[] = lang("ACCOUNT_SPECIFY_PASSWORD");
		}
	
		if(count($errors) == 0)
		{
			//A security note here, never tell the user which credential was incorrect
			if(!emailExists($email))
			{
				$errors[] = lang("ACCOUNT_USER_OR_PASS_INVALID");
			}
			else
			{
				$userdetails = fetchUserDetails($email);
				//See if the user's account is activated
				if($userdetails["active"]==0)
				{
					$errors[] = lang("ACCOUNT_INACTIVE");
				}
				else
				{
					//Hash the password and use the salt from the database to compare the password.
					$entered_pass = generateHash($password,$userdetails["password"]);
					
					if($entered_pass != $userdetails["password"])
					{
						//Again, we know the password is at fault here, but lets not give away the combination incase of someone bruteforcing
						$errors[] = lang("ACCOUNT_USER_OR_PASS_INVALID");
					}
					else
					{
						//Passwords match! we're good to go'
						
						//Construct a new logged in user object
						//Transfer some db data to the session object
						$loggedInUser = new loggedInUser();
						$loggedInUser->email = $userdetails["email"];
						$loggedInUser->user_id = $userdetails["id"];
						$loggedInUser->hash_pw = $userdetails["password"];
						$loggedInUser->title = $userdetails["title"];
						$loggedInUser->displayname = $userdetails["display_name"];
                        
                        if ($userdetails["has_image"]==0) {
                            $loggedInUser->user_image = '/img/anonymous.png';
                        } else {
                            $loggedInUser->user_image = '/img/profiles/' . $userdetails["id"] . '.jpg';
                        }
						
						//Update last sign in
						$loggedInUser->updateLastSignIn();
						$_SESSION["userCakeUser"] = $loggedInUser;
						
						//Redirect to user account page
						echo "OK";
						die();
					}
				}
			}
		}
        
        // If we got this far, something is FUBAR
        // echo json_encode(array_values($errors));
        echo $errors[0];
        die();
        
	}

}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");
echo "<div class='container'>";

$wrapper = '<div id="alertPanel" class="panel panel-warning" style="width: 75%; margin: 30px auto; display: none;">
                <div class="panel-body">
                    <h2 id="alertMessage" style="text-align: center; margin-top: 0;"><small>
                        %message% Please take a moment to register or login.
                    </small></h2>
                </div>
           </div>';
	   
$wrapper = str_replace("%target%", $_SERVER['QUERY_STRING'], $wrapper);

switch (substr($_SERVER['QUERY_STRING'], 0, 1)) {
    case '0':
        echo str_replace("%message%", "You must be logged in to access our build tools.", $wrapper);
        break;
    case '1':
        echo str_replace("%message%", "You must be logged in to enter a realm.", $wrapper);
        break;
    case '2':
        echo str_replace("%message%", "You must be logged in to access your account information.", $wrapper);
        break;
}

?>

<div class="well" style="margin: 40px auto;">
  <h3 class="text-center" style="margin-top: 10px;"><strong>ASSEMBLEDREALMS IS IN BETA!</strong></h3>
  <p class="text-justify"><strong>Please don't take things too seriously until the platform is stable. If you encounter a bug or if something is not working as you'd expect, please feel free to contact me directly: <a href="mailto:chase@assembledrealms.com">chase@assembledrealms.com</a> or <a href="https://twitter.com/chasebgale">@chasebgale</a>. Have fun!</strong></p>
</div>

<div class="row">
	<div class="col-md-5">
		<form id="form-signin" role="form" action="<?php echo $_SERVER['PHP_SELF']; ?>" method="post">
		    <h2 class="form-signin-heading">Please sign in...</h2>
			<p>&nbsp;</p>
			
			<div class="form-group">
			<label for="loginEmail">Email address</label>
		    <input name="email" id="loginEmail" type="email" class="form-control" placeholder="contact@domain.com" required="true" autofocus="">
		    </div>
			
			<div class="form-group">
			<label for="loginPassword">Password</label>
			<input name="password" id="loginPassword" type="password" class="form-control" placeholder="Password" required="true">
		    </div>
			
			<button id="loginSubmit" class="btn btn-lg btn-default btn-block" type="submit">Sign in</button>
		</form>
	</div>
	
	<div class="col-md-2">
        <div class="tall_spacer"></div>
		<!--<h1 style="margin: 50px 0; text-align: center; font-weight: bold;" class="text-muted">or</h1>-->
	</div>
	
	<div class="col-md-5">
		<form id="form-register" role="form">
		    <h2 class="form-signin-heading">Join the adventure!</h2>
		    <p>We need a little information to get you going:</p>
		
		    <div class="form-group">
			<label for="registerEmail">Email address</label>
			<input name="email" id="registerEmail" type="email" class="form-control" placeholder="user@domain.com" required="true" autofocus="">
		    </div>
		
		    <div class="form-group">
			<label for="registerPassword">Password</label>
			<input name="password" id="registerPassword" type="password" class="form-control" placeholder="Password" required="true">
			<input name="passwordc" type="password" class="form-control" placeholder="Re-type Password" required="true">
		    </div>
		    
		    <div class="form-group">
			<label for="registerDisplayname">Display name (How other users will see you)</label>
			<input name="displayname" id="registerDisplayname" type="text" class="form-control" placeholder="Display Name" required="true">
		    </div>
		    
		    <button id="registerSubmit" class="btn btn-lg btn-default btn-block" type="submit">Register!</button>
		</form>
	</div>
</div>

</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script>

  $("#registerSubmit").on("click", function (e) {
    e.preventDefault();
	
    var post = 'directive=register&' + $("#form-register").serialize();

    $.post("<?php echo $_SERVER['PHP_SELF']; ?>", post, function (data) {
      if (data == "OK") {

        switch (window.location.search.substr(1, 1)) {
          case '0':
            window.location = "/build";
            break;
          case '1':
            window.location = "/play/realm.php?" + window.location.search.substr(2);
            break;
          case '2':
            window.location = "/account";
            break;
          default:
            window.location = "/build";
            break;
        }

        //window.location = "account.php";

      } else {
        var parsed = JSON.parse(data);
        var input;

        // Remove existing error displays:
        $("#form-register .form-group").removeClass("has-error");
        $("#form-register .form-control-feedback").remove();

        // Add current error displays:
        _.each(parsed, function (value, key) {

            input = $("#form-register input[name='" + key + "']");
            input.parent().addClass("has-error");
            input.before('<div class="alert alert-danger">' + value + '</div>')

        });
      }
    });
  });
    
  $("#loginSubmit").on("click", function (e) {
    e.preventDefault();
    
    var button  = $(this);
    button.attr('disabled', 'disabled');
    button.html('<i class="fa fa-cog fa-spin"></i> Sign in');
    
    if (button.next().hasClass('alert')) {
      button.next().remove();
    }
    
    var post    = 'directive=login&' + $("#form-signin").serialize();

    $.post("<?php echo $_SERVER['PHP_SELF']; ?>", post, function (data) {
      if (data == "OK") {
        <?php 
            switch (substr($_SERVER['QUERY_STRING'], 0, 1)) {
                case '0':
                    echo 'window.location = "/build";';
                    break;
                case '1':
                    echo 'window.location = "/play/realm.php?' . substr($_SERVER['QUERY_STRING'], 1) . '";';
                    break;
                case '2':
                    echo 'window.location = "/account";';
                    break;
                default:
                    echo 'window.location = "/account";';
                    break;
            }
        ?>
      } else {
        
        button.after('<div class="alert alert-danger" role="alert">' + data + '</div>');
        button.removeAttr('disabled');
        button.html('Sign in');
        
        // $("#alertPanel").removeClass("panel-warning").addClass("panel-danger");
        // $("#alertMessage").html("<small>" + data + "</small>");
      }
    });
  });

</script>

</body>
</html>