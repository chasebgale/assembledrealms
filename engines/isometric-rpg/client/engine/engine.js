define(["actors", "avatar", "constants", "landscape", "utilities", "pixi"], 
function(actors, avatar, constants, landscape, utilities, PIXI) {

/*
	var avatar 		= require('avatar');
	var constants 	= require('constants');
	var landscape 	= require('landscape');
	var utilities	= require('utilities');
	var PIXI		= require('pixi');
	var _			= require('lodash');
*/
	
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

		initialize: function (target) {

			var self = this;
			
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

			/*
			var image = new Image();
			image.onload = function() {
				var baseTexture = new PIXI.BaseTexture(image);
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
			image.src = 'img/cursors.png';
			*/
			
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
			matrix.translate(Map.offset.x, Map.offset.y);

			Map.texture.render(Map.buffer, matrix, true);
		},
	   
		draw: function () {
		
			this.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/
		
			landscape.draw(this, PIXI);
		
		},

		render: function () {

		  // Map.stats.begin();

		  if (Map.invalidate) {
			 Map.draw();
			 Map.updateTexture();
			 Map.invalidate = false;
		  }

		  if (Map.texture)
			 Map.renderer.render(Map.stage);

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