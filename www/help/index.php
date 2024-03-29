<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content" class="container">
  <div class="page-header">
    <div class="row">
      <div class="col-md-6">
        <h2><a href="https://www.twitter.com/chasebgale">@chasebgale</a></h2>
      </div>
      <div class="col-md-6">
        <h2 class="text-right"><a href="mailto:chase@assembledrealms.com">chase@assembledrealms.com</a></h2>
      </div>
    </div>
  </div>
  <p class="text-muted">
    Assembled Realms is currently in beta. Please don't take things too seriously until the platform is more stable. 
  </p>
  <p class="lead">
    Assembled Realms is a platform for creating <i>awesome</i> open-source, multiplayer, real-time HTML5 games. Taking advantage of modern browser technology, the platform exposes a completely web-based IDE where you can edit both server and client code in one ubiquitous language: Javascript. You have the ability to start your game from one of the templates provided <strong>or</strong> by forking a copy of anyone else's game. 
  </p>
  <p class="lead">
    The goal here is to create a tool for fun and for learning. Make changes to a game's code right in your browser and see the effect of that code change in real time! Reverse engineer games and figure out how they work! Express your artistic side by creating game art and content! Build a community around your game and engage with your players directly!
  </p>
    
</div>

</body>
</html>