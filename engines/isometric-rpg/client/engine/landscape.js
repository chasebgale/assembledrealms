define(function () {

	return {

		// Called on player login and when changing maps
		draw: function (engine, PIXI) {

			var sprite;
			var count = 0;
			var index = 0;
			var frame = "";
			var drawLast = [];
			var startPoint = {};
			var endPoint = {};
			
			startPoint.row = (engine.playerPos.x / TILE_WIDTH_HALF + engine.playerPos.y / TILE_HEIGHT_HALF) / 2;
			startPoint.col = (engine.playerPos.y / TILE_HEIGHT_HALF - engine.playerPos.x / TILE_WIDTH_HALF) / -2;
			startPoint.row = Math.floor(startPoint.row);
			startPoint.col = Math.floor(startPoint.col);

			endPoint.row = _.max(_.keys(engine.terrain), function(obj) { 
				if (engine.isNumber(obj)) { 
					return parseInt(obj); 
				} 
			});
			
			endPoint.col = _.max(_.keys(engine.terrain[endPoint.row]));
			
			var end = engine.coordFromScreen({
				row: endPoint.row,
				col: endPoint.col
			});
			
			var aStart = (startPoint.row + startPoint.col) - VIEWPORT_WIDTH_TILES_HALF;
			var aEnd = end.a; //aStart + VIEWPORT_WIDTH_TILES + 2;

			var bStart = (startPoint.row - startPoint.col) - VIEWPORT_HEIGHT_TILES_HALF;
			var bEnd = end.b; //bStart + VIEWPORT_HEIGHT_TILES + 1;

			var xOffset = (-1 * aStart * 32) - TILE_WIDTH_HALF - 32;
			var yOffset = (-1 * bStart * 16) - TILE_Y_OFFSET;

			var offset = { x: xOffset, y: yOffset };
			
			var pathSprite = new PIXI.Sprite(PIXI.Texture.fromFrame('grass_0.png'));
		
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
					engine.buffer.addChild(sprite);
					
					// PATH
					if (engine.frames[frame].walkable === undefined) {
					
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
					
						pathSprite = new PIXI.Sprite(PIXI.Texture.fromFrame('grass_0.png'));
					
						if (engine.frames['grass_0.png'].anchor === undefined) {
							// Assume default y anchor:
							pathSprite.anchor.y = (pathSprite.height - 32) / pathSprite.height;
						} else {
							pathSprite.anchor.y = engine.frames['grass_0.png'].anchor / pathSprite.height;
						}

						pathSprite.anchor.x = ((pathSprite.width / 2) - 32) / pathSprite.width;
						pathSprite.position.x = (a * TILE_WIDTH_HALF);
						pathSprite.position.y = (b * TILE_HEIGHT_HALF);

						engine.path.addChild(pathSprite);
					}

					if (engine.terrain.decoration[row] !== undefined) {
						if (engine.terrain.decoration[row][col] !== undefined) {
							drawLast.push({ "row": row, "col": col, "a": a, "b": b, "index": engine.terrain.decoration[row][col] })
						}
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

							engine.buffer.addChild(sprite);
							
						}
					}

					count++;

				}
			}
			
			return offset;
		}

	}
});