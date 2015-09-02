var Avatar = function (engine) {

    this.direction  = 0;
    this.sprite     = new PIXI.Container();
    this.moving     = false;
    this.attacking  = false;
    this.typing     = false;
    this.blurb      = "";
    this.health     = 100;
    this.stamina    = 100;
    this.experience = 0;
	this.id			= "";
	this.engine     = engine;
    this.text       = undefined;
};

Avatar.prototype.update = function (avatar) {
    // Update avatar stats (from realm)
    this.health     = avatar.health;
    this.stamina    = avatar.stamina;
    this.experience = avatar.experience;
	this.id			= avatar.id;
	
	this.text               = new PIXI.extras.BitmapText('Hello, just testing!', { font: '16px UO Classic (rough)', align: 'center' });
    this.text.position.x    = 0; //-1 * Math.round(this.text.textWidth / 2);
    this.text.position.y    = -32;
    this.text.alpha         = 0;
    
    this.sprite.addChild(this.text);
};
    
Avatar.prototype.load = function (callback_complete) {

    var clip;
    var directions = 4;
    var i = 0;
    var prefix = "skeleton";
    var self = this;
    
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

                    clip.position.x = -32; //(CANVAS_WIDTH / 2) - 32;
                    clip.position.y = -32; //(CANVAS_HEIGHT / 2) - 32;
                    clip.animationSpeed = 0.2;
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

                    clip.position.x = -32; //(CANVAS_WIDTH / 2) - 32;
                    clip.position.y = -32; //(CANVAS_HEIGHT / 2) - 32;
                    clip.animationSpeed = 0.2;
                    clip.loop = false;
                    clip.visible = false;

                    self.sprite.addChild(clip);
                }
                
                callback(null);
            });
        }
    ],
    function(err, results){
        if (err) {
            console.log('error loading assets');
            return;
        }
        
        self.direction = DIRECTION_S;
        
		self.sprite.children[self.direction].visible = true;
		self.sprite.children[self.direction].gotoAndStop(0);
		
		KeyboardJS.on('enter', function() {

            if (self.typing) {
                // Send our text string, then clear it
                self.engine.socket.emit('text', self.blurb);
                
                self.text.text          = self.blurb;
                //self.text.position.x    = -1 * Math.round((self.blurb.length / 2) * 16);
                self.text.alpha         = 1;
                self.blurb              = ""; 
                
                self.engine.text_input.text = self.blurb;
                
                document.removeEventListener("keydown", self.keydown, false);
            } else {
                // Stop our avatar and show the carrot blinking for input
                if (self.moving) {
                    self.moving = false;
                    self.sprite.children[self.direction].gotoAndStop(0);

                    // Sending one more 'move' with duplicate coords as the last update will tell all clients this
                    // actor has stopped moving
                    self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
                }
                
                document.addEventListener("keydown", self.keydown, false);
            }

            self.typing = !self.typing;
        });
        
        
        
        callback_complete();
        
    });
    
};

Avatar.prototype.keydown = function (e) {
    
    var letter = '';
    
    // Backspace
    if (e.keyCode == 8) {
        engine.avatar.blurb = engine.avatar.blurb.substring(0, engine.avatar.blurb.length - 1);
    } else if (e.keyCode == 32) {
        engine.avatar.blurb += ' ';
    } else if ((e.keyCode > 64) && (e.keyCode < 91)) {
        // Letter     
        letter = String.fromCharCode(e.keyCode);
        if (!e.shiftKey) {
            letter = letter.toLowerCase();
        }
        engine.avatar.blurb += letter;
    } else if ((e.keyCode > 47) && (e.keyCode < 58)) {
        // Numbers
        letter = String.fromCharCode(e.keyCode);
        if (e.shiftKey) {
            switch (letter) {
                case '1':
                    letter = '!';
                    break;
                case '2':
                    letter = '@';
                    break;
                case '3':
                    letter = '#';
                    break;
                case '4':
                    letter = '$';
                    break;
                case '5':
                    letter = '%';
                    break;
                case '6':
                    letter = '^';
                    break;
                case '7':
                    letter = '&';
                    break;
                case '8':
                    letter = '*';
                    break;
                case '9':
                    letter = '(';
                    break;
                case '0':
                    letter = ')';
                    break;
                default:
                    letter = '';
                    break;
            }
        }
        engine.avatar.blurb += letter;
    } else if ((e.keyCode > 185) && (e.keyCode < 193)) {
        switch (e.keyCode) {
            case 186:
                letter = e.shiftKey ? ':' : ';';
                break;
            case 187:
                letter = e.shiftKey ? '+' : '=';
                break;
            case 188:
                letter = e.shiftKey ? '<' : ',';
                break;
            case 189:
                letter = e.shiftKey ? '_' : '-';
                break;
            case 190:
                letter = e.shiftKey ? '>' : '.';
                break;
            case 191:
                letter = e.shiftKey ? '?' : '/';
                break;
            case 192:
                letter = e.shiftKey ? '~' : '`';
                break;
        }
        engine.avatar.blurb += letter;
    } else if ((e.keyCode > 218) && (e.keyCode < 223)) {
        switch (e.keyCode) {
            case 219:
                letter = e.shiftKey ? '{' : '[';
                break;
            case 220:
                letter = e.shiftKey ? '|' : '\\';
                break;
            case 221:
                letter = e.shiftKey ? '}' : ']';
                break;
            case 222:
                letter = e.shiftKey ? '"' : '\'';
                break;
        }
        engine.avatar.blurb += letter;
    }
    
    engine.text_input.text = engine.avatar.blurb;
};

		
Avatar.prototype.tick = function () {
    var self = this;
    
    if (self.attacking || self.typing) {
        return;
    }
    
    if (this.text.alpha > 0) {
        this.text.alpha -= 0.003;
    }
    
    var amount 				= 2;
    var animationSpeed 		= 0.2;
    
    var wasMoving 		= self.moving;
    var oldDirection 	= self.direction;
    var oldPosition 	= $.extend(true, {}, self.engine.position);
    
    var keys 			= KeyboardJS.activeKeys();
    
    var isStepLegal = function () {
        
        var col = Math.floor(self.engine.position.x / TILE_WIDTH);
        var row = Math.ceil(self.engine.position.y / TILE_HEIGHT);
        
        if (self.engine.map.terrain.index[row] !== undefined) {
            
            if (self.engine.map.terrain.index[row][col] !== undefined) {
                if ((self.engine.map.terrain.index[row][col][2] !== undefined) &&
					(self.engine.map.terrain.index[row][col][2] !== null)) {
                    self.engine.position = oldPosition;
                }
            } else {
                self.engine.position = oldPosition;
            }
        } else {
            self.engine.position = oldPosition;
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
        
        self.sprite.position = self.engine.position; 
		
		self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
        
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
        };
        
        self.sprite.children[self.direction + 4].visible = true;
        self.sprite.children[self.direction + 4].gotoAndPlay(0);
        
        self.attacking = true;
        return;
    }
    
    if ($.inArray('shift', keys) > -1) {
        amount *= 2;
        animationSpeed *= 2;
    }
    
    if ($.inArray('w', keys) > -1) {
		
		if ($.inArray('a', keys) > -1) {
			amount *= MOVEMENT_ANGLE;
			self.engine.position.x -= amount;
			self.direction = DIRECTION_W;
		} else if ($.inArray('d', keys) > -1) {
			amount *= MOVEMENT_ANGLE;
			self.engine.position.x += amount;
			self.direction = DIRECTION_E;
		} else {
			self.direction = DIRECTION_N;
		}
		
        self.engine.position.y -= amount;
        self.moving = true;
        isStepLegal();
        return;
    }
	
	if ($.inArray('s', keys) > -1) {
		
		if ($.inArray('a', keys) > -1) {
			amount *= MOVEMENT_ANGLE;
			self.engine.position.x -= amount;
			self.direction = DIRECTION_W;
		} else if ($.inArray('d', keys) > -1) {
			amount *= MOVEMENT_ANGLE;
			self.engine.position.x += amount;
			self.direction = DIRECTION_E;
		} else {
			self.direction = DIRECTION_S;
		}
		
        self.engine.position.y += amount;
        self.moving = true;
        isStepLegal();
        return;
    }
    
    if ($.inArray('a', keys) > -1) {
        self.engine.position.x -= amount;
        self.moving = true;
        self.direction = DIRECTION_W;
        isStepLegal();
        return;
    }
    
    if ($.inArray('d', keys) > -1) {
        self.engine.position.x += amount;
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
		
		// Sending one more 'move' with duplicate coords as the last update will tell all clients this
		// actor has stopped moving
		self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
        
        //this.sprite.children[this.direction].visible = false;
        //this.sprite.children[this.direction].stop();
        
        //this.sprite.children[this.direction + 8].visible = true;
        //this.sprite.children[this.direction + 8].play();
    }
};