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
		buffer: undefined,
		path: undefined,
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
			this.path = new PIXI.SpriteBatch();

			var assets = _.union(this.terrain.source, this.objects.source, this.actors.source);
			
			// TODO: Actor json injected more gracefully?
			assets.push('/resource/zombie.json', '/resource/effects.json');
			
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
				
				avatar.initialize(self, PIXI);
				avatar.sprite.position.x = (CANVAS_WIDTH / 2) - 64;
				avatar.sprite.position.y = (CANVAS_HEIGHT / 2) - 64;
				
				avatar.offset = self.draw();

				self.texture = new PIXI.RenderTexture(self.renderer.width, self.renderer.height);

				self.layer_actors = new PIXI.DisplayObjectContainer();
				self.layer_actors.addChild(avatar.sprite);
				self.layer_terrain = new PIXI.Sprite(self.texture);
				self.layer_terrain.cacheAsBitmap = true;

				var matrix = new PIXI.Matrix();
				matrix.translate(avatar.offset.x, avatar.offset.y);

				self.texture.render(self.path, matrix);

				self.stage.addChild(self.layer_terrain);
				self.stage.addChild(self.layer_actors);

				self.renderer.render(self.stage);
				
				self.loaded();
				
			};
			
			loader.load();
				 
		},
	   
		updateTexture: function () {
			var matrix = new PIXI.Matrix();
			matrix.translate(avatar.offset.x, avatar.offset.y);

			this.texture.render(this.path, matrix, true);
		},
	   
		draw: function () {
		
			this.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/
		
			var offset = landscape.draw(this, PIXI);
			
			return offset;
		
		},

		render: function () {

		  // Map.stats.begin();
		  
		  avatar.tick(this, PIXI);

		  //if (this.invalidate) {
			 //this.draw();
			 this.updateTexture();
			 this.invalidate = false;
		  //}

		  if (this.texture)
			 this.renderer.render(this.stage);

		  // Map.stats.end();
	   },

		indexFromScreen: function (point) {

			var map = {};
			var screen = {};
			screen.x = point.x - avatar.offset.x;
			screen.y = point.y - avatar.offset.y;

			map.row = (screen.x / TILE_WIDTH_HALF + screen.y / TILE_HEIGHT_HALF) / 2;
			map.col = (screen.y / TILE_HEIGHT_HALF - screen.x / TILE_WIDTH_HALF) / -2;

			map.row = Math.floor(map.row);
			map.col = Math.floor(map.col);

			return map;
	   },
	   
		coordFromScreen: function (index) {
			var b = ((index.row * 2) - (index.col * 2)) / 2;
			var a = (index.row * 2) - b;

			return {"a" : a, "b": b};
		},
		
		validPixel: function (point) {
			return this.buffer.hitTest(point);
		},
		
		isNumber: function (o) {
			return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
		}
	   
	};

});