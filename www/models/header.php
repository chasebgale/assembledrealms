<?php
/*
UserCake Version: 2.0.2
http://usercake.com
*/
echo "
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml'>
<head>
<meta http-equiv='Content-Type' content='text/html; charset=utf-8' />
<title>".$websiteName."</title>
<link href='".$template."' rel='stylesheet' type='text/css' />

<link href='//code.jquery.com/ui/1.10.3/themes/dark-hive/jquery-ui.css' rel='stylesheet' />
<script src='//code.jquery.com/jquery-1.9.1.js'></script>
<script src='//code.jquery.com/ui/1.10.3/jquery-ui.js'></script>

<link href='//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css' rel='stylesheet' />
<script src='models/funcs.js' type='text/javascript'>
</script>

<script>
  $(function() {
    $( document ).tooltip();
	$( '.header-button' ).button();
    $( '.ui-button' ).button();
  });
</script>

</head>

<body>
<div id='wrapper'>
<div id='top-nav'>
";

include("top-nav.php");

echo "
</div>
<div id='top'>
<div id='logo'>
	<img src='models/site-templates/images/logo.png' />
	<a href='builder.php' class='header-button'><img src='models/site-templates/images/builder.png' /></a>
	<a href='#' class='header-button'><img src='models/site-templates/images/explorer.png' /></a>
</div></div>
";

?>
