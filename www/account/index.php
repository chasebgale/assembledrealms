<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) {
    header("Location: /account/register.php?0");
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

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content">

    <div class="panel panel-default">
        <div class="panel-heading">Profile</div>
        <div class="panel-body">
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
                    <div class="tab-pane" id="paypal">
						<div class="alert alert-info" style="margin-top: 20px;" role="alert">
							<p>If this website becomes profitable enough I will pay $30.00 a month for PayPal premium and start accepting user configurable amounts. For now, it has to be fixed prices.</p>
						</div>
						<div>
							<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="display: inline-block;">
								<input type="hidden" name="cmd" value="_s-xclick">
								<input type="hidden" name="hosted_button_id" value="MG5YX75N4LFAW">
								<table>
								<tr><td><input type="hidden" name="on0" value="Account Deposit">Account Deposit</td></tr><tr><td><select name="os0">
									<option value="Ye Of Little Faith">Ye Of Little Faith $1.00 USD</option>
									<option value="Big Spender">Big Spender $5.00 USD</option>
									<option value="King of the Cash">King of the Cash $10.00 USD</option>
									<option value="Making it Rain">Making it Rain $15.00 USD</option>
									<option value="Literal Billionaire">Literal Billionaire $20.00 USD</option>
								</select> </td></tr>
								</table>
								<input type="hidden" name="currency_code" value="USD">
								<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">
								<img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">
							</form>
							<div style="display: inline-block;">
								<ul>
									<li>$1.00</li>
									<li>-2.9%</li>
									<li>-$0.30</li>
									<li></li>
								</ul>
							</div>
						</div>
					</div>
                    <div class="tab-pane" id="bitcoin"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php echo print_r($loggedInUser) ?>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

</body>
</html>