define(function () {

	return {

		texture: undefined,
		buffer: undefined,
	
		load: function (engine, PIXI, callback) {
			var self = this;
			var worker = [];
      
			self.buffer     = new PIXI.SpriteBatch();
            self.texture    = new PIXI.RenderTexture(engine.renderer.width, engine.renderer.height);
      
			engine.map.terrain.source.forEach(function (asset) {

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
                        PIXI.Texture.addTextureToCache(frameTexture, 'terrain_' + index);
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
            
            this.buffer.children = [];
            this.texture.clear();
            
            var sprite;
            
            var startCol = Math.floor((engine.offset.x - CANVAS_WIDTH_HALF) / TILE_WIDTH);
            var startRow = Math.floor((engine.offset.y - CANVAS_HEIGHT_HALF) / TILE_HEIGHT);
            
            for (var row = startRow; row < startRow + VIEWPORT_HEIGHT_TILES; row++) {
                for (var col = startCol; col < startCol + VIEWPORT_WIDTH_TILES; col++) {
                    if (engine.map.terrain.index[row] === undefined) continue;
                    if (engine.map.terrain.index[row][col] === undefined) continue;
                    
                    layers = engine.map.terrain.index[row][col];
                    
                    if (layers.constructor !== Array) continue;
                    
                    for (i = 0; i < layers.length; i++) {
                        
                        index = layers[i];
                        
                        if (index != null) {
                            
                            sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('terrain_' + index));
                    
                            sprite.position.x = (col * TILE_WIDTH);// + engine.offset.x;
                            sprite.position.y = (row * TILE_HEIGHT);// + engine.offset.y;
                            
                            this.buffer.addChild(sprite);
                            
                        }
                        
                    }
                    
                    
                }
            }
            
            this.texture.render(this.buffer, engine.matrix);
            
		},
		
		isWalkable: function (engine, point) {
		
			if (getPixel(this.path, point.x, point.y).r !== 255) {
				return false;
			}
			
			return true;
		}

	}
});