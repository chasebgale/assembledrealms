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
            <div class="row">
                <div class="col-md-4"><h1>$ 12.83</h1></div>
                
                <div class="col-md-4 input-group" style="margin-top: 22px;">
                    <span class="input-group-addon">$</span>
                    <input type="number" min="0.25" max="1000" step="0.01" value="1.00" class="form-control">
                    <span class="input-group-btn">
                        <button class="btn btn-default" type="button" data-toggle="modal" data-target="#modalDepositFunds">
                            <i class="fa fa-usd"></i> <i class="fa fa-btc"></i>  Deposit Funds
                        </button>
                    </span>
                </div>
            </div>
        </div>
    </div>

</div>

<div class="modal fade" id="modalDepositFunds" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">Deposit $2.50</h4>
            </div>
            <div class="modal-body" id="modalDepositFundsContent">
                <!-- Nav tabs -->
                <ul class="nav nav-tabs">
                    <li class="active"><a href="#google" data-toggle="tab">Google</a></li>
                    <li><a href="#paypal" data-toggle="tab">Paypal</a></li>
                    <li><a href="#bitcoin" data-toggle="tab">Bitcoin via Coinbase</a></li>
                </ul>
                
                <!-- Tab panes -->
                <div class="tab-content">
                    <div class="tab-pane active" id="google"></div>
                    <div class="tab-pane" id="paypal"></div>
                    <div class="tab-pane" id="bitcoin"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>