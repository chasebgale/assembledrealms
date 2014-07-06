<?php



require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id='content'>
  
  <div id='about_banner' style='width: 1000px; height: 160px; margin-top: 20px; background-color: #E0E0E0;'>About assembled realms, rotating banner</div>
  
  <div id='boxes' style='padding-top: 20px;'>
  
    <div id='top_realms' style='width: 580px; height: 500px; background-color: #E0E0E0; display: inline-block;'>Top realms</div>
  
    <div id='news' style='width: 400px; height: 500px; background-color: #E0E0E0; display: inline-block; float: right;'>Latest news</div>
  
  </div>
  
</div>

<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

</body>
</html>


