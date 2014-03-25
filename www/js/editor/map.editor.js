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
    touch: new Vector3(),

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

        var tileWidth = Math.ceil( Map.renderer.width / 32 ) + 1;
        var tileHeight = Math.ceil(Map.renderer.height / 16) + 1;

        var htileWidth = Math.ceil(tileWidth / 2);
        var htileHeight = Math.ceil(tileHeight / 2);

        var sprite, textSprite;
        var count = 0;

        var startPoint = { "x": 250, "y": 250 };

        var aStart = (startPoint.x + startPoint.y) - htileWidth;
        var aEnd = aStart + tileWidth;

        var bStart = (startPoint.x - startPoint.y) - htileHeight;
        var bEnd = bStart + tileHeight;

        var xOffset = -1 * aStart * 32;
        var yOffset = -1 * bStart * 16;

        for (var a = aStart; a < aEnd; a++) {

            for (var b = bStart; b < bEnd; b++) {

                sprite = new PIXI.Sprite(PIXI.Texture.fromFrame("js/editor/placeholder.png"));
                
                if ((b & 1) != (a & 1)) {
                    continue;
                }

                x = (a + b) / 2;
                y = (a - b) / 2;

                textSprite = new PIXI.Text(x + "," + y, { font: "11px serif", fill: "white", align: "left" });
                textSprite.position.x = 16;
                textSprite.position.y = 32;

                sprite.addChild(textSprite);

                sprite.position.x = (a * 32); // + xOffset;
                sprite.position.y = (b * 16); // + yOffset;

                console.log(sprite.position);

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

        Map.xOffset = xOffset;
        Map.yOffset = yOffset;

        console.log(count + " tiles...");

        Map.transformMatrix = new Matrix4();
        Map.transformMatrix.identity();
        Map.transformMatrix.makeTranslation(0.0, 0.25, 0.0);
        Map.transformMatrix.makeScale((Math.sqrt(2.0) / 2.0), (Math.sqrt(2.0) / 4.0), 1.0);
        Map.transformMatrix.makeRotationAxis({ x: 0, y: 0, z: 1.0 }, -45.0);

        Map.transformMatrix.getInverse(Map.transformMatrix);

        Map.stage.mousedown = function (data) {
            console.log(data.global);

            // Transform way:
            Map.touch.set(data.global.x, data.global.y, 0);
            Map.touch.applyMatrix4(Map.transformMatrix);

            // Manual way:
            var worldPositionX = (2 * data.global.y + data.global.x) / 2;
            var worldPositionY = (2 * data.global.y - data.global.x) / 2;

            var worldX = Math.floor(worldPositionX / 64);
            var worldY = Math.floor(worldPositionY / 32);

            //pickedTile = tiles[worldX][worldY];
            console.log("clicked: " + worldX + ", " + worldY);

            //console.log(Map.touch);
            
        };

    },

    render: function () {
        Map.texture.render(Map.buffer, new PIXI.Point(Map.xOffset, Map.yOffset), true);
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

document.onkeydown = function (evt) {
    evt = evt || window.event;

    console.log(evt.keyCode);

    switch (evt.keyCode) {
        case 87:
            //Map.view.position.y--;
            Map.yOffset--;
            break;
        case 83:
            //Map.view.position.y++;
            Map.yOffset++;
            break;
        case 65:
            //Map.view.position.x--;
            Map.xOffset--;
            break;
        case 68:
            //Map.view.position.x++;
            Map.xOffset++;
            break;
    }
};