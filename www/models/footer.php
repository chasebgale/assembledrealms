</div>

<div id='footer'>
  <script src='//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
  <script src='//netdna.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js'></script>
  <script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
  
  <div class="row">
    <div id="footer-left" class="col-xs-3">
      <a href="#">Home</a>
      ·
      <a href="#">Account</a>
      ·
      <a href="#">Build</a>
      ·
      <a href="#">Play</a>
      ·
      <a href="#">About</a>
    </div>
  
    <div id="footer-right" class="col-xs-9">
      <ins id="footer_ad" class="adsbygoogle"
           style="display:inline-block;width:970px;height:90px;"
           data-ad-client="ca-pub-4898800745718155"
           data-ad-slot="4211616849"></ins> 
      <script>
      (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
      
      <script>
          $(function() {
              console.log('Document ready!');
              setTimeout(
                function() 
                { 
                  console.log('1 second later and...');
                  if ($('#footer_ad').is(':hidden')) {
                      $('#footer_msg').fadeIn().css("display","inline-block");
                      console.log('...ad was blocked, appended message!');
                  } else {
                      console.log('...ad does not appear blocked!');
                  }
              }, 1000);
          });
      </script>
      
      <div id="footer_msg" style="display: none; width: 970px; height: 90px;">
        <h3>If you enjoy this site, please white-list it in your ad-blocking plug-in!</h3>
        <p>I am self-funding so a little extra cash from advertising would be awesome.</p>
      </div>
    </div>
  
  </div>

</div>