<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?2");
    die();
}

if(!empty($_POST)) {
    try {
    
        // Undefined | Multiple Files | $_FILES Corruption Attack
        // If this request falls under any of them, treat it invalid.
        if (
            !isset($_FILES['upfile']['error']) ||
            is_array($_FILES['upfile']['error'])
        ) {
            throw new RuntimeException('Invalid parameters.');
        }
    
        // Check $_FILES['upfile']['error'] value.
        switch ($_FILES['upfile']['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_NO_FILE:
                throw new RuntimeException('No file sent.');
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new RuntimeException('Exceeded filesize limit.');
            default:
                throw new RuntimeException('Unknown errors.');
        }
        
        $img = $_FILES['upfile']['tmp_name'];
        $dst = '/home/public/img/profiles/' . $loggedInUser->user_id . '.jpg';
        $size = 150;
    
        // You should also check filesize here. 
        if ($_FILES['upfile']['size'] > 2000000) {
            throw new RuntimeException('Exceeded filesize limit.');
        }
    
        if (($img_info = getimagesize($img)) === FALSE)
            throw new RuntimeException('Invalid file format.');
        
        $width = $img_info[0];
        $height = $img_info[1];
        
        switch ($img_info[2]) {
            case IMAGETYPE_GIF  : $src = imagecreatefromgif($img);  break;
            case IMAGETYPE_JPEG : $src = imagecreatefromjpeg($img); break;
            case IMAGETYPE_PNG  : $src = imagecreatefrompng($img);  break;
            default : throw new RuntimeException("Unknown filetype");
        }
        
        $tmp = imagecreatetruecolor($size, $size);
        
        //calculate resized image picture dimensions 
        $original_ratio = $width/$height;
        $targetWidth = $targetHeight = min($size, max($width, $height));
    
        if ($ratio < 1) {
            $targetWidth = $targetHeight * $original_ratio;
        } else {
            $targetHeight = $targetWidth / $original_ratio;
        }
    
        //calculate picture position 'in center' of new image.
        $int_width = ($size - $targetWidth)/2;
        $int_height = ($size - $targetHeight)/2;        
    
        imagecopyresampled($tmp, $src, $int_width, $int_height, 0, 0, $targetWidth, $targetHeight, $width, $height);
        imagejpeg($tmp, $dst);
        
        imagedestroy($tmp);
    
    } catch (RuntimeException $e) {
        echo $e->getMessage();
    }
}

if ($loggedInUser->unreadMessages() > 0) {
    $loggedInUser->clearMessages();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content">

    <ul id="tabs" class="nav nav-tabs" role="tablist" style="margin-top: 60px;">
        <li class="active"><a href="#tab_messages" role="tab" data-toggle="tab">Messages</a></li>
        <li><a href="#tab_funding" role="tab" data-toggle="tab">Funding</a></li>
        <li><a href="#tab_settings" role="tab" data-toggle="tab">Settings</a></li>
    </ul>
    
    <!-- Tab panes -->
    <div class="tab-content" style="min-height: 400px;">
  
        <div id="tab_messages" class="tab-pane active clearfix" style="margin-top: 12px;">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th> </th>
                        <th>Sender</th>
                        <th>Timestamp</th>
                        <th>Preview</th>
                    </tr>
                </thead>
                <tbody id="messages">
                </tbody>
            </table>
        </div>
        
        <div id="tab_funding" class="tab-pane" style="margin-top: 12px;">
            <!--
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
            -->
            <!-- Nav tabs -->
            <ul class="nav nav-pills nav-stacked" style="float: left; width: 20%;">
                <li class="active"><a href="#paypal" data-toggle="tab">Paypal</a></li>
                <li><a href="#bitcoin" data-toggle="tab">Bitcoin via Coinbase</a></li>
            </ul>
            
            <!-- Tab panes -->
            <div class="tab-content" style="float: left; width: 80%;">
                <div class="tab-pane active" id="paypal">
                    <div style="padding: 20px; height: 400px;">
                        <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="display: inline-block; width: 200px; margin-left: 20px; vertical-align: top; margin-top: 40px;">
                            <input type="hidden" name="cmd" value="_s-xclick">
                            <input type="hidden" name="hosted_button_id" value="MG5YX75N4LFAW">
                            <table>
                                <tr>
                                    <td>
                                        <input type="hidden" name="on0" value="Account Deposit:">Account Deposit:
                                    </td>
                                </tr>
                                <tr style="margin-top: 12px;">
                                    <td>
                                        <select name="os0" id="os0">
                                            <option value="$2 for" data-fee="- $0.07" data-amt="$2.37">$2 for $2.37 USD</option>
                                            <option value="$5 for" data-fee="- $0.16" data-amt="$5.46">$5 for $5.46 USD</option>
                                            <option value="$10 for" data-fee="- $0.31" data-amt="$10.61">$10 for $10.61 USD</option>
                                            <option value="$15 for" data-fee="- $0.46" data-amt="$15.76">$15 for $15.76 USD</option>
                                            <option value="$20 for" data-fee="- $0.61" data-amt="$20.91">$20 for $20.91 USD</option>
                                        </select>
                                    </td>
                                </tr>
                            </table>
                            <input type="hidden" name="currency_code" value="USD">
                            <input type="hidden" name="custom" value="<?php echo $loggedInUser->user_id ?>">
                            <input style="margin-top: 12px;" type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">
                            <img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">
                        </form>
                        <div style="display: inline-block; width: 400px;">
                            <h2 style="margin-top: 0;">The Math:</h2>
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td>Payment Amount:</td>
                                        <td id="calculator_start">  $2.37</td>
                                    </tr>
                                    <tr>
                                        <td><a href="https://www.paypal.com/webapps/mpp/paypal-fees" target="_blank">Paypal Fee (2.9%)</a>:</td>
                                        <td id="calculator_fee">- $0.07</td>
                                    </tr>
                                    <tr>
                                        <td><a href="https://www.paypal.com/webapps/mpp/paypal-fees" target="_blank">Paypal Transaction Fee</a>:</td>
                                        <td>- $0.30</td>
                                    </tr>
                                    <tr>
                                        <td>Total Deposit:</td>
                                        <td id="calculator_finish">  $2.00</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="tab-pane" id="bitcoin">
                    <div style="padding: 40px; height: 400px; padding-top: 80px;">
                        <a class="coinbase-button" data-code="53dc620f9bc6914ac6a5da9c8371e02a" data-custom="<?php echo $loggedInUser->user_id ?>" href="https://www.coinbase.com/checkouts/53dc620f9bc6914ac6a5da9c8371e02a" style="margin-left: 20px; margin-top: 40px;">Pay With Bitcoin</a>
                        <script src="https://www.coinbase.com/assets/button.js" type="text/javascript"></script>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="tab_settings" class="tab-pane" style="margin-top: 12px;">
            <h3>Mugshot</h3>
            <div>
                <img src="<?=$loggedInUser->user_image?>" />
            </div>
            <div>
                <span><?=$loggedInUser->email?></span>
            </div>
            <div>
                <!-- The data encoding type, enctype, MUST be specified as below -->
                <form enctype="multipart/form-data" action="" method="POST" role="form">
                    <div class="form-group">
                        <label for="upfile">Select a new profile image:</label>
                        <!-- MAX_FILE_SIZE must precede the file input field -->
                        <input type="hidden" name="MAX_FILE_SIZE" value="200000" />
                        <!-- Name of input element determines name in $_FILES array -->
                        <input name="upfile" id="upfile" type="file" accept="image/gif, image/png, image/jpeg" />
                        <button type="submit" class="btn btn-default">Upload</button>
                    </div>
                </form>
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
                
            </div>
        </div>
    </div>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script id="messages_template" type="text/template">
    
<% _.each( messages, function( message ){ %>
    
    <tr>
        <th scope="row"><%=type_map[message.type]%></th>
        <td><%- message.sender %></td>
        <td><%- message.timestamp %></td>
        <td><%- message.preview %></td>
    </tr>
        
<% }); %>

</script>

<script type="text/javascript">

    var type_map = [];
    
    type_map[0] = '<i class="fa fa-comments-o"></i>';
    type_map[1] = '<i class="fa fa-usd"></i>';
    type_map[2] = '<i class="fa fa-envelope-o"></i>';

    $(document).ready(function () {
        var templateFn = _.template($('#messages_template').html());
        
        // TODO: Retrieve messages
        var data = [
            {id: 219293, type: 0, sender: 'praisejeebus', timestamp: '11:26 AM', preview: 'I don\'t think you have any idea what you are doing...'},
            {id: 219293, type: 1, sender: 'AR Bank', timestamp: '9:01 AM', preview: 'Heads up! Your realm "The Big Show" has less than $1.00 of funding!'},
            {id: 219293, type: 2, sender: 'Mr. Champion', timestamp: '10/14/2015', preview: 'Yo brother, have you ever thought about how weird it is to be writing messages to yourself? I mean, really? This is an affront to the reputation I previously held of you... You can do better, sir!'},
            {id: 219293, type: 1, sender: 'AR Bank', timestamp: '10/14/2015', preview: 'Heads up! Your realm "Poo Poo Planet" has less than $1.00 of funding!'}
        ];

        $("#messages").html(templateFn({ 'messages': data }));
    });
    
    $('#os0').on('change', function (e) {
        var optionSelected = $("option:selected", this);
        // data-fee="- $0.61" data-amt="$20.91"
        $('#calculator_start').text(optionSelected.attr('data-amt'));
        $('#calculator_fee').text(optionSelected.attr('data-fee'));
        $('#calculator_finish').text(optionSelected.attr('value').split(' ')[0] + '.00');
    });

    
</script>

</body>
</html>