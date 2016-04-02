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
            if (isset($_POST['description'])) {
                
                $loggedInUser->updateBlurb( $_POST['description'] );
                
            } else {
                throw new RuntimeException('Invalid parameters.');
            }
        } else {
    
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
        }
    
    } catch (RuntimeException $e) {
        echo $e->getMessage();
    }
}

if ($loggedInUser->unreadMessages() > 0) {
    $loggedInUser->clearMessages();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content" class="container">

  <section id="sectionAvatar">
    <div class="panel panel-default">
      <div class="panel-heading">
          <h3 class="realm-panel-title">Your Public Image</h3>
      </div>
      <div class="panel-body">
        <div class="row">
          <div class="col-md-3">
            <div>
              <img src="<?=$loggedInUser->user_image?>" />
            </div>
            <form id="mugshotForm" enctype="multipart/form-data" action="" method="POST" role="form">
              <div class="form-group">
                <label for="upfile">New mugshot:</label>
                <!-- MAX_FILE_SIZE must precede the file input field -->
                <input type="hidden" name="MAX_FILE_SIZE" value="200000" />
                <!-- Name of input element determines name in $_FILES array -->
                <input name="upfile" id="upfile" type="file" accept="image/gif, image/png, image/jpeg" />
                <!--<button type="submit" class="btn btn-default">Upload</button>-->
              </div>
            </form>
          </div>
          <div class="col-md-9">
            <div id="editor" style="height: 300px;"><?=$loggedInUser->fetchBlurb();?></div>
          </div>
        </div>
      </div>
      <div class="panel-footer clearfix">
        <button id="saveChanges" class="btn btn-default pull-right">Save Changes</button>
      </div>
    </div>
  </section>
              
  <section id="sectionAccounting">
    <div class="panel panel-default">
      <div class="panel-heading">
          <h3 class="realm-panel-title">Your <a href="https://www.youtube.com/watch?v=1xNXgyWQqxY" style="color: #939393;" target="_blank">Cash</a></h3>
      </div>
      <div class="panel-body">
        <div class="row">
          <div class="col-md-2">
            <h2 style="margin-top: 0;">Funds:</h2>
            <h1>$<?php echo $loggedInUser->funds(); ?></h1>
          </div>
          <div class="col-md-3">
            <h2 style="margin-top: 0;">Deposit:</h2>
            <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="margin-bottom: 40px;">
              <input type="hidden" name="cmd" value="_s-xclick">
              <input type="hidden" name="hosted_button_id" value="MG5YX75N4LFAW">
              <table>
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
          </div>
          <div class="col-md-4">
            <h2 style="margin-top: 0;"><i class="fa fa-calculator"></i> The Math:</h2>
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
    </div>
  </section>
</div>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="/build/js/marked.js"></script>
<script src="/js/ace/src-min-noconflict/ace.js" type="text/javascript" charset="utf-8"></script>

<script type="text/javascript">

    var __editor;

    $(document).ready(function () {
        var width = $("#editor").parent().width();
        $("#editor").width(width);
        
        __editor = ace.edit("editor");
        __editor.getSession().setMode("ace/mode/markdown");
        
        __editor.on("change", function () {
           // TODO: update preview 
        });
    });
    
    $('#upfile').on('change', function (e) {
        $('#mugshotForm').submit();
    });
    
    $('#saveChanges').on('click', function () {
        $.post("index.php", {description: __editor.getValue()});
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