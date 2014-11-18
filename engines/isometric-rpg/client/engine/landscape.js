define(function (require) {

	return {

		// Called on player login and when changing maps
		draw: function () {

			var sprite;
			var count = 0;
			var index = 0;
			var frame = "";
			var drawLast = [];
			var startPoint = {};

			startPoint.row = (Map.playerPos.x / TILE_WIDTH_HALF + Map.playerPos.y / TILE_HEIGHT_HALF) / 2;
			startPoint.col = (Map.playerPos.y / TILE_HEIGHT_HALF - Map.playerPos.x / TILE_WIDTH_HALF) / -2;
			startPoint.row = Math.floor(startPoint.row);
			startPoint.col = Math.floor(startPoint.col);

			var aStart = (startPoint.row + startPoint.col) - Map.VIEWPORT_WIDTH_TILES_HALF;
			var aEnd = aStart + Map.VIEWPORT_WIDTH_TILES + 2;

			var bStart = (startPoint.row - startPoint.col) - Map.VIEWPORT_HEIGHT_TILES_HALF;
			var bEnd = bStart + Map.VIEWPORT_HEIGHT_TILES + 1;

			if (!Map.offset) {
				var xOffset = (-1 * aStart * 32) - TILE_WIDTH_HALF - 32;
				var yOffset = (-1 * bStart * 16) - TILE_Y_OFFSET;

				Map.offset = { x: xOffset, y: yOffset };
			}

			for (var b = bStart; b < bEnd + 1; b++) {

				for (var a = aStart; a < aEnd; a++) {

					if ((b & 1) != (a & 1)) {
						continue;
					}

					row = (a + b) / 2;
					col = (a - b) / 2;

					index = -1;

					if (Map.terrain[row] === undefined) continue;
					if (Map.terrain[row][col] === undefined) continue;

					index = Map.terrain[row][col];
					frame = Map.terrain.index[index];
					sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(frame));


					if (Map.frames[frame].anchor === undefined) {
						// Assume default y anchor:
						sprite.anchor.y = (sprite.height - 32) / sprite.height;
					} else {
						sprite.anchor.y = Map.frames[frame].anchor / sprite.height;
					}


					sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
					sprite.position.x = (a * Map.TILE_WIDTH_HALF);
					sprite.position.y = (b * Map.TILE_HEIGHT_HALF);
					Map.buffer.addChild(sprite);

					if (Map.terrain.decoration[row] !== undefined) {
						if (Map.terrain.decoration[row][col] !== undefined) {
							drawLast.push({ "row": row, "col": col, "a": a, "b": b, "index": Map.terrain.decoration[row][col] })
						}
					}


					if (Map.objects[row] !== undefined) {
						if (Map.objects[row][col] !== undefined) {

							frame = Map.objects.index[Map.objects[row][col]];
							sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(frame));

							if (Map.frames[frame].anchor === undefined) {
								// Assume default y anchor:
								sprite.anchor.y = (sprite.height - 32) / sprite.height;
							} else {
								sprite.anchor.y = Map.frames[frame].anchor / sprite.height;
							}

							sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
							sprite.position.x = (a * Map.TILE_WIDTH_HALF);
							sprite.position.y = (b * Map.TILE_HEIGHT_HALF);

							Map.buffer.addChild(sprite);
						}
					}

					count++;

				}
			}
		}

	}
};