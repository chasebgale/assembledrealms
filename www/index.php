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
</div>
<div id='main'>

</div>
<div id='bottom'></div>
</div>
</body>
</html>";

?>
