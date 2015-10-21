var Avatar = function (engine) {
  this.direction  = 0;
  this.sprite     = new PIXI.Container();
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
  this.text.position.y    = -34;
  this.text.alpha         = 0;

  this.statsBar = new PIXI.Graphics();
  this.statsBar.alpha = 0.5;
  this.statsBar.position.x = -16;
  this.statsBar.position.y = 36;
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
    self.statsBar.alpha = 0.5;
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
      clip.position.y = -32; //(CANVAS_HEIGHT / 2) - 32;
      clip.animationSpeed = 0.2;
      clip.visible = false;

      self.sprite.addChild(clip);
    }
  };

  process_layer(ROOT + "client/resource/actors/walkcycle/BODY_skeleton.png", "walk");
  process_layer(ROOT + "client/resource/actors/slash/BODY_skeleton.png", "slash");
  process_layer(ROOT + "client/resource/actors/hurt/BODY_skeleton.png", "hurt");
              
  self.direction = DIRECTION_S;
        
  self.sprite.children[self.direction].visible = true;
  self.sprite.children[self.direction].gotoAndStop(0);
  
  KeyboardJS.on('space', function(e) {
    e.preventDefault();
  });
  
  KeyboardJS.on('enter', function() {
    
    if (self.typing) {
      // Send our text string, then clear it
      self.engine.socket.emit('text', self.blurb);
      self.emote(self.blurb);
      
      self.blurb                  = ""; 
      self.engine.textInput.text  = "";
      
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
      
      document.addEventListener("keydown", self.keydown, false);
    }
    self.typing = !self.typing;
  });
  
  complete();
    
};

Avatar.prototype.keydown = function (e) {
    
  var letter = '';
  
  // Backspace
  if (e.keyCode == 8) {
    engine.avatar.blurb = engine.avatar.blurb.substring(0, engine.avatar.blurb.length - 1);
  } else if (e.keyCode == 32) {
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
  
  var amount            = 4;
  var animationSpeed    = 0.2;
  var wasMoving         = self.moving;
  var oldDirection      = self.direction;
  var oldPosition       = $.extend(true, {}, self.engine.position);
  var keys              = KeyboardJS.activeKeys();
  
  var isStepLegal = function () {
    
    var col = Math.floor(self.engine.position.x / TILE_WIDTH);
    var row = Math.ceil(self.engine.position.y / TILE_HEIGHT);
    
    if (self.engine.map.terrain.index[row] !== undefined) {
      if (self.engine.map.terrain.index[row][col] !== undefined) {
        if ((self.engine.map.terrain.index[row][col][2] !== undefined) &&
            (self.engine.map.terrain.index[row][col][2] !== null)) {
          self.engine.position = oldPosition;
        }
      } else {
        self.engine.position = oldPosition;
      }
    } else {
      self.engine.position = oldPosition;
    }
    
    var flag = false;

    if (!wasMoving && self.moving) {
      self.sprite.children[self.direction].play();  
    }

    if ((oldDirection !== self.direction) || (flag)) {

      self.sprite.children[oldDirection].visible = false;
      self.sprite.children[oldDirection].stop();

      self.sprite.children[self.direction].visible = true;
      self.sprite.children[self.direction].play();
    
    }
    
    self.sprite.children[self.direction].animationSpeed = animationSpeed;
    
    self.sprite.position = self.engine.position; 
  
    self.engine.socket.emit('move', {position: self.engine.position, direction: self.direction});
      
  };
  
  if ($.inArray('space', keys) > -1) {
      
    if (self.stamina < 10) {
      self.emote('/me oof');
      return;
    }
    
    self.sprite.children[self.direction].stop();
    self.sprite.children[self.direction].visible = false;
    
    self.sprite.children[self.direction + 4].onComplete = function () {
      self.attacking = false;
      self.sprite.children[self.direction + 4].visible = false;
      self.sprite.children[self.direction + 4].gotoAndStop(0);
      self.sprite.children[self.direction].visible = true;
      
      if (self.moving) {
        self.sprite.children[self.direction].play();   
      }
    };
    
    self.sprite.children[self.direction + 4].loop = false;
    self.sprite.children[self.direction + 4].visible = true;
    self.sprite.children[self.direction + 4].gotoAndPlay(0);
    
    self.attacking = true;
    
    self.engine.socket.emit('attack');
    return;
  }
  
  if ($.inArray('shift', keys) > -1) {
    amount *= 2;
    animationSpeed *= 2;
  }
  
  if ($.inArray('w', keys) > -1) {
  
    if ($.inArray('a', keys) > -1) {
      amount *= MOVEMENT_ANGLE;
      self.engine.position.x -= amount;
      self.direction = DIRECTION_W;
    } else if ($.inArray('d', keys) > -1) {
      amount *= MOVEMENT_ANGLE;
      self.engine.position.x += amount;
      self.direction = DIRECTION_E;
    } else {
      self.direction = DIRECTION_N;
    }
  
    self.engine.position.y -= amount;
    self.moving = true;
    isStepLegal();
    return;
  }

  if ($.inArray('s', keys) > -1) {
  
    if ($.inArray('a', keys) > -1) {
      amount *= MOVEMENT_ANGLE;
      self.engine.position.x -= amount;
      self.direction = DIRECTION_W;
    } else if ($.inArray('d', keys) > -1) {
      amount *= MOVEMENT_ANGLE;
      self.engine.position.x += amount;
      self.direction = DIRECTION_E;
    } else {
      self.direction = DIRECTION_S;
    }
  
    self.engine.position.y += amount;
    self.moving = true;
    isStepLegal();
    return;
  }
  
  if ($.inArray('a', keys) > -1) {
    self.engine.position.x -= amount;
    self.moving = true;
    self.direction = DIRECTION_W;
    isStepLegal();
    return;
  }
  
  if ($.inArray('d', keys) > -1) {
    self.engine.position.x += amount;
    self.moving = true;
    self.direction = DIRECTION_E;
    isStepLegal();
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