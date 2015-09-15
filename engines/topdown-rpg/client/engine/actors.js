var Actors = function (engine) {
	
    this.players    = {};
    this.npcs       = {};
    this.layer      = new PIXI.Container();
	this.player_id	= -1;
	this.engine     = engine;

};

Actors.prototype.load = function (callback_complete) {
	callback_complete();
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
		    this.engine.avatar.update(actors.players[keys[i]]);
			continue;
		}		
		this.players[keys[i]].move(actors.players[keys[i]]);
	}
	
	var keys = Object.keys(actors.npcs);
    for (var i = 0; i < keys.length; i++) {
		this.npcs[keys[i]].update(actors.npcs[keys[i]]);
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
	
	this.health_bar = new PIXI.Graphics();
    this.health_bar.position.x = -16;
    this.health_bar.position.y = 36;
    // set a fill and line style
    this.health_bar.beginFill(0x00FF00);
    this.health_bar.lineStyle(2, 0x000000, 1);
    this.health_bar.drawRect(0, 0, 32, 5);
	
	// Server response will create npcs with: npc.layers = [0, 4, 7, 8, 9];
	this.npc_assets = [
		"BELT_leather.png",		                // 0
		"BELT_rope.png",		                // 1
		"FEET_plate_armor_shoes.png",           // 2
		"FEET_shoes_brown.png",                 // 3
		"HANDS_plate_armor_gloves.png",			// 4
        "HEAD_chain_armor_helmet.png",			// 5
        "HEAD_chain_armor_hood.png",			// 6
        "HEAD_hair_blonde.png",			        // 7
        "HEAD_leather_armor_hat.png",			// 8
        "HEAD_plate_armor_helmet.png",			// 9
        "HEAD_robe_hood.png",                   // 10
        "LEGS_pants_greenish.png",			    // 11
        "LEGS_plate_armor_pants.png",			// 12
        "TORSO_chain_armor_jacket_purple.png",	// 13
        "TORSO_chain_armor_torso.png",			// 14
        "TORSO_leather_armor_shirt_white.png",	// 15
        "TORSO_leather_armor_torso.png",		// 16
        "TORSO_plate_armor_torso.png",	        // 17
        "TORSO_robe_shirt_brown.png",			// 18
        "TORSO_leather_armor_bracers.png",		// 19
        "TORSO_leather_armor_shoulders.png",    // 20
        "TORSO_plate_armor_arms_shoulders.png"	// 21
	];
	
	// Constructor variables
	var self		= this;
	var directions 	= 4;
	var textures	= [];
	var clip;
	var i;
	var j;
	
	var process_layer = function (action) {
	    var base            = ROOT + "client/resource/actors/" + action + "/";
        var spritesheet     = PIXI.utils.TextureCache[base + "BODY_human.png"].baseTexture;
        var model 			= new PIXI.Container();
    	var modelTexture	= new PIXI.RenderTexture(renderer, spritesheet.width, spritesheet.height);
    	var cols            = Math.floor(spritesheet.width / 64);
        var rows            = Math.floor(spritesheet.height / 64);
        
    	model.addChild( 
    		new PIXI.Sprite( 
    			PIXI.utils.TextureCache[base + "BODY_human.png"]
    		)
    	);
    	
    	// RenderTexture the layers:
    	for (i = 0; i < npc.layers.length; i++) {
    		model.addChild( 
    			new PIXI.Sprite( 
    				PIXI.utils.TextureCache[base + self.npc_assets[npc.layers[i]]]
    			)
    		);
    	}
    	
    	if (action == "slash") {
    	    // The only difference is we need our weapon:
    	    model.addChild( 
    			new PIXI.Sprite( 
    				PIXI.utils.TextureCache[base + "WEAPON_dagger.png"]
    			)
    		);
    	}
    	
    	modelTexture.render(model);
    	
    	// Create animations from the render texture
    	for (i = 0; i < rows; i++) {
    		
    		// Walking animation
    		textures = [];
    		
    		for (j = 0; j < cols; j++) {
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
	};
	
	process_layer("walkcycle");
	process_layer("slash");
	process_layer("hurt");
	
	///////////////////////////////////
	self.sprite.children[self.direction].visible = true;
	self.sprite.children[self.direction].gotoAndStop(0);
	
	self.sprite.addChild(self.text);
	self.sprite.addChild(self.health_bar);
	
};

NPC.prototype.update = function(npc) {
	
	var self = this;
	
	if (npc.position) {
	    
	    if (self.sprite.children[self.direction + 4].visible) {
    	    self.sprite.children[self.direction + 4].visible = false;
            self.sprite.children[self.direction + 4].gotoAndStop(0);
            self.sprite.children[self.direction].visible = true;
    	}
	    
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
	}
	
	if (npc.health !== undefined) {
	    self.health = npc.health;
	    
	    if (self.health < 1) {
	        // self.sprite.alpha = 0;
	        self.sprite.children[self.direction].visible = false;
	        self.sprite.children[self.direction + 4].visible = false;
	        self.sprite.children[8].loop = false;
            self.sprite.children[8].visible = true;
            self.sprite.children[8].play();
            self.health_bar.clear();
	    } else {
    	    self.health_bar.clear();
            self.health_bar.lineStyle(2, 0x000000, 1);
            self.health_bar.drawRect(0, 0, 32, 5);
            self.health_bar.beginFill(0x00FF00);
            self.health_bar.lineStyle(0);
            self.health_bar.drawRect(1, 1, Math.floor(32 * (self.health / 100)) - 1, 4);
	    }
	}
	
	if (npc.attack === true) {
	    self.sprite.children[self.direction].visible = false;
    	self.sprite.children[self.direction].stop();
    /*
        self.sprite.children[self.direction + 4].onComplete = function () {
            console.log('CALLBACK');
            self.sprite.children[self.direction + 4].visible = false;
            self.sprite.children[self.direction + 4].gotoAndStop(0);
            self.sprite.children[self.direction].visible = true;
            
            if (self.moving) {
                self.sprite.children[self.direction].play();   
            }
        };
    */
        self.sprite.children[self.direction + 4].visible = true;
        self.sprite.children[self.direction + 4].gotoAndPlay(0);
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
