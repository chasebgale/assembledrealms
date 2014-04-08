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
    source: [],
    emptyTexture: null,
    width: 896,
    height: 504,
    TILE_WIDTH: 64,
    TILE_WIDTH_HALF: 32,
    TILE_HEIGHT: 32,
    TILE_HEIGHT_HALF: 16,
    TILE_Y_OFFSET: 14,
    playerPos: { x: 9500, y: 0 },
    offsetTracker: { x: 0, y: 0 },
    stats: null,
    tiles: [],
    objects: [],
    tile: 0,
    layer: 0,
    brushSource: null,
    LAYERS: 2,

    init: function (div) {

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
        Map.renderer = new PIXI.WebGLRenderer(Map.width, Map.height);

        Map.stage = new PIXI.Stage(0x000000, true);

        canvas.appendChild(Map.renderer.view);

        Map.emptyTexture = PIXI.Texture.fromImage("js/editor/placeholder.png");
        Map.brushSprite = new PIXI.Sprite(Map.emptyTexture);
        Map.brushSprite.anchor.x = 0.5;
        Map.brushSprite.anchor.y = 0.5;

        Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / 32) + 1;
        Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / 16) + 1;

        Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
        Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

        Map.stats = new Stats();
        document.body.appendChild(Map.stats.domElement);
        Map.stats.domElement.style.position = "absolute";
        Map.stats.domElement.style.top = "200px";
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
        Map.createTileIndexes(obj.json);
        Map.onTilesLoaded(obj.json);
    },

    objectsLoaded: function (obj) {
        Map.createObjectIndexes(obj.json);
        Map.onObjectsLoaded(obj.json);
    },

    setBrush: function (brushSource, brushKey) {
        Map.tile = _.indexOf(brushSource, brushKey);
        Map.brushSource = brushSource;

        Map.brushSprite.setTexture(PIXI.Texture.fromFrame(Map.brushSource[Map.tile]));
        Map.brushSprite.anchor.y = (Map.brushSprite.height - 32) / Map.brushSprite.height;
        Map.brushSprite.anchor.x = (Map.brushSprite.width / 2) / Map.brushSprite.width;

    },

    load: function () {

        Map.draw();

        Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);
        Map.view = new PIXI.Sprite(Map.texture);

        Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);

        Map.stage.addChild(Map.view);
        Map.stage.addChild(Map.brushSprite);

        Map.renderer.render(Map.stage);

        Map.stage.mousedown = function (data) {

            console.log(data.global);

            var result = Map.indexFromScreen(data.global);

            console.log(result.row + ', ' + result.col);

            Map.source[Map.layer][result.row][result.col] = Map.tile;
            Map.update();
            Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);

        };

        Map.stage.mousemove = function (data) {

            Map.brushSprite.position = data.global;

            if (data.target.__isDown) {
                var result = Map.indexFromScreen(data.global);

                if (Map.source[Map.layer][result.row][result.col] === 0) {
                    Map.source[Map.layer][result.row][result.col] = Map.tile;
                    Map.update();
                    Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
                }
            }

        };
    },

    update: function () {
        Map.draw();
    },

    draw: function () {
        var sprite;
        var count = 0;

        Map.buffer = new PIXI.SpriteBatch();

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

                for (var layer = 0; layer < Map.LAYERS; layer++) {

                    if (Map.source[layer][row] === undefined) continue;
                    if (Map.source[layer][row][col] === undefined) continue;

                    switch (layer) {
                        case 0:
                            if (Map.source[layer][row][col] > 0) {
                                sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(Map.tiles[Map.source[layer][row][col]]));
                            } else {
                                sprite = new PIXI.Sprite(Map.emptyTexture);
                            }
                            break;
                        case 1:
                            if (Map.source[layer][row][col] > 0) {
                                sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(Map.objects[Map.source[layer][row][col]]));
                            }
                            break;
                    }

                    

                    sprite.anchor.y = (sprite.height - 32) / sprite.height;
                    sprite.anchor.x = ((sprite.width / 2) - 32) / sprite.width;
                    sprite.position.x = (a * Map.TILE_WIDTH_HALF);
                    sprite.position.y = (b * Map.TILE_HEIGHT_HALF);

                    Map.buffer.addChild(sprite);

                    count++;
                }
            }
        }
    },

    render: function () {

        Map.draw();

        if (Map.texture) {
            //Map.texture.render(Map.buffer, new PIXI.Point(Map.xOffset, Map.yOffset), true);
            Map.stats.begin();
            //Map.update();
            Map.renderer.render(Map.stage);
            Map.stats.end();
        }
    },

    indexFromScreen: function (screen) {

        var map = {};

        screen.y -= Map.offset.y;
        screen.x -= Map.offset.x;

        map.row = (screen.x / Map.TILE_WIDTH_HALF + screen.y / Map.TILE_HEIGHT_HALF) / 2;
        map.col = (screen.y / Map.TILE_HEIGHT_HALF - screen.x / Map.TILE_WIDTH_HALF) / -2;

        //map.row = Math.round(map.row + 1); // + origin.x;
        //map.col = Math.round(map.col); // + origin.y;

        map.row = Math.floor(map.row);
        map.col = Math.floor(map.col);

        return map;
    },

    createTileIndexes: function (json) {
        Map.tiles[0] = "";
        _.each(json.frames, function (frame, key) {
            Map.tiles.push(key);
        });
    },

    createObjectIndexes: function (json) {
        Map.objects[0] = "";
        _.each(json.frames, function (frame, key) {
            Map.objects.push(key);
        });
    }
};

document.onkeydown = function (evt) {
    evt = evt || window.event;

    var amount = 2;

    switch (evt.keyCode) {
        case 87:
            //Map.view.position.y--;
            Map.offset.y -= amount;
            Map.offsetTracker.y -= amount;
            Map.playerPos.y += amount;
            break;
        case 83:
            //Map.view.position.y++;
            Map.offset.y += amount;
            Map.offsetTracker.y += amount;
            Map.playerPos.y -= amount;
            break;
        case 65:
            //Map.view.position.x--;
            Map.offset.x -= amount;
            Map.offsetTracker.x -= amount;
            Map.playerPos.x += amount;
            break;
        case 68:
            //Map.view.position.x++;
            Map.offset.x += amount;
            Map.offsetTracker.x += amount;
            Map.playerPos.x -= amount;
            break;
    }

    /*
    if ( Map.offsetTracker.x  >= 32 ) {
        Map.offsetTracker.x = 0;
        Map.update();
    }

    if (Map.offsetTracker.x <= -32) {
        Map.offsetTracker.x = 0;
        Map.update();
    }
    */
    
    Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
};