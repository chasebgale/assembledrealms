</div>

<div id='footer'>
  <script src='//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
  <script src='//netdna.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js'></script>
  <script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
  
  <div id="footer-ad">
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
  
  <div style="margin-top: 20px;">
    <img src="/img/logo.png" />
  </div>
  
  <div id="footer-nav">
    <a href="#">Home</a>
    &nbsp;·&nbsp;
    <a href="#">Account</a>
    &nbsp;·&nbsp;
    <a href="#">Build</a>
    &nbsp;·&nbsp;
    <a href="#">Play</a>
    &nbsp;·&nbsp;
    <a href="#">About</a>
  </div>

</div>