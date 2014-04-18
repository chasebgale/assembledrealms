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
        <?php
        if (isUserLoggedIn()) {
            echo "<li><a href='/logout.php' class='header-link'><i class='fa fa-sign-out fa-2x' style='display: block;'></i>Logout</a></li>";
            echo "<li><a href='/account.php' class='header-link'><i class='fa fa-user fa-2x' style='display: block; text-align: center;'></i>Profile</a></li>";
        } else {
            echo "<li><a href='/login.php' class='header-link'><i class='fa fa-sign-in fa-2x' style='display: block;'></i>Login</a></li>";
            echo "<li><a href='/register.php' class='header-link'><i class='fa fa-lightbulb-o fa-2x' style='display: block;'></i>Join</a></li>";
        }
        ?>
      </ul>
    </div><!--/.nav-collapse -->
  </div>
</div>