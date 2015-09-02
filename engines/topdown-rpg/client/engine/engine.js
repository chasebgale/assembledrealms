var Engine = function () {
    
/*
Weak skelly born in crypt or something, weak, must team up with other player skellys to destroy 
difficult, lone, npc 'adventurers' exploring the dungeon, etc, fast pace

enemies are sparse, think human dovakhins, must be taken down by multiple skellies, difficulty scales with skellies online
*/

    this.initialized    = false;
    
    this.stage          = undefined;
    this.renderer       = undefined;
    this.map            = undefined;
    this.matrix         = undefined;
    this.layer_terrain  = undefined;
    this.layer_air      = undefined;
    this.layer_text     = undefined;
    this.text_input     = undefined;
    
    this.avatar     = new Avatar(this);
    this.terrain    = new Terrain(this);
    this.actors     = new Actors(this);

    this.position       = {x: 220, y: 220};
    
    this.socket = io(HOST);
    
    var self = this;
    
    this.socket.on('sync', function (actors) {
        // Full JSON from the realm, other players [location, stats, etc], npcs [location, etc]
        //
        //  data.actors = [{id: xx, position: {x: xx, y: xx}}, {etc}, {etc}]
        //  data.avatar = {position: {x: xx, y: xx}, health: 100};
        //
        
		self.avatar.update(actors.player);
		self.actors.create(actors, self.renderer); //data.players, data.player.id);
		
		self.position = actors.player.position;
		
		self.initialized = true;
        
        //this.position = data.avatar.position;
        
        // TODO: Setup all, then:
        self.loaded();
    });
    
    this.socket.on('update', function (actors) {
		if (self.initialized) {
			self.actors.update(actors);
		}
    });
	
	this.socket.on('create', function (actors) {
		self.actors.create(actors, self.renderer);
	});
    
    this.socket.on('debug', function (data) {
        console.log(data);
    });
	
	this.socket.on('stats', function (data) {
		self.debugging(data);
	});
	
	this.socket.on('text', function (data) {
        self.actors.text(data);
	});
        
};

Engine.prototype.initialize = function (target) {

    // If we are inside of nested functions, 'this' can be reassigned, let's keep a reference to 'this'
    // as it initially references 'engine'
    var self = this;
    
    self.matrix = new PIXI.Matrix();
    self.matrix.translate(0, 0);
    
    // Initialize PIXI, the 2D rendering engine we will use, check out
    // https://github.com/GoodBoyDigital/pixi.js for more info
    var rendererOptions = {
        antialiasing:   false,
        transparent:    false,
        resolution:     1
    };
    
    self.renderer   = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, rendererOptions);
    self.stage      = new PIXI.Container();
    //self.buffer     = new PIXI.ParticleContainer();
    
    target.appendChild(self.renderer.view);
    
    self.stage.mousedown = function (data) {
        //console.log(self.indexFromScreen(data.global));
    };
    
    // TODO: Right here I should be handshaking with the server and receiving a 
    // response object with player position, stats, etc - then the map he/she is
    // located inside of gets loaded!
    
    // OR: Perhaps the handshake just auth's and then we display a list of available 
    // characters or the new character option...
    var jqxhr = $.getJSON( ROOT + "client/maps/town.json", function( data ) {
        self.load(data);
    }).fail(function(d, textStatus, error) {
        console.error("getJSON failed, status: " + textStatus + ", error: "+error);
    });

    

};

Engine.prototype.load = function (map) {
		
    var self = this;
    self.map = map;
    
    self.terrain.load(map.terrain.source, self.renderer, function (error) {
        
        var loader = new PIXI.loaders.Loader();
        loader.add('UO Classic (rough)', ROOT + 'client/resource/uo.xml');
        loader.once('complete', function () {
        
            self.layer_terrain = new PIXI.Sprite(self.terrain.texture_ground);
            self.stage.addChild(self.layer_terrain);
            
            self.stage.addChild(self.actors.layer);
            //self.stage.addChild(self.avatar.sprite);
            self.actors.layer.addChild(self.avatar.sprite);
            
            self.layer_air = new PIXI.Sprite(self.terrain.texture_air);
            self.stage.addChild(self.layer_air);
            
            self.layer_text = new PIXI.Container();
            self.text_input = new PIXI.extras.BitmapText('', { font: '16px UO Classic (rough)', align: 'left' });
            self.text_input.position.x = 0;
            self.text_input.position.y = CANVAS_HEIGHT - 16;
            self.layer_text.addChild(self.text_input);
            self.stage.addChild(self.layer_text);
        
            self.avatar.load(function (error) {
               
                self.actors.load(function (error) {
                    
                    
                    
                    // Tell the realm we are ready for the initial data pack to setup actors, avatar position, etc
                    self.socket.emit('ready', 'ready');
                    
                });
                
            });
        });
        loader.load();
        
        
    });
};

Engine.prototype.render = function () {

    var self = this;

    if (!self.initialized) {
        return;
    }
    
    self.avatar.tick();
    self.actors.tick();
	
	// Sort actors from front to back
	// TODO: Merge objects into the same layer as actors, same with avatar
	self.actors.layer.children.sort(function (a, b) {
        if (a.position.y < b.position.y)
            return -1;
        if (a.position.y > b.position.y)
            return 1;
        return 0; 
	});
	
	
	self.actors.layer.position = {x: -self.position.x + CANVAS_WIDTH_HALF, y: -self.position.y + CANVAS_HEIGHT_HALF};
    
    // Offset translation for smooth scrolling between tiles
    self.matrix = new PIXI.Matrix();
    self.matrix.translate(-self.position.x + CANVAS_WIDTH_HALF, 
                          -self.position.y + CANVAS_HEIGHT_HALF);
    
    self.terrain.draw(self.map.terrain, self.matrix, self.position);
    
    self.renderer.render(self.stage);

};

Engine.prototype.debug = function (enabled) {
	
	var self = this;
	
	if (enabled) {
		self.socket.emit('join_debug');
	} else {
		self.socket.emit('leave_debug');
	}
};