<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id='content' style='padding-top: 60px;'>

    <img src="/img/underconstruction.gif" class="center-block" />
    <br />
    <br />
    <h2 style="text-align: center;"><img src="/img/underconstruction_small.gif" />&nbsp;Someone goofed. I hope nostolsgia calms your frustration.&nbsp;<img src="/img/underconstruction_small.gif" /></h2>

</div>

<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

</body>
</html>