var Avatar = function () {

    this.direction  = 0;
    this.sprite     = undefined;
    this.moving     = false;
    this.attacking  = false;

};
    
Avatar.prototype.load = function (engine, PIXI, callback_complete) {

    var clip;
    var directions = 4;
    var i = 0;
    var prefix = "avatar";
    var self = this;
    
    self.sprite = new PIXI.Container();
    
    // Load our avatar sprites in order, still using async xfer, utilizing Caolan McMahon's async library:
    // https://github.com/caolan/async
    async.series([
        function(callback){
            // First we load the base walking spritesheet
            var spritesheet = PIXI.BaseTexture.fromImage(ROOT + "client/resource/actors_walkcycle_BODY_skeleton.png");
            spritesheet.on('loaded', function() {
                var index   = 0;
                var row     = 0;
                var col     = 0;
                
                var textures = [];
                var frameTexture;
                
                var cols = Math.floor(spritesheet.width / 64);
                
                for (row = 0; row < directions; row++) {
                    textures[row] = [];
                    for (col = 0; col < cols; col++) {
                        frameTexture = new PIXI.Texture(spritesheet, {
                            x: col * 64,
                            y: row * 64,
                            width: 64,
                            height: 64
                        });
                        
                        textures[row][col] = frameTexture;
                        
                        PIXI.Texture.addTextureToCache(frameTexture, prefix + "_walk_" + row + "_" + col + ".png");
                        index++;
                    }
                }
                
                // Add/create animated clips:
                for (i = 0; i < directions; i++) {
                    clip = new PIXI.extras.MovieClip(textures[i]);

                    clip.position.x = (CANVAS_WIDTH / 2) - 32;
                    clip.position.y = (CANVAS_HEIGHT / 2) - 32;
                    clip.animationSpeed = .2;
                    clip.visible = false;

                    self.sprite.addChild(clip);
                }
                
                callback(null);
            });
        },
        function(callback){
            // Next we load the attack spritesheet
            var spritesheet = PIXI.BaseTexture.fromImage(ROOT + "client/resource/actors_slash_BODY_skeleton.png");
            spritesheet.on('loaded', function() {
            
                var index   = 0;
                var row     = 0;
                var col     = 0;
                
                var textures = [];
                var frameTexture;
                
                var cols = Math.floor(spritesheet.width / 64);
                
                for (row = 0; row < directions; row++) {
                    textures[row] = [];
                    for (col = 0; col < cols; col++) {
                        frameTexture = new PIXI.Texture(spritesheet, {
                            x: col * 64,
                            y: row * 64,
                            width: 64,
                            height: 64
                        });
                        
                        textures[row][col] = frameTexture;
                        
                        PIXI.Texture.addTextureToCache(frameTexture, prefix + "_slash_" + row + "_" + col + ".png");
                        index++;
                    }
                }
                
                // Add/create animated clips:
                for (i = 0; i < directions; i++) {
                    clip = new PIXI.extras.MovieClip(textures[i]);

                    clip.position.x = (CANVAS_WIDTH / 2) - 32;
                    clip.position.y = (CANVAS_HEIGHT / 2) - 32;
                    clip.animationSpeed = .2;
                    clip.loop = false;
                    clip.visible = false;

                    self.sprite.addChild(clip);
                }
                
                callback(null);
            });
        }
    ],
    // optional callback
    function(err, results){
        if (err) {
            console.log('error loading assets');
            return;
        }
        
        self.direction = DIRECTION_S;
        
		self.sprite.children[self.direction].visible = true;
		self.sprite.children[self.direction].gotoAndStop(0);
        
        callback_complete();
        
    });
    
};
		
Avatar.prototype.tick = function (engine, PIXI) {
    var self = this;
    
    if (self.attacking) {
        return;
    }
    
    var amount 				= 2;
    var amount_angle_sin 	= 2 * MOVEMENT_ANGLE_SIN;
    var amount_angle_cos 	= 2 * MOVEMENT_ANGLE_COS;
    var animationSpeed 		= .2;
    
    var wasMoving 		= self.moving;
    var oldDirection 	= self.direction;
    var oldPosition 	= $.extend(true, {}, engine.position);
    
    var keys 			= KeyboardJS.activeKeys();
    
    console.log(keys);
    
    var isStepLegal = function () {
        
        var col = Math.floor(engine.position.x / TILE_WIDTH);
        var row = Math.ceil(engine.position.y / TILE_HEIGHT);
        
        if (engine.map.terrain.index[row] !== undefined) {
            
            if (engine.map.terrain.index[row][col] !== undefined) {
                if ((engine.map.terrain.index[row][col][2] !== undefined) &&
					(engine.map.terrain.index[row][col][2] !== null)) {
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
    
    if ($.inArray('space', keys) > -1) {
        self.sprite.children[self.direction].stop();
        self.sprite.children[self.direction].visible = false;
        
        self.sprite.children[self.direction + 4].onComplete = function () {
            self.attacking = false;
            self.sprite.children[self.direction + 4].visible = false;
            self.sprite.children[self.direction + 4].gotoAndStop(0);
            self.sprite.children[self.direction].visible = true;
            
            if (self.moving) {
            
                self.sprite.children[self.direction].play();
                
            }
            
            //self.tick(engine, PIXI);
        };
        
        self.sprite.children[self.direction + 4].visible = true;
        self.sprite.children[self.direction + 4].gotoAndPlay(0);
        
        self.attacking = true;
        return;
    }
    
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