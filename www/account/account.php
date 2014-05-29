<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content">

    <div class="panel panel-default">
        <div class="panel-heading">General</div>
        <div class="panel-body">
            <div>
                <img src="/img/profiles/1.jpg" />
            </div>
            <div>
                <span>chase.b.gale@gmail.com</span>
            </div>
        </div>
    </div>

    <div class="panel panel-default">
        <div class="panel-heading">Funding</div>
        <div class="panel-body">
            <div>
                <span>Current Balance: </span><span style="font-weight: bold;">$ 12.83</span>
            </div>
            <div>
                <a class="btn btn-default" href="#">Deposit Funds</a>
            </div>
        </div>
    </div>

</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>