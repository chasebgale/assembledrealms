<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

echo "
<div id='content'>
  
  <div id='about_banner' style='width: 1000px; height: 160px; margin-top: 20px; background-color: #E0E0E0;'>About assembled realms, rotating banner</div>
  
  <div id='boxes' style='padding-top: 20px;'>
  
    <div id='top_realms' style='width: 580px; height: 500px; background-color: #E0E0E0; display: inline-block;'>Top realms</div>
  
    <div id='news' style='width: 400px; height: 500px; background-color: #E0E0E0; display: inline-block; float: right;'>Latest news</div>
  
  </div>
  
</div>
";

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

<script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
<script src='//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js'></script>

<script>
    $(function() {
        console.log('Document ready!');
        setTimeout(
          function() 
          { 
            console.log('5 seconds later and...');
            if ($('#footer_ad').is(':hidden')) {
                $('#footer').append('<div style="width: 900px; margin: 0 auto;" class="panel panel-danger">' +
                                        '<div class="panel-heading"><span class="glyphicon glyphicon-exclamation-sign"></span> We need your help!</div>' +
                                        '<div class="panel-body">' +
                                            '<h3>If you enjoy this service, please consider whitelisting us in your adblocking plugin!</h3>' +
                                            '<p>Ads put food on the table! A developer with a full belly is a happy developer. Happy developers continue to write code and improve services! ' +
                                            'If an ad offended or irritated you, or if you have a suggestion, please feel free to send it over to <a href="mailto:outreach@assembledrealms.com">outreach@assembledrealms.com</a></p>' +
                                        '</div>' +
                                    '</div>');
                console.log('...ad was blocked, appended message!');
            } else {
                console.log('...ad does not appear blocked!');
            }
        }, 1000);
    });
</script>

</body>
</html>


