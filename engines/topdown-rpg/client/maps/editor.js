var Map = {
	
	stage: null,
	renderer: null,
    canvas: null,
    invalidate: false,
	width: 896,
	height: 512, // Slightly larger than 16:9, so we have an even height in tiles
	half_width: 448,
	half_height: 256,
	TILE_WIDTH: 32,
	TILE_WIDTH_HALF: 16,
	TILE_HEIGHT: 32,
	TILE_HEIGHT_HALF: 16,
    
    modes: {
        MOVE: 0,
        ADD_TILE: 1,
        DELETE_TILE: 2
    },
    
    mode: 0,
	
	// Top left tile coordinates
	coordinates: {row: 0, col: 0},
    
    offset: {x: 0, y: 0},
    tile_count: 0,
    tile_index: 0,
    layer_index: 0,
    
    // Mouse tracking:
    mouse_down: false,
    mouse_origin: {x: 0, y: 0},
    mouse_origin_coordinates: {row: 0, col: 0},
    mouse_animation_flag: false,
    
    debug: true,
    initialized: false,
	
	init: function (element, map) {
        
        if (Map.initialized) {
            return;
        }
        
        Map.settings = map.settings;
		Map.terrain = map.terrain;
		Map.objects = map.objects;
		Map.actors  = map.actors;
		
		// Find element:
		var target = document.getElementById(element);
		
		// Empty any contents, including the canvas we created if re-initializing:
		// while (target.firstChild) {
		// 	target.removeChild(target.firstChild);
		// }
        
        // If we haven't already, let's get our toolbar in place:
        if (!document.getElementById('mapToolbar').firstChild.hasChildNodes()) {
            Map.appendDOM();
        }
		
		// Initialize PIXI:
		var rendererOptions = {
			antialiasing:false,
			transparent:false,
			resolution:1
		};
		
		Map.renderer = PIXI.autoDetectRenderer(Map.width, Map.height, rendererOptions);

		Map.stage = new PIXI.Stage(0x000000, true);

		Map.canvas = target.appendChild(Map.renderer.view);

		Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / Map.TILE_WIDTH) + 1;
		Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / Map.TILE_HEIGHT) + 1;

		Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
		Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

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
            
            document.getElementById('modalTilesBody').appendChild(event.texture.baseTexture.source);
            
            //Map.onResourceLoaded(event.json, realmResourceURL('client/resource/' + event.json.meta.image));
        };
        loader.onComplete = function (event) {
            
            Map.initialized = true;
            
            Map.tile_count = index - 1;
            
            Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);

            Map.layer_terrain = new PIXI.Sprite(Map.texture);
            Map.layer_terrain.cacheAsBitmap = true;
            Map.stage.addChild(Map.layer_terrain);
            
            Map.mouse_sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('tile_0'));
            Map.mouse_sprite.visible = false;
            Map.stage.addChild(Map.mouse_sprite);
            
            Map.mouse_sprite_highlight = new PIXI.Graphics();
            Map.mouse_sprite_highlight.blendMode = PIXI.blendModes.DIFFERENCE;
            Map.stage.addChild(Map.mouse_sprite_highlight);
            
            
            Map.invalidate = true;
            requestAnimationFrame(Map.render);
        };
        loader.load();

		var cursors = new Image();
        cursors.crossOrigin = "anonymous";
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

            Map.setMode(Map.modes.MOVE);
            
		};
		cursors.src = realmResourceURL('client/resource/cursors.png');
        
        
	},
	
	setTile: function (screen_coordinates, tile_index) {
		var col = Map.coordinates.col + Math.floor(screen_coordinates.x / Map.TILE_WIDTH);
		var row = Map.coordinates.row + Math.floor(screen_coordinates.y / Map.TILE_HEIGHT);
        
        if (tile_index == null) {
            // DELETE THIS TILE:
            if (Map.terrain[row]) {
                if (col in Map.terrain[row]) {
                    delete Map.terrain[row][col][Map.layer_index];
                }
            }
        } else {
            // ADD OR CHANGE A TILE:
            if (Map.terrain[row] === undefined) {
                Map.terrain[row] = {};
            }
            
            if (Map.terrain[row][col] === undefined) {
                Map.terrain[row][col] = [];
            }
            
            Map.terrain[row][col][Map.layer_index] = tile_index;
        }
        
		Map.invalidate = true;
        
        if (Map.debug) {
            console.log("setTile()'d at row: " + row + ", col: " + col);
        }
	},
	
    setMode: function (mode) {
        Map.mode = mode;
        
        switch (mode) {
            case Map.modes.MOVE:
            
                // ALL MOUSE EVENTS RE-WIRED FOR THE MOVE TOOL:
                Map.mouse_sprite.setTexture(PIXI.Texture.fromFrame('cursor_hand'));
                
                Map.canvas.onmousedown = function (event) {
                    Map.mouse_down = true;
                    Map.mouse_origin = {x: event.layerX, y: event.layerY};
                    Map.mouse_origin_coordinates = {row: Map.coordinates.row, col: Map.coordinates.col};
                    Map.mouse_sprite.setTexture(PIXI.Texture.fromFrame('cursor_hand_closed'));
                }
                
                Map.canvas.onmouseup = function (event) {
                    Map.mouse_down = false;
                    Map.mouse_sprite.setTexture(PIXI.Texture.fromFrame('cursor_hand'));
                }
                
                Map.canvas.onmouseout = function (event) {
                    Map.mouse_sprite.visible = false;
                }
                
                Map.canvas.onmousemove = function (event) {
            
                    if (!Map.mouse_sprite.visible) {
                        Map.mouse_sprite.visible = true;
                    }
                    
                    if (Map.mouse_down) {
                        
                        if (event.which == 0) {
                            // We've re-entered the canvas w/o the mouse being held down:
                            Map.mouse_down = false;
                        } else {                        
                            var offset_cols = Math.ceil((event.layerX - Map.mouse_origin.x) / Map.TILE_WIDTH_HALF);
                            var offset_rows = Math.ceil((event.layerY - Map.mouse_origin.y) / Map.TILE_HEIGHT_HALF);
                            
                            Map.coordinates.row = Map.mouse_origin_coordinates.row - offset_rows;
                            Map.coordinates.col = Map.mouse_origin_coordinates.col - offset_cols;
                            
                            Map.invalidate = true;
                        }
                    }
                    
                    var x = event.layerX - 10;// - (event.layerX % Map.TILE_WIDTH);
                    var y = event.layerY - 10;// - (event.layerY % Map.TILE_HEIGHT);
                    
                    Map.mouse_sprite.x = x;
                    Map.mouse_sprite.y = y;
                }
            
                break;
            case Map.modes.DELETE_TILE:
                
                Map.mouse_sprite.visible = false;
                
                Map.mouse_sprite_highlight.clear();
                Map.mouse_sprite_highlight.lineStyle(1, 0xFFFFFF, 1);
                Map.mouse_sprite_highlight.moveTo(0, 0);
                Map.mouse_sprite_highlight.lineTo(32, 0);
                Map.mouse_sprite_highlight.lineTo(32, 32);
                Map.mouse_sprite_highlight.lineTo(0, 32);
                Map.mouse_sprite_highlight.lineTo(0, 0);
                Map.mouse_sprite_highlight.lineTo(32, 32);
                
                Map.canvas.onmousedown = function (event) {
                    Map.mouse_down = true;
                    Map.setTile({x: event.layerX, y: event.layerY}, null);
                }
                
                Map.canvas.onmouseup = function (event) {
                    Map.mouse_down = false;
                    Map.save();
                }
                
                Map.canvas.onmouseout = function (event) {
                    Map.mouse_sprite.visible = false;
                    Map.mouse_sprite_highlight.visible = false;
                }
                
                Map.canvas.onmousemove = function (event) {
            
                    if (!Map.mouse_sprite_highlight.visible) {
                        Map.mouse_sprite_highlight.visible = true;
                    }
                    
                    if (Map.mouse_down) {
                        if (event.which == 0) {
                            // We've re-entered the canvas w/o the mouse being held down:
                            Map.mouse_down = false;
                        } else { 
                            Map.setTile({x: event.layerX, y: event.layerY}, null);
                        }
                    }
                    
                    var x = event.layerX - (event.layerX % Map.TILE_WIDTH);
                    var y = event.layerY - (event.layerY % Map.TILE_HEIGHT);
                  
                    Map.mouse_sprite_highlight.x = x;
                    Map.mouse_sprite_highlight.y = y;
                }
                
                break;
                
            case Map.modes.ADD_TILE:
            
                Map.mouse_sprite.setTexture(PIXI.Texture.fromFrame('tile_' + Map.tile_index));
                
                Map.mouse_sprite_highlight.clear();
                Map.mouse_sprite_highlight.lineStyle(1, 0xFFFFFF, 1);
                Map.mouse_sprite_highlight.moveTo(0, 0);
                Map.mouse_sprite_highlight.lineTo(32, 0);
                Map.mouse_sprite_highlight.lineTo(32, 32);
                Map.mouse_sprite_highlight.lineTo(0, 32);
                Map.mouse_sprite_highlight.lineTo(0, 0);
            
                Map.canvas.onmousedown = function (event) {
                    Map.mouse_down = true;
                    Map.setTile({x: event.layerX, y: event.layerY}, Map.tile_index);
                }
                
                Map.canvas.onmouseup = function (event) {
                    Map.mouse_down = false;
                    Map.save();
                }
                
                Map.canvas.onmouseout = function (event) {
                    Map.mouse_sprite.visible = false;
                    Map.mouse_sprite_highlight.visible = false;
                }
            
                Map.canvas.onmousemove = function (event) {
            
                    if (!Map.mouse_sprite.visible) {
                        Map.mouse_sprite.visible = true;
                        Map.mouse_sprite_highlight.visible = true;
                    }
                    
                    if (Map.mouse_down) {
                        if (event.which == 0) {
                            // We've re-entered the canvas w/o the mouse being held down:
                            Map.mouse_down = false;
                        } else { 
                            Map.setTile({x: event.layerX, y: event.layerY}, Map.tile_index);
                        }
                    }
                    
                    var x = event.layerX - (event.layerX % Map.TILE_WIDTH);
                    var y = event.layerY - (event.layerY % Map.TILE_HEIGHT);
                    
                    Map.mouse_sprite.x = x;
                    Map.mouse_sprite.y = y;
                    
                    Map.mouse_sprite_highlight.x = x;
                    Map.mouse_sprite_highlight.y = y;
                }
            
            
                break;
        }
        
    },
    
	draw: function (full) {

        // Reset some things:
        Map.buffer.children = [];
        Map.texture.clear();
    
        var index;
		var sprite;
        var layers;
        var i;
		
		for (var row = Map.coordinates.row; row < Map.coordinates.row + Map.VIEWPORT_HEIGHT_TILES; row++) {
			for (var col = Map.coordinates.col; col < Map.coordinates.col + Map.VIEWPORT_WIDTH_TILES; col++) {
				if (Map.terrain[row] === undefined) continue;
				if (Map.terrain[row][col] === undefined) continue;
				
				layers = Map.terrain[row][col];
                
                if (layers.constructor !== Array) continue;
				
                for (i = 0; i < layers.length; i++) {
                    
                    index = layers[i];
                    
                    if (index != null) {
                        
                        sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('tile_' + index));
                
                        sprite.position.x = ((col - Map.coordinates.col) * Map.TILE_WIDTH);
                        sprite.position.y = ((row - Map.coordinates.row) * Map.TILE_HEIGHT);
                        
                        Map.buffer.addChild(sprite);
                        
                    }
                    
                }
                
                
			}
		}
        
		if (full) {
			var matrix = new PIXI.Matrix();
			matrix.translate(0, 0);

			Map.texture.render(Map.buffer, matrix);
		}
        
	},
	
	render: function () {
        
        /*
        if (!Map.rendering) {
            return;
        }
        */
		
        if (Map.invalidate) {
            Map.draw(true);
            Map.invalidate = false;
        }
        
        if (Map.mouse_sprite_highlight.alpha >= 1) {
            Map.mouse_animation_flag = true;
        } else if (Map.mouse_sprite_highlight.alpha <= 0.1) {
            Map.mouse_animation_flag = false;
        }
        
        if (Map.mouse_animation_flag) {
            Map.mouse_sprite_highlight.alpha -= 0.05;
        } else {
            Map.mouse_sprite_highlight.alpha += 0.05;
        }
        
        if (Map.texture) {
            Map.renderer.render(Map.stage);
        }
      
        requestAnimationFrame(Map.render);
	 
    },
	
    appendDOM: function () {
        
        var html = '';
        
        // TOOLBAR:
        html += '<button type="button" class="btn btn-default navbar-btn btn-map-tool active" id="moveButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Navigate the map">' +
                    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-39px -8px"></div>' +
                '</button>' +
                '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="eraseButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Erase tiles from the map">' + 
                    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-216px -6px"></div>' +
                '</button>' +
                '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="addButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Add tiles">' + 
                    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-6px -6px"></div>' +
                '</button>' +
                '<div class="spacer"></div>' + 
                '<button type="button" class="btn btn-default navbar-btn btn-map-tool" data-toggle="modal" data-target="#modalTiles">' + 
                    '<div id="brushIndicator" style="width: 20px; height: 20px; background-color: white; vertical-align: middle; display: inline-block;"></div>&nbsp' +
                    '<span class="caret"></span>' +
                '</button>' +
                '<div class="dropdown btn-map-tool" style="display: inline;">' +
                    '<button class="btn btn-default navbar-btn dropdown-toggle" type="button" id="layersMenu" data-toggle="dropdown" aria-expanded="true">' +
                        'Editing Layer: 1 ' +
                        '<span class="caret"></span>' +
                    '</button>' +
                    '<ul class="dropdown-menu" role="menu" aria-labelledby="layersMenu" id="layersMenuList">' +
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 1, Walkable</a></li>' +
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 2, Walkable</a></li>' +
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 3, Non-Walkable</a></li>' +
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 4, Above Ground</a></li>' +
                    '</ul>' +
                '</div>';
            
        // MODAL DIALOG:
        html += '<div class="modal fade tiles-modal-lg" id="modalTiles" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog modal-lg">' +
                        '<div class="modal-content">' +
                            '<div class="modal-header clearfix">' +
                                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
                                '<h4 class="modal-title pull-left" style="width: 230px;">Select a tile from category: </h4>' +
                                '<select id="categorySelection" class="form-control pull-left" style="display: inline-block; width: 125px; margin-top: -4px;">' +
                                    '<option data-id="terrain">Terrain</option>' +
                                    '<option data-id="objects">Objects</option>' + 
                                '</select>' +
                            '</div>' +
                            '<div id="modalTilesBody" class="modal-body" style="overflow-x: scroll;">' +
                                // TILE HOVER IDENTIFIER:
                                '<div id="tilesHoverIdentifier" style="width: 32px; height: 32px; outline: 2px solid magenta; position: relative; z-index: 9999; display: none; pointer-events: none;"></div>' + 
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                
        
        // ADD MARKUP TO DOM:
        document.getElementById('mapToolbar').innerHTML = html;
        
        // ATTACH LISTENERS TO NEW DOM:
        $('#modalTilesBody').on('mousedown', 'img', function (e) {
            var offset = $(this).offset();
            var width = $(this).width();
            var point = {x: e.pageX - offset.left, y: e.pageY - offset.top};
            
            // Every image is processed row, then each column, row, then each column...
            // So first we determine how many columns are in this image, then calculate the tile #
            var row_tile_width = Math.round(width / 32);
            var rows_to_add = Math.floor(point.y / 32);
            
            Map.tile_index = (rows_to_add * row_tile_width) + Math.floor(point.x / 32);
            
            if (Map.mode === Map.modes.ADD_TILE) {
                Map.mouse_sprite.setTexture(PIXI.Texture.fromFrame('tile_' + Map.tile_index));
            }
            
            $("#modalTiles").modal("hide");
            
        });
        
        $('#modalTilesBody').on('mousemove', 'img', function (e) {
            $("#tilesHoverIdentifier").show();
            
            var offset = $(this).offset();
            var point = {x: e.pageX - offset.left, y: e.pageY - offset.top};
            
            var y_offset = point.y % 32;
            var x_offset = point.x % 32;
            
            $("#tilesHoverIdentifier").css('top', (point.y - y_offset + 32) + 'px');
            $("#tilesHoverIdentifier").css('left', (point.x- x_offset) + 'px');
            
        });
        
        $('#modalTiles').on('hidden.bs.modal', function (e) {
            $("#tilesHoverIdentifier").hide();
        });
        
        $("#layersMenuList").on('click', 'li', function (e) {
            var index = $(e.currentTarget).index();
            Map.layer_index = index;
            $("#layersMenu").html('Editing Layer: ' + (index + 1) + '&nbsp;<span class="caret"></span>');
        });
        
        $("#moveButton").on("click", function () {
       
            //Map.setCursor('cursor_pencil');
            Map.setMode(Map.modes.MOVE);
            
            $(this).addClass('active').siblings().removeClass('active');
            
        });
        
        $("#eraseButton").on("click", function () {

            //Map.setCursor('cursor_pencil');
            Map.setMode(Map.modes.DELETE_TILE);
            
            $(this).addClass('active').siblings().removeClass('active');
            
        });
        
        $("#addButton").on("click", function () {
           
            //Map.setCursor('cursor_pencil');
            Map.setMode(Map.modes.ADD_TILE);
            
            $(this).addClass('active').siblings().removeClass('active');
            
        });
        
    }
    
}