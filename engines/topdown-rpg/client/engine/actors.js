define(function () {

	return {

		path: undefined,
		context: undefined,
		texture: undefined,
		buffer: undefined,
		sprite: undefined,
	
		load: function (engine, PIXI, callback) {
			var self = this;
			var worker = [];
      
			self.buffer = new PIXI.SpriteBatch();
      
			engine.map.actors.source.forEach(function (asset) {

				asset = 'client/resource/' + asset;
				worker.push(asset);

			});

			var loader = new PIXI.AssetLoader(worker, true);
			
            // TODO: The way this works right now, the actual integer indices located in the map file
            // for tile locations assume the same load order of images. Make sure they are the same by adding an
            // id or something in the json definition for the source array items
			loader.onProgress = function (event) {
                
				var index   = 0;
                var row     = 0;
                var col     = 0;
				
                var frameTexture;
				var filename = event.texture.baseTexture.imageUrl.split('/').pop();
				
				for (row = 0; row < event.texture.height; row += 32) {
                    for (col = 0; col < event.texture.width; col += 32) {
                        frameTexture = new PIXI.Texture(event.texture, {
                            x: col,
                            y: row,
                            width: 32,
                            height: 32
                        });
                        PIXI.Texture.addTextureToCache(frameTexture, 'actors_' + index);
                        index++;
                    }
                }
				
			};
			
			loader.onComplete = function (event) {
				
				callback();
				
			};
			
			loader.load();
		},
	
		// Called on player login and when changing maps
		draw: function (engine, PIXI) {
            return true;
		}

	}
});