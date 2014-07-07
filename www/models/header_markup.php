<div class="navbar-default navbar-fixed-top" role="navigation">
  <div class="container">
    <div class="navbar-header">
      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
        <span class="sr-only">Toggle navigation</span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
      <a class="navbar-brand" href="http://www.assembledrealms.com/"><img src='../../img/logo.png' /></a>
    </div>
    <div class="collapse navbar-collapse">
      <ul class="nav navbar-nav">
        <li><a href='../../build' class='header-link'><i class='fa fa-cogs fa-2x' style='display: block;'></i>Build</a></li>
        <li><a href='../../play' class='header-link'><i class='fa fa-rocket fa-2x' style='display: block;'></i>Play</a></li>
      </ul>
      <ul class="nav navbar-nav navbar-right">
        <li><a href='../../blog' class='header-link'><i class='fa fa-pencil-square-o fa-2x' style='display: block;'></i>Blog</a></li>
        <?php
        if (isUserLoggedIn()) {
            echo "<li><a href='/account/logout.php' class='header-link'><i class='fa fa-sign-out fa-2x' style='display: block;'></i>Logout</a></li>";
            echo "<li><a href='/account' class='header-link'><i class='fa fa-user fa-2x' style='display: block; text-align: center;'></i>Profile</a></li>";
        } else {
            echo "<li><a href='/account/login.php' class='header-link'><i class='fa fa-sign-in fa-2x' style='display: block;'></i>Login</a></li>";
            echo "<li><a href='/account/register.php' class='header-link'><i class='fa fa-lightbulb-o fa-2x' style='display: block;'></i>Join</a></li>";
        }
        ?>
        <li class="dropdown">
          <a class="dropdown-toggle header-link" data-toggle="dropdown" href="#" id="helpDropdown">
            <i class='fa fa-life-ring fa-2x' style='display: block;'></i>Help
          </a>
          <ul class="dropdown-menu" role="menu" aria-labelledby="helpDropdown">
            <li role="presentation"><a role="menuitem" tabindex="-1" href="/blog/index.php/posts/an-adventure-in-the-making">About</a></li>
            <li role="presentation"><a role="menuitem" tabindex="-1" href="/user/?1">Contact</a></li>
            <li role="presentation" class="divider"></li>
            <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Tour</a></li>
            <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Builder 101</a></li>
          </ul>
        </li>
      </ul>
    </div><!--/.nav-collapse -->
  </div>
</div>