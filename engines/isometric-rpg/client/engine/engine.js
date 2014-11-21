define(["actors", "avatar", "constants", "landscape", "utilities", "pixi"], 
function(actors, avatar, constants, landscape, utilities, PIXI) {

	return {

		stage: null,
		renderer: null,
		playerPos: { x: 0, y: 0 },
		offsetTracker: { x: 0, y: 0 },
		terrain: {},
		objects: {},
		brush: {},
		tile: 0,
		moveOriginPoint: {},
		moveOriginOffset: {},
		frames: {},
		offset: {},
		buffer: undefined,
		keyboard: undefined,

		initialize: function (target) {

			var self = this;
			
			// Initialize keyboard:
			self.keyboard = require("keyboard");
			
			// Initialize PIXI:
			var rendererOptions = {
				antialiasing:false,
				transparent:false,
				resolution:1
			}
			
			self.renderer = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, rendererOptions);
			target.appendChild(self.renderer.view);
			self.stage = new PIXI.Stage(0x000000, true);
			
			
			
			// TODO: Right here I should be handshaking with the server and receiving a 
			// response object with player position, stats, etc - then the map he/she is
			// located inside of gets loaded!
			
			// OR: Perhaps the handshake just auth's and then we display a list of available 
			// characters or the new character option...
			
			$.ajax({
				type: 'GET',
				url: 'client/maps/town.json',
				dataType: 'json'
			})
			.done(function(json) {
				self.load(json);
			});
			
		},
		
		checkKeys: function () {
			var self = this;
			var amount = 2;
			var amount_angle = 2 * MOVEMENT_ANGLE;
			
			var keys = self.keyboard.activeKeys();
			
			if (_.contains(keys, 'shift')) {
				amount *= 2;
				amount_angle *= 2;
			}
			
			if (_.contains(keys, 'w')) {
				if (_.contains(keys, 'a')) {
					// North-West
					self.offset.x += amount_angle;
					self.offsetTracker.x += amount_angle;
					
					self.offset.y += amount_angle;
					self.offsetTracker.y += amount_angle;
					
					self.playerPos.x -= amount_angle;
					self.playerPos.y -= amount_angle;
					self.invalidate = true;
					return;
				} else if (_.contains(keys, 'd')) {
					// North-East
					self.offset.x -= amount_angle;
					self.offsetTracker.x -= amount_angle;
					
					self.offset.y += amount_angle;
					self.offsetTracker.y += amount_angle;
					
					self.playerPos.x += amount_angle;
					self.playerPos.y -= amount_angle;
					self.invalidate = true;
					return;
				} else {
					// North
					self.offset.y += amount;
					self.offsetTracker.y += amount;
					self.playerPos.y -= amount;
					self.invalidate = true;
					return;
				}
			}
			
			if (_.contains(keys, 's')) {
				if (_.contains(keys, 'a')) {
					// South-West
					self.offset.x += amount_angle;
					self.offsetTracker.x += amount_angle;
					
					self.offset.y -= amount_angle;
					self.offsetTracker.y -= amount_angle;
					
					self.playerPos.x -= amount_angle;
					self.playerPos.y += amount_angle;
					self.invalidate = true;
					return;
				} else if (_.contains(keys, 'd')) {
					// South-East
					self.offset.x -= amount_angle;
					self.offsetTracker.x -= amount_angle;
					
					self.offset.y -= amount_angle;
					self.offsetTracker.y -= amount_angle;
					
					self.playerPos.x += amount_angle;
					self.playerPos.y += amount_angle;
					self.invalidate = true;
					return;
				} else {
					// South
					self.offset.y -= amount;
					self.offsetTracker.y -= amount;
					self.playerPos.y += amount;
					self.invalidate = true;
					return;
				}
			}
			
			if (_.contains(keys, 'd')) {
				self.offset.x -= amount;
				self.offsetTracker.x -= amount;
				self.playerPos.x += amount;
				self.invalidate = true;
				return;
			}
			
			if (_.contains(keys, 'a')) {
				self.offset.x += amount;
				self.offsetTracker.x += amount;
				self.playerPos.x -= amount;
				self.invalidate = true;
				return;
			}
		},
		
		checkBounds: function () {

			var self = this;
		
			if (self.offsetTracker.x >= 32 ) {
				self.offsetTracker.x = 0;
				self.invalidate = true;
			}

			if (self.offsetTracker.x <= -32) {
				self.offsetTracker.x = 0;
				self.invalidate = true;
			}
			
			if (self.offsetTracker.y >= 16) {
				self.offsetTracker.y = 0;
				self.invalidate = true;
			}

			if (self.offsetTracker.y <= -16) {
				self.offsetTracker.y = 0;
				self.invalidate = true;
			}
		},
	   
		load: function (map) {
		
			this.terrain = map.terrain;
			this.objects = map.objects;
			this.actors  = map.actors;

			this.buffer = new PIXI.SpriteBatch();

			var assets = _.union(this.terrain.source, this.objects.source, this.actors.source);
			this.assetLoadCount = assets.length;
			this.loadResources(assets);

		},

		loadResources: function (assets) {
			
			var self = this;
			var worker = [];
      
			_.each(assets, function (asset) {

				asset = 'client' + asset;
				worker.push(asset);

			});

			var loader = new PIXI.AssetLoader(worker, true);
			
			loader.onProgress = function (event) {
				$.extend(self.frames, event.json.frames);
			};
			
			loader.onComplete = function (event) {
				
				self.draw();

				self.texture = new PIXI.RenderTexture(self.renderer.width, self.renderer.height);

				self.layer_actors = new PIXI.DisplayObjectContainer();
				self.layer_terrain = new PIXI.Sprite(self.texture);
				self.layer_terrain.cacheAsBitmap = true;

				var matrix = new PIXI.Matrix();
				matrix.translate(self.offset.x, self.offset.y);

				self.texture.render(self.buffer, matrix);

				self.stage.addChild(self.layer_terrain);
				self.stage.addChild(self.layer_actors);

				self.renderer.render(self.stage);
				
			};
			
			loader.load();
				 
		},
	   
		updateTexture: function () {
			var matrix = new PIXI.Matrix();
			matrix.translate(this.offset.x, this.offset.y);

			this.texture.render(this.buffer, matrix, true);
		},
	   
		draw: function () {
		
			this.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/
		
			landscape.draw(this, PIXI);
		
		},

		render: function () {

		  // Map.stats.begin();
		  
		  this.checkKeys();

		  if (this.invalidate) {
			 this.draw();
			 this.updateTexture();
			 this.invalidate = false;
		  }

		  if (this.texture)
			 this.renderer.render(this.stage);

		  // Map.stats.end();
	   },

		indexFromScreen: function (point) {

			var map = {};
			var screen = {};
			screen.x = point.x - Map.offset.x;
			screen.y = point.y - Map.offset.y;

			map.row = (screen.x / Map.TILE_WIDTH_HALF + screen.y / Map.TILE_HEIGHT_HALF) / 2;
			map.col = (screen.y / Map.TILE_HEIGHT_HALF - screen.x / Map.TILE_WIDTH_HALF) / -2;

			map.row = Math.floor(map.row);
			map.col = Math.floor(map.col);

			return map;
	   },
	   
		coordFromScreen: function (index) {
			var b = ((index.row * 2) - (index.col * 2)) / 2;
			var a = (index.row * 2) - b;

			return {"a" : a, "b": b};
		}
	   
	};

});