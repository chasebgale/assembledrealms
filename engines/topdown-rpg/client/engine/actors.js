var Actors = function () {
	
    this.players    = {};
    this.npcs       = {};
    this.layer      = new PIXI.Container();
	this.player_id	= -1;

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

Actors.prototype.create = function (actors, renderer) {
    // Create players from actors
	if (actors.players !== undefined) {
		var keys = Object.keys(actors.players);
		for (var i = 0; i < keys.length; i++) {
			
			if (actors.player !== undefined) {
				if (keys[i] == actors.player.id) {
					this.player_id = actors.player.id;
					continue;
				}
			}

            var player = new Player( actors.players[keys[i]] );
			
			this.players[player.id] = player;
			this.layer.addChild(player.sprite);
		}
	}
	
	// Create npcs from actors
	if (actors.npcs !== undefined) {
		var keys = Object.keys(actors.npcs);
		for (var i = 0; i < keys.length; i++) {

			var npc 	= new NPC( actors.npcs[keys[i]], renderer );
			
			this.npcs[npc.id] = npc;
			this.layer.addChild(npc.sprite);
		}
	}
};

Actors.prototype.update = function (actors) {
    // Server updates to npcs, pathfinding, life/stamina changes, etc
	// TODO: Check what properties were sent by the server for each npc/actor and only update those

	var keys = Object.keys(actors.players);
    for (var i = 0; i < keys.length; i++) {
		if (keys[i] == this.player_id) {
			continue;
		}		
		this.players[keys[i]].move(actors.players[keys[i]]);
	}
	
	var keys = Object.keys(actors.npcs);
    for (var i = 0; i < keys.length; i++) {
		this.npcs[keys[i]].move(actors.npcs[keys[i]]);
	}
	
};

Actors.prototype.text = function (actors) {
    if (actors.player) {
        this.players[actors.player.id].text(actors.player.blurb);
    }
};

Actors.prototype.tick = function () {
    
    //  tick() is the client side animation loop.
    // This function updates non-gameplay elements, e.g. text fading out, effects, etc 
    
    var keys = Object.keys(this.players);
    for (var i = 0; i < keys.length; i++) {
		if (keys[i] == this.player_id) {
			continue;
		}		
		this.players[keys[i]].tick();
	}
	
	var keys = Object.keys(this.npcs);
    for (var i = 0; i < keys.length; i++) {
		this.npcs[keys[i]].tick();
	}
};


var Player = function (data) {
	
	// Public properties
	this.sprite     		= new PIXI.Container();
	this.sprite.position 	= data.position;
	
	this.text               = new PIXI.extras.BitmapText('Hello, just testing!', { font: '16px UO Classic (rough)', align: 'center' });
    this.text.position.x    = -1 * Math.round(this.text.textWidth / 2);
    this.text.position.y    = -32;
    this.text.alpha         = 0;
	
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
		clip.position.x = -32;
		clip.position.y = -32;
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
		clip.position.x = -32;
		clip.position.y = -32;
		clip.animationSpeed = 0.2;
		clip.loop = false;
		clip.visible = false;

		self.sprite.addChild(clip);
	}
        
	self.sprite.children[self.direction].visible = true;
	self.sprite.children[self.direction].gotoAndStop(0);
	
	self.sprite.addChild(this.text);
	
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
	
	if ((self.sprite.position.x == player.position.x) &&
		(self.sprite.position.y == player.position.y)) {
		self.moving = false;
		self.sprite.children[self.direction].gotoAndStop(0);
	} else {
		self.moving = true;
		self.sprite.position = player.position;
		//self.sprite.position.x -= 32;
		//self.sprite.position.y -= 32;
	}
	
	
};

Player.prototype.text = function(data) {
    if (data.substring(0, 4) == '/me ') {
        data = '*' + data.substring(4) + '*';
        this.text.font.tint = 11184810;
    } else {
        this.text.font.tint = 16777215;
    }
    
    this.text.text          = data;
    this.text.position.x    = -1 * Math.round(this.text.textWidth / 2);
    this.text.alpha         = 1;
};

Player.prototype.tick = function(data) {
    if (this.text.alpha > 0) {
        this.text.alpha -= 0.002;
    }
};

var NPC = function (npc, renderer) {
	
	// Public properties
	this.sprite     		= new PIXI.Container();
	this.sprite.position 	= npc.position;
	
	this.text               = new PIXI.extras.BitmapText(EMOTES_NPC_CREATED[getRandomInt(0, EMOTES_NPC_CREATED.length-1)], { font: '16px UO Classic (rough)', align: 'left' });
    this.text.position.x    = -1 * Math.round(this.text.textWidth / 2);
    this.text.position.y    = -32;
    this.text.alpha         = 1;
	
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
	var modelTexture	= new PIXI.RenderTexture(renderer, 576, 256);
	
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
		clip.position.x = -32;
		clip.position.y = -32;
		clip.animationSpeed = 0.2;
		clip.visible = false;

		self.sprite.addChild(clip);
	}
        
	self.sprite.children[self.direction].visible = true;
	self.sprite.children[self.direction].gotoAndStop(0);
	
	self.sprite.addChild(this.text);
	
};

NPC.prototype.move = function(npc) {
	
	var self = this;
	
	if (!self.moving) {
		self.sprite.children[self.direction].play();
	}
	
	if (self.direction !== npc.direction) {
		self.sprite.children[self.direction].visible = false;
		self.sprite.children[self.direction].stop();

		self.sprite.children[npc.direction].visible = true;
		self.sprite.children[npc.direction].play();
	}
	
	self.direction = npc.direction;
	
	if ((self.sprite.position.x == npc.position.x) && 
		(self.sprite.position.y == npc.position.y)) {
		self.moving = false;
		self.sprite.children[self.direction].gotoAndStop(0);
	} else {
		self.moving = true;
		self.sprite.position = npc.position;
		//self.sprite.position.x -= 32;
		//self.sprite.position.y -= 32;
	}
	
	
};

NPC.prototype.text = function(data) {
    if (data.substring(0, 4) == '/me ') {
        data = '*' + data.substring(4) + '*';
        this.text.font.tint = 11184810;
    } else {
        this.text.font.tint = 16777215;
    }
    
    this.text.text          = data;
    this.text.position.x    = -1 * Math.round(this.text.textWidth / 2);
    this.text.alpha         = 1;
};

NPC.prototype.tick = function(data) {
    if (this.text.alpha > 0) {
        this.text.alpha -= 0.002;
    }
};
