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
      
			engine.map.terrain.source.forEach(function (asset) {

				asset = 'client/resource/' + asset;
				worker.push(asset);

			});

			var loader = new PIXI.AssetLoader(worker, true);
			
			loader.onProgress = function (event) {
                
				var index;
				var sprite;
				var layers;
				var i;
				
				var filename = event.texture.baseTexture.imageUrl.split('/').pop();
				
				for (var row = engine.coordinates.row; row < engine.coordinates.row + engine.VIEWPORT_HEIGHT_TILES; row++) {
					for (var col = engine.coordinates.col; col < engine.coordinates.col + engine.VIEWPORT_WIDTH_TILES; col++) {
						if (engine.terrain.index[row] === undefined) continue;
						if (engine.terrain.index[row][col] === undefined) continue;
						
						layers = engine.terrain.index[row][col];
						
						if (layers.constructor !== Array) continue;
						
						for (i = 0; i < layers.length; i++) {
							
							index = layers[i];
							
							if (index != null) {
								
								sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('terrain_' + index));
						
								sprite.position.x = ((col - engine.coordinates.col) * engine.TILE_WIDTH);
								sprite.position.y = ((row - engine.coordinates.row) * engine.TILE_HEIGHT);
								
								engine.buffer.addChild(sprite);
								
							}
							
						}
						
						
					}
				}
				
			};
			
			loader.onComplete = function (event) {
				
				avatar.initialize(self, PIXI);
				avatar.sprite.position.x = (CANVAS_WIDTH / 2) - 64;
				avatar.sprite.position.y = (CANVAS_HEIGHT / 2) - 64;
				
				objects.initialize(self, PIXI);
				
				avatar.offset = self.draw();
				
				avatar.position.x = avatar.sprite.position.x + 64;
				avatar.position.y = avatar.sprite.position.y + 64;

				self.stage.addChild(terrain.sprite);
				self.stage.addChild(objects.sprite);
				
				self.renderer.render(self.stage);
				
				self.loaded();
				
			};
			
			loader.load();
		},
	
		// Called on player login and when changing maps
		draw: function (engine, PIXI) {

			var sprite;
			var spriteOver;
			var count = 0;
			var index = 0;
			var frame = "";
			var drawLast = [];
			var startPoint = {};
			var endPoint = {};
			
			var self = this;
			
			self.buffer = new PIXI.SpriteBatch();
			self.buffer.cacheAsBitmap = true;
			
			// startPoint.row = (engine.playerPos.x / TILE_WIDTH_HALF + engine.playerPos.y / TILE_HEIGHT_HALF) / 2;
			// startPoint.col = (engine.playerPos.y / TILE_HEIGHT_HALF - engine.playerPos.x / TILE_WIDTH_HALF) / -2;
			startPoint.row = 0; // Math.floor(startPoint.row);
			startPoint.col = 0; // Math.floor(startPoint.col);

			endPoint.row = _.max(_.keys(engine.terrain), function(obj) { 
				if (isNumber(obj)) { 
					return parseInt(obj); 
				} 
			});
			
			endPoint.col = _.max(_.keys(engine.terrain[endPoint.row]));
		
			for (var row = 0; row < endPoint.row; row++) {

				for (var col = 0; col < endPoint.col; col++) {

					index = -1;

					if (engine.terrain[row] === undefined) continue;
					if (engine.terrain[row][col] === undefined) continue;

					index = engine.terrain[row][col];
					frame = engine.terrain.index[index];
					sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(frame));
					
					sprite.position.x = col * TILE_WIDTH;
					sprite.position.y = row * TILE_HEIGHT;
					
					self.buffer.addChild(sprite);

					if (engine.terrain.decoration[row] !== undefined) {
						if (engine.terrain.decoration[row][col] !== undefined) {
							drawLast.push({ "row": row, "col": col, "a": a, "b": b, "index": engine.terrain.decoration[row][col] })
						}
					}
					
					count++;
				}
			}
			
			
			// TODO: Instead of creating a pixi rendertexture/spritebatch, create a pixel array
			// as big as the map in pixels, then set the pixels in the array to white when walkable,
			// so essentially clone a tile of white pixels... then later hit test for null pixels...
			// var data = new Uint8Array(texture.image.width * texture.image.height * 4);
			//
			// after all drawing is done, then do the hitmap, using: this.buffer.width for pixel array dimensions
			//
			// HAVE MULTIPLE COLORS in the pixel array to do different stuff, for instance, a red pixel would be a
			// "draw over" pixel... for example the bridge, on the south side, actors should have the walls rendered over
			// them.... so, in the pixel array, the wall would be rendered red, and after drawing the avatar and actors, 
			// re-draw in a higher layer anything red... or maybe we'll have to keep that draw-over data in a new array,
			// as the best way may be to use a mask and a layer that renders the same as the background, just only in the 
			// mask of pixels to get the desired effect
			
			// NEW IDEA... have a layer composed of tiles labeled 'over' in the json... draw only the layer composited through
			// a mask, the mask being the actors layer, including the avatar, that way all actors are rendered properly
			
			// Path:
			var canvas = document.createElement('canvas');
			canvas.setAttribute('id', 'canvasPath');
			canvas.setAttribute('style', 'background-color: black;');
			canvas.width = self.buffer.width;
			canvas.height = self.buffer.height;
			document.body.appendChild(canvas);
			this.context = canvas.getContext('2d');
			
			self.path = this.context.createImageData(self.buffer.width, self.buffer.height);
			
			var yCenter = 0;
			var xLeft = 0;
			var width = 0;
			
			for (var b = bStart; b < bEnd + 1; b++) {

				for (var a = aStart; a < aEnd; a++) {

					if ((b & 1) != (a & 1)) {
						continue;
					}

					row = (a + b) / 2;
					col = (a - b) / 2;

					index = -1;

					if (engine.terrain[row] === undefined) continue;
					if (engine.terrain[row][col] === undefined) continue;
					
					index = engine.terrain[row][col];
					frame = engine.terrain.index[index];
					
					if (engine.frames[frame].walkable === undefined) {
					
						yCenter = yOffset + (b * TILE_HEIGHT_HALF);
						xLeft = xOffset + (a * TILE_WIDTH_HALF) - 32;
						width = 64;
						var color = 255;
						
						/*
						if (Math.random() < 0.2) {
							color = 100;
						}
					*/
					
						// Draw tile in pixel array:
						for (var y = 0; y < 16; y++) {
							for (var x = y * 2; x < width; x++) {
								setPixel(this.path, xLeft + x, yCenter - y, color, color, color, 0xFF);
							}
							width -= 2;
						}
						
						width = 64;
						for (var y = 0; y < 16; y++) {
							for (var x = y * 2; x < width; x++) {
								setPixel(this.path, xLeft + x, yCenter + y, color, color, color, 0xFF);
							}
							width -= 2;
						}
						
					
					}
					
				}
			}
			
			this.context.putImageData(self.path, 0, 0);
			
			self.texture = new PIXI.RenderTexture(self.buffer.width + (CANVAS_WIDTH / 2), self.buffer.height + (CANVAS_HEIGHT / 2));
			self.texture.render(self.buffer);
			
			self.sprite = new PIXI.Sprite(self.texture); 
			self.sprite.cacheAsBitmap = true;
			
			return offset;
		},
		
		isWalkable: function (engine, point) {
		
			if (getPixel(this.path, point.x, point.y).r !== 255) {
				return false;
			}
			
			return true;
		}

	}
});