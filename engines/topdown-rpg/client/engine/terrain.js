var Terrain = function () {
  this.textureGround;
  this.bufferGround;
  this.textureAir;
  this.bufferAir;
};
    
Terrain.prototype.load = function (source, renderer, complete) {
  var self   = this;
  var worker = [];

  self.bufferGround = new PIXI.ParticleContainer();
  self.textureGround = new PIXI.RenderTexture(renderer, renderer.width, renderer.height);
  self.bufferAir     = new PIXI.ParticleContainer();
  self.textureAir    = new PIXI.RenderTexture(renderer, renderer.width, renderer.height);

  source.forEach(function (asset) {
    asset = ROOT + asset;
    worker.push(asset);
  });

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
      complete();
      
    })
    .on('error', function (e) {
      console.log(e);
    })
    .once('complete', complete)
    .load();
};
	
		// Called on player login and when changing maps
Terrain.prototype.draw = function (source, matrix, position) {
            
	var self = this;
			
  self.bufferGround.children = [];
  self.textureGround.clear();
  
  self.bufferAir.children = [];
  self.textureAir.clear();

  var sprite;
  
  var startCol = Math.floor((position.x - CANVAS_WIDTH_HALF) / TILE_WIDTH);
  var startRow = Math.floor((position.y - CANVAS_HEIGHT_HALF) / TILE_HEIGHT);
  
  var maxCol = startCol + VIEWPORT_WIDTH_TILES + 1;
  var maxRow = startRow + VIEWPORT_HEIGHT_TILES + 1;
  
  var startX = startCol * TILE_WIDTH;
  var startY = startRow * TILE_HEIGHT;
  
  for (var row = startRow; row < maxRow; row++) {
    for (var col = startCol; col < maxCol; col++) {
      if (source.index[row] === undefined) continue;
      if (source.index[row][col] === undefined) continue;
      
      layers = source.index[row][col];
      
      if (layers.constructor !== Array) continue;
      
      for (i = 0; i < layers.length; i++) {
          
        index = layers[i];
        
        if (index !== null) {
            
          sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('terrain_' + index));
  
          sprite.position.x = startX + ((col - startCol) * TILE_WIDTH);
          sprite.position.y = startY + ((row - startRow) * TILE_HEIGHT);
          
          if (i < 3) {
            self.bufferGround.addChild(sprite);
          } else {
            self.bufferAir.addChild(sprite);
          }
          
        }
          
      }
        
    }
  }
  
  self.textureGround.render(self.bufferGround, matrix);
  self.textureAir.render(self.bufferAir, matrix);
};

	