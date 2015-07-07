$(document).ready(function () {    
    
    var engine = new Engine();
	
	engine.loaded = function () {
		animate();
	}
	
	engine.initialize( document.getElementById("realm") );
	
	// Debugging:
	if (DEBUG) {
		var stats = new Stats();
		stats.setMode(0); // 0: fps, 1: ms

		// align top-left
		//stats.domElement.style.position = 'absolute';
		//stats.domElement.style.left = '32px';
		//stats.domElement.style.top = '564px';

		document.getElementById("realmStats").appendChild( stats.domElement );
	}
	
	function animate() {
		
		stats.begin();
		
		engine.render();
		
		stats.end();
		
		requestAnimationFrame(animate);
		

	}
	
});