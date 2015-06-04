define(["actors", "avatar", "constants", "terrain", "objects", "utilities", "pixi"], 
function(actors, avatar, constants, terrain, objects, utilities, PIXI) {


/*

Weak skelly born in crypt or something, weak, must team up with other player skellys to destroy 
difficult, lone, npc 'adventurers' exploring the dungeon, etc, fast pace

*/

	return {

		stage:          undefined,
		renderer:       undefined,
		buffer:         undefined,
		map:		    undefined,
		keyboard:       undefined,
        matrix:         undefined,
        initialized:    false,
        
        layer_terrain:  undefined,
        layer_actors:   undefined,
		
		// Top left tile coordinates
		coordinates: {row: 0, col: 0},
        
        offset:     {x: 0, y: 0},
		position:   {x: 200, y: 200},

		initialize: function (target) {

            // If we are inside of nested functions, 'this' can be reassigned, let's keep a reference to 'this'
            // as it initially references 'engine'
			var self = this;
			
			// Initialize keyboard, check out https://github.com/RobertWHurst/KeyboardJS for more info
			self.keyboard = require("keyboard");
            
            self.matrix = new PIXI.Matrix();
			self.matrix.translate(0, 0);
			
			// Initialize PIXI, the 2D rendering engine we will use, check out
			// https://github.com/GoodBoyDigital/pixi.js for more info
			var rendererOptions = {
				antialiasing:   false,
				transparent:    false,
				resolution:     1
			};
			
			self.renderer   = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, rendererOptions);
			self.stage      = new PIXI.Stage(0x000000, true);
			self.buffer     = new PIXI.SpriteBatch();
			
			target.appendChild(self.renderer.view);
			
			self.stage.mousedown = function (data) {
				//console.log(self.indexFromScreen(data.global));
			};
			
			// TODO: Right here I should be handshaking with the server and receiving a 
			// response object with player position, stats, etc - then the map he/she is
			// located inside of gets loaded!
			
			// OR: Perhaps the handshake just auth's and then we display a list of available 
			// characters or the new character option...
			
			/*
			$.ajax({
				type: 'GET',
				url: 'client/maps/town.json',
				dataType: 'json'
			})
			.done(function(json) {
				self.load(json);
			});
			*/
			
			var jqxhr = $.getJSON( "client/maps/town.json", function( data ) {
				self.load(data);
			}).fail(function(d, textStatus, error) {
				console.error("getJSON failed, status: " + textStatus + ", error: "+error)
			});
			
		},

		load: function (map) {
		
            var self = this;
			self.map = map;
			
			terrain.load(this, PIXI, function (error) {

                self.layer_terrain = new PIXI.Sprite(terrain.texture);
                self.layer_terrain.cacheAsBitmap = true;
                self.stage.addChild(self.layer_terrain);
                
                self.layer_actors = new PIXI.DisplayObjectContainer();
                self.stage.addChild(self.layer_actors);
                
                avatar.load(this, PIXI, function (error) {
                   
                    self.layer_actors.addChild(avatar.sprite);
                   
                    self.initialized = true;
                    self.loaded();
                   
                });
                
				
                
			});

		},

		loadResources: function (assets) {
			
			var self = this;
			var worker = [];
      
			assets.forEach(function (asset) {

				asset = 'client/resource/' + asset;
				worker.push(asset);

			});

			var loader = new PIXI.AssetLoader(worker, true);
			
			loader.onProgress = function (event) {
                // $.extend is like $.merge but targets objects as opposed to arrays, 
                // i.e. it merges objects' properties: http://api.jquery.com/jquery.extend/
				// $.extend(self.frames, event.json.frames);
				//.substr(16)
				
				var filename = event.texture.baseTexture.imageUrl.split('/').pop();
				
				if (filename.startsWith('terrain')) {
					
					
					var index;
					var sprite;
					var layers;
					var i;
					
					for (var row = self.coordinates.row; row < self.coordinates.row + self.VIEWPORT_HEIGHT_TILES; row++) {
						for (var col = self.coordinates.col; col < self.coordinates.col + self.VIEWPORT_WIDTH_TILES; col++) {
							if (self.terrain[row] === undefined) continue;
							if (self.terrain[row][col] === undefined) continue;
							
							layers = self.terrain[row][col];
							
							if (layers.constructor !== Array) continue;
							
							for (i = 0; i < layers.length; i++) {
								
								index = layers[i];
								
								if (index != null) {
									
									sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('tile_' + index));
							
									sprite.position.x = ((col - self.coordinates.col) * self.TILE_WIDTH);
									sprite.position.y = ((row - self.coordinates.row) * self.TILE_HEIGHT);
									
									self.buffer.addChild(sprite);
									
								}
								
							}
							
							
						}
					}
					
					
				} else if (filename.startsWith('actors')) {
					
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

        /*
		position: function () {
			return avatar.position;
		},
        */
		draw: function () {
		
		},

		render: function () {

            var self = this;
        
			if (!self.initialized) {
                return;
            }
            
            avatar.tick(self, PIXI);
			
			// Offset translation for smooth scrolling between tiles
			self.matrix = new PIXI.Matrix();
			self.matrix.translate(-self.position.x + CANVAS_WIDTH_HALF, 
								  -self.position.y + CANVAS_HEIGHT_HALF);
            
            terrain.draw(self, PIXI);
            
            
            
            self.renderer.render(self.stage);

		},

		indexFromScreen: function (point) {

			var map = {};
			var screen = {};
			screen.x = point.x - avatar.offset.x;
			screen.y = point.y - avatar.offset.y;

			map.row = (screen.x / TILE_WIDTH_HALF + screen.y / TILE_HEIGHT_HALF) / 2;
			map.col = (screen.y / TILE_HEIGHT_HALF - screen.x / TILE_WIDTH_HALF) / -2;
			
			console.log("Coords pre-rounding: " + map.row + ", " + map.col);

			map.row = Math.floor(map.row);
			map.col = Math.floor(map.col);
			
			console.log("Coords post-rounding: " + map.row + ", " + map.col);

			return map;
			
		},

		coordFromScreen: function (index) {
			var b = ((index.row * 2) - (index.col * 2)) / 2;
			var a = (index.row * 2) - b;

			return {"a" : a, "b": b};
		},
		
		isWalkable: function(point) {
			return terrain.isWalkable(this, {x: point.x + 32, y: point.y + 64});
		}

	};

});