var Avatar = function () {

    this.direction  = 0;
    this.sprite     = undefined;
    this.moving     = false;

};
    
Avatar.prototype.load = function (engine, PIXI, callback) {

    // create an array to store the textures
    var textures = [];
    var clip;
    var texture;
    var texture_name;
    var directions = 4;
    var i = 0;
    var prefix = "skelly_row";
    var self = this;
    
    self.sprite = new PIXI.DisplayObjectContainer();
    
    var loader = new PIXI.AssetLoader([ROOT + "client/resource/actors_walkcycle_BODY_skeleton.png"], true);
    
    loader.onProgress = function (event) {
        
        var index   = 0;
        var row     = 0;
        var col     = 0;
        
        var frameTexture;
        var filename = event.texture.baseTexture.imageUrl.split('/').pop();
        
        for (row = 0; row < directions; row++) {
            textures[row] = [];
            for (col = 0; col < 9; col++) {
                frameTexture = new PIXI.Texture(event.texture, {
                    x: col * 64,
                    y: row * 64,
                    width: 64,
                    height: 64
                });
                
                textures[row][col] = frameTexture;
                
                PIXI.Texture.addTextureToCache(frameTexture, prefix + row + "_" + "col" + col + ".png");
                index++;
            }
        }
        
        // Walking clips:
        for (i = 0; i < directions; i++) {
            clip = new PIXI.MovieClip(textures[i]);

            clip.position.x = (CANVAS_WIDTH / 2) - 32;
            clip.position.y = (CANVAS_HEIGHT / 2) - 32;
            clip.animationSpeed = .2;
            clip.visible = false;

            self.sprite.addChild(clip);
        }
        
    };
    
    loader.onComplete = function (event) {
        self.direction = DIRECTION_S;
        
        self.sprite.children[self.direction].visible = true;
        self.sprite.children[self.direction].gotoAndStop(0);
        
        callback();
    };
    
    loader.load();
			
};
		
Avatar.prototype.tick = function (engine, PIXI) {
    var self = this;
    
    var amount 				= 2;
    var amount_angle_sin 	= 2 * MOVEMENT_ANGLE_SIN;
    var amount_angle_cos 	= 2 * MOVEMENT_ANGLE_COS;
    var animationSpeed 		= .2;
    
    var wasMoving 		= self.moving;
    var oldDirection 	= self.direction;
    var oldPosition 	= $.extend(true, {}, engine.position);
    
    var keys 			= KeyboardJS.activeKeys();
    
    var isStepLegal = function () {
        
        var col = Math.floor(engine.position.x / TILE_WIDTH);
        var row = Math.ceil(engine.position.y / TILE_HEIGHT);
        
        if (engine.map.terrain.index[row] !== undefined) {
            
            if (engine.map.terrain.index[row][col] !== undefined) {
                if (engine.map.terrain.index[row][col][2] !== undefined) {
                    engine.position = oldPosition;
                }
            } else {
                engine.position = oldPosition;
            }
        } else {
            engine.position = oldPosition;
        }
        
        
        
        var flag = false;
    
        if (!wasMoving && self.moving) {
            
            self.sprite.children[self.direction].play();
            
            // Hide the standing-still sprite:
            //this.sprite.children[oldDirection + 8].visible = false;
            //this.sprite.children[oldDirection + 8].stop();
            //flag = true;
        }
    
        if ((oldDirection !== self.direction) || (flag)) {
    
            self.sprite.children[oldDirection].visible = false;
            self.sprite.children[oldDirection].stop();

            self.sprite.children[self.direction].visible = true;
            self.sprite.children[self.direction].play();
        
        }
        
        self.sprite.children[self.direction].animationSpeed = animationSpeed;
        
    };
    
    if ($.inArray('shift', keys) > -1) {
        amount *= 2;
        amount_angle_sin *= 2;
        amount_angle_cos *= 2;
        animationSpeed *= 2;
    }
    
    if ($.inArray('w', keys) > -1) {
        engine.offset.y += amount;
        engine.position.y -= amount;
        self.moving = true;
        self.direction = DIRECTION_N;
        isStepLegal();
        return;
    }
    
    if ($.inArray('a', keys) > -1) {
        engine.offset.x += amount;
        engine.position.x -= amount;
        self.moving = true;
        self.direction = DIRECTION_W;
        isStepLegal();
        return;
    }
    
    if ($.inArray('s', keys) > -1) {
        engine.offset.y -= amount;
        engine.position.y += amount;
        self.moving = true;
        self.direction = DIRECTION_S;
        isStepLegal();
        return;
    }
    
    if ($.inArray('d', keys) > -1) {
        engine.offset.x -= amount;
        engine.position.x += amount;
        self.moving = true;
        self.direction = DIRECTION_E;
        isStepLegal();
        return;
    }
    
    // If we've gotten this far, no movement keys are pressed... so if our movement flag is true, we know
    // the player has stopped moving
    if (self.moving) {
        self.moving = false;
        
        self.sprite.children[self.direction].gotoAndStop(0);
        
        //this.sprite.children[this.direction].visible = false;
        //this.sprite.children[this.direction].stop();
        
        //this.sprite.children[this.direction + 8].visible = true;
        //this.sprite.children[this.direction + 8].play();
    }
};