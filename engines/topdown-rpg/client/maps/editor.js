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
        
        // If we haven't already, let's get our toolbar in place:
        if (!document.getElementById('mapToolbar').firstChild.hasChildNodes()) {
            Map.createToolbar();
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
        
        var frameTexture;
        var index = 0;
        var row = 0;
        var col = 0;
        var worker = [];
        
        _.each(map.terrain.source, function (asset) {
         
            asset = realmResourceURL(asset);
            worker.push(asset);

        });
        
        
        var loader = new PIXI.AssetLoader(worker, true);
        loader.onProgress = function (event) {
            
            // Once we have the tile image loaded, break it up into textures:
            for (row = 0; row < event.texture.height; row += 32) {
                for (col = 0; col < event.texture.width; col += 32) {
                    frameTexture = new PIXI.Texture(event.texture, {
                        x: col,
                        y: row,
                        width: 32,
                        height: 32
                    });
                    PIXI.Texture.addTextureToCache(frameTexture, 'tile_' + index);
                    index++;
                }
            }
            //Map.onResourceLoaded(event.json, realmResourceURL('client/resource/' + event.json.meta.image));
        };
        loader.onComplete = function (event) {
            Map.tile_count = index - 1;
            
            Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);

            Map.layer_terrain = new PIXI.Sprite(Map.texture);
            Map.layer_terrain.cacheAsBitmap = true;
            
            Map.stage.addChild(Map.layer_terrain);
            
            requestAnimationFrame(Map.render);
        };
        loader.load();

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
	 
    },
	
    createToolbar: function () {
        var html = '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="moveButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Navigate the map"><div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 20px; background-position:-39px -8px"></div></button>' +
            '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="eraseButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Erase tiles from the map"><div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 20px; background-position:-216px -6px"></div></button>' +
            '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="addButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Add tiles"><div style="background-image: url(\'/build/img/cursors.png\'); width: 22px; height: 22px; background-position:-6px -6px"></div></button>' +
			'<div id="addBrush" style="display: none;"><canvas id="brush" width="48" height="48" style="vertical-align: middle; display: inline-block;"></canvas>' +
            '<button type="button" class="btn btn-default btn-sm navbar-btn" data-toggle="modal" data-target=".tiles-modal-lg"><span>Change Brush</span></button></div>';
            
        document.getElementById('mapToolbar').innerHTML = html;
    }
    
}