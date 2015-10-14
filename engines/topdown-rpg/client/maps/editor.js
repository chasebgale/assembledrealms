var Map = function (target, toolbar, map) {
  var self = this;
  
  self.settings = map.settings;
  self.terrain  = map.terrain;
  self.objects  = map.objects;
  self.actors   = map.actors;

  self.stage            = null;
  self.renderer         = null;
  self.canvas           = null;
  self.invalidate       = false;
  self.width            = 896;
  self.height           = 512; // Slightly larger than 16 =9; so we have an even height in tiles
  self.half_width       = 448;
  self.half_height      = 256;
  self.TILE_WIDTH       = 32;
  self.TILE_WIDTH_HALF  = 16;
  self.TILE_HEIGHT      = 32;
  self.TILE_HEIGHT_HALF = 16;
  self.tileIndexes      = {};
  self.mode             = 0;
  
  self.modes = {
    MOVE:         0,
    ADD_TILE:     1,
    DELETE_TILE:  2,
    INSPECT:      3
  };
  
  // Top left tile coordinates
  self.coordinates = {
    row: 0, 
    col: 0
  };
    
  self.offset = {
    x: 0,
    y: 0
  };

  self.tile_count  = 0;
  self.tile_index  = 0;
  self.layer_index = 0;
  
  // Mouse tracking
  self.mouse_down           = false;
  self.mouse_animation_flag = false;
  self.debug                = true;
  
  self.mouse_origin = {
    x: 0, 
    y: 0
  };
  
  self.mouse_origin_coordinates = {
    row: 0, 
    col: 0
  };

  // If we haven't already, let's get our toolbar in place:
  if (!toolbar.firstChild.hasChildNodes()) {
      self.appendDOM();
  }
  
  // Initialize PIXI:
  var rendererOptions = {
    antialiasing: false,
    transparent:  false,
    resolution:   1
  };
  
  self.renderer = PIXI.autoDetectRenderer(self.width, self.height, rendererOptions);
  self.canvas   = target.appendChild(self.renderer.view);
  self.stage    = new PIXI.Container();

  self.VIEWPORT_WIDTH_TILES       = Math.ceil(self.width / self.TILE_WIDTH) + 1;
  self.VIEWPORT_HEIGHT_TILES      = Math.ceil(self.height / self.TILE_HEIGHT) + 1;
  self.VIEWPORT_WIDTH_TILES_HALF  = Math.ceil(self.VIEWPORT_WIDTH_TILES / 2);
  self.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(self.VIEWPORT_HEIGHT_TILES / 2);

  self.buffer = new PIXI.ParticleContainer();
    
  var index  = 0;
  var row    = 0;
  var col    = 0;
  var worker = [];
  var frameTexture;
  
  // This sucks but for some reason the on complete events aren't firing:
  var load_count = 0;
  var load_complete = function () {
    self.initialized = true;
      
    self.tile_count = index - 1;
    
    self.texture = new PIXI.RenderTexture(self.renderer, self.renderer.width, self.renderer.height);

    self.layer_terrain = new PIXI.Sprite(self.texture);
    self.stage.addChild(self.layer_terrain);
    
    self.mouse_sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('cursor_0'));
    self.mouse_sprite.visible = false;
    self.stage.addChild(self.mouse_sprite);
    
    self.mouse_sprite_highlight = new PIXI.Graphics();
    self.mouse_sprite_highlight.blendMode = PIXI.BLEND_MODES.DIFFERENCE;
    self.stage.addChild(self.mouse_sprite_highlight);
    
    self.setMode(self.modes.MOVE);
    
    self.invalidate = true;
    //requestAnimationFrame(this.render);
    self.onInitialized();
  };

  _.each(map.terrain.source, function (asset) {
    worker.push({name: "terrain_", url: realmResourceURL(asset)});
  });
    
  worker.push({name: "cursor_", url: realmResourceURL('client/resource/cursors.png')});
  
  PIXI.loader
    .add(worker)
    .after(function (event) {
      
      if (self.tileIndexes[event.name] === undefined) {
        self.tileIndexes[event.name] = 0;
      }
      
      // Once we have the tile image loaded, break it up into textures:
      for (row = 0; row < event.texture.height; row += 32) {
        for (col = 0; col < event.texture.width; col += 32) {
          frameTexture = new PIXI.Texture(event.texture, {
            x: col,
            y: row,
            width: 32,
            height: 32
          });
          PIXI.Texture.addTextureToCache(frameTexture, event.name + self.tileIndexes[event.name]);
          self.tileIndexes[event.name] = self.tileIndexes[event.name] + 1;
        }
      }
      
      if (event.name == "terrain_") {
        document.getElementById('modalTilesBody').appendChild(event.texture.baseTexture.source);
      }
      
      load_count++;
      
      if (load_count > 1) {
        load_complete();
      }
    })
    .load(function (loader, resources) {
      load_complete();
    });
};

Map.prototype.setTile = function (screen_coordinates, tile_index) {
  var self = this;
  
  var col = self.coordinates.col + Math.floor(screen_coordinates.x / self.TILE_WIDTH);
  var row = self.coordinates.row + Math.floor(screen_coordinates.y / self.TILE_HEIGHT);

  if (tile_index == null) {
    // DELETE THIS TILE:
    if (self.terrain.index[row]) {
      if (col in self.terrain.index[row]) {
        delete self.terrain.index[row][col][self.layer_index];
      }
    }
  } else {
    // ADD OR CHANGE A TILE:
    if (self.terrain.index[row] === undefined) {
      self.terrain.index[row] = {};
    }

    if (self.terrain.index[row][col] === undefined) {
      self.terrain.index[row][col] = [];
    }

    self.terrain.index[row][col][self.layer_index] = tile_index;
  }

  self.invalidate = true;

  if (self.debug) {
    console.log("setTile()'d at row: " + row + ", col: " + col);
  }
};
  
Map.prototype.setMode = function (mode) {
  var self = this;
  
  self.mode = mode;
  self.mouse_sprite_highlight.visible = false;
        
  switch (mode) {
    case self.modes.INSPECT:
        
      self.mouse_sprite.visible = false;
      
      self.mouse_sprite_highlight.clear();
      self.mouse_sprite_highlight.lineStyle(1, 0xFFFFFF, 1);
      self.mouse_sprite_highlight.moveTo(0, 0);
      self.mouse_sprite_highlight.lineTo(32, 0);
      self.mouse_sprite_highlight.lineTo(32, 32);
      self.mouse_sprite_highlight.lineTo(0, 32);
      self.mouse_sprite_highlight.lineTo(0, 0);
        
      var mouse_coordinates = {};
        
      self.mouse_sprite.texture = PIXI.Texture.fromFrame('cursor_4');
        
      self.canvas.onmousedown = function (event) {
        self.mouse_down = true;
        self.mouse_origin = {x: event.layerX, y: event.layerY};

        var col = self.coordinates.col + Math.floor(event.layerX / self.TILE_WIDTH);
        var row = self.coordinates.row + Math.floor(event.layerY / self.TILE_HEIGHT);
        
        mouse_coordinates = {row: row, col: col};
        
        var x = event.layerX - (event.layerX % self.TILE_WIDTH);
        var y = event.layerY - (event.layerY % self.TILE_HEIGHT);

        self.mouse_sprite_highlight.x = x;
        self.mouse_sprite_highlight.y = y;
        self.mouse_sprite_highlight.visible = true;
            
        $("#inspectorOutput").text("ROW: " + row + ", COL: " + col);
      };
                
      self.canvas.onmouseup = function (event) {
        self.mouse_down = false;
      };
                
      self.canvas.onmouseout = function (event) {
        self.mouse_sprite.visible = false;
      };
                
      self.canvas.onmousemove = function (event) {
        if (!self.mouse_sprite.visible) {
            self.mouse_sprite.visible = true;
        }
        
        if (self.mouse_down) {
          if (event.which == 0) {
            // We've re-entered the canvas w/o the mouse being held down:
            self.mouse_down = false;
          } else {                        
              
          }
        }
        
        var x = event.layerX - 10;// - (event.layerX % self.TILE_WIDTH);
        var y = event.layerY - 10;// - (event.layerY % self.TILE_HEIGHT);
        
        self.mouse_sprite.x = x;
        self.mouse_sprite.y = y;
      };
        
      break;
      
    case self.modes.MOVE:
      // ALL MOUSE EVENTS RE-WIRED FOR THE MOVE TOOL:
      self.mouse_sprite.texture = PIXI.Texture.fromFrame('cursor_0');
                
      // self.canvas
      self.canvas.onmousedown = function (event) {
        self.mouse_down = true;
        self.mouse_origin = {x: event.layerX, y: event.layerY};
        self.mouse_origin_coordinates = {row: self.coordinates.row, col: self.coordinates.col};
        self.mouse_sprite.texture = PIXI.Texture.fromFrame('cursor_1');
      };
      
      self.canvas.onmouseup = function (event) {
        self.mouse_down = false;
        self.mouse_sprite.texture = PIXI.Texture.fromFrame('cursor_0');
      };
      
      self.canvas.onmouseout = function (event) {
        self.mouse_sprite.visible = false;
      };
      
      self.canvas.onmousemove = function (event) {
        if (!self.mouse_sprite.visible) {
          self.mouse_sprite.visible = true;
        }
        
        if (self.mouse_down) {
            
          if (event.which == 0) {
            // We've re-entered the canvas w/o the mouse being held down:
            self.mouse_down = false;
          } else {                        
            var offset_cols = Math.ceil((event.layerX - self.mouse_origin.x) / self.TILE_WIDTH_HALF);
            var offset_rows = Math.ceil((event.layerY - self.mouse_origin.y) / self.TILE_HEIGHT_HALF);
            
            self.coordinates.row = self.mouse_origin_coordinates.row - offset_rows;
            self.coordinates.col = self.mouse_origin_coordinates.col - offset_cols;
            
            self.invalidate = true;
          }
        }
        
        var x = event.layerX - 10;// - (event.layerX % self.TILE_WIDTH);
        var y = event.layerY - 10;// - (event.layerY % self.TILE_HEIGHT);
        
        self.mouse_sprite.x = x;
        self.mouse_sprite.y = y;
      };
  
      break;
      
    case self.modes.DELETE_TILE:
                
      self.mouse_sprite.visible = false;
      
      self.mouse_sprite_highlight.clear();
      self.mouse_sprite_highlight.lineStyle(1, 0xFFFFFF, 1);
      self.mouse_sprite_highlight.moveTo(0, 0);
      self.mouse_sprite_highlight.lineTo(32, 0);
      self.mouse_sprite_highlight.lineTo(32, 32);
      self.mouse_sprite_highlight.lineTo(0, 32);
      self.mouse_sprite_highlight.lineTo(0, 0);
      self.mouse_sprite_highlight.lineTo(32, 32);
      
      self.canvas.onmousedown = function (event) {
        self.mouse_down = true;
        self.setTile({x: event.layerX, y: event.layerY}, null);
      }
      
      self.canvas.onmouseup = function (event) {
        self.mouse_down = false;
        self.save();
      }
      
      self.canvas.onmouseout = function (event) {
        self.mouse_sprite.visible = false;
        self.mouse_sprite_highlight.visible = false;
      }
      
      self.canvas.onmousemove = function (event) {
        if (!self.mouse_sprite_highlight.visible) {
          self.mouse_sprite_highlight.visible = true;
        }
        
        if (self.mouse_down) {
          if (event.which == 0) {
            // We've re-entered the canvas w/o the mouse being held down:
            self.mouse_down = false;
          } else { 
            self.setTile({x: event.layerX, y: event.layerY}, null);
          }
        }
        
        var x = event.layerX - (event.layerX % self.TILE_WIDTH);
        var y = event.layerY - (event.layerY % self.TILE_HEIGHT);
      
        self.mouse_sprite_highlight.x = x;
        self.mouse_sprite_highlight.y = y;
      }
      break;
                
    case self.modes.ADD_TILE:
      self.mouse_sprite.texture = PIXI.Texture.fromFrame('terrain_' + self.tile_index);
      
      self.mouse_sprite_highlight.clear();
      self.mouse_sprite_highlight.lineStyle(1, 0xFFFFFF, 1);
      self.mouse_sprite_highlight.moveTo(0, 0);
      self.mouse_sprite_highlight.lineTo(32, 0);
      self.mouse_sprite_highlight.lineTo(32, 32);
      self.mouse_sprite_highlight.lineTo(0, 32);
      self.mouse_sprite_highlight.lineTo(0, 0);
  
      self.canvas.onmousedown = function (event) {
        self.mouse_down = true;
        self.setTile({x: event.layerX, y: event.layerY}, self.tile_index);
      }
      
      self.canvas.onmouseup = function (event) {
        self.mouse_down = false;
        self.save();
      }
      
      self.canvas.onmouseout = function (event) {
        self.mouse_sprite.visible = false;
        self.mouse_sprite_highlight.visible = false;
      }
  
      self.canvas.onmousemove = function (event) {
        if (!self.mouse_sprite.visible) {
          self.mouse_sprite.visible = true;
          self.mouse_sprite_highlight.visible = true;
        }
        
        if (self.mouse_down) {
          if (event.which == 0) {
              // We've re-entered the canvas w/o the mouse being held down:
              self.mouse_down = false;
          } else { 
              self.setTile({x: event.layerX, y: event.layerY}, self.tile_index);
          }
        }
        
        var x = event.layerX - (event.layerX % self.TILE_WIDTH);
        var y = event.layerY - (event.layerY % self.TILE_HEIGHT);
        
        self.mouse_sprite.x = x;
        self.mouse_sprite.y = y;
        
        self.mouse_sprite_highlight.x = x;
        self.mouse_sprite_highlight.y = y;
      }
      break;
  }    
};
    
Map.prototype.draw = function (full) {
  var self = this;

  // Reset some things:
  self.buffer.children = [];
  self.texture.clear();

  var index;
  var sprite;
  var layers;
  var i;
    
  for (var row = self.coordinates.row; row < self.coordinates.row + self.VIEWPORT_HEIGHT_TILES; row++) {
    for (var col = self.coordinates.col; col < self.coordinates.col + self.VIEWPORT_WIDTH_TILES; col++) {
      if (self.terrain.index[row] === undefined) continue;
      if (self.terrain.index[row][col] === undefined) continue;
      
      layers = self.terrain.index[row][col];
              
      if (layers.constructor !== Array) continue;

      for (i = 0; i < layers.length; i++) {
          
        index = layers[i];
        
        if (index != null) {
          sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('terrain_' + index));
  
          sprite.position.x = ((col - self.coordinates.col) * self.TILE_WIDTH);
          sprite.position.y = ((row - self.coordinates.row) * self.TILE_HEIGHT);
          
          self.buffer.addChild(sprite);
        }
      } 
    }
  }
        
  if (full) {
    self.texture.render(self.buffer); //, matrix);
  }
};
  
Map.prototype.render = function () {
  var self = this;
  
  if (self.invalidate) {
    self.draw(true);
    self.invalidate = false;
  }
  
  if (self.mouse_sprite_highlight.alpha >= 1) {
    self.mouse_animation_flag = true;
  } else if (self.mouse_sprite_highlight.alpha <= 0.1) {
    self.mouse_animation_flag = false;
  }
  
  if (self.mouse_animation_flag) {
    self.mouse_sprite_highlight.alpha -= 0.05;
  } else {
    self.mouse_sprite_highlight.alpha += 0.05;
  }
  
  if (self.texture) {
    self.renderer.render(self.stage);
  }

  //requestAnimationFrame(self.render);
};
  
Map.prototype.appendDOM = function () {
  var self = this;
  
  var html = [
    // TOOLBAR:
    '<button type="button" class="btn btn-default navbar-btn btn-map-tool active" id="moveButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Navigate the map">',
    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-39px -8px"></div>',
    '</button>',
    '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="inspectButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Reveal details of selected tile">',
    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-179px -6px"></div>',
    '</button>',
    '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="eraseButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Erase tiles from the map">', 
    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-216px -6px"></div>',
    '</button>',
    '<button type="button" class="btn btn-default navbar-btn btn-map-tool" id="addButton" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Add tiles">',
    '<div style="background-image: url(\'/build/img/cursors.png\'); width: 20px; height: 22px; background-position:-6px -6px"></div>',
    '</button>',
        '<div class="spacer"></div>', 
        '<button type="button" id="tileModalButton" class="btn btn-default navbar-btn btn-map-tool" data-toggle="modal" data-target="#modalTiles">',
            '<div id="brushIndicator" style="width: 32px; height: 32px; vertical-align: middle; display: inline-block;"></div>&nbsp',
      '<span class="caret"></span>',
        '</button>',
    '<div class="dropdown btn-map-tool" style="display: inline;">',
            '<button class="btn btn-default navbar-btn dropdown-toggle" type="button" id="layersMenu" data-toggle="dropdown" aria-expanded="true">',
        'Editing Layer: 1 ',
        '<span class="caret"></span>',
            '</button>',
      '<ul class="dropdown-menu" role="menu" aria-labelledby="layersMenu" id="layersMenuList">',
        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 1, Walkable</a></li>',
        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 2, Walkable</a></li>',
        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 3, Non-Walkable</a></li>',
        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Layer 4, Above Ground</a></li>',
      '</ul>',
        '</div>'
  ].join("\n");
        
  // ADD MARKUP TO DOM:
  document.getElementById('mapToolbar').innerHTML = html;
    
  html = [
    // INSPECTOR OUTPUT:
    '<div id="inspectorOutput" style="min-height: 200px;">',
    '</div>',
    // MODAL DIALOG:
        '<div class="modal fade tiles-modal-lg" id="modalTiles" tabindex="-1" role="dialog" aria-hidden="true">',
            '<div class="modal-dialog modal-lg">',
        '<div class="modal-content">',
                    '<div class="modal-header clearfix">',
                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>',
            '<h4 class="modal-title pull-left" style="width: 230px;">Select a tile from category: </h4>',
            '<select id="categorySelection" class="form-control pull-left" style="display: inline-block; width: 125px; margin-top: -4px;">',
              '<option data-id="terrain">Terrain</option>',
              '<option data-id="objects">Objects</option>', 
            '</select>',
          '</div>',
          '<div id="modalTilesBody" class="modal-body" style="overflow-x: scroll;">',
            // TILE HOVER IDENTIFIER:
            '<div id="tilesHoverIdentifier" style="width: 32px; height: 32px; outline: 2px solid magenta; position: relative; z-index: 9999; display: none; pointer-events: none;"></div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
    '</div>'
  ].join("\n");
    
  // ADD MARKUP TO DOM:
  document.getElementById('mapDetails').innerHTML = html;
        
  // ATTACH LISTENERS TO NEW DOM:
  $('#modalTilesBody').on('mousedown', 'img', function (e) {
    var offset = $(this).offset();
    var width = $(this).width();
    var point = {x: e.pageX - offset.left, y: e.pageY - offset.top};
    
    // Every image is processed row, then each column, row, then each column...
    // So first we determine how many columns are in this image, then calculate the tile #
    var row_tile_width = Math.round(width / 32);
    var rows_to_add = Math.floor(point.y / 32);
    
    self.tile_index = (rows_to_add * row_tile_width) + Math.floor(point.x / 32);
    
    if (self.mode === self.modes.ADD_TILE) {
        self.mouse_sprite.texture = PIXI.Texture.fromFrame('terrain_' + self.tile_index);
    }
    
    var background_x = (point.x - (point.x % 32)) * -1;
    var background_y = (point.y - (point.y % 32)) * -1;
    
    $("#brushIndicator").css('background-image', 'url(' + e.currentTarget.src + ')');
    $("#brushIndicator").css('background-position', background_x + 'px ' + background_y + 'px');
    
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
    self.layer_index = index;
    $("#layersMenu").html('Editing Layer: ' + (index + 1) + '&nbsp;<span class="caret"></span>');
  });
  
  $("#moveButton").on("click", function () {
    self.setMode(self.modes.MOVE);
    $(this).addClass('active').siblings().removeClass('active');
  });
    
  $("#inspectButton").on("click", function () {
    self.setMode(self.modes.INSPECT);
    $(this).addClass('active').siblings().removeClass('active');
  });
        
  $("#eraseButton").on("click", function () {
    self.setMode(self.modes.DELETE_TILE);
    $(this).addClass('active').siblings().removeClass('active');
  });
  
  $("#addButton").on("click", function () {
    self.setMode(self.modes.ADD_TILE);
    $(this).addClass('active').siblings().removeClass('active');
  });
};