var Engine = function () {
    
/*
Weak skelly born in crypt or something, weak, must team up with other player skellys to destroy 
difficult, lone, npc 'adventurers' exploring the dungeon, etc, fast pace

enemies are sparse, think human dovakhins, must be taken down by multiple skellies, difficulty scales with skellies online
*/

    this.initialized    = false;
    
    this.stage          = undefined;
    this.renderer       = undefined;
    this.buffer         = undefined;
    this.map            = undefined;
    this.matrix         = undefined;
    this.layer_terrain  = undefined;
    this.layer_actors   = undefined;
    this.layer_air      = undefined;
    
    this.avatar     = new Avatar();
    this.terrain    = new Terrain();
    
    // Top left tile coordinates
    this.coordinates    = {row: 0, col: 0};
    this.offset         = {x: 0, y: 0};
    this.position       = {x: 220, y: 220};
    
    //this.socket = io(HOST);
    
    //this.socket.on('auth-handshake', function (msg) {
        
    //});
        
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
        console.error("getJSON failed, status: " + textStatus + ", error: "+error);
    });

    

};

Engine.prototype.handshake = function () {
    
    socket.emit('handshake', 'encrpytrd');
    
};

Engine.prototype.load = function (map) {
		
    var self = this;
    self.map = map;
    
    self.terrain.load(self, PIXI, function (error) {

        self.layer_terrain = new PIXI.Sprite(self.terrain.texture_ground);
        self.stage.addChild(self.layer_terrain);
        
        self.layer_actors = new PIXI.Container();
        self.stage.addChild(self.layer_actors);
        
        self.layer_air = new PIXI.Sprite(self.terrain.texture_air);
        self.stage.addChild(self.layer_air);
        
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