var Engine = function () {
    
  this.stage;
  this.renderer;
  this.map;
  this.matrix;
  this.layerTerrain;
  this.layerAir;
  this.layerText;
  this.textInput;
  this.socket;
  
  this.avatar     = new Avatar(this);
  this.terrain    = new Terrain(this);
  this.actors     = new Actors(this);

  this.position       = {x: 220, y: 220};
  this.alternator     = false;
  this.initialized    = false;
};

Engine.prototype.initialize = function (container, host, port, cwd) {

  // If we are inside of nested functions, 'this' can be reassigned, let's keep a reference to 'this'
  // as it initially references our Engine instance 'engine'
  var self = this;
  
  self.host = host;
  self.port = port;
  self.cwd  = cwd;
  
  // Create a socket connection to server we've been given
  self.socket = io(host + ":" + port);
  
  // Respond to the 'sync' message from the server when it arrives. 
  // This message is sent after a player successfully makes a connection to our server. The message
  // contains the locations of other players, npcs and this players last (or initial) position.
  self.socket.on('sync', function (actors) {
    self.avatar.create(actors.player);
    self.actors.create(actors, self.renderer);
    
    self.position = actors.player.position;
    
    self.initialized = true;
    self.ready();
  });
    
  // The update message occurs anytime an npc or player performed an action
  self.socket.on('update', function (actors) {
    if (self.initialized) {
      self.actors.update(actors);
    }
  });
  
  // The create message tells us another player or npc has entered the map we are on
  self.socket.on('create', function (actors) {
    self.actors.create(actors, self.renderer);
  });
  
  // The destroy message tells us another player or npc has left the map we are on
  self.socket.on('destroy', function (actor) {
    self.actors.destroy(actor, self.renderer);
  });
    
  self.socket.on('debug', function (data) {
    console.log(data);
  });
  
  self.socket.on('stats', function (data) {
    self.debugging(data);
  });
  
  // Respond to an npc or player emitting text
  self.socket.on('text', function (data) {
    self.actors.text(data);
  });
  
  self.matrix = new PIXI.Matrix();
  self.matrix.translate(0, 0);
  
  // Initialize PIXI, the 2D rendering engine we will use, for more info check out:
  // https://github.com/GoodBoyDigital/pixi.js 
  var rendererOptions = {
    antialiasing:   false,
    transparent:    false,
    resolution:     1
  };
  
  self.renderer   = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, rendererOptions);
  self.stage      = new PIXI.Container();
  
  container.appendChild(self.renderer.view);
  
  self.stage.mousedown = function (data) {
    //console.log(self.indexFromScreen(data.global));
  };
  
  // TODO: Right here I should be handshaking with the server and receiving a 
  // response object with player position, stats, etc - then the map he/she is
  // located inside of gets loaded!
  
  // OR: Perhaps the handshake just auth's and then we display a list of available 
  // characters or the new character option...
  var jqxhr = $.getJSON("//" + host + cwd + "client/maps/town.json", function( data ) {
    self.load(data);
  }).fail(function(d, textStatus, error) {
    console.error("getJSON failed, status: " + textStatus + ", error: "+error);
  });
};

Engine.prototype.load = function (map) {
  
  var self = this;
  self.map = map;
  
  var i = 0;
  var j = 0;
  
  var loader = PIXI.loader;
  
  var actorActions = [
    "walkcycle",
    "slash",
    "hurt"
  ];
  
  var avatarAssets = [
    "BODY_skeleton.png"
  ];
  
  var npcAssets = [
    "BODY_human.png",
    "BELT_leather.png",
    "BELT_rope.png",
    "FEET_plate_armor_shoes.png",
    "FEET_shoes_brown.png",
    "HANDS_plate_armor_gloves.png",
    "HEAD_chain_armor_helmet.png",
    "HEAD_chain_armor_hood.png",
    "HEAD_hair_blonde.png",
    "HEAD_leather_armor_hat.png",
    "HEAD_plate_armor_helmet.png",
    "HEAD_robe_hood.png",
    "LEGS_pants_greenish.png",
    "LEGS_plate_armor_pants.png",
    "TORSO_chain_armor_jacket_purple.png",
    "TORSO_chain_armor_torso.png",
    "TORSO_leather_armor_shirt_white.png",
    "TORSO_leather_armor_torso.png",
    "TORSO_plate_armor_torso.png",
    "TORSO_robe_shirt_brown.png",
    "TORSO_leather_armor_bracers.png",
    "TORSO_leather_armor_shoulders.png",
    "TORSO_plate_armor_arms_shoulders.png"
  ];
  
  for (i = 0; i < actorActions.length; i++) {
    for (j = 0; j < npcAssets.length; j++) {
      loader.add(ROOT + "client/resource/actors/" + actorActions[i] + "/" + npcAssets[j]);
    }

    for (j = 0; j < avatarAssets.length; j++) {
      loader.add(ROOT + "client/resource/actors/" + actorActions[i] + "/" + avatarAssets[j]);
    }
  }
  
  loader.add('UO Classic (rough)', ROOT + 'client/resource/uo.xml');
  loader.add(ROOT + 'client/resource/actors/slash/WEAPON_dagger.png');
      
  loader.on('progress', function (e) {
    self.loading(e);
  });
  
  loader.on('error', function (e) {
    console.log(e);
  });
  
  loader.once('complete', function () {
    self.loaded();
    self.terrain.load(map.terrain.source, self.renderer, function (error) {
      self.layerTerrain = new PIXI.Sprite(self.terrain.textureGround);
      self.stage.addChild(self.layerTerrain);
      
      self.stage.addChild(self.actors.layer);
      //self.stage.addChild(self.avatar.sprite);
      self.actors.layer.addChild(self.avatar.sprite);
      
      self.layerAir = new PIXI.Sprite(self.terrain.textureAir);
      self.stage.addChild(self.layerAir);
      
      self.layerText = new PIXI.Container();
      self.textInput = new PIXI.extras.BitmapText('', { font: '16px UO Classic (rough)', align: 'left' });
      self.textInput.position.x = 0;
      self.textInput.position.y = CANVAS_HEIGHT - 16;
      self.layerText.addChild(self.textInput);
      self.stage.addChild(self.layerText);
  
      self.avatar.load(function (error) {
         
        self.actors.load(function (error) {

          // Tell the realm we are ready for the initial data pack to setup actors, avatar position, etc
          self.socket.emit('ready', 'ready');
            
        });
          
      });
    });
  });
  
  loader.load();
};

Engine.prototype.render = function () {

  var self = this;

  if (!self.initialized) {
    return;
  }
  
  self.alternator = !self.alternator;
  
  if (self.alternator) {
    return;
  }
  
  if (self.stage.alpha < 1.0) {
    if (self.stage.alpha > 0) {
      self.stage.alpha -= 0.01;
    }
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