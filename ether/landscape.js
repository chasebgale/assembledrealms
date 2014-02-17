function Landscape(e) {
	var buffer, view, textures, self, callback;
	
	self = this;
	self.callback = e;
	
	var jqxhr = $.getJSON( "map.json", function() {
	  console.log( "success" );
	})
	.done(function(payload) {
		console.log( "--done loading map.json" );
		
		source = payload;
		
		// create a new loader
		var landscapeLoader = new PIXI.AssetLoader(payload.tileSource);

		// use callback
		landscapeLoader.onComplete = self.init;

		//begin load
		landscapeLoader.load();
	})
	.fail(function() {
		console.log( "error" );
	})
	.always(function() {
		console.log( "complete" );
	});
}

Landscape.prototype.init = function () {
	var roughRows = Math.round((600 / 16)) + 1;
    var roughCols = Math.round((800 / 64));

    // Testing fps hit with larger area
    roughRows = roughRows * 2;
    roughCols = roughCols * 2;

    var rowOffset = 0;

    var count = 0;

    var texture_name;

    buffer = new PIXI.DisplayObjectContainer();

	// TODO: In the future this will be a map parsed
    for (row = 0; row < roughRows; row++) {
        for (col = 0; col < roughCols; col++) {
            texture_name = "grass_and_water_" + getRandomInt(0, 3) + ".png";
            sprites[count] = new PIXI.Sprite(PIXI.Texture.fromFrame(texture_name)); //textures[getRandomInt(0, 3)]);

            if ((row % 2) === 0) {
                rowOffset = 32;
            } else {
                rowOffset = 0;
            }

            sprites[count].position.x = (col * 64) + rowOffset - 32;
            sprites[count].position.y = (row * 16) - 32;

            buffer.addChild(sprites[count]);
			
            count++;
        }
    }

    var renderTexture = new PIXI.RenderTexture(1600, 1200);

    self.view = new PIXI.Sprite(renderTexture);

    view.position.x = 0;
    view.position.y = 0;

    renderTexture.render(buffer);

    
    stage.addChild(self.view);

    landscapeLoaded(self.view);
}

Landscape.prototype.assetsLoaded = function () {

}

Landscape.prototype.move = function (offset) {
	this.x += offset.x;
	this.y += offset.y;
}