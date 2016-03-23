var Avatar = function (engine) {
  this.direction  = 0;
  this.sprite     = new PIXI.Container();
  this.active     = undefined;
  this.moving     = false;
  this.attacking  = false;
  this.typing     = false;
  this.death      = false;
  this.blurb      = "";
  this.health     = 100;
  this.stamina    = 100;
  this.experience = 0;
  this.id         = "";
  this.engine     = engine;
  this.text       = undefined;
  this.keys       = {};
};

Avatar.prototype.create = function (avatar) {
  // Update avatar stats (from realm)
  this.health     = avatar.health;
  this.stamina    = avatar.stamina;
  this.experience = avatar.experience;
  this.id         = avatar.id;

  this.text = new PIXI.extras.BitmapText('Hello, World!', {
    font: '16px UO Classic (rough)', 
    align: 'center' 
  });
  this.text.position.x    = 0;
  this.text.position.y    = -60;
  this.text.alpha         = 0;

  this.statsBar = new PIXI.Graphics();
  this.statsBar.alpha = 0.5;
  this.statsBar.position.x = -16;
  this.statsBar.position.y = 2;
  // set a fill and line style
  this.statsBar.beginFill(0x00FF00);
  this.statsBar.lineStyle(2, 0x000000, 1);
  this.statsBar.drawRect(0, 0, 32, 5);
  this.statsBar.drawRect(0, 6, 32, 5);

  this.sprite.addChild(this.text);
  this.sprite.addChild(this.statsBar);
  this.sprite.position = this.engine.position; 
};

Avatar.prototype.update = function (avatar) {
  var self = this;
  var draw = false;
  
  if (avatar.stamina !== undefined) {
    self.stamina = avatar.stamina;
    draw = true;
  }
  
  if (avatar.health !== undefined) {
    self.health = avatar.health;
    draw = true;
  }
  
  if (avatar.death === true) {
    // We have been killed
    self.sprite.children[self.direction].stop();
    self.sprite.children[self.direction].visible = false;
    self.sprite.children[self.direction + 4].visible = false;
    
    self.direction  = avatar.direction;
    self.position   = avatar.position;
    self.moving     = false;
    self.attacking  = false;
    self.typing     = false;
    self.death      = true;
    self.health     = 0;
      
    self.sprite.children[8].onComplete = function () {
      self.engine.stage.alpha -= 0.01;
    };
    
    self.sprite.children[8].loop = false;
    self.sprite.children[8].visible = true;
    self.sprite.children[8].gotoAndPlay(0);
    
  } else if (avatar.death === false) {
    
    self.position           = avatar.position;
    self.engine.position    = avatar.position;
    self.sprite.position    = avatar.position;
    self.death              = false;
    
    self.sprite.children[8].visible                 = false;
    self.sprite.children[self.direction].visible    = true;
    self.sprite.children[self.direction].gotoAndStop(0);
    
    self.engine.stage.alpha = 1.0;
  }
  
  if (draw) {
    self.statsBar.clear();
    self.statsBar.lineStyle(2, 0x000000, 1);
    self.statsBar.drawRect(0, 0, 32, 5);
    self.statsBar.drawRect(0, 6, 32, 5);
    self.statsBar.beginFill(0x00FF00);
    self.statsBar.lineStyle(0);
    self.statsBar.drawRect(1, 1, Math.floor(32 * (self.health / 100)) - 1, 4);
    self.statsBar.drawRect(1, 7, Math.floor(32 * (self.stamina / 100)) - 1, 4);
    self.statsBar.alpha = 0.5; //
  }
};
    
Avatar.prototype.load = function (complete) {

  var self = this;

  var process_layer = function (resource, action) {
      
    var index       = 0;
    var row         = 0;
    var col         = 0;
    var textures    = [];
    var directions  = 4;
    var i           = 0;
    var prefix      = "skeleton";
    var spritesheet = PIXI.utils.TextureCache[resource].baseTexture;
    var cols        = Math.floor(spritesheet.width / 64);
    var rows        = Math.floor(spritesheet.height / 64);
    
    var frameTexture;
    var clip;
    
    for (row = 0; row < rows; row++) {
      textures[row] = [];
      for (col = 0; col < cols; col++) {
        frameTexture = new PIXI.Texture(spritesheet, {
            x: col * 64,
            y: row * 64,
            width: 64,
            height: 64
        });
        
        textures[row][col] = frameTexture;
        
        PIXI.Texture.addTextureToCache(frameTexture, prefix + "_" + action + "_" + row + "_" + col + ".png");
        index++;
      }
    }
    
    // Add/create animated clips:
    for (i = 0; i < rows; i++) {
      clip = new PIXI.extras.MovieClip(textures[i]);

      clip.position.x = -32; //(CANVAS_WIDTH / 2) - 32;
      clip.position.y = -60; //(CANVAS_HEIGHT / 2) - 32;
      clip.animationSpeed = 0.2;
      clip.visible = false;

      self.sprite.addChild(clip);
    }
  };

  process_layer(ROOT + "client/resource/actors/walkcycle/BODY_skeleton.png", "walk");
  process_layer(ROOT + "client/resource/actors/slash/BODY_skeleton.png", "slash");
  process_layer(ROOT + "client/resource/actors/hurt/BODY_skeleton.png", "hurt");
              
  self.direction  = DIRECTION_S;
  self.active     = self.sprite.children[self.direction];
        
  self.active.visible = true;
  self.active.gotoAndStop(0);
  
  /*
  var amount            = 4;
  var animationSpeed    = 0.2;
  var wasMoving         = self.moving;
  var oldDirection      = self.direction;
  var oldPosition       = $.extend(true, {}, self.engine.position);
  */
  
  //document.addEventListener("keydown", self.keydown, false);
  //document.addEventListener("keyup", self.keyup, false);
  
  /*
  keyboardJS.bind('enter', function(e) {
    
    if (self.typing) {
      // Send our text string, then clear it
      self.engine.socket.emit('text', self.blurb);
      self.emote(self.blurb);
      
      self.blurb                  = ""; 
      self.engine.textInput.text  = "";
      
      keyboardJS.resume();
      document.removeEventListener("keydown", self.keydown, false);
    } else {
      // Stop our avatar and show the carrot blinking for input
      if (self.moving) {
          self.moving = false;
          self.sprite.children[self.direction].gotoAndStop(0);

          // Sending one more 'move' with duplicate coords as the last update will tell all clients this
          // actor has stopped moving
          self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
      }
      
      keyboardJS.pause();
      document.addEventListener("keydown", self.keydown, false);
    }
    self.typing = !self.typing;
  });
  */
  
  complete();
    
};

Avatar.prototype.keydown = function (e) {
  var self    = this;
  var letter  = '';
  var name    = KEY_CODES[e.keyCode];
  
  // Spacebar and Enter and Arrow keys mess with the browser, so prevent them from bubbling:
  if ((name == "spacebar") || (name == "enter") || (name == "up") || (name == "down") || (name == "left") || (name == "right")) {
    e.preventDefault();
  }
  
  if (engine.avatar.typing) {
    if (e.keyCode == 8) {
      // Backspace
      engine.avatar.blurb = engine.avatar.blurb.substring(0, engine.avatar.blurb.length - 1);
    } else if (e.keyCode == 13) {
      // Enter
      engine.socket.emit('text', engine.avatar.blurb);
      engine.avatar.emote(engine.avatar.blurb);
      engine.avatar.typing = false;
      engine.avatar.blurb    = ""; 
      engine.textInput.text  = "";
    } else if (e.keyCode == 32) {
      // Space
      engine.avatar.blurb += ' ';
    } else if ((e.keyCode > 64) && (e.keyCode < 91)) {
      // Letter     
      letter = String.fromCharCode(e.keyCode);
      if (!e.shiftKey) {
        letter = letter.toLowerCase();
      }
      engine.avatar.blurb += letter;
    } else if ((e.keyCode > 47) && (e.keyCode < 58)) {
      // Numbers
      letter = String.fromCharCode(e.keyCode);
      if (e.shiftKey) {
        switch (letter) {
          case '1':
            letter = '!';
            break;
          case '2':
            letter = '@';
            break;
          case '3':
            letter = '#';
            break;
          case '4':
            letter = '$';
            break;
          case '5':
            letter = '%';
            break;
          case '6':
            letter = '^';
            break;
          case '7':
            letter = '&';
            break;
          case '8':
            letter = '*';
            break;
          case '9':
            letter = '(';
            break;
          case '0':
            letter = ')';
            break;
          default:
            letter = '';
            break;
        }
      }
      engine.avatar.blurb += letter;
    } else if ((e.keyCode > 185) && (e.keyCode < 193)) {
      switch (e.keyCode) {
        case 186:
          letter = e.shiftKey ? ':' : ';';
          break;
        case 187:
          letter = e.shiftKey ? '+' : '=';
          break;
        case 188:
          letter = e.shiftKey ? '<' : ',';
          break;
        case 189:
          letter = e.shiftKey ? '_' : '-';
          break;
        case 190:
          letter = e.shiftKey ? '>' : '.';
          break;
        case 191:
          letter = e.shiftKey ? '?' : '/';
          break;
        case 192:
          letter = e.shiftKey ? '~' : '`';
          break;
      }
      engine.avatar.blurb += letter;
    } else if ((e.keyCode > 218) && (e.keyCode < 223)) {
      switch (e.keyCode) {
        case 219:
          letter = e.shiftKey ? '{' : '[';
          break;
        case 220:
          letter = e.shiftKey ? '|' : '\\';
          break;
        case 221:
          letter = e.shiftKey ? '}' : ']';
          break;
        case 222:
          letter = e.shiftKey ? '"' : '\'';
          break;
      }
      engine.avatar.blurb += letter;
    }
    
    engine.textInput.text  = engine.avatar.blurb;
  } else {
    if (e.keyCode == 13) {
      // Enter
      if (engine.avatar.moving) {
        engine.avatar.moving = false;
        engine.avatar.sprite.children[engine.avatar.direction].gotoAndStop(0);
        
        // Sending one more 'move' with duplicate coords as the last update will tell all clients this
        // actor has stopped moving
        engine.socket.emit('move', {position: engine.position, direction: engine.avatar.direction});
      }
      
      engine.avatar.typing = true;
      
    } else if (e.keyCode == 78) {
      // 'n' key, used to show all player names
      engine.actors.names();
    } else {
      engine.avatar.keys[KEY_CODES[e.keyCode]] = true;
    }
  }
};

Avatar.prototype.keyup = function (e) {
  engine.avatar.keys[KEY_CODES[e.keyCode]] = false;
};


Avatar.prototype.emote = function(blurb) {
    
  var self = this;
  
  if (blurb.substring(0, 4) == '/me ') {
    blurb = '*' + blurb.substring(4) + '*';
    self.text.font.tint = 11184810;
  } else {
    self.text.font.tint = 16777215;
  }
  
  self.text.text = blurb;
  
  // Get the start position from engine input string as occasionally a race condition occurs where 
  // if I set the text of self.text then request it's textWidth property, it would give an
  // old measurement as the text hasn't been rastered yet before I ask for the value
  self.text.position.x = -1 * Math.round(self.engine.textInput.textWidth / 2);
  self.text.alpha      = 1;  
};
    
Avatar.prototype.tick = function () {
  var self = this;
  
  if (self.text.alpha > 0) {
    self.text.alpha -= 0.003;
  }
  
  if (self.statsBar.alpha > 0) {
    if ((self.stamina == 100) && (self.health == 100)) {
      self.statsBar.alpha -= 0.003;
    }
  }
  
  if (self.attacking || self.typing || self.death) {
    return;
  }
  
  var keys              = self.keys;
  var amount            = 4;
  var animationSpeed    = 0.2;
  var wasMoving         = self.moving;
  var newDirection      = self.direction;
  var newPosition       = $.extend(true, {}, self.engine.position);
  var positionChanged   = false;
  
  var step = function () {
    var col = Math.floor(newPosition.x / TILE_WIDTH);
    var row = Math.floor(newPosition.y / TILE_HEIGHT);
    
    var stop = function () {
      self.active.gotoAndStop(0);
      self.moving = false;
      
      // Sending one more 'move' with duplicate coords as the last update will tell all clients this
      // actor has stopped moving
      self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
    };
    
    // Check for illegal step and return if it's illegal
    if (self.engine.map.terrain.index[row] !== undefined) {
      if (self.engine.map.terrain.index[row][col] !== undefined) {
        if ((self.engine.map.terrain.index[row][col][2] !== undefined) &&
            (self.engine.map.terrain.index[row][col][2] !== null)) {
          stop();
          return;
        }
      } else {
        stop();
        return;
      }
    } else {
      stop();
      return;
    }
    
    var drawDirection = -1;
    self.moving = true;
    
    // (NE and SE both display as E) 
    if ((newDirection == 4) || (newDirection == 6)) {
      drawDirection = DIRECTION_E;
    } else if ((newDirection == 5) || (newDirection == 7)) {
      drawDirection = DIRECTION_W;
    } else {
      drawDirection = newDirection;
    }
  
    if (drawDirection !== self.direction) {
      self.active.visible = false;
      self.active.stop();
      
      self.active = self.sprite.children[drawDirection];
      
      self.active.visible = true;
      self.active.play();
    } else {
      if (!wasMoving && self.moving) {
        self.active.play();
      }
    }
    
    self.active.animationSpeed = animationSpeed;
    
    self.direction        = newDirection;
    self.engine.position  = newPosition;
    self.sprite.position  = self.engine.position; 
  
    self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
  };
  
  if (self.keys.spacebar) {
      
    if (self.stamina < 10) {
      self.emote('/me oof');
    } else {
      self.active.stop();
      self.active.visible = false;
      
      var drawDirection = -1;
      
      // (NE and SE both display as E)
      if ((self.direction == 4) || (self.direction == 6)) {
        drawDirection = DIRECTION_E;
      } else if ((self.direction == 5) || (self.direction == 7)) {
        drawDirection = DIRECTION_W;
      } else {
        drawDirection = self.direction;
      }
      
      var attackClip = self.sprite.children[drawDirection + 4];
      
      attackClip.onComplete = function () {
        self.attacking = false;
        attackClip.visible = false;
        attackClip.gotoAndStop(0);
        self.active.visible = true;
        
        if (self.moving) {
          self.active.play();   
        }
      };
      
      attackClip.loop = false;
      attackClip.visible = true;
      attackClip.gotoAndPlay(0);
      
      self.attacking = true;
      
      self.engine.socket.emit('attack');
      return;
    }
  }
  
  if (self.keys.shift) {
    if (self.stamina > 0) {
      amount *= 2;
      animationSpeed *= 2;
    }
  }
  
  if (self.keys['w'] || self.keys['up']) {
  
    if (self.keys['a'] || self.keys['left']) {
      amount *= MOVEMENT_ANGLE;
      newPosition.x -= amount;
      newDirection = DIRECTION_NW;
    } else if (self.keys['d'] || self.keys['right']) {
      amount *= MOVEMENT_ANGLE;
      newPosition.x += amount;
      newDirection = DIRECTION_NE;
    } else {
      newDirection = DIRECTION_N;
    }
  
    newPosition.y -= amount;
    step();
    return;
  }

  if (self.keys['s'] || self.keys['down']) {
  
    if (self.keys['a'] || self.keys['left']) {
      amount *= MOVEMENT_ANGLE;
      newPosition.x -= amount;
      newDirection = DIRECTION_SW;
    } else if (self.keys['d'] || self.keys['right']) {
      amount *= MOVEMENT_ANGLE;
      newPosition.x += amount;
      newDirection = DIRECTION_SE;
    } else {
      newDirection = DIRECTION_S;
    }
  
    newPosition.y += amount;
    step();
    return;
  }
  
  if (self.keys['a'] || self.keys['left']) {
    newPosition.x -= amount;
    newDirection = DIRECTION_W;
    step();
    return;
  }
  
  if (self.keys['d'] || self.keys['right']) {
    newPosition.x += amount;
    newDirection = DIRECTION_E;
    step();
    return;
  }
  
  // If we've gotten this far, no movement keys are pressed... so if our movement flag is true, we know
  // the player has stopped moving
  if (self.moving) {
    self.moving = false;
    
    self.sprite.children[self.direction].gotoAndStop(0);
  
    // Sending one more 'move' with duplicate coords as the last update will tell all clients this
    // actor has stopped moving
    self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
  }

};