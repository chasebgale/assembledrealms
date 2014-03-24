<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once("models/header.php");

if(!isUserLoggedIn()) { 
  echo "<h1>You must be logged in to access our build tools!</h1>";
  die(); 
}

if(!empty($_POST))
{
	//$username = sanitize(trim($_POST["username"]));
	//$password = trim($_POST["password"]);
  
  // Step 1: Does this user need a gitlab acct?
  
  // Step 2: Create project in their gitlab
  
  // Step 3: Create SQL 
  
  // Step 4: Redirect to Realm's Dashboard
}

?>

<div id="content">

  <section id="newRealm">
    <div id="newRealmRoot">
      <div>
        <h1>New Realm!</h1>
        <br />
        <input type="text" placeholder="Realm Name"></input>
      </div>
      <div>
        <i class="fa fa-caret-left fa-2x"></i>
      </div>
      <div id="newRealmEngineDisplay">
        <span>ISOMETRIC</span>
      </div>
      <div>
        <i class="fa fa-caret-right fa-2x"></i>
      </div>
      <div style="float: right;">
        <a class="btn btn-default btn-lg" href="#" role="button">Create »</a>
      </div>
    </div>
  </section>

  <section id="existingRealms">
    <ul id="existingRealmsList">

    </ul>
  </section>

</div>

<script id="realms_template" type="text/template">
  <% _.each( realms, function( realm ) { %>
  <li class="existingRealmsListItem">
    <div>
      <h1>
        <%- realm.name %>
      </h1>
      <br />
      <span>
        Built: <%- realm.buildDate %>
      </span>
    </div>

    <div style="float: right;">
      <% if (realm.status == 0) { %>
      <i class="fa fa-power-off fa-4x light"></i>
      <% } else { %>
      <i class="fa fa-power-off fa-4x online"></i>
      <% } %>
    </div>

    <div style="float: right; width: 300px;">
      <ul>
        <li>
          <span class="existingRealmsStatsLabel">Funds:</span>
          <%- realm.funds %>
        </li>
        <li>
          <span class="existingRealmsStatsLabel">Online/Max:</span>
          <%- realm.playersOnline %>/<%- realm.playersMax %>
        </li>
        <li>
          <span class="existingRealmsStatsLabel">Likes:</span>
          <%- realm.likes %>
        </li>
      </ul>
    </div>

  </li>
  <% }); %>
</script>

<script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
<script src='//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js'></script>
<script src="/js/build.dashboard.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>


