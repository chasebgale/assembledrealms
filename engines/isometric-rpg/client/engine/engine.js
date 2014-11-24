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
			this.buffer.cacheAsBitmap = true;

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
				
				avatar.position.x = avatar.sprite.position.x + 64;
				avatar.position.y = avatar.sprite.position.y + 64;

				self.texture = new PIXI.RenderTexture(self.renderer.width, self.renderer.height);
				
				self.bufferTexture = new PIXI.RenderTexture(self.buffer.width + (CANVAS_WIDTH / 2), self.buffer.height + (CANVAS_HEIGHT / 2));
				self.bufferTexture.render(self.buffer);

				self.layer_actors = new PIXI.DisplayObjectContainer();
				self.layer_actors.addChild(avatar.sprite);
				self.layer_terrain = new PIXI.Sprite(self.bufferTexture); //self.texture);
				self.layer_terrain.cacheAsBitmap = true;

				//var matrix = new PIXI.Matrix();
				//matrix.translate(avatar.offset.x, avatar.offset.y);

				//self.texture.render(self.buffer, matrix);

				self.stage.addChild(self.layer_terrain);
				self.stage.addChild(self.layer_actors);

				self.renderer.render(self.stage);
				
				self.loaded();
				
			};
			
			loader.load();
				 
		},
	   
		updateTexture: function () {
			//var matrix = new PIXI.Matrix();
			//matrix.translate(avatar.offset.x, avatar.offset.y);

			//this.texture.render(this.bufferTexture, matrix, true);
			this.layer_terrain.position.x = -avatar.position.x + avatar.sprite.position.x; //offset
			this.layer_terrain.position.y = -avatar.position.y + avatar.sprite.position.y + 32;
		},
	   
		draw: function () {
		
			//this.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/
		
			var offset = landscape.draw(this, PIXI);
			
			return offset;
		
		},

		render: function () {
		  
			avatar.tick(this, PIXI);
		  
			landscape.context.fillStyle = "rgb(255,0,0)";
			landscape.context.fillRect(avatar.position.x + 32, avatar.position.y + 64, 2, 2);

			this.updateTexture();

			if (this.texture)
				this.renderer.render(this.stage);

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
		
		isNumber: function (o) {
			return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
		},
		
		setPixel: function (imageData, x, y, r, g, b, a) {
			var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
			imageData.data[index+0] = r;
			imageData.data[index+1] = g;
			imageData.data[index+2] = b;
			imageData.data[index+3] = a;
		},
		
		getPixel: function (imageData, x, y) {
			var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
			return {r: imageData.data[index+0],
					g: imageData.data[index+1],
					b: imageData.data[index+2],
					a: imageData.data[index+3]};
		},
		
		isWalkable: function(point) {
			return landscape.isWalkable(this, {x: point.x + 32, y: point.y + 64});
		}
	   
	};

});