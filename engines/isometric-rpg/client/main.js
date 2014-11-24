define(function (require) {
    
	var engine = require('engine');
	
	engine.loaded = function () {
		animate();
	}
	
	engine.initialize( document.body );
	
	function animate() {

		requestAnimationFrame(animate);
		engine.render();

	}
	
});