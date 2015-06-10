var Terrain = function () {

	this.texture_ground    = undefined;
	this.buffer_ground     = undefined;
	
	this.texture_air    = undefined;
	this.buffer_air     = undefined;
	
};
    
Terrain.prototype.load = function (engine, PIXI, callback) {
    var self = this;
    var worker = [];

    self.buffer_ground     = new PIXI.ParticleContainer();
    self.texture_ground    = new PIXI.RenderTexture(engine.renderer, engine.renderer.width, engine.renderer.height);
    
    self.buffer_air     = new PIXI.ParticleContainer();
    self.texture_air    = new PIXI.RenderTexture(engine.renderer, engine.renderer.width, engine.renderer.height);

    engine.map.terrain.source.forEach(function (asset) {

        asset = ROOT + asset;
        worker.push(asset);

    });

    //var loader = new PIXI.AssetLoader(worker, true);
    PIXI.loader
		.add(worker)
	
    // TODO: The way this works right now, the actual integer indices located in the map file
    // for tile locations assume the same load order of images. Make sure they are the same by adding an
    // id or something in the json definition for the source array items
		.after( function (event) {
        
			var index   = 0;
			var row     = 0;
			var col     = 0;
			
			var frameTexture;
			var filename = event.url.split('/').pop();
			
			for (row = 0; row < event.texture.height; row += 32) {
				for (col = 0; col < event.texture.width; col += 32) {
					frameTexture = new PIXI.Texture(event.texture, {
						x: col,
						y: row,
						width: 32,
						height: 32
					});
					PIXI.Texture.addTextureToCache(frameTexture, 'terrain_' + index);
					index++;
				}
			}
			
			// It's never called normally so if we have more than one item to load we are f'd.
			// TODO: Figure out why 'complete' is never firing!!!
			callback();
			
		})
		.on('error', function (e) {
			console.log(e);
		})
		.once('complete', callback)
		.load();
};
	
		// Called on player login and when changing maps
Terrain.prototype.draw = function (engine, PIXI) {
            
    this.buffer_ground.children = [];
    this.texture_ground.clear();
    
    this.buffer_air.children = [];
    this.texture_air.clear();
    
    var sprite;
    
    var startCol = Math.floor((engine.position.x - CANVAS_WIDTH_HALF) / TILE_WIDTH);
    var startRow = Math.floor((engine.position.y - CANVAS_HEIGHT_HALF) / TILE_HEIGHT);
    
    var maxCol = startCol + VIEWPORT_WIDTH_TILES + 1;
    var maxRow = startRow + VIEWPORT_HEIGHT_TILES + 1;
    
    var startX = startCol * TILE_WIDTH;
    var startY = startRow * TILE_HEIGHT;
    
    for (var row = startRow; row < maxRow; row++) {
        for (var col = startCol; col < maxCol; col++) {
            if (engine.map.terrain.index[row] === undefined) continue;
            if (engine.map.terrain.index[row][col] === undefined) continue;
            
            layers = engine.map.terrain.index[row][col];
            
            if (layers.constructor !== Array) continue;
            
            for (i = 0; i < layers.length; i++) {
                
                index = layers[i];
                
                if (index !== null) {
                    
                    sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('terrain_' + index));
            
                    sprite.position.x = startX + ((col - startCol) * TILE_WIDTH);
                    sprite.position.y = startY + ((row - startRow) * TILE_HEIGHT);
                    
                    if (i < 3) {
                        this.buffer_ground.addChild(sprite);
                    } else {
                        this.buffer_air.addChild(sprite);
                    }
                    
                }
                
            }
            
            
        }
    }
    
    this.texture_ground.render(this.buffer_ground, engine.matrix);
    this.texture_air.render(this.buffer_air, engine.matrix);
};

	