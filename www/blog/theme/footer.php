		<div class="wrap">
            <div id="footer">
                <script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
                <!-- assembledrealms large -->
                <ins id="footer_ad" class="adsbygoogle"
                     style="display:block;width:970px;height:90px;margin: 0 auto;"
                     data-ad-client="ca-pub-4898800745718155"
                     data-ad-slot="4211616849"></ins>
                <script>
                    (adsbygoogle = window.adsbygoogle || []).push({});
                </script>
            </div>

	        <footer id="bottom">
	            <small>&copy; <?php echo date('Y'); ?> <?php echo site_name(); ?>. All rights reserved.</small>

	            <ul role="navigation">
	                <li><a href="<?php echo rss_url(); ?>">RSS</a></li>
	                <li><a href="https://twitter.com/chasebgale">@chasebgale</a></li>
	            </ul>
	        </footer>

        </div>

        <script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'></script>
        <script src='//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js'></script>

        <script>
            $(function () {
                console.log('Document ready!');
                setTimeout(
                  function () {
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