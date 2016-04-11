<div class="navbar-default navbar-fixed-top" role="navigation">
  <div class="container">
    <div class="navbar-header">
      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
        <span class="sr-only">Toggle navigation</span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
      <a class="navbar-brand" href="http://www.assembledrealms.com/">
		    <img src='/img/logo_small.png' />
	    </a>
    </div>

    <div class="collapse navbar-collapse">
      <div class="navbar-spacer hidden-xs"></div>
      <ul class="nav navbar-nav">
        <li><a href='../../build' class='header-link'><i class='fa fa-cogs'></i> Build</a></li>
        <li><a href='../../play' class='header-link'><i class='fa fa-rocket'></i> Play</a></li>
      </ul>
      <ul class="nav navbar-nav navbar-right">
        <!--<li><a href='../../blog' class='header-link'><i class='fa fa-pencil-square-o'></i> Blog</a></li>-->
        <li><a href="../../help" class="header-link"><i class='fa fa-life-ring'></i> Help</a></li>
<?php if (isUserLoggedIn()) { ?>
        <li>
          <a href='/account/logout' class='header-link'>
            <i class='fa fa-sign-out'></i> Logout
          </a>
        </li>
        <li>
          <a href='/account' class='header-link' style="padding-top: 5px !important;">
            <img src='<?php echo $loggedInUser->user_image; ?>' width='24' /><span class='badge' style='background-color: #4C4C4C; vertical-align: top; text-align: left; line-height: 1.5em; height: 24px; border-radius: 0;'>
              <?php echo $loggedInUser->displayname; ?>
              <div class='spacer'></div>
              <i class='fa fa-usd'></i> <span id='userFunds'><?php echo $loggedInUser->funds(); ?>
            </span>
          </a>
        </li>
<?php } else { ?>
        <li>
          <a href='/account/register' class='header-link'><i class='fa fa-sign-in'></i> Login / Join</a>
        </li>
<?php } ?>
      </ul>
    </div><!--/.nav-collapse -->
    
  </div>
</div>