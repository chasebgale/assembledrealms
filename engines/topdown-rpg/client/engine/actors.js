var Actors = function () {

    this.players    = {};
    this.npcs       = {};
	
	this.layer = new PIXI.Container();

};

Actors.prototype.load = function (engine, PIXI, callback_complete) {
    // Load base assets and textures for all possible NPCs as other player 
    // assets have already been loaded by the Avatar class
};

Actors.prototype.create = function (actors, avatar_id) {
    // Create players from actors
	var keys = Object.keys(actors);
    for (var i = 0; i < keys.length; i++) {
		
		if (keys[i] == avatar_id) {
			continue;
		}
		
		var actor 	= actors[keys[i]];
		var player 	= new Player(actor);
		
		this.players[player.id] = player;
		this.layer.addChild(player.sprite);
	}
};

Actors.prototype.add = function (actor) {
    // Create player from actor
	var player = new Player(actor);
	this.players[player.id] = player;
	this.layer.addChild(player.sprite);
};

Actors.prototype.move = function (player) {
    this.players[player.id].move(player);
};

var Player = function (data) {
	
	// Public properties
	this.sprite     		= new PIXI.Container();
	this.sprite.position 	= data.position;
	
	this.direction  = DIRECTION_S;
	this.health     = 100;
	this.stamina    = 100;
    this.experience = 0;
	this.moving     = false;
    this.attacking  = false;
	this.id			= data.id;
	
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
	}
	
	for (i = 0; i < directions; i++) {
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
        
	self.sprite.children[self.direction].visible = true;
	self.sprite.children[self.direction].gotoAndStop(0);
	
};

Player.prototype.move = function(player) {
	
	var self = this;
	
	if (!self.moving) {
		self.sprite.children[self.direction].play();
	}
	
	if (self.direction !== player.direction) {
		self.sprite.children[self.direction].visible = false;
		self.sprite.children[self.direction].stop();

		self.sprite.children[player.direction].visible = true;
		self.sprite.children[player.direction].play();
	}
	
	self.direction = player.direction;
	
	if ((self.sprite.position.x == (player.position.x - 32)) && 
		(self.sprite.position.y == (player.position.y - 32))) {
		self.moving = false;
		self.sprite.children[self.direction].gotoAndStop(0);
	} else {
		self.moving = true;
		self.sprite.position = player.position;
		self.sprite.position.x -= 32;
		self.sprite.position.y -= 32;
	}
	
	
};