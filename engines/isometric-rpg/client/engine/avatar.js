define(function () {

	return {
	
		sprite: {},

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
			
			// TODO: Load visible direction from characters last position, last logout.
			zombieMovieClip.visible = true;

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
		},

		move: function (offset) {
			this.x += offset.x;
			this.y += offset.y;
		},

		onEffectFinished: function () {
			this.sprite.children[16].visible = false;
			this.sprite.children[16].gotoAndStop(0);
		}
	}
});