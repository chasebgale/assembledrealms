var renderer = new PIXI.WebGLRenderer(800, 600); 

var stage,
i, 
count, 
activeAvatarIndex;

var direction = DIRECTION_S;
var moving = false;
var prefix = "zombie_row";
var zombieSprite;
var lastKeyCode = -1;
var stats;
var mouseDown = false;
var newMouseEvent = false;
var mouseCoordPoint = {x: 0, y: 0};

function init() {

	activeAvatarIndex = DIRECTION_S;

	stage = new PIXI.Stage(0x000000, true);

	document.body.appendChild(renderer.view);
	
	stage.mousedown = function (data) {

	    mouseDown = true;
		newMouseEvent = true;
		
		// In the future we need to hitTest first to see if we are clicking an object and not moving...
		Avatar.sprite.children[activeAvatarIndex].visible = false;

	}

	stage.mouseup = function (data) {

	    mouseDown = false;
		newMouseEvent = true;
		Avatar.sprite.children[activeAvatarIndex].visible = false;

	}

	stats = new Stats();
	document.body.appendChild( stats.domElement );
	stats.domElement.style.position = "absolute";
	stats.domElement.style.top = "0px";

	document.onkeydown = function(evt) {
		evt = evt || window.event;
		
		if (evt.keyCode === lastKeyCode) {
			return;
		}
		
		lastKeyCode = evt.keyCode;
	};

	document.onkeyup = function(evt) {
		evt = evt || window.event;
		
		lastKeyCode = -1;
	};

	$.getJSON("map.json", function (payload) {

	    Landscape.onComplete = landscapeLoaded;
	    Landscape.init(payload, 800, 600);

	    Avatar.onComplete = avatarLoaded;
	    Avatar.init(["zombie.json"]);

	});
}

function landscapeLoaded(view) {
    stage.addChildAt(view, RENDER_STACK_LANDSCAPE);
}

function avatarLoaded(avatar) {
    avatar.position.x = 400 - 64;
    avatar.position.y = 300 - 64;

    stage.addChildAt(avatar, RENDER_STACK_AVATAR);

    requestAnimationFrame(animate);
}

function updateAvatar(newDirection) {

    Avatar.sprite.children[activeAvatarIndex].visible = false;
    Avatar.sprite.children[activeAvatarIndex].stop();

    Avatar.sprite.children[newDirection].visible = true;
    Avatar.sprite.children[newDirection].play();

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
	        case DIRECTION_W:
	            Landscape.view.position.x += 1;
	            break;
	        case DIRECTION_NW:
	            Landscape.view.position.x += MOVEMENT_ANGLE;
	            Landscape.view.position.y += MOVEMENT_ANGLE;
	            break;
	        case DIRECTION_N:
	            Landscape.view.position.y += 1;
	            break;
	        case DIRECTION_NE:
	            Landscape.view.position.x -= MOVEMENT_ANGLE;
	            Landscape.view.position.y += MOVEMENT_ANGLE;
	            break;
	        case DIRECTION_E:
	            Landscape.view.position.x -= 1;
	            break;
	        case DIRECTION_SE:
	            Landscape.view.position.x -= MOVEMENT_ANGLE;
	            Landscape.view.position.y -= MOVEMENT_ANGLE;
	            break;
	        case DIRECTION_S:
	            Landscape.view.position.y -= 1;
	            break;
	        case DIRECTION_SW:
	            Landscape.view.position.x += MOVEMENT_ANGLE;
	            Landscape.view.position.y -= MOVEMENT_ANGLE;
	            break;
	    }
	} else {
		var newAvatarIndex = 8 + direction;
		if ((Avatar.sprite.children[newAvatarIndex].visible === false) || (newMouseEvent)) {
		
		    Landscape.view.position.x = Math.round(Landscape.view.position.x);
		    Landscape.view.position.y = Math.round(Landscape.view.position.y);
		
			updateAvatar(newAvatarIndex);
			activeAvatarIndex = newAvatarIndex;
			newMouseEvent = false;
		}
	}

	renderer.render(stage);
	
	stats.end();
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