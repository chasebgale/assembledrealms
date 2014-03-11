<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once("models/header.php");

if(!isUserLoggedIn()) { 
  echo "<h1>You must be logged in to access our build tools!</h1>";
  die(); 
}

?>


<section id="newRealm">

</section>

<section id="existingRealms">
  <ul id="existingRealmsList">

  </ul>
</section>

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

<script src="/js/build.dashboard.js" type="text/javascript" charset="utf-8"></script>

</body>
</html>


