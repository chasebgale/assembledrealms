<?php



require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id='content' class="container">

	<div id="carousel-banner" class="carousel slide" data-ride="carousel">
	  <!-- Indicators -->
	  <ol class="carousel-indicators">
		<li data-target="#carousel-banner" data-slide-to="0" class="active"></li>
		<li data-target="#carousel-banner" data-slide-to="1"></li>
		<li data-target="#carousel-banner" data-slide-to="2"></li>
	  </ol>

	  <!-- Wrapper for slides -->
	  <div class="carousel-inner" role="listbox">
		<div class="item active">
		  <img src="..." alt="...">
		  <div class="carousel-caption">
			...
		  </div>
		</div>
		<div class="item">
		  <img src="..." alt="...">
		  <div class="carousel-caption">
			...
		  </div>
		</div>
		...
	  </div>

	  <!-- Controls -->
	  <a class="left carousel-control" href="#carousel-banner" role="button" data-slide="prev">
		<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
		<span class="sr-only">Previous</span>
	  </a>
	  <a class="right carousel-control" href="#carousel-banner" role="button" data-slide="next">
		<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>
		<span class="sr-only">Next</span>
	  </a>
	</div>
  
  <div id='about_banner' style='width: 1000px; height: 160px; margin-top: 20px; background-color: #E0E0E0;'>About assembled realms, rotating banner</div>
  
  <div id='boxes' style='padding-top: 20px;'>
  
    <div id='top_realms' style='width: 580px; height: 500px; background-color: #E0E0E0; display: inline-block;'>Top realms</div>
  
    <div id='news' style='width: 400px; height: 500px; background-color: #E0E0E0; display: inline-block; float: right;'>Latest news</div>
  
  </div>
  
</div>

<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php");

?>

</body>
</html>


