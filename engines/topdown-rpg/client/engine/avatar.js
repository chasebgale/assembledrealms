define(function () {

	return {
	
    /*
		sprite: {},
		active: 0,
		offset: {x: 0, y: 0},
		position: {x: 0, y: 0},
		
		moving: false,
		engine: undefined,
    */
    
        direction:  0,
        sprite:     undefined,
    
		load: function (engine, PIXI, callback) {

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
            
            var loader = new PIXI.AssetLoader(["client/resource/actors_walkcycle_BODY_skeleton.png"], true);
            
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

                    clip.position.x = 0;
                    clip.position.y = 0;
                    clip.animationSpeed = .2;
                    clip.visible = false;

                    self.sprite.addChild(clip);
                }
				
			};
            
            loader.onComplete = function (event) {
                self.direction = DIRECTION_S;
                self.sprite.children[self.direction].visible = true;
                self.sprite.children[self.direction].play();
                
                callback();
            };
            
            loader.load();
			
		},

		move: function (offset) {
			this.x += offset.x;
			this.y += offset.y;
		},
		
		tick: function () {
			var self = this;
			var amount = 2;
			var amount_angle_sin = 2 * MOVEMENT_ANGLE_SIN;
			var amount_angle_cos = 2 * MOVEMENT_ANGLE_COS;
			var animationSpeed = .2;
			
			var oldDirection = self.direction;
			var wasMoving = self.moving;
			var oldOffset = _.clone(self.position, true);
			
			
			
			var keys = self.engine.keyboard.activeKeys();
			
			if (_.contains(keys, 'shift')) {
				amount *= 2;
				amount_angle_sin *= 2;
				amount_angle_cos *= 2;
				animationSpeed *= 2;
			}
			
			if (_.contains(keys, 'w')) {
				if (_.contains(keys, 'a')) {
					// North-West
					self.offset.x += amount_angle_cos;
					self.offset.y += amount_angle_sin;
					
					self.position.x -= amount_angle_cos;
					self.position.y -= amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_NW;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				} else if (_.contains(keys, 'd')) {
					// North-East
					self.offset.x -= amount_angle_cos;
					self.offset.y += amount_angle_sin;
					
					self.position.x += amount_angle_cos;
					self.position.y -= amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_NE;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				} else {
					// North
					self.offset.y += amount;
					self.position.y -= amount;
					
					self.moving = true;
					self.direction = DIRECTION_N;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				}
			}
			
			if (_.contains(keys, 's')) {
				if (_.contains(keys, 'a')) {
					// South-West
					self.offset.x += amount_angle_cos;
					self.offset.y -= amount_angle_sin;
					
					self.position.x -= amount_angle_cos;
					self.position.y += amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_SW;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				} else if (_.contains(keys, 'd')) {
					// South-East
					self.offset.x -= amount_angle_cos;
					self.offset.y -= amount_angle_sin;
					
					self.position.x += amount_angle_cos;
					self.position.y += amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_SE;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				} else {
					// South
					self.offset.y -= amount;
					self.position.y += amount;
					
					self.moving = true;
					self.direction = DIRECTION_S;
					self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
					return;
				}
			}
			
			if (_.contains(keys, 'd')) {
				self.offset.x -= amount;
				self.position.x += amount;
				self.moving = true;
				self.direction = DIRECTION_E;
				self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
				return;
			}
			
			if (_.contains(keys, 'a')) {
				self.offset.x += amount;
				self.position.x -= amount;
				self.moving = true;
				self.direction = DIRECTION_W;
				self.checkDirection(wasMoving, oldDirection, oldOffset, animationSpeed);
				return;
			}
			
			// If we've gotten this far, no movement keys are pressed... so if our movement flag is true, we know
			// the player has stopped moving
			if (self.moving) {
				self.moving = false;
				this.sprite.children[this.direction].visible = false;
				this.sprite.children[this.direction].stop();
				
				this.sprite.children[this.direction + 8].visible = true;
				this.sprite.children[this.direction + 8].play();
			}
		},

		checkDirection: function(wasMoving, oldDirection, oldOffset, animationSpeed) {
		
			// Ensure valid destination tile
			
			/*
			var map = this.engine.indexFromScreen(this.sprite.position);
			
			if (this.engine.terrain[map.row] === undefined) {
				this.offset = oldOffset;
			} else {
				if (this.engine.terrain[map.row][map.col] === undefined) {
					this.offset = oldOffset;
				}
			}
			*/
			
			if (!this.engine.isWalkable(this.position)) {
				this.position = oldOffset;
			}
		
			// Update sprites
			var flag = false;
			
			if (!wasMoving && this.moving) {
				this.sprite.children[oldDirection + 8].visible = false;
				this.sprite.children[oldDirection + 8].stop();
				flag = true;
			}
		
			if ((oldDirection !== this.direction) || (flag)) {
		
				this.sprite.children[oldDirection].visible = false;
				this.sprite.children[oldDirection].stop();

				this.sprite.children[this.direction].visible = true;
				this.sprite.children[this.direction].play();
			
			}
			
			this.sprite.children[this.direction].animationSpeed = animationSpeed;
		},
		
		onEffectFinished: function () {
			this.sprite.children[16].visible = false;
			this.sprite.children[16].gotoAndStop(0);
		}
	}
});