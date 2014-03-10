<?php
/*
UserCake Version: 2.0.2
http://usercake.com
*/

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once("models/header.php");

echo "
<div id='content'>
  
  <div id='about_banner' style='width: 1000px; height: 160px; margin-top: 20px; background-color: #000;'>About assembled realms, rotating banner</div>
  
  <div id='boxes' style='padding-top: 20px;'>
  
    <div id='top_realms' style='width: 580px; height: 500px; background-color: #000; display: inline-block;'>Top realms</div>
  
    <div id='news' style='width: 400px; height: 500px; background-color: #000; display: inline-block; float: right;'>Latest news</div>
  
  </div>
  
</div>
<div id='bottom'></div>
";

require_once("models/footer.php");

echo "
</body>
</html>";

?>
