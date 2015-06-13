var Actors = function () {

    this.players    = {};
    this.npcs       = {};
	
	this.layer = new PIXI.Container();

};

Actors.prototype.load = function (engine, PIXI, callback_complete) {
    // Load base assets and textures for all possible NPCs as other player 
    // assets have already been loaded by the Avatar class
};

Actors.prototype.create = function (actors) {
    // Update or create actors
	var keys = Object.keys(actors);
    for (var i = 0; i < keys.length; i++) {
		var actor 	= actors[keys[i]];
		var player 	= new Player(actor);
		
		this.players[player.id] = player;
	}
};

Actors.prototype.add = function (actor) {
    // Update or create actors
	var player 	= new Player(actor);
	this.players[player.id] = player;
};

Actors.prototype.move = function (player) {
    this.players[player.id].position = player.position;
};

var Player = function (data) {
	
	// Public properties
	this.sprite     = new PIXI.Container();
	this.direction  = 0;
	this.health     = 100;
	this.stamina    = 100;
    this.experience = 0;
	this.moving     = false;
    this.attacking  = false;
	this.id			= data.id;
	this.position	= data.position;
	
	// Constructor variables
	var prefix 		= "skeleton";
	var self		= this;
	var directions 	= 4;
	var textures	= [];
	var clip;
	var i;
	var j;
	
	// Create animations from texture cache textures
	for (i = 0; i < directions; i++) {
		
		// Walking animation
		textures = [];
		
		for (j = 0; j < 9; j++) {
			textures[j] = PIXI.utils.TextureCache[prefix + "_walk_" + i + "_" + j + ".png"];
		}
		
		clip = new PIXI.extras.MovieClip(textures);
		clip.animationSpeed = 0.2;
		clip.visible = false;

		self.sprite.addChild(clip);
		
		// Slashing animation
		textures = [];
		
		for (j = 0; j < 6; j++) {
			textures[j] = PIXI.utils.TextureCache[prefix + "_slash_" + i + "_" + j + ".png"];
		}
		
		clip = new PIXI.extras.MovieClip(textures);
		clip.animationSpeed = 0.2;
		clip.loop = false;
		clip.visible = false;

		self.sprite.addChild(clip);
	}
	
};

Player.prototype.