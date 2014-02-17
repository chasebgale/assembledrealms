<?php
/*
UserCake Version: 2.0.2
http://usercake.com
*/

if (!securePage($_SERVER['PHP_SELF'])){die();}

//Links for logged in user
if(isUserLoggedIn()) {
	echo "
	<ul>
	<li>$loggedInUser->displayname</li>
	<li><a href='account.php' title='View and update your public profile...'><i class='fa fa-user'></i> </a></li>
	<li><a href='user_settings.php' title='Update your settings...'><i class='fa fa-cog'></i> </a></li>
	<li><a href='logout.php' title='Log out of assembledrealms...'><i class='fa fa-sign-out'></i> </a></li>
	</ul>";
	
	//Links for permission level 2 (default admin)
	/*
	if ($loggedInUser->checkPermission(array(2))){
	echo "
	<ul>
	<li><a href='admin_configuration.php'>Admin Configuration</a></li>
	<li><a href='admin_users.php'>Admin Users</a></li>
	<li><a href='admin_permissions.php'>Admin Permissions</a></li>
	<li><a href='admin_pages.php'>Admin Pages</a></li>
	</ul>";
	}
	*/
} 
//Links for users not logged in
else {
	echo "
	<ul>
	<li><a href='register.php'><i class='fa fa-thumbs-up'></i> join</a></li>
	<li><a href='login.php'><i class='fa fa-sign-in'></i> login</a></li>
	<li><a href='forgot-password.php'><i class='fa fa-question'></i> forgot password</a></li>";
//	if ($emailActivation)
//	{
//	echo "<li><a href='resend-activation.php'>Resend Activation Email</a></li>";
//	}
	echo "</ul>";
}

?>
