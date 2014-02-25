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
        Map.renderer = new PIXI.WebGLRenderer(800, 600);
        Map.rendererMini = new PIXI.WebGLRenderer(400, 300);

        Map.stage = new PIXI.Stage(0x000000, true);

        canvas.appendChild(Map.renderer.view);
        miniCanvas.appendChild(Map.rendererMini.view);

        Map.emptyTexture = PIXI.Texture.fromImage("js/editor/placeholder.png");

    },

    create: function (tileWidth, tileHeight) {

        /*
               *     width
             *   * 
           *   *   *
         *   *   *   *
           *   *   *
             *   *   height
               *
        */

        Map.buffer = new PIXI.DisplayObjectContainer();
        Map.source = [];

        for (var row = 0; row < tileHeight; row++) {

            Map.source[row] = [];

            for (var col = 0; col < tileWidth; col++) {

                Map.source[row][col] = 0;

            }
        }

        // Load the map:
        var assetsLoader = new PIXI.AssetLoader(["js/editor/placeholder.png"]);
        assetsLoader.onComplete = Map.load;
        assetsLoader.load();

    },

    load: function (map) {

        if (map) {
            Map.source = map;
        }

        var tileWidth = Math.ceil( Map.renderer.width / 32 );
        var tileHeight = Math.ceil(Map.renderer.height / 16) + 1;

        var htileWidth = Math.ceil(tileWidth / 2);
        var htileHeight = Math.ceil(tileHeight / 2);

        var sprite, textSprite;
        var rowOffset = 0;
        var count = 0;

        var startRow = 50 - Math.round(tileWidth / 2);
        var startCol = 0 - Math.round(tileHeight / 2);
        var xOffset = (-1 * startRow * 32) - 32;
        var yOffset = 270;

        for (var row = startRow; row < 50 + htileWidth; row++) {

            for (var col = startCol; col < htileHeight; col++) {

                sprite = new PIXI.Sprite(PIXI.Texture.fromFrame("js/editor/placeholder.png"));
                
                if ((col & 1) != (row & 1)) {
                    console.log("Skipping col: " + col + ", row: " + row);
                    continue;
                }
                x = (row + col) / 2;
                y = (row - col) / 2;

                textSample = new PIXI.Text(x + "," + y, { font: "12px Consolas", fill: "white", align: "left" });
                textSample.position.x = 16;
                textSample.position.y = 32;

                sprite.addChild(textSample);

                sprite.position.x = (row * 32) + xOffset;
                sprite.position.y = (col * 16) + yOffset;

                Map.buffer.addChild(sprite);

                count++;

            }
        }

        // TODO: Figure width and height of finished Rhombus
        Map.texture = new PIXI.RenderTexture(Map.renderer.width, Map.renderer.height);
        Map.view = new PIXI.Sprite(Map.texture);

        Map.view.position.x = 0;
        Map.view.position.y = 0;

        Map.texture.render(Map.buffer, new PIXI.Point(0, 0), true);

        Map.stage.addChild(Map.view);
        Map.renderer.render(Map.stage);

    },

    render: function () {
        Map.renderer.render(Map.stage);
    },

    assetsLoaded: function () {
        var roughRows = Math.round((Landscape.height / 16)) + 1;
        var roughCols = Math.round((Landscape.width / 64));

        // Testing fps hit with larger area
        roughRows = roughRows * 2;
        roughCols = roughCols * 2;

        var rowOffset = 0;

        var count = 0;

        var texture_name;

        var sprites = [];

        Landscape.buffer = new PIXI.DisplayObjectContainer();

        // TODO: In the future this will be a map parsed
        for (row = 0; row < roughRows; row++) {
            for (col = 0; col < roughCols; col++) {
                texture_name = "grass_and_water_" + getRandomInt(0, 3) + ".png";
                sprites[count] = new PIXI.Sprite(PIXI.Texture.fromFrame(texture_name)); //textures[getRandomInt(0, 3)]);

                if ((row % 2) === 0) {
                    rowOffset = 32;
                } else {
                    rowOffset = 0;
                }

                sprites[count].position.x = (col * 64) + rowOffset - 32;
                sprites[count].position.y = (row * 16) - 32;

                Landscape.buffer.addChild(sprites[count]);

                count++;
            }
        }

        Landscape.texture = new PIXI.RenderTexture(1600, 1200);

        Landscape.view = new PIXI.Sprite(Landscape.texture);

        Landscape.view.position.x = 0;
        Landscape.view.position.y = 0;

        Landscape.texture.render(Landscape.buffer, new PIXI.Point(0, 0), true);

        stage.addChild(Landscape.view);
    }

}