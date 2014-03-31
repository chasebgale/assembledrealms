/*

http://gamedev.stackexchange.com/questions/32350/optimizing-isometric-drawing-function
http://gamedev.stackexchange.com/questions/25896/how-do-i-find-which-isometric-tiles-are-inside-the-cameras-current-view/25900#25900
http://jsfiddle.net/kAFVB/3/
http://stackoverflow.com/questions/7016981/efficiently-getting-isometric-grid-positions-within-a-bounding-box

EG:

http://www.openspace-engine.com/support/tutorials/mapStructure

*/

var Map = {

    stage: null,
    renderer: null,
    rendererMini: null,
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

    init: function (div) {

        // Append elements:
        var target = document.getElementById(div);

        var canvas = document.createElement('div');
        canvas.setAttribute("style", "padding: 2px; display: inline-block;");
        canvas.id = 'mapMain';
        target.appendChild(canvas);
        
        var miniCanvas = document.createElement('div');
        miniCanvas.setAttribute("style", "padding: 2px; display: inline-block;");
        miniCanvas.id = 'mapMini';
        target.appendChild(miniCanvas);

        // Initialize PIXI:
        Map.renderer = new PIXI.WebGLRenderer(Map.width, Map.height);
        Map.rendererMini = new PIXI.WebGLRenderer(400, 300);

        Map.stage = new PIXI.Stage(0x000000, true);

        canvas.appendChild(Map.renderer.view);
        miniCanvas.appendChild(Map.rendererMini.view);

        Map.emptyTexture = PIXI.Texture.fromImage("js/editor/placeholder.png");

        Map.VIEWPORT_WIDTH_TILES = Math.ceil(Map.width / 32) + 1;
        Map.VIEWPORT_HEIGHT_TILES = Math.ceil(Map.height / 16) + 1;

        Map.VIEWPORT_WIDTH_TILES_HALF = Math.ceil(Map.VIEWPORT_WIDTH_TILES / 2);
        Map.VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(Map.VIEWPORT_HEIGHT_TILES / 2);

        Map.stats = new Stats();
        document.body.appendChild(Map.stats.domElement);
        Map.stats.domElement.style.position = "absolute";
        Map.stats.domElement.style.top = "0px";
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

        for (var row = 0; row < tileHeight; row++) {

            Map.source[row] = [];

            for (var col = 0; col < tileWidth; col++) {

                Map.source[row][col] = 0;

            }
        }

        // Load the map:
        var assetsLoader = new PIXI.AssetLoader(["js/editor/landscape.json"]);
        assetsLoader.onComplete = Map.load;
        assetsLoader.onProgress = function (e) {
            console.log(e);
        };
        assetsLoader.load();
        
    },

    load: function (map) {

        if (map) {
            Map.source = map;
        }

        var sprite, textSprite;
        var count = 0;

        var startPoint = {};

        startPoint.row = (Map.playerPos.x / Map.TILE_WIDTH_HALF + Map.playerPos.y / Map.TILE_HEIGHT_HALF) / 2;
        startPoint.col = (Map.playerPos.y / Map.TILE_HEIGHT_HALF - Map.playerPos.x / Map.TILE_WIDTH_HALF) / -2;
        startPoint.row = Math.floor(startPoint.row);
        startPoint.col = Math.floor(startPoint.col);

        var aStart = (startPoint.row + startPoint.col) - Map.VIEWPORT_WIDTH_TILES_HALF;
        var aEnd = aStart + Map.VIEWPORT_WIDTH_TILES;

        var bStart = (startPoint.row - startPoint.col) - Map.VIEWPORT_HEIGHT_TILES_HALF;
        var bEnd = bStart + Map.VIEWPORT_HEIGHT_TILES;

        var xOffset = (-1 * aStart * 32) - Map.TILE_WIDTH_HALF;
        var yOffset = (-1 * bStart * 16) - Map.TILE_Y_OFFSET;

        for (var b = bStart; b < bEnd + 1; b++) {

            for (var a = aStart; a < aEnd; a++) {
                
                if ((b & 1) != (a & 1)) {
                    continue;
                }

                row = (a + b) / 2;
                col = (a - b) / 2;

                if (Map.source[row] === undefined) continue;
                if (Map.source[row][col] === undefined) continue;

                sprite = new PIXI.Sprite(Map.emptyTexture);

                textSprite = new PIXI.Text(row + "," + col, { font: "11px serif", fill: "white", align: "left" });
                textSprite.position.x = 16;
                textSprite.position.y = -8;

                sprite.addChild(textSprite);

                sprite.anchor.y = 0.5;
                sprite.position.x = (a * Map.TILE_WIDTH_HALF);
                sprite.position.y = (b * Map.TILE_HEIGHT_HALF); // - tileYOffset;

                //if (row === 0 && col === 0) {
                    console.log('sprite ' + count + ' - ' + sprite.position.x + ',' + sprite.position.y);
                //}

                Map.buffer.addChild(sprite);

                count++;

            }
        }

        // TODO: Figure width and height of finished Rhombus
        Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);
        Map.view = new PIXI.Sprite(Map.texture);

        Map.texture.render(Map.buffer, new PIXI.Point(xOffset, yOffset), true);

        Map.stage.addChild(Map.view);
        Map.renderer.render(Map.stage);

        Map.offset = { x: xOffset, y: yOffset };

        console.log(count + " tiles... offset: " + xOffset + ',' + yOffset);

        Map.stage.mousedown = function (data) {

            console.log(data.global);

            var result = Map.indexFromScreen(data.global);

            console.log(result.row + ', ' + result.col);

            Map.source[result.row][result.col] = getRandomInt(1, 3);
            Map.update();
            Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);

        };

        Map.stage.mousemove = function (data) {
            
            if (data.target.__isDown) {
                var result = Map.indexFromScreen(data.global);

                if (Map.source[result.row][result.col] === 0) {
                    Map.source[result.row][result.col] = getRandomInt(1, 3);
                    Map.update();
                    Map.texture.render(Map.buffer, new PIXI.Point(Map.offset.x, Map.offset.y), true);
                }
            }

        };
    },

    update: function () {

        var sprite;
        var count = 0;

        Map.buffer = new PIXI.SpriteBatch();

        var startPoint = {};

        startPoint.row = (Map.playerPos.x / Map.TILE_WIDTH_HALF + Map.playerPos.y / Map.TILE_HEIGHT_HALF) / 2;
        startPoint.col = (Map.playerPos.y / Map.TILE_HEIGHT_HALF - Map.playerPos.x / Map.TILE_WIDTH_HALF) / -2;
        startPoint.row = Math.floor(startPoint.row);
        startPoint.col = Math.floor(startPoint.col);

        var aStart = (startPoint.row + startPoint.col) - Map.VIEWPORT_WIDTH_TILES_HALF;
        var aEnd = aStart + Map.VIEWPORT_WIDTH_TILES;

        var bStart = (startPoint.row - startPoint.col) - Map.VIEWPORT_HEIGHT_TILES_HALF;
        var bEnd = bStart + Map.VIEWPORT_HEIGHT_TILES;

        for (var b = bStart; b < bEnd + 1; b++) {

            for (var a = aStart; a < aEnd; a++) {

                if ((b & 1) != (a & 1)) {
                    continue;
                }

                row = (a + b) / 2;
                col = (a - b) / 2;

                if (Map.source[row] === undefined) continue;
                if (Map.source[row][col] === undefined) continue;

                if (Map.source[row][col] > 0) {
                    sprite = new PIXI.Sprite(PIXI.Texture.fromFrame("grass_and_water_" + Map.source[row][col] + ".png"));
                } else {
                    sprite = new PIXI.Sprite(Map.emptyTexture);
                }

                sprite.anchor.y = 0.5;
                sprite.position.x = (a * Map.TILE_WIDTH_HALF);
                sprite.position.y = (b * Map.TILE_HEIGHT_HALF);

                Map.buffer.addChild(sprite);

                count++;

            }
        }

    },

    render: function () {
        if (Map.texture) {
            //Map.texture.render(Map.buffer, new PIXI.Point(Map.xOffset, Map.yOffset), true);
            Map.stats.begin();
            //Map.update();
            Map.renderer.render(Map.stage);
            Map.stats.end();
        }
    },

    indexFromScreen: function(screen) {
    
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
    }

}

document.onkeydown = function (evt) {
    evt = evt || window.event;

    

    switch (evt.keyCode) {
        case 87:
            //Map.view.position.y--;
            Map.offset.y--;
            Map.offsetTracker.y--;
            Map.playerPos.y++;
            break;
        case 83:
            //Map.view.position.y++;
            Map.offset.y++;
            Map.offsetTracker.y++;
            Map.playerPos.y--;
            break;
        case 65:
            //Map.view.position.x--;
            Map.offset.x--;
            Map.offsetTracker.x--;
            Map.playerPos.x++;
            break;
        case 68:
            //Map.view.position.x++;
            Map.offset.x++;
            Map.offsetTracker.x++;
            Map.playerPos.x--;
            break;
    }

    console.log(evt.keyCode + ' - ' + Map.xOffset + ',' + Map.yOffset);

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