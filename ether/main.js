var renderer = new PIXI.WebGLRenderer(800, 600); 
var stage, textures, sprites, i, row, col, count, zombie, landscape, landscapeBuffer, activeAvatarIndex;

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
var lastKeyCode = -1;
var stats;
var mouseDown = false;
var newMouseEvent = false;
var mouseCoordPoint = {x: 0, y: 0};

// sin(45degrees) ≈ .707 and cos(45degrees) ≈ .707
var angledMovementAmount = .707;

function init() {

    var assetsToLoader;
	
	activeAvatarIndex = CONST_DIRECTION_S;

	document.body.appendChild(renderer.view);
	stage = new PIXI.Stage(0x000000, true);
	
	stage.mousedown = function (data) {

	    mouseDown = true;
		newMouseEvent = true;
		
		// In the future we need to hitTest first to see if we are clicking an object and not moving...
		zombieSprite.children[activeAvatarIndex].visible = false;

	}

	stage.mouseup = function (data) {

	    mouseDown = false;
		newMouseEvent = true;
		zombieSprite.children[activeAvatarIndex].visible = false;

	}

	stats = new Stats();
	document.body.appendChild( stats.domElement );
	stats.domElement.style.position = "absolute";
	stats.domElement.style.top = "0px";

	/*
	document.onkeydown = function(evt) {
		evt = evt || window.event;
		
		if (evt.keyCode === lastKeyCode) {
			return;
		}

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
			
		}
		
		zombieSprite.children[direction].visible = true;
		zombieSprite.children[direction].gotoAndPlay(1);
		
		lastKeyCode = evt.keyCode;
	};

	document.onkeyup = function(evt) {
		evt = evt || window.event;
		
		lastKeyCode = -1;
		//alert("keyup: " + evt.keyCode);
	};
	*/
	
	textures = [];
	sprites = [];
	
    /*
	for (i = 0; i < 24; i++) {
		textures[i] = PIXI.Texture.fromImage("tiles/grass_and_water_" + i + ".png");
	}
	*/

    // LOAD THE LANDSCAPE!
    ////////////////////////////////////////////////////
	assetsToLoader = ["landscape.json"];

    // create a new loader
	var landscapeLoader = new PIXI.AssetLoader(assetsToLoader);

    // use callback
	landscapeLoader.onComplete = onLandscapeLoaded;

    //begin load
	landscapeLoader.load();

	//requestAnimationFrame(animate);
}

function onLandscapeLoaded() {

    var roughRows = Math.round((600 / 16)) + 1;
    var roughCols = Math.round((800 / 64));


    // Testing fps hit with larger area
    roughRows = roughRows * 2;
    roughCols = roughCols * 2;

    var rowOffset = 0;

    var count = 0;

    var texture_name;

    landscapeBuffer = new PIXI.DisplayObjectContainer();

    for (row = 0; row < roughRows; row++) {
        for (col = 0; col < roughCols; col++) {
            texture_name = "grass_and_water_" + getRandomInt(0, 3) + ".png";
            sprites[count] = new PIXI.Sprite(PIXI.Texture.fromFrame(texture_name));//textures[getRandomInt(0, 3)]);

            if ((row % 2) === 0) {
                rowOffset = 32;
            } else {
                rowOffset = 0;
            }

            sprites[count].position.x = (col * 64) + rowOffset - 32;
            sprites[count].position.y = (row * 16) - 32;

            landscapeBuffer.addChild(sprites[count]);

            count++;
        }
    }

    var renderTexture = new PIXI.RenderTexture(1600, 1200);
    landscape = new PIXI.Sprite(renderTexture);

    renderTexture.render(landscapeBuffer);

    stage.addChild(landscape);
	
	// LOAD THE ZOMBIE!
	////////////////////////////////////////////////////
	
	assetsToLoader = [ "zombie.json" ];

	// create a new loader
	var loader = new PIXI.AssetLoader(assetsToLoader);

	// use callback
	loader.onComplete = onAssetsLoaded;

	//begin load
	loader.load();
}

function onAssetsLoaded() {

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
	
	// Walking clips:
	for (i = 0; i < directions; i++) {
		zombieMovieClip = new PIXI.MovieClip(zombieTextures[i].splice(4, 8));

		zombieMovieClip.position.x = 0;
		zombieMovieClip.position.y = 0;
		zombieMovieClip.animationSpeed = .1;
		zombieMovieClip.visible = false;
		
		zombieSprite.addChild(zombieMovieClip);
	}
	
	// Standing clips:
	var workerClipArray = [];
	
	for (i = 0; i < directions; i++) {
		
		texture = PIXI.Texture.fromFrame(texture_name);
	
		workerClipArray = zombieTextures[i].splice(0, 4);
		
		texture_name = prefix + i + "_" + "col2.png";
		workerClipArray.push(PIXI.Texture.fromFrame(texture_name));
		
		texture_name = prefix + i + "_" + "col1.png";
		workerClipArray.push(PIXI.Texture.fromFrame(texture_name));
		
		texture_name = prefix + i + "_" + "col0.png";
		workerClipArray.push(PIXI.Texture.fromFrame(texture_name));
		
		zombieMovieClip = new PIXI.MovieClip(workerClipArray);

		zombieMovieClip.position.x = 0;
		zombieMovieClip.position.y = 0;
		zombieMovieClip.animationSpeed = .05;
		zombieMovieClip.visible = false;
		
		zombieSprite.addChild(zombieMovieClip);
	}
	

	zombieSprite.position.x = 400 - 64;
	zombieSprite.position.y = 300 - 64;
	//zombieSprite.anchor.x = 0.5;
	//zombieSprite.anchor.y = 0.5;

	//zombieSprite.children[CONST_DIRECTION_S].visible = true;
	//zombieSprite.children[CONST_DIRECTION_S].gotoAndPlay(1);

	stage.addChild(zombieSprite);
	
	requestAnimationFrame(animate);

}	

var moveX = 0;
var moveY = 0;

function moveAvatar(x, y) {
	landscape.position.x -= x;
	landscape.position.y += y;
	
	if (x !== 0) {
		moveX = x;
	}
	
	if (y !== 0) {
		moveY = y;
	}
}

function updateAvatar(newDirection) {

    zombieSprite.children[activeAvatarIndex].visible = false;
    zombieSprite.children[activeAvatarIndex].stop();

    zombieSprite.children[newDirection].visible = true;
    zombieSprite.children[newDirection].play();

}

function moveUp(e) {
	moveAvatar(0, 1);
}

function moveDown(e) {
	moveAvatar(0, -1)
}

function moveLeft(e) {
	moveAvatar(-1, 0);
}

function moveRight(e) {
	moveAvatar(1, 0);
}


function animate() {
	
    requestAnimationFrame(animate);

	stats.begin();

	var angle;
	var point;
	var calcDirection;

	if (mouseDown) {
	    point = stage.getMousePosition();

        // Update Avatar based on angle of mouse from center:
	    if ((lineDistanceSqrt(mouseCoordPoint, point) > 12) || (newMouseEvent)) {
	        mouseCoordPoint.x = point.x;
	        mouseCoordPoint.y = point.y;

            angle = (Math.atan2(300 - mouseCoordPoint.y, mouseCoordPoint.x - 400) * 180 / Math.PI + 360) % 360;
	        console.log(mouseCoordPoint.x + ":" + mouseCoordPoint.y + "  -- Angle: " + angle);

	        calcDirection = directionFromAngle(angle);

	        if ((calcDirection !== direction) || (newMouseEvent)) {
			
	            updateAvatar(calcDirection);
	            direction = calcDirection;
				activeAvatarIndex = direction;
				newMouseEvent = false;
	        }
	    }

	    // Update stage position in direction avatar is moving:
	    switch (direction) {
	        case CONST_DIRECTION_W:
	            landscape.position.x += 1;
	            break;
	        case CONST_DIRECTION_NW:
	            landscape.position.x += angledMovementAmount;
	            landscape.position.y += angledMovementAmount;
	            break;
	        case CONST_DIRECTION_N:
	            landscape.position.y += 1;
	            break;
	        case CONST_DIRECTION_NE:
	            landscape.position.x -= angledMovementAmount;
	            landscape.position.y += angledMovementAmount;
	            break;
	        case CONST_DIRECTION_E:
	            landscape.position.x -= 1;
	            break;
	        case CONST_DIRECTION_SE:
	            landscape.position.x -= angledMovementAmount;
	            landscape.position.y -= angledMovementAmount;
	            break;
	        case CONST_DIRECTION_S:
	            landscape.position.y -= 1;
	            break;
	        case CONST_DIRECTION_SW:
	            landscape.position.x += angledMovementAmount;
	            landscape.position.y -= angledMovementAmount;
	            break;
	    }
	} else {
		var newAvatarIndex = 8 + direction;
		if ((zombieSprite.children[newAvatarIndex].visible === false) || (newMouseEvent)) {
		
			landscape.position.x = Math.round(landscape.position.x);
            landscape.position.y = Math.round(landscape.position.y);
		
			updateAvatar(newAvatarIndex);
			activeAvatarIndex = newAvatarIndex;
			newMouseEvent = false;
		}
	}
	
	renderer.render(stage);
	
	stats.end();
}

function directionFromAngle(angle) {
    if ((angle > 337.5) || (angle < 22.5)) {
        return CONST_DIRECTION_E;
    }

    if ((angle > 22.5) && (angle < 67.5)) {
        return CONST_DIRECTION_NE;
    }

    if ((angle > 67.5) && (angle < 112.5)) {
        return CONST_DIRECTION_N;
    }

    if ((angle > 112.5) && (angle < 157.5)) {
        return CONST_DIRECTION_NW;
    }

    if ((angle > 157.5) && (angle < 202.5)) {
        return CONST_DIRECTION_W;
    }

    if ((angle > 202.5) && (angle < 247.5)) {
        return CONST_DIRECTION_SW;
    }

    if ((angle > 247.5) && (angle < 292.5)) {
        return CONST_DIRECTION_S;
    }

    if ((angle > 292.5) && (angle < 337.5)) {
        return CONST_DIRECTION_SE;
    }
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

function lineDistanceSqrt(point1, point2) {
    var xs = 0;
    var ys = 0;

    xs = point2.x - point1.x;
    xs = xs * xs;

    ys = point2.y - point1.y;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
}

function lineDistanceManhattan(p1, p2) {
    return Math.abs(p1.x-p2.x)+Math.abs(p1.y-p2.y);
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