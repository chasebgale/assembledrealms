<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id='content' style='padding-top: 60px;'>

    <div class="center-block text-center" style="max-width: 600px;">
      <img src="/img/underconstruction_small.gif" style="display: inline-block;" />
      <img src="/img/underconstruction.gif" style="display: inline-block; padding: 20px;" />
      <img src="/img/underconstruction_small.gif" style="display: inline-block;" />
      <h3 class="text-muted text-justify">Whatever you are looking for seems to be missing completely, it's probably not "under construction." I apologize for the deception, geocities gifs just felt right.</h3>
    </div>

</div>

<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

</body>
</html>