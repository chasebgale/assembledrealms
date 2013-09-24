var renderer = new PIXI.WebGLRenderer(800, 600); 
var stage, textures, sprites, i, row, col, count, zombie;

var CONST_DIRECTION_W = 0;
var CONST_DIRECTION_NW = 1;
var CONST_DIRECTION_N = 2;
var CONST_DIRECTION_NE = 3;
var CONST_DIRECTION_E = 4;
var CONST_DIRECTION_SE = 5;
var CONST_DIRECTION_S = 6;
var CONST_DIRECTION_SW = 7;

var direction = CONST_DIRECTION_S;
var moving = false;
var prefix = "zombie_row";
var zombieSprite;

function init() {
	document.body.appendChild(renderer.view);
	stage = new PIXI.Stage;

	document.onkeydown = function(evt) {
		evt = evt || window.event;
		//alert("keydown: " + evt.keyCode);

		// TODO: Only stop walk if non walk key was pressed
		zombieSprite.children[direction].visible = false;
		zombieSprite.children[direction].stop();
		
		switch (evt.keyCode) {
			case 37:
				direction = CONST_DIRECTION_W;
				break;
			case 38:
				direction = CONST_DIRECTION_N;
				break;
			case 39:
				direction = CONST_DIRECTION_E;
				break;
			case 40:
				direction = CONST_DIRECTION_S;
				break;
			/*
			case 38:
				direction = CONST_DIRECTION_N;
				break;
			case 38:
				direction = CONST_DIRECTION_N;
				break;
			case 38:
				direction = CONST_DIRECTION_N;
				break;
			case 38:
				direction = CONST_DIRECTION_N;
				break;
			*/
		}
		
		zombieSprite.children[direction].visible = true;
		zombieSprite.children[direction].gotoAndPlay(1);
	};

	document.onkeyup = function(evt) {
		evt = evt || window.event;
		//alert("keyup: " + evt.keyCode);
	};
	
	textures = [];
	sprites = [];
	
	for (i = 0; i < 24; i++) {
		textures[i] = PIXI.Texture.fromImage("tiles/grass_and_water_" + i + ".png");
	}
	
	var roughRows = Math.round((600 / 16)) + 1;
	var roughCols = Math.round((800 / 64));
	var rowOffset = 0;
	
	count = 0;
	
	for (row = 0; row < roughRows; row++) {
		for (col = 0; col < roughCols; col++) {
			sprites[count] = new PIXI.Sprite(textures[getRandomInt(0, 3)]); // 
			
			if ((row % 2) === 0) {
				rowOffset = 32;
			} else {
				rowOffset = 0;
			}
			
			sprites[count].position.x = (col * 64) + rowOffset - 32;
			sprites[count].position.y = (row * 16) - 32;
			
			stage.addChild(sprites[count]);
			
			count++;
		}
	}
	
	// LOAD THE ZOMBIE!
	////////////////////////////////////////////////////
	// create an array of assets to load
	//var temp = zombieSpriteJSON();
	//console.log(temp);
	
	var assetsToLoader = [ "zombie.json" ];

	// create a new loader
	loader = new PIXI.AssetLoader(assetsToLoader);

	// use callback
	loader.onComplete = onAssetsLoaded;

	//begin load
	loader.load();

	requestAnimationFrame(animate);
}

function onAssetsLoaded()
{
	// create an array to store the textures
	var zombieTextures = [];
	var zombieMovieClip;
	var texture;
	var texture_name;
	var directions = 8;
	var i = 0;
	
	zombie = [];

	for (rows = 0; rows < 8; rows++) {
		zombieTextures[rows] = [];
		for (cols = 0; cols < 36; cols++) {
			texture_name = prefix + rows + "_" + "col" + cols + ".png";
			texture = PIXI.Texture.fromFrame(texture_name);
			zombieTextures[rows][cols] = texture;
		}
	}
	
	zombieSprite = new PIXI.DisplayObjectContainer();
	
	for (i = 0; i < directions; i++) {
		zombieMovieClip = new PIXI.MovieClip(zombieTextures[i].splice(4, 6));

		zombieMovieClip.position.x = 0;
		zombieMovieClip.position.y = 0;
		zombieMovieClip.animationSpeed = .1;
		zombieMovieClip.visible = false;
		
		zombieSprite.addChild(zombieMovieClip);
	}

	zombieSprite.position.x = 400 - 64;
	zombieSprite.position.y = 300 - 64;
	//zombieSprite.anchor.x = 0.5;
	//zombieSprite.anchor.y = 0.5;

	zombieSprite.children[CONST_DIRECTION_S].visible = true;
	zombieSprite.children[CONST_DIRECTION_S].gotoAndPlay(1);

	stage.addChild(zombieSprite);

}	


function animate() {
	
	renderer.render(stage);

	requestAnimationFrame(animate);
	
}

function zombieSpriteJSON() {
	var container = {};
	var prefix_worker = "";
	var rows, cols;
	
	container.frames = {};
	
	for (rows = 0; rows < 8; rows++) {
		for (cols = 0; cols < 36; cols++) {
			prefix_worker = prefix + rows + "_" + "col" + cols + ".png";
			container.frames[prefix_worker] = {};
			container.frames[prefix_worker].frame = {"x":cols * 128, "y":rows * 128, "w":128, "h":128};
			container.frames[prefix_worker].rotated = false;
			container.frames[prefix_worker].trimmed = false;
			container.frames[prefix_worker].spriteSourceSize = {"x":0, "y":0, "w":128, "h":128};
			container.frames[prefix_worker].sourceSize = {"w":128, "h":128};
		}
	}
	
	container.meta = {
		"app": "http://www.texturepacker.com",
		"version": "1.0",
		"image": "zombie_0.png",
		"format": "RGBA8888",
		"size": {"w":1345,"h":299},
		"scale": "1",
		"smartupdate": "$TexturePacker:SmartUpdate:17e4a2d92ff3e27832c3f4938cec7c85$"
	};
	
	return JSON.stringify(container);
}

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

if(window.attachEvent) {
    window.attachEvent('onload', init);
} else {
    if(window.onload) {
        var curronload = window.onload;
        var newonload = function() {
            curronload();
            init();
        };
        window.onload = newonload;
    } else {
        window.onload = init;
    }
}