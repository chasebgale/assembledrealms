define(function () {

	return {

		texture: undefined,
		buffer: undefined,
		sprite: undefined,
	
		initialize: function (engine, PIXI) {
			var self = this;
			
			self.buffer = new PIXI.SpriteBatch();
			//self.buffer.cacheAsBitmap = true;
			
			self.texture = new PIXI.RenderTexture(CANVAS_WIDTH, CANVAS_HEIGHT);
			self.sprite = new PIXI.Sprite(self.texture); 
			
			self.tick(engine, PIXI);
		},
		
		// Called on player login and when changing maps
		tick: function (engine, PIXI) {

			var sprite;
			var count = 0;
			var index = 0;
			var frame = "";
			var drawLast = [];
			var startPoint = {};
			var self = this;
			
			self.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/
			
			var position = engine.position();
			
			var startX = (position.x / TILE_WIDTH_HALF + position.y / TILE_HEIGHT_HALF) / 2;
			var startY = (position.y / TILE_HEIGHT_HALF - position.x / TILE_WIDTH_HALF) / -2;
			
			startPoint.row = Math.floor(startX);
			startPoint.col = Math.floor(startY);
//			startPoint.row = Math.floor(startPoint.row);
//			startPoint.col = Math.floor(startPoint.col);
			
			var aStart = (startPoint.row + startPoint.col) - VIEWPORT_WIDTH_TILES_HALF;
			var aEnd = aStart + VIEWPORT_WIDTH_TILES + 2;

			var bStart = (startPoint.row - startPoint.col) - VIEWPORT_HEIGHT_TILES_HALF;
			var bEnd = bStart + VIEWPORT_HEIGHT_TILES + 1;

			var xOffset = (startX % startPoint.row) * TILE_WIDTH;
			var yOffset = (startY % startPoint.col) * TILE_HEIGHT;

			var offset = { x: xOffset, y: yOffset };
		
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
					
					if (engine.frames[frame].over == true) {
						
						sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(frame));

						if (engine.frames[frame].anchor === undefined) {
							// Assume default y anchor:
							sprite.anchor.y = (sprite.height - 32) / sprite.height;
						} else {
							sprite.anchor.y = engine.frames[frame].anchor / sprite.height;
						}

						sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
						sprite.position.x = xOffset + (a * TILE_WIDTH_HALF);
						sprite.position.y = yOffset + (b * TILE_HEIGHT_HALF);
					
						self.buffer.addChild(sprite);
					}
					
					if (engine.objects[row] !== undefined) {
						if (engine.objects[row][col] !== undefined) {
							
							// Actual display buffer:
							frame = engine.objects.index[engine.objects[row][col]];
							sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(frame));

							if (engine.frames[frame].anchor === undefined) {
								// Assume default y anchor:
								sprite.anchor.y = (sprite.height - 32) / sprite.height;
							} else {
								sprite.anchor.y = engine.frames[frame].anchor / sprite.height;
							}

							sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
							sprite.position.x = (a * TILE_WIDTH_HALF);
							sprite.position.y = (b * TILE_HEIGHT_HALF);

							self.buffer.addChild(sprite);
							
						}
					}

					count++;
				}
				
			} // for loop
			
			var matrix = new PIXI.Matrix();
			matrix.translate(0, 0);
			
			self.texture.render(self.buffer, matrix, true);
		
			// self.texture.render(self.buffer);
			
		}
	}
});