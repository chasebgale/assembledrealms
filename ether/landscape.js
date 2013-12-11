function Landscape() {
	var buffer, view, textures;
	
	var jqxhr = $.getJSON( "map.json", function() {
	  console.log( "success" );
	})
	.done(function() {
		console.log( "second success" );
	})
	.fail(function() {
		console.log( "error" );
	})
	.always(function() {
		console.log( "complete" );
	});
}

Landscape.prototype.init = function () {
	var roughRows = Math.round((600 / 16)) + 1;
    var roughCols = Math.round((800 / 64));

    // Testing fps hit with larger area
    roughRows = roughRows * 2;
    roughCols = roughCols * 2;

    var rowOffset = 0;

    var count = 0;

    var texture_name;

    buffer = new PIXI.DisplayObjectContainer();

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

            buffer.addChild(sprites[count]);
			
            count++;
        }
    }

    var renderTexture = new PIXI.RenderTexture(1600, 1200);
    view = new PIXI.Sprite(renderTexture);

    renderTexture.render(buffer);

    //stage.addChild(view);
	
	return view;
}

Landscape.prototype.move = function (offset) {
	this.x += offset.x;
	this.y += offset.y;
}