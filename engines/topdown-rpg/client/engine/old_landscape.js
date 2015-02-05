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

			startPoint.row = (engine.playerPos.x / TILE_WIDTH_HALF + engine.playerPos.y / TILE_HEIGHT_HALF) / 2;
			startPoint.col = (engine.playerPos.y / TILE_HEIGHT_HALF - engine.playerPos.x / TILE_WIDTH_HALF) / -2;
			startPoint.row = Math.floor(startPoint.row);
			startPoint.col = Math.floor(startPoint.col);

			var aStart = (startPoint.row + startPoint.col) - VIEWPORT_WIDTH_TILES_HALF;
			var aEnd = aStart + VIEWPORT_WIDTH_TILES + 2;

			var bStart = (startPoint.row - startPoint.col) - VIEWPORT_HEIGHT_TILES_HALF;
			var bEnd = bStart + VIEWPORT_HEIGHT_TILES + 1;

			if (engine.offset.x === undefined) {
				var xOffset = (-1 * aStart * 32) - TILE_WIDTH_HALF - 32;
				var yOffset = (-1 * bStart * 16) - TILE_Y_OFFSET;

				engine.offset = { x: xOffset, y: yOffset };
			}

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

					if (engine.terrain.decoration[row] !== undefined) {
						if (engine.terrain.decoration[row][col] !== undefined) {
							drawLast.push({ "row": row, "col": col, "a": a, "b": b, "index": engine.terrain.decoration[row][col] })
						}
					}


					if (engine.objects[row] !== undefined) {
						if (engine.objects[row][col] !== undefined) {

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
		}

	}
});