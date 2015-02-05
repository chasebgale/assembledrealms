var Map = {
	
	stage: null,
	renderer: null,
    invalidate: false,
	width: 896,
	height: 504,
	half_width: 448,
	half_height: 252,
	TILE_WIDTH: 32,
	TILE_WIDTH_HALF: 16,
	TILE_HEIGHT: 32,
	TILE_HEIGHT_HALF: 16,
	
	// Center global coordinates of viewport in relation to the map: 
	coordinates: {x: 0, y: 0},
    
    offset: {x: 0, y: 0},
    
    // Used for random tile generation: TODO: REMOVE
    tile_count: 0,
	
	init: function (element, map) {
		
		// Find element:
		var target = document.getElementById(element);
		
		// Empty any contents, including the canvas we created if re-initializing:
		while (target.firstChild) {
			target.removeChild(target.firstChild);
		}
		
		// Initialize PIXI:
		var rendererOptions = {
			antialiasing:false,
			transparent:false,
			resolution:1
		};
		
		Map.renderer = PIXI.autoDetectRenderer(Map.width, Map.height, rendererOptions);

		Map.stage = new PIXI.Stage(0x000000, true);

		var canvas = target.appendChild(Map.renderer.view);
        
        canvas.onmousedown = function (event) {
            console.log(event);
            Map.setTile({x: event.layerX, y: event.layerY}, Math.floor(Math.random() * Map.tile_count + 1));
        }
        

		Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / Map.TILE_WIDTH) + 1;
		Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / Map.TILE_HEIGHT) + 1;

		Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
		Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

		Map.settings = map.settings;
		Map.terrain = map.terrain;
		Map.objects = map.objects;
		Map.actors  = map.actors;

		Map.buffer = new PIXI.SpriteBatch();
		//Map.buffer.cacheAsBitmap = true;

		var tiles = new Image();
		tiles.onload = function() {
			var baseTexture = new PIXI.BaseTexture(tiles);
			var texture = new PIXI.Texture(baseTexture);
			var frameTexture = undefined;
			var index = 0;
			
			// Once we have the tile image loaded, break it up into textures:
			for (var row = 0; row < tiles.height; row += 32) {
				for (var col = 0; col < tiles.width; col += 32) {
					frameTexture = new PIXI.Texture(texture, {
						x: col,
						y: row,
						width: 32,
						height: 32
					});
					PIXI.Texture.addTextureToCache(frameTexture, 'tile_' + index);
					index++;
				}
			}
            
            Map.tile_count = index;
		};
		tiles.src = 'client/resource/terrain_atlas.png';

		var cursors = new Image();
		cursors.onload = function() {
			var baseTexture = new PIXI.BaseTexture(cursors);
			var texture = new PIXI.Texture(baseTexture);

			// Open hand:
			var frameTexture = new PIXI.Texture(texture, {
				x: 39,
				y: 8,
				width: 20,
				height: 20
			});
			PIXI.Texture.addTextureToCache(frameTexture, 'cursor_hand');

			// Closed hand:
			frameTexture = new PIXI.Texture(texture, {
				x: 70,
				y: 8,
				width: 20,
				height: 20
			});
			PIXI.Texture.addTextureToCache(frameTexture, 'cursor_hand_closed');

			// Eraser:
			frameTexture = new PIXI.Texture(texture, {
				x: 214,
				y: 6,
				width: 20,
				height: 22
			});
			PIXI.Texture.addTextureToCache(frameTexture, 'cursor_eraser');

			// Pencil:
			frameTexture = new PIXI.Texture(texture, {
				x: 2,
				y: 6,
				width: 26,
				height: 24
			});
			PIXI.Texture.addTextureToCache(frameTexture, 'cursor_pencil');


		};
		cursors.src = 'client/resource/cursors.png';
        
        Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);

        Map.layer_terrain = new PIXI.Sprite(Map.texture);
        Map.layer_terrain.cacheAsBitmap = true;
        
        Map.stage.addChild(Map.layer_terrain);
        
        requestAnimationFrame(Map.render);
	},
	
	setTile: function (screen_coordinates, tile_index) {
		var col = Math.floor((Map.coordinates.x - Map.offset.x - Map.half_width + screen_coordinates.x) / Map.TILE_WIDTH);
		var row = Math.floor((Map.coordinates.y - Map.offset.y - Map.half_height + screen_coordinates.y) / Map.TILE_HEIGHT);
        
        if (Map.terrain[row] === undefined) {
            Map.terrain[row] = {};
        }
        //if (Map.terrain[row][col] === undefined) continue;
		
		Map.terrain[row][col] = tile_index;
		Map.invalidate = true;
	},
	
	draw: function (full) {

		var sprite = undefined;
		
		
		var start_col = Math.floor((Map.coordinates.x - Map.half_width) / Map.TILE_WIDTH);
		var start_row = Math.floor((Map.coordinates.y - Map.half_height) / Map.TILE_HEIGHT);
		
		var offset_x = (Map.coordinates.x - Map.half_width) % Map.TILE_WIDTH;
		var offset_y = (Map.coordinates.y - Map.half_height) % Map.TILE_HEIGHT;
		
		for (var row = start_row; row < Map.VIEWPORT_HEIGHT_TILES; row++) {
			for (var col = start_col; col < Map.VIEWPORT_WIDTH_TILES; col++) {
				if (Map.terrain[row] === undefined) continue;
				if (Map.terrain[row][col] === undefined) continue;
				
				index = Map.terrain[row][col];
				sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('tile_' + index));
				
				sprite.position.x = offset_x + ((col - start_col) * Map.TILE_WIDTH);
				sprite.position.y = offset_y + ((row - start_row) * Map.TILE_HEIGHT);
				Map.buffer.addChild(sprite);
			}
		}
        
        Map.offset = {x: offset_x, y: offset_y};
		
		if (full) {
			var matrix = new PIXI.Matrix();
			matrix.translate(0, 0);

			Map.texture.render(Map.buffer, matrix);
		}
	},
	
	render: function () {
		
      if (Map.invalidate) {
         Map.draw(true);
         Map.invalidate = false;
      }

      if (Map.texture) {
         Map.renderer.render(Map.stage);
	  }
      
      requestAnimationFrame(Map.render);
	 
   }
	
}