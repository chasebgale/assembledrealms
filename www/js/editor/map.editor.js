/*

http://gamedev.stackexchange.com/questions/32350/optimizing-isometric-drawing-function
http://gamedev.stackexchange.com/questions/25896/how-do-i-find-which-isometric-tiles-are-inside-the-cameras-current-view/25900#25900
http://jsfiddle.net/kAFVB/3/
http://stackoverflow.com/questions/7016981/efficiently-getting-isometric-grid-positions-within-a-bounding-box

*/

var Map = {

    stage: null,
    renderer: null,
    rendererMini: null,
    map: null,
    emptyTexture: null,

    init: function (div, map) {

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

        // Load the map:
        var assetsLoader = new PIXI.AssetLoader(map.tileSource);
        assetsLoader.onComplete = Map.assetsLoaded;
        //assetsLoader.load();

    },

    create: function (tileWidth, tileHeight) {

        var sprites = [];
        var count = 0;
        var rowOffset = 0;

        Map.buffer = new PIXI.DisplayObjectContainer();

        // TODO: In the future this will be a map parsed
        for (var row = 0; row < tileHeight; row++) {
            for (var col = 0; col < tileWidth; col++) {
                sprites[count] = new PIXI.Sprite(Map.emptyTexture);

                if ((row % 2) === 0) {
                    rowOffset = 32;
                } else {
                    rowOffset = 0;
                }

                sprites[count].position.x = (col * 64) + rowOffset - 32;
                sprites[count].position.y = (row * 16) - 32;

                Map.buffer.addChild(sprites[count]);

                count++;
            }
        }

        Map.texture = new PIXI.RenderTexture(tileWidth * 64, tileHeight * 32);
        Map.view = new PIXI.Sprite(Map.texture);

        Map.view.position.x = 0;
        Map.view.position.y = 0;

        Map.texture.render(Map.buffer, new PIXI.Point(0, 0), true);

        Map.stage.addChild(Map.view);
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