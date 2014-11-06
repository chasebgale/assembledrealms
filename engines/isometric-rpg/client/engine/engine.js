var Engine = {

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

	initialize: function (canvas) {

		// Initialize PIXI:
		var rendererOptions = {
			antialiasing:false,
			transparent:false,
			resolution:1
		}
		
		Map.renderer = PIXI.autoDetectRenderer(Map.width, Map.height, rendererOptions);

		Map.stage = new PIXI.Stage(0x000000, true);

		canvas.appendChild(Map.renderer.view);

		Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / 32) + 1;
		Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / 16) + 1;

		Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
		Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

		Map.settings = map.settings;
		Map.terrain = map.terrain;
		Map.objects = map.objects;
		Map.actors  = map.actors;

		Map.buffer = new PIXI.SpriteBatch();
		//Map.buffer.cacheAsBitmap = true;

		var assets = _.union(map.terrain.source, map.objects.source, map.actors.source);
		Map.assetLoadCount = assets.length;
		Map.loadResources(assets);

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
	},
   
	load: function () {
	
		Map.draw();

		Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);

		Map.layer_actors = new PIXI.DisplayObjectContainer();
		Map.layer_terrain = new PIXI.Sprite(Map.texture);
		Map.layer_terrain.cacheAsBitmap = true;

		var matrix = new PIXI.Matrix();
		matrix.translate(Map.offset.x, Map.offset.y);

		Map.texture.render(Map.buffer, matrix);

		Map.stage.addChild(Map.layer_terrain);
		Map.stage.addChild(Map.layer_actors);

		Map.renderer.render(Map.stage);
		
	},

   loadResources: function (assets) {
      
		var worker = [];

		_.each(assets, function (asset) {

			asset = 'client' + asset;
			asset = realmResourceURL(asset);

			worker.push(asset);

		});

		var loader = new PIXI.AssetLoader(worker, true);
		
		loader.onProgress = function (event) {
			$.extend(Map.frames, event.json.frames);
		};
		
		loader.onComplete = function (event) {
			Map.load();
		};
		
		loader.load();
      
      _.each(assets, function (asset) {
         
         asset = 'client' + asset;
        
         // Load the json file, then load the image file, then parse. Wohoo!
         var assetPath = asset.substring(0, asset.lastIndexOf("/") + 1);
         
         $.ajax({
            url: realmResourceURL(asset),
            type: 'get',
            dataType: 'json',
            success: function (json) {
       
               if (json.frames) {
               
                  var image = new Image();
                  image.onload = function() {
                     var baseTexture = new PIXI.BaseTexture(image);
                     var texture = new PIXI.Texture(baseTexture);
                     
                     _.each(json.frames, function(frame, frameName) {
                     
                        var frameTexture = new PIXI.Texture(texture, {
                           x: parseInt(frame.frame.x),
                           y: parseInt(frame.frame.y),
                           width: parseInt(frame.frame.w),
                           height: parseInt(frame.frame.h)
                        });
                        
                        PIXI.Texture.addTextureToCache(frameTexture, frameName);
                           
                     });
                  
                     Map.onResourceLoaded(json, realmResourceURL(assetPath + json.meta.image));
                  
                     Map.assetLoadCount--;
                     
                     if (Map.assetLoadCount === 0) {
                        Map.load();
                     }
                  };
                  image.src = realmResourceURL(assetPath + json.meta.image);
                  
                  
                  
                  // Persist to look up tile settings, like offset and whatnot, later
                  $.extend(Map.frames, json.frames);
                  
               }
            }
         });
             
      });
      */
   },
   
	update: function () {
		Map.draw();
	},

	updateTexture: function () {
		var matrix = new PIXI.Matrix();
		matrix.translate(Map.offset.x, Map.offset.y);

		Map.texture.render(Map.buffer, matrix, true);
	},
   
	draw: function () {
      
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

document.onkeydown = function (evt) {
    evt = evt || window.event;

    var amount = 2;

    switch (evt.keyCode) {
        case 87:
            //Map.layer_terrain.position.y--;
            Map.offset.y -= amount;
            Map.offsetTracker.y -= amount;
            Map.playerPos.y += amount;
            break;
        case 83:
            //Map.layer_terrain.position.y++;
            Map.offset.y += amount;
            Map.offsetTracker.y += amount;
            Map.playerPos.y -= amount;
            break;
        case 65:
            //Map.layer_terrain.position.x--;
            Map.offset.x -= amount;
            Map.offsetTracker.x -= amount;
            Map.playerPos.x += amount;
            break;
        case 68:
            //Map.layer_terrain.position.x++;
            Map.offset.x += amount;
            Map.offsetTracker.x += amount;
            Map.playerPos.x -= amount;
            break;
    }


    if ( Map.offsetTracker.x  >= 32 ) {
        Map.offsetTracker.x = 0;
        Map.invalidate = true;
    }

    if (Map.offsetTracker.x <= -32) {
        Map.offsetTracker.x = 0;
        Map.invalidate = true;
    }
    
    if (Map.offsetTracker.y >= 16) {
        Map.offsetTracker.y = 0;
        Map.invalidate = true;
    }

    if (Map.offsetTracker.y <= -16) {
        Map.offsetTracker.y = 0;
        Map.invalidate = true;
    }

    Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
};