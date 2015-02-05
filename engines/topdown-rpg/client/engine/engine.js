define(["actors", "avatar", "constants", "landscape", "objects", "utilities", "pixi"], 
function(actors, avatar, constants, landscape, objects, utilities, PIXI) {

	/*
	
		Classes of wolves, e.g. mages would be 'howlers' that stay out of combat and buff 
	front line warriors. Dire's, i.e. warriors, receive a combat bonus % equal to wolves in
	pack.
	
		Packing would be a spell like initiating a howl or anything else... when a player wants
	to join a pack, they use the command and the wolf sits down, another wolf from the existing
	pack gets in the adjacent tile and presses the same command, thereby adding the wolf to the pack.
	
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
			
			self.stage.mousedown = function (data) {
				console.log(self.indexFromScreen(data.global));
			};
			
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

			//this.over = new PIXI.SpriteBatch();
			//this.over.cacheAsBitmap = true;

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
				
				objects.initialize(self, PIXI);
				
				avatar.offset = self.draw();
				
				avatar.position.x = avatar.sprite.position.x + 64;
				avatar.position.y = avatar.sprite.position.y + 64;

				//self.texture = new PIXI.RenderTexture(self.renderer.width, self.renderer.height);
				
				//self.overTexture = new PIXI.RenderTexture(self.buffer.width + (CANVAS_WIDTH / 2), self.buffer.height + (CANVAS_HEIGHT / 2));
				//self.overTexture.render(self.over);

				// self.layer_actors = new PIXI.DisplayObjectContainer();
				// self.layer_actors.addChild(avatar.sprite);
				//self.layer_terrain = new PIXI.Sprite(self.bufferTexture); //self.texture);
				//self.layer_terrain.cacheAsBitmap = true;
				//self.layer_over = new PIXI.Sprite(self.overTexture); 
				//self.layer_over.cacheAsBitmap = true;

				self.stage.addChild(landscape.sprite);
				self.stage.addChild(objects.sprite);
				
				//self.stage.addChild(self.layer_actors);
				//self.stage.addChild(self.layer_over);
				
				/*
				var mask = new PIXI.Graphics();
				self.stage.addChild(mask);
				mask.position.x = 0;
				mask.position.y = 0;
				mask.beginFill(0xFFFFFF, 1.0);
				mask.drawRect((CANVAS_WIDTH / 2) - 32, (CANVAS_HEIGHT / 2) - 32, 64, 80);
				mask.endFill();
				self.layer_over.mask = mask;
				*/
				self.renderer.render(self.stage);
				
				self.loaded();
				
			};
			
			loader.load();
				 
		},
	   
		position: function () {
			return avatar.position;
		},
	   
		updateTexture: function () {
			//var matrix = new PIXI.Matrix();
			//matrix.translate(avatar.offset.x, avatar.offset.y);

			//this.texture.render(this.bufferTexture, matrix, true);
			//this.layer_terrain.position.x = -avatar.position.x + avatar.sprite.position.x; //offset
			//this.layer_terrain.position.y = -avatar.position.y + avatar.sprite.position.y + 32;
			
			landscape.sprite.position.x = -avatar.position.x + avatar.sprite.position.x; //offset
			landscape.sprite.position.y = -avatar.position.y + avatar.sprite.position.y + 32;
			
			//this.layer_over.position.x = -avatar.position.x + avatar.sprite.position.x; //offset
			//this.layer_over.position.y = -avatar.position.y + avatar.sprite.position.y + 32;
		},
	   
		draw: function () {
		
			var offset = landscape.draw(this, PIXI);
			
			
			
			return offset;
		
		},

		render: function () {
		  
			avatar.tick(this, PIXI);
		  
			objects.tick(this, PIXI);
		  
			landscape.context.fillStyle = "rgb(255,0,0)";
			landscape.context.fillRect(avatar.position.x + 32, avatar.position.y + 64, 2, 2);

			this.updateTexture();
			this.renderer.render(this.stage);

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
			return landscape.isWalkable(this, {x: point.x + 32, y: point.y + 64});
		}
	   
	};

});