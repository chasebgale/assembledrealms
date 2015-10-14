<?php



require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="intro" style="width: 100%; height: 100vh; background-size: cover; background-image:url('/img/front_page_background.png'); color: white;">
  <h1 class="text-center" style="padding-top: 100px;"><strong>BUILD AN AWESOME MMO IN YOUR BROWSER</strong></h1>
  <h4 class="text-center">quick-start from an existing game &#9642; developer/community tools &#9642; client/server code in one language: javascript</h4>
</div>

<div id='content' class="container">
  
  
  
</div>

<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

</body>
</html>


