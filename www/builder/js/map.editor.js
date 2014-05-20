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
    playerPos: { x: 0, y: 0 },
    offsetTracker: { x: 0, y: 0 },
    stats: null,
    terrain: {},
    objects: {},
    brush: {},
    tile: 0,

    init: function (div, map) {

        // Append elements:
        var target = document.getElementById(div);

        var canvas = document.createElement('div');
        canvas.setAttribute("style", "padding: 2px; display: inline-block; cursor: none;");
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
        Map.renderer = new PIXI.WebGLRenderer(Map.width, Map.height);

        Map.stage = new PIXI.Stage(0x000000, true);

        canvas.appendChild(Map.renderer.view);

        Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / 32) + 1;
        Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / 16) + 1;

        Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
        Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

        Map.terrain = map.terrain;
        Map.objects = map.objects;
        Map.buffer = new PIXI.SpriteBatch();

        Map.stats = new Stats();
        document.body.appendChild(Map.stats.domElement);
        Map.stats.domElement.style.position = "absolute";
        Map.stats.domElement.style.top = "200px";

        // Maybe in the future we can load them from one array, for now though we need the manual chaining to 
        // setup the markup properly... :/
        // var assets = _.union(map.terrain.source, map.objects.source, map.actors.source);

        
        // SHOULD BE TAKING THE SOURCE (map.terrain.source) AND CREATING A URL LIKE:
        // http://source-01.assembledrealms.com/api/v3/projects/12/repository/blobs/master?id=12&filepath=client%2Fsprites%2Fzombie_0.png&private_token=o4sq1j9WsQXqhxuyis5Z
        // FROM IT...
        
        // Actually we're going to have to do it manually.
        // 1.) Load json resource file, e.g. terrain.json
        // 2.) Load spritesheet .png defined in terrain.json using above method (api)
        // 3.) Add large texture png to png texture cache
        // 4.) Parse json and for each frame defined:
        // 5.) Create new frame and add it to the texture cache
        // (see: PIXI.ImageLoader.prototype.loadFramedSpriteSheet for a how-to)
        
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
            
                    if (data.frames) {
                     
                        var resp = $.ajax({
                           url: realmResourceURL_WORKAROUND(assetPath + data.meta.image),
                           type: 'get',
                           dataType: 'json',
                           async: false
                        }).responseText;
                   
                        var json = JSON.parse(resp);
                     
                        var img = new Image();
                        img.src = 'data:image/png;base64,' + json.content;
                        
                        var baseTexture = new PIXI.BaseTexture(img);
                        var texture = new PIXI.Texture(baseTexture);
                        
                        _.each(data.frames, function(frame, frameName) {
                           
                           var frameTexture = new PIXI.Texture(texture, {
                              x: parseInt(frame.frame.x),
                              y: parseInt(frame.frame.y),
                              width: parseInt(frame.frame.w),
                              height: parseInt(frame.frame.h)
                           });
                           
                           PIXI.Texture.addTextureToCache(frameTexture, frameName);
                              
                        });
                        
                        Map.assetLoadCount--;
                        
                        if (Map.assetLoadCount === 0) {
                           Map.load();
                        }
                        
                        
                    }
            
                }
            });
               
         });
        
        
    },

    create: function (tileWidth, tileHeight) {

        /*
               *     
             *   *     
           *   *   *
         *   *   *   *
 height    *   *   *
             *   *   width
               *
        */

        Map.buffer = new PIXI.SpriteBatch(); //PIXI.DisplayObjectContainer();
        Map.source = [];

        for (var layer = 0; layer < Map.LAYERS; layer++) {

            Map.source[layer] = [];

            for (var row = 0; row < tileHeight; row++) {

                Map.source[layer][row] = [];

                for (var col = 0; col < tileWidth; col++) {

                    Map.source[layer][row][col] = 0;

                }
            }
        }

        // Load the map:
        var tilesLoader = new PIXI.AssetLoader(["js/editor/landscape.json"]);

        tilesLoader.addEventListener("loaded", Map.jsonLoaded);
        tilesLoader.onProgress = function (json) {
            Map.tilesLoaded(json);
        };
        tilesLoader.onComplete = function () {
            var objectsLoader = new PIXI.AssetLoader(["js/editor/dungeon_walls.json"]);
            objectsLoader.onProgress = function (json) {
                Map.objectsLoaded(json);
            };
            objectsLoader.onComplete = function () {
                Map.load();
            };
            objectsLoader.load();
        };
        tilesLoader.load();

    },

    tilesLoaded: function (obj) {
        //Map.createTileIndexes(obj.json);
        Map.onTilesLoaded(obj.json);
    },

    objectsLoaded: function (obj) {
        //Map.createObjectIndexes(obj.json);
        Map.onObjectsLoaded(obj.json);
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

        Map.stage.mousedown = function (data) {

            console.log(data.global);

            var result = Map.indexFromScreen(data.global);

            console.log(result.row + ', ' + result.col);

            /*
            if (result.row < 0) {
                var rowsToAdd = -1 * result.row;
                for (var i = 0; i < rowsToAdd; i++) {
                    for (var j = 0; j < Map.LAYERS; j++) {
                        Map.source[j].unshift([]);
                    }
                }

                result.row = 0;
            }

            if (result.row >= Map.source[0].length) {
                var rowsToAdd = result.row - Map.source[0].length + 1;
                for (var i = 0; i < rowsToAdd; i++) {
                    for (var j = 0; j < Map.LAYERS; j++) {
                        Map.source[j].push([]);
                    }
                }
            }
            */
            
            if (Map.brush.source[result.row] === undefined) {
                Map.brush.source[result.row] = {};
            }

            Map.brush.source[result.row][result.col] = Map.brush.index;
            Map.draw();
            Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);

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
                
            }

            if (Map.brush.sprite)
                Map.brush.sprite.position = data.global;

        };
    },

    update: function () {
        Map.draw();
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

        Map.stats.begin();

        if (Map.invalidate) {
            Map.draw();
            Map.invalidate = false;
        }

        if (Map.texture) {
            //Map.texture.render(Map.buffer, new PIXI.Point(Map.xOffset, Map.yOffset), true);

            //Map.update();
            Map.renderer.render(Map.stage);

        }

        Map.stats.end();
    },

    indexFromScreen: function (point) {

        var map = {};

        var screen = {};
        screen.x = point.x - Map.offset.x;
        screen.y = point.y - Map.offset.y;

        map.row = (screen.x / Map.TILE_WIDTH_HALF + screen.y / Map.TILE_HEIGHT_HALF) / 2;
        map.col = (screen.y / Map.TILE_HEIGHT_HALF - screen.x / Map.TILE_WIDTH_HALF) / -2;

        //map.row = Math.round(map.row + 1); // + origin.x;
        //map.col = Math.round(map.col); // + origin.y;

        map.row = Math.floor(map.row);
        map.col = Math.floor(map.col);

        return map;
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