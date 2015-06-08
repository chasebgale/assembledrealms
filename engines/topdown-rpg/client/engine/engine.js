var Engine = function () {
    
/*
Weak skelly born in crypt or something, weak, must team up with other player skellys to destroy 
difficult, lone, npc 'adventurers' exploring the dungeon, etc, fast pace
*/

    this.initialized    = false;
    
    this.stage          = undefined;
    this.renderer       = undefined;
    this.buffer         = undefined;
    this.map            = undefined;
    this.matrix         = undefined;
    this.layer_terrain  = undefined;
    this.layer_actors   = undefined;
    
    this.avatar     = new Avatar();
    this.terrain    = new Terrain();
    
    // Top left tile coordinates
    this.coordinates    = {row: 0, col: 0};
    this.offset         = {x: 0, y: 0};
    this.position       = {x: 200, y: 200};
    
    this.socket = io();
    
    this.socket.on('auth-handshake', function (msg) {
        
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
    self.buffer     = new PIXI.ParticleContainer();
    
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
        console.error("getJSON failed, status: " + textStatus + ", error: "+error)
    });

    

};

Engine.prototype.handshake = function () {
    
    socket.emit('handshake', 'encrpytrd');
    
};

Engine.prototype.load = function (map) {
		
    var self = this;
    self.map = map;
    
    self.terrain.load(self, PIXI, function (error) {

        self.layer_terrain = new PIXI.Sprite(self.terrain.texture);
        self.layer_terrain.cacheAsBitmap = true;
        self.stage.addChild(self.layer_terrain);
        
        self.layer_actors = new PIXI.Container();
        self.stage.addChild(self.layer_actors);
        
        self.avatar.load(self, PIXI, function (error) {
           
            self.layer_actors.addChild(self.avatar.sprite);
           
            self.initialized = true;
            self.loaded();
           
        });
        
    });

};

Engine.prototype.render = function () {

    var self = this;

    if (!self.initialized) {
        return;
    }
    
    self.avatar.tick(self, PIXI);
    
    // Offset translation for smooth scrolling between tiles
    self.matrix = new PIXI.Matrix();
    self.matrix.translate(-self.position.x + CANVAS_WIDTH_HALF, 
                          -self.position.y + CANVAS_HEIGHT_HALF);
    
    self.terrain.draw(self, PIXI);
    
    self.renderer.render(self.stage);

};
/*
		indexFromScreen: function (point) {

			var map = {};
			var screen = {};
			screen.x = point.x - avatar.offset.x;
			screen.y = point.y - avatar.offset.y;

			map.row = (screen.x / TILE_WIDTH_HALF + screen.y / TILE_HEIGHT_HALF) / 2;
			map.col = (screen.y / TILE_HEIGHT_HALF - screen.x / TILE_WIDTH_HALF) / -2;
			
			console.log("Coords pre-rounding: " + map.row + ", " + map.col);

			map.row = Math.floor(map.row);
			map.col = Math.floor(map.col);
			
			console.log("Coords post-rounding: " + map.row + ", " + map.col);

			return map;
			
		},

		coordFromScreen: function (index) {
			var b = ((index.row * 2) - (index.col * 2)) / 2;
			var a = (index.row * 2) - b;

			return {"a" : a, "b": b};
		},
		
		isWalkable: function(point) {
			return terrain.isWalkable(this, {x: point.x + 32, y: point.y + 64});
		}
*/