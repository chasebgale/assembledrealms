define(function (require) {
    
	var engine = require('engine');
	engine.initialize( document.body );
	
	function animate() {

		requestAnimationFrame(animate);
		engine.render();

	}
	
	animate();
	
});