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

<!--<link href='".$template."' rel='stylesheet' type='text/css' />-->

<link rel='shortcut icon' href='/img/favicon.png')'>

<link rel='stylesheet' href='css/root.css' />
<link rel='stylesheet' href='css/bootstrap.min.css' />
<link rel='stylesheet' href='//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css' />

<script src='models/funcs.js' type='text/javascript'></script>
<script src='js/lodash.min.js'></script>

</head>

<body>
<div id='wrapper'>
<!--<div id='top-nav'>-->
";

//include("top-nav.php");

?>

<div class="navbar navbar-default navbar-fixed-top" role="navigation">
  <div class="container">
    <div class="navbar-header">
      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
        <span class="sr-only">Toggle navigation</span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
      <a class="navbar-brand" href="http://www.assembledrealms.com/"><img src='models/site-templates/images/logo.png' /></a>
    </div>
    <div class="collapse navbar-collapse">
      <ul class="nav navbar-nav">
        <li><a href='../../builder.php' class='header-link'><i class='fa fa-cogs fa-2x' style='display: block;'></i>Build</a></li>
        <li><a href='#' class='header-link'><i class='fa fa-rocket fa-2x' style='display: block;'></i>Play</a></li>
      </ul>
      <ul class="nav navbar-nav navbar-right">
        <li><a href='../../blog' class='header-link'><i class='fa fa-pencil-square-o fa-2x' style='display: block;'></i>Blog</a></li>
        <li><a href='/login.php' class='header-link'><i class='fa fa-sign-in fa-2x' style='display: block;'></i>Login</a></li>
      </ul>
    </div><!--/.nav-collapse -->
  </div>
</div>


