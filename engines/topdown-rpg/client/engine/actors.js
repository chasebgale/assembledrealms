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
		
		if (keys[i] == actors.player.id) {
			continue;
		}

		var player 	= new Player( actors.players[keys[i]] );
		
		this.players[player.id] = player;
		this.layer.addChild(player.sprite);
	}
	
	// Create npcs from actors
	var keys = Object.keys(actors.npcs);
    for (var i = 0; i < keys.length; i++) {

		var npc 	= new NPC( this.engine, actors.npcs[keys[i]] );
		
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
			var npc = new NPC( this.engine, npcs[keys[i]] );			
			this.npcs[npc.id] = npc;
			this.layer.addChild(npc.sprite);
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

var NPC = function (engine, npc) {
	
	// Public properties
	this.sprite     		= new PIXI.Container();
	this.sprite.position 	= npc.position;
	
	this.direction  = DIRECTION_S;
	this.health     = 100;
	this.stamina    = 100;
	this.moving     = false;
    this.attacking  = false;
	this.id			= npc.id;
	
	// Server response will create npcs with: npc.layers = [0, 4, 7, 8, 9];
	this.npc_assets = [
		ROOT + "client/resource/actors_walkcycle_BODY_male.png",		// 0
        ROOT + "client/resource/HEAD_chain_armor_helmet.png",			// 1
        ROOT + "client/resource/HEAD_chain_armor_hood.png",				// 2
        ROOT + "client/resource/HEAD_plate_armor_helmet.png",			// 3
        ROOT + "client/resource/TORSO_chain_armor_torso.png",			// 4
        ROOT + "client/resource/TORSO_plate_armor_arms_shoulders.png",	// 5
        ROOT + "client/resource/TORSO_plate_armor_torso.png",			// 6
        ROOT + "client/resource/LEGS_plate_armor_pants.png",			// 7
        ROOT + "client/resource/HANDS_plate_armor_gloves.png",			// 8
        ROOT + "client/resource/FEET_plate_armor_shoes.png"				// 9
	];
	
	// Constructor variables
	var self		= this;
	var directions 	= 4;
	var textures	= [];
	var clip;
	var i;
	var j;
	
	var model 			= new PIXI.Container();
	var modelSprite		= undefined;
	var modelTextures	= [];
	var modelTexture	= new PIXI.RenderTexture(engine.renderer, 576, 256);
	
	// RenderTexture the layers:
	for (i = 0; i < npc.layers.length; i++) {
		model.addChild( 
			new PIXI.Sprite( 
				PIXI.utils.TextureCache[self.npc_assets[npc.layers[i]]]
			)
		);
	}
	
	modelTexture.render(model);
	
	// Create animations from the render texture
	for (i = 0; i < directions; i++) {
		
		// Walking animation
		textures = [];
		
		for (j = 0; j < 9; j++) {
			textures[j] = new PIXI.Texture(modelTexture.baseTexture, {
                            x: j * 64,
                            y: i * 64,
                            width: 64,
                            height: 64
			});
		}
		
		clip = new PIXI.extras.MovieClip(textures);
		clip.animationSpeed = 0.2;
		clip.visible = false;

		self.sprite.addChild(clip);
	}
        
	self.sprite.children[self.direction].visible = true;
	self.sprite.children[self.direction].gotoAndStop(0);
	
};