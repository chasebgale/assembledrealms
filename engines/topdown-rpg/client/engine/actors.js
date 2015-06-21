var Actors = function (engine) {

    this.players    = {};
    this.npcs       = {};
	
	this.layer 	= new PIXI.Container();
	this.engine	= engine;
};

Actors.prototype.load = function (callback_complete) {
    
    var load_count = 0;
    
    // Load base assets and textures for all possible NPCs as other player 
    // assets have already been loaded by the Avatar class
    PIXI.loader
		.add(ROOT + "client/resource/actors_walkcycle_BODY_male.png")
        .add(ROOT + "client/resource/HEAD_chain_armor_helmet.png")
        .add(ROOT + "client/resource/HEAD_chain_armor_hood.png")
        .add(ROOT + "client/resource/HEAD_plate_armor_helmet.png")
        .add(ROOT + "client/resource/TORSO_chain_armor_torso.png")
        .add(ROOT + "client/resource/TORSO_plate_armor_arms_shoulders.png")
        .add(ROOT + "client/resource/TORSO_plate_armor_torso.png")
        .add(ROOT + "client/resource/LEGS_plate_armor_pants.png")
        .add(ROOT + "client/resource/HANDS_plate_armor_gloves.png")
        .add(ROOT + "client/resource/FEET_plate_armor_shoes.png")
	
    // TODO: The way this works right now, the actual integer indices located in the map file
    // for tile locations assume the same load order of images. Make sure they are the same by adding an
    // id or something in the json definition for the source array items
		.on('progress', function (e) {
        
			load_count++;
            
            if (load_count > 9) {
                // It's never called normally 
                // TODO: Figure out why 'complete' is never firing!!!
                callback_complete();
            }
		})
		.on('error', function (e) {
			console.log(e);
		})
		.once('complete', callback_complete)
		.load();
};

Actors.prototype.create = function (actors) {
    // Create players from actors
	var keys = Object.keys(actors.players);
    for (var i = 0; i < keys.length; i++) {
		
		if (keys[i] == avatar_id) {
			continue;
		}

		var player 	= new Player( actors.players[keys[i]] );
		
		this.players[player.id] = player;
		this.layer.addChild(player.sprite);
	}
	
	// TODO: Create npcs from actors: (STUBBED FOR NOW)
	var keys = Object.keys(actors.npcs);
    for (var i = 0; i < keys.length; i++) {
		
		if (keys[i] == avatar_id) {
			continue;
		}

		var npc 	= new NPC( actors.npcs[keys[i]] );
		
		this.npcs[npc.id] = npc;
		this.layer.addChild(npc.sprite);
	}
};

Actors.prototype.add = function (actor) {
    // Create player from actor
	var player = new Player(actor);
	this.players[player.id] = player;
	this.layer.addChild(player.sprite);
};

Actors.prototype.update = function (npcs) {
    // Server updates to npcs, mainly pathfinding
	var keys = Object.keys(npcs);
    for (var i = 0; i < keys.length; i++) {
		// TODO: Call player.move below, like actors, so we get the correct walking animations
		if (this.npcs[keys[i]] === undefined) {
			this.npcs[keys[i]] = npcs[keys[i]];
		} else {
			this.npcs[keys[i]].position = npcs[keys[i]].position;
		}
	}
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

var NPC = function (data) {
	
	// Public properties
	this.sprite     		= new PIXI.Container();
	this.sprite.position 	= data.position;
	
	this.direction  = DIRECTION_S;
	this.health     = 100;
	this.stamina    = 100;
	this.moving     = false;
    this.attacking  = false;
	this.id			= data.id;
	
	// Constructor variables
	var prefix 		= "human";
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