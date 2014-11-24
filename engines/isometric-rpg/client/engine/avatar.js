define(function () {

	return {
	
		sprite: {},
		active: 0,
		offset: {x: 0, y: 0},
		position: {x: 0, y: 0},
		direction: 0,
		moving: false,
		engine: undefined,

		initialize: function (engine, PIXI) {

			// create an array to store the textures
			var zombieTextures = [];
			var zombieMovieClip;
			var texture;
			var texture_name;
			var directions = 8;
			var i = 0;
			var prefix = "zombie_row";
			var self = this;
			
			self.engine = engine;

			zombie = [];

			for (rows = 0; rows < 8; rows++) {
				zombieTextures[rows] = [];
				for (cols = 0; cols < 36; cols++) {
					texture_name = prefix + rows + "_" + "col" + cols + ".png";
					texture = PIXI.Texture.fromFrame(texture_name);
					zombieTextures[rows][cols] = texture;
				}
			}

			self.sprite = new PIXI.DisplayObjectContainer();

			// Walking clips:
			for (i = 0; i < directions; i++) {
				zombieMovieClip = new PIXI.MovieClip(zombieTextures[i].splice(4, 8));

				zombieMovieClip.position.x = 0;
				zombieMovieClip.position.y = 0;
				zombieMovieClip.animationSpeed = .1;
				zombieMovieClip.visible = false;

				self.sprite.addChild(zombieMovieClip);
			}

			// Standing clips:
			var workerClipArray = [];

			for (i = 0; i < directions; i++) {

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

				self.sprite.addChild(zombieMovieClip);
			}

			// Effects clips:
			workerClipArray = [];

			for (i = 0; i < 4; i++) {

				texture_name = "blood0_frame" + i + ".png";
				workerClipArray.push(PIXI.Texture.fromFrame(texture_name));

			}
			zombieMovieClip = new PIXI.MovieClip(workerClipArray);

			zombieMovieClip.position.x = 32;
			zombieMovieClip.position.y = 32;
			zombieMovieClip.animationSpeed = .25;
			zombieMovieClip.visible = false;
			zombieMovieClip.loop = false;
			zombieMovieClip.onComplete = self.onEffectFinished;

			self.sprite.addChild(zombieMovieClip);
			
			// TODO: Load position from last logout postion
			self.direction = DIRECTION_S;
			self.sprite.children[self.direction + 8].visible = true;
			self.sprite.children[self.direction + 8].play();
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
			
			var oldDirection = self.direction;
			var wasMoving = self.moving;
			var oldOffset = _.clone(self.offset, true);
			
			var keys = self.engine.keyboard.activeKeys();
			
			if (_.contains(keys, 'shift')) {
				amount *= 2;
				amount_angle_sin *= 2;
				amount_angle_cos *= 2;
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
					self.checkDirection(wasMoving, oldDirection, oldOffset);
					return;
				} else if (_.contains(keys, 'd')) {
					// North-East
					self.offset.x -= amount_angle_cos;
					self.offset.y += amount_angle_sin;
					
					self.position.x += amount_angle_cos;
					self.position.y -= amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_NE;
					self.checkDirection(wasMoving, oldDirection, oldOffset);
					return;
				} else {
					// North
					self.offset.y += amount;
					self.position.y -= amount;
					
					self.moving = true;
					self.direction = DIRECTION_N;
					self.checkDirection(wasMoving, oldDirection, oldOffset);
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
					self.checkDirection(wasMoving, oldDirection, oldOffset);
					return;
				} else if (_.contains(keys, 'd')) {
					// South-East
					self.offset.x -= amount_angle_cos;
					self.offset.y -= amount_angle_sin;
					
					self.position.x += amount_angle_cos;
					self.position.y += amount_angle_sin;
					
					self.moving = true;
					self.direction = DIRECTION_SE;
					self.checkDirection(wasMoving, oldDirection, oldOffset);
					return;
				} else {
					// South
					self.offset.y -= amount;
					self.position.y += amount;
					
					self.moving = true;
					self.direction = DIRECTION_S;
					self.checkDirection(wasMoving, oldDirection, oldOffset);
					return;
				}
			}
			
			if (_.contains(keys, 'd')) {
				self.offset.x -= amount;
				self.position.x += amount;
				self.moving = true;
				self.direction = DIRECTION_E;
				self.checkDirection(wasMoving, oldDirection, oldOffset);
				return;
			}
			
			if (_.contains(keys, 'a')) {
				self.offset.x += amount;
				self.position.x -= amount;
				self.moving = true;
				self.direction = DIRECTION_W;
				self.checkDirection(wasMoving, oldDirection, oldOffset);
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

		checkDirection: function(wasMoving, oldDirection, oldOffset) {
		
			// Ensure valid destination tile
			
			
			var map = this.engine.indexFromScreen(this.sprite.position);
			
			if (this.engine.terrain[map.row] === undefined) {
				this.offset = oldOffset;
			} else {
				if (this.engine.terrain[map.row][map.col] === undefined) {
					this.offset = oldOffset;
				}
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
		},
		
		onEffectFinished: function () {
			this.sprite.children[16].visible = false;
			this.sprite.children[16].gotoAndStop(0);
		}
	}
});