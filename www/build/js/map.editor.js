/*

http://gamedev.stackexchange.com/questions/32350/optimizing-isometric-drawing-function
http://gamedev.stackexchange.com/questions/25896/how-do-i-find-which-isometric-tiles-are-inside-the-cameras-current-view/25900#25900
http://jsfiddle.net/kAFVB/3/
http://stackoverflow.com/questions/7016981/efficiently-getting-isometric-grid-positions-within-a-bounding-box

EG:

http://www.openspace-engine.com/support/tutorials/mapStructure

LIBRARIES:

https://github.com/lokesh/color-thief - Determine dominant color in image JS (for mini map pixel representation of tile)
https://gist.github.com/boazsender/cf23f8bddb307ad4abd8 - same thing as above but in php, depends on the direction I go in

*/

var Map = {

   stage: null,
   renderer: null,
   width: 896,
   height: 504,
   TILE_WIDTH: 64,
   TILE_WIDTH_HALF: 32,
   TILE_HEIGHT: 32,
   TILE_HEIGHT_HALF: 16,
   TILE_Y_OFFSET: 14,
   MODE_PAINT: 0,
   MODE_MOVE: 1,
   MODE_DELETE: 2,
   playerPos: { x: 0, y: 0 },
   offsetTracker: { x: 0, y: 0 },
   terrain: {},
   objects: {},
   brush: {},
   tile: 0,
   moveOriginPoint: {},
   moveOriginOffset: {},

   init: function (div, map) {

      if ($('#mapMain').length) {
         // We've already init'd, so:
         return;
      }
   
      // Append elements:
      var target = document.getElementById(div);

      var canvas = document.createElement('div');
      canvas.setAttribute("style", "padding: 2px; display: inline-block;");
      canvas.id = 'mapMain';
      target.appendChild(canvas);

      var miniMapDiv = document.createElement('div');
      miniMapDiv.setAttribute("style", "padding: 2px; display: inline-block;");
      miniMapDiv.id = 'mapMini';
      target.appendChild(miniMapDiv);

      var miniMapCanvas = document.createElement('canvas');
      miniMapCanvas.setAttribute('width', '448');
      miniMapCanvas.setAttribute('height', '252');

      Map.miniMapContext = miniMapCanvas.getContext('2d');

      miniMapDiv.appendChild(miniMapCanvas);

      // Initialize PIXI:
      Map.renderer = PIXI.autoDetectRenderer(Map.width, Map.height, undefined, undefined, true); //new PIXI.WebGLRenderer(Map.width, Map.height);

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
      
      var assets = _.union(map.terrain.source, map.objects.source, map.actors.source);
      Map.assetLoadCount = assets.length;
      
      _.each(assets, function (asset) {
         
         asset = 'client' + asset;
        
         // Load the json file, then load the image file, then parse. Wohoo!
         var assetPath = asset.substring(0, asset.lastIndexOf("/") + 1);
         
         $.ajax({
            url: realmResourceURL(asset),
            type: 'get',
            dataType: 'json',
            success: function (data) {
              
               var json = JSON.parse(data.content); 
       
               if (json.frames) {
                
                  var resp = $.ajax({
                     url: realmResourceURL(assetPath + json.meta.image),
                     type: 'get',
                     dataType: 'json',
                     async: false
                  }).responseJSON;
               
                  var img = new Image();
                  img.src = 'data:image/png;base64,' + resp.content;
                  
                  var baseTexture = new PIXI.BaseTexture(img);
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
                  
                  Map.onResourceLoaded(json, img.src);
                  
                  Map.assetLoadCount--;
                  
                  if (Map.assetLoadCount === 0) {
                     Map.load();
                  }
               }
            }
         });
             
      });
       
       
   },

   setBrush: function (source, textureKey) {

      var indexFromKey = -1;

      _.each(source.index, function (key, index) {
         if (key === textureKey) {
            indexFromKey = parseInt(index);
            return false;
         }
      });

      if (indexFromKey > -1) {
         
         Map.brush.index = indexFromKey;
      
      } else {

         var indexSize = _.size(source) + 1;
         for (var i = 0; i < indexSize; i++) {
            if (source.index[i] === undefined) {
               source.index[i] = textureKey;
               Map.brush.index = i;
               break;
            }
         }

      }

      Map.brush.source = source;

      if (Map.brush.sprite === undefined) {
         Map.brush.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(textureKey));
         Map.stage.addChild(Map.brush.sprite);
      } else {
         Map.brush.sprite.setTexture(PIXI.Texture.fromFrame(textureKey));
      }

      Map.brush.sprite.anchor.y = (Map.brush.sprite.height - 32) / Map.brush.sprite.height;
      Map.brush.sprite.anchor.x = (Map.brush.sprite.width / 2) / Map.brush.sprite.width;

   },

   load: function () {

      Map.draw();

      Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);

      Map.layer_actors = new PIXI.DisplayObjectContainer();
      Map.layer_terrain = new PIXI.Sprite(Map.texture);

      Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);

      Map.stage.addChild(Map.layer_terrain);
      Map.stage.addChild(Map.layer_actors);

      Map.renderer.render(Map.stage);
       
   },

   update: function () {
      Map.draw();
   },
   
   updateSource: function () {
      var worker = {};
      worker.settings = Map.settings;
      worker.terrain = Map.terrain;
      worker.objects = Map.objects;
      worker.actors = Map.actors;
      
      __editor.setValue(JSON.stringify(worker, undefined, 2), -1);
      sessionStorage[__fileId] = __editor.getValue();
   },

   draw: function () {
      var sprite;
      var count = 0;

      Map.buffer.children = []; //= new PIXI.SpriteBatch(); <-- Leaks memory :-/

      var startPoint = {};

      startPoint.row = (Map.playerPos.x / Map.TILE_WIDTH_HALF + Map.playerPos.y / Map.TILE_HEIGHT_HALF) / 2;
      startPoint.col = (Map.playerPos.y / Map.TILE_HEIGHT_HALF - Map.playerPos.x / Map.TILE_WIDTH_HALF) / -2;
      startPoint.row = Math.floor(startPoint.row);
      startPoint.col = Math.floor(startPoint.col);

      var aStart = (startPoint.row + startPoint.col) - Map.VIEWPORT_WIDTH_TILES_HALF;
      var aEnd = aStart + Map.VIEWPORT_WIDTH_TILES + 2;

      var bStart = (startPoint.row - startPoint.col) - Map.VIEWPORT_HEIGHT_TILES_HALF;
      var bEnd = bStart + Map.VIEWPORT_HEIGHT_TILES + 1;

      if (!Map.offset) {
         var xOffset = (-1 * aStart * 32) - Map.TILE_WIDTH_HALF - 32;
         var yOffset = (-1 * bStart * 16) - Map.TILE_Y_OFFSET;

         Map.offset = { x: xOffset, y: yOffset };
      }

      for (var b = bStart; b < bEnd + 1; b++) {

         for (var a = aStart; a < aEnd; a++) {

            if ((b & 1) != (a & 1)) {
               continue;
            }

            row = (a + b) / 2;
            col = (a - b) / 2;

            if (Map.terrain[row] === undefined) continue;
            if (Map.terrain[row][col] === undefined) continue;

            sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(Map.terrain.index[Map.terrain[row][col]]));
            sprite.anchor.y = (sprite.height - 32) / sprite.height;
            sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
            sprite.position.x = (a * Map.TILE_WIDTH_HALF);
            sprite.position.y = (b * Map.TILE_HEIGHT_HALF);
            Map.buffer.addChild(sprite);

            if (Map.objects[row] !== undefined) {
               if (Map.objects[row][col] !== undefined) {
                  sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(Map.objects.index[Map.objects[row][col]]));
                  sprite.anchor.y = (sprite.height - 32) / sprite.height;
                  sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
                  sprite.position.x = (a * Map.TILE_WIDTH_HALF);
                  sprite.position.y = (b * Map.TILE_HEIGHT_HALF);
                  Map.buffer.addChild(sprite);
               }
            }

            count++;
             
         }
      }
   },

   render: function () {

      // Map.stats.begin();

      if (Map.invalidate) {
         Map.draw();
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
   
   setMode: function (mode, options) {
      switch (mode) {
         case Map.MODE_DELETE:
            
            Map.stage.mousedown = function (data) {
               var result = Map.indexFromScreen(data.global);
               
               /*
               var source;
               
               switch (layer) {
                  case 0:
                     source = Map.terrain;
                     break;
                  case 1:
                     source = Map.objects;
                     break;
               }
               
               delete source[result.row][result.col];
               */
               
               
               if (Map.terrain[result.row]) {
                  if (Map.terrain[result.row][result.col]) {
                     delete Map.terrain[result.row][result.col];
                  }
               }
               
               if (Map.objects[result.row]) {
                  if (Map.objects[result.row][result.col]) {
                     delete Map.objects[result.row][result.col];
                  }
               }
               
               Map.draw();
               Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
               Map.updateSource();
            };
            
            Map.stage.mousemove = function (data) {
               
               if (data.target.__isDown) {
                  var result = Map.indexFromScreen(data.global);
      
                  if (Map.terrain[result.row]) {
                     if (Map.terrain[result.row][result.col]) {
                        delete Map.terrain[result.row][result.col];
                     }
                  }
                  
                  if (Map.objects[result.row]) {
                     if (Map.objects[result.row][result.col]) {
                        delete Map.objects[result.row][result.col];
                     }
                  }
                   
                  Map.draw();
                  Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
                  Map.updateSource();
               }
               
            };
            
            Map.stage.mouseup = function (data) {
               
            };
            
            break;
         case Map.MODE_PAINT:
            
            Map.stage.mousedown = function (data) {

               var result = Map.indexFromScreen(data.global);
               
               if (Map.brush.source[result.row] === undefined) {
                  Map.brush.source[result.row] = {};
               }
      
               Map.brush.source[result.row][result.col] = Map.brush.index;
               Map.draw();
               Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
               
               Map.updateSource();
      
            };
      
            Map.stage.mousemove = function (data) {
               
               if (data.target.__isDown) {
                  var result = Map.indexFromScreen(data.global);
      
                  if (Map.brush.source[result.row] === undefined) {
                     Map.brush.source[result.row] = {};
                  }
      
                  Map.brush.source[result.row][result.col] = Map.brush.index;
                  Map.draw();
                  Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
                  
                  Map.updateSource();
                   
               }
      
               if (Map.brush.sprite)
                  Map.brush.sprite.position = data.global;
      
            };
            
            Map.stage.mouseup = function (data) {
               
            };
            
            break;
         case Map.MODE_MOVE:
            
            Map.stage.mousedown = function (data) {
               Map.moveOriginPoint = _.cloneDeep( data.global );
               Map.moveOriginOffset = _.cloneDeep( Map.offset );
               Map.moveOriginPlayer = _.cloneDeep( Map.playerPos );
            };
      
            Map.stage.mousemove = function (data) {
               
               if ((data.target.__isDown) && (Map.moveOriginPoint)) {
                  
                  var xDiff = data.global.x - Map.moveOriginPoint.x;
                  var yDiff = Map.moveOriginPoint.y - data.global.y;
                  
                  Map.offset.x = (Map.moveOriginOffset.x + xDiff );
                  Map.offset.y = (Map.moveOriginOffset.y - yDiff );

                  Map.playerPos.x = (Map.moveOriginPlayer.x - xDiff);
                  Map.playerPos.y = (Map.moveOriginPlayer.y + yDiff);
                  
//                  Map.draw();
                  Map.invalidate = true;
                  Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
                  
                  Map.updateSource();
                   
               }
      
            };
            
            Map.stage.mouseup = function (data) {
               Map.moveOriginPoint = null;
            };
            
            break;
      }
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