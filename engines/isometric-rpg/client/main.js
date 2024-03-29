define(function (require) {
    
	var engine = require('engine');
	
	engine.loaded = function () {
		animate();
	}
	
	engine.initialize( document.body );
	
	// Debugging:
	if (DEBUG) {
		var stats = new Stats();
		stats.setMode(0); // 0: fps, 1: ms

		// align top-left
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.left = '32px';
		stats.domElement.style.top = '564px';

		document.body.appendChild( stats.domElement );
	}
	
	function animate() {
		
		stats.begin();
		
		engine.render();
		
		stats.end();
		
		requestAnimationFrame(animate);
		

	}
	
});