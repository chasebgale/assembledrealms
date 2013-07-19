window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

function Cosmos() {
	return true;
}

Cosmos.prototype.initialize = function (element) {
	
	var self = this;
	
	self.element = element;
	
	self.canvas =  document.createElement( 'canvas' );
	self.canvas.width = 800;
	self.canvas.height = 600;
	self.canvas.setAttribute('id', 'ether.viewport');
    self.context = self.canvas.getContext( '2d' );
    element.appendChild( self.canvas );
    
	self.canvasBuffer =  document.createElement( 'canvas' );
	self.canvasBuffer.width = 1000;
	self.canvasBuffer.height = 800;
	self.canvasBuffer.setAttribute('id', 'ether.buffer');
	self.canvasBuffer.setAttribute('style', 'display: none;');
    element.appendChild( self.canvasBuffer );
	

	/* Round to even
	if (Math.floor(width)%2!=0)
		width = width - 1;
	*/
	
	var tileWidth = 32;
	var tileHeight = 15;
	
	// If I need to set any css:
	/*  
	var viewport = $("#ether.viewport", self.element);
	viewport.css("overflow", "hidden");
	viewport.css("margin", "0px");
	viewport.css("padding", "0px");
	*/
};

Cosmos.prototype.drawTerrain = function () {
	
}