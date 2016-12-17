var NPC = function(id) {
  // Setup some default values:
  this.id           = id;
  this.direction    = 0;
  this.health       = 100;
  this.experience   = 0;
  this.layers       = [];
  this.step         = 0;
  this.steps        = [];       // Pathfinding
  this.counter      = 0;        // Sleep/wait
  this.taunt        = 30 * 3;   // 30 ticks per second times 3 = 90 ticks or 3 second delay
  this.attacking    = false;
  this.cooldown     = 0;
  this.target       = -1;
  this.map          = 0;        // Index of map in map array this npc is on
  this.position     = { x: -41 * 32, y: 41 * 32 };
  this.emotes       = [
    "Holy moly it's dark down here... or at least, it should be...",
    "I think I've made a huge mistake...",
    "I smell the stench of the undead... Out with thee!!",
    "/me shivers, looks around nervously..."
  ];
};

NPC.prototype.randomize = function () {
  // NPC assets are loaded into the movieclip (client-side) in the same order
  // as the array, so the 'bottom' piece is the one with the lowest index
  
  // Head: 5-10
  this.layers.push(getRandomInt(5, 10));
  
  // Torso: 14-19
  this.layers.push(getRandomInt(14, 19));
  
  // Torso detail: 20-22
  this.layers.push(getRandomInt(20, 22));
  
  // Belt: 0-1
  this.layers.push(getRandomInt(0, 1));
  
  // Legs: 11-13
  this.layers.push(getRandomInt(11, 13));
  
  // Feet: 2-3
  this.layers.push(getRandomInt(2, 3));
  
  // Hands: 4
  if (Math.random() <= 0.5) {
    this.layers.push(4);
  }
};

// map      = reference to the loaded map the npc is on
// attackee = reference to player object in engine
// walkable = reference to walk test function in engine
NPC.prototype.tick = function (map, attackee, walkable) {
  var self        = this;
  var modified    = {};
  var difference  = 4;
  
  // Do we have an attack target?
  if (attackee) {
    
    // Has our attackee died?
    if (attackee.death) {
      self.attacking      = false;
      self.target         = -1;
      
      modified.attacking  = false;
      modified.target     = -1;
      
      // If we were attacking but are now not
      return modified;
    }
    
    self.counter++;
    
    // Cooldown timer
    if (self.cooldown > 0) {
      self.cooldown++;
      if (self.cooldown === 20) {
        self.cooldown = 0;
      } else {
        // Still cooling down, alert outer loop not to broadcast this npc
        return false;
      }
    }
    
    var distance_x = self.position.x - attackee.position.x;
    var distance_y = self.position.y - attackee.position.y;
    
    // Distance between two points using pythagorean theorem, from this npc to the player it's attacking
    distance = Math.sqrt( Math.pow(distance_x , 2) + Math.pow(distance_y,2) );
    
    // Every other tick, check if this npc should attack it's target
    if (self.counter % 2) {
      
      if (distance < 33) {
        // npc should swing it's weapon, so set a cooldown for the duration of the attack
        self.cooldown = 1;
        self.attacking = true;
        
        modified.attack = true;
        
        attackee.health -= 10;
        modified.attackee = {
          health: attackee.health
        };
        
        if (attackee.health < 1) {
          // target player dies, oh no
          attackee.counter    = 0;
          attackee.death      = true;
          attackee.attackers  = {};
          
          self.target     = -1;
          self.attacking  = false;
          
          modified.target     = -1;
          modified.attacking  = false;
          modified.attackee   = attackee;
        }
        
        return modified;
      }
    }
    
    // Once per second and a half we check if the player has ran out of range
    if (self.counter > 45) {
      
      self.counter = 0;
      
      if (distance > 300) {
        self.attacking = false;  
        self.target = -1;
        delete attackee.attackers[self.id];
        
        modified.target     = -1;
        modified.attacking  = false;
        return modified;
      }
    }
    
    // NPC should follow it's target
    if (distance > 32) {

      var modifiedX         = self.position.x;
      var modifiedY         = self.position.y;
      var modifiedDirection = self.direction;
      var update            = false;

      // Vertical movement
      if (Math.abs(distance_y) > difference) {
        if (modifiedY < attackee.position.y) {
          modifiedY         += difference;
          modifiedDirection  = DIRECTION_S;
        } else {
          modifiedY         -= difference; 
          modifiedDirection  = DIRECTION_N;
        }
      }
      
      // Test if the proposed vertical movement is valid:
      col = Math.floor( modifiedX / TILE_WIDTH );
      row = Math.floor( modifiedY / TILE_HEIGHT );
      
      if (walkable(map, row, col)) {
        self.position.y = modifiedY;
        self.direction  = modifiedDirection;
        update = true;
      }
      
      // Horizontal movement
      if (Math.abs(distance_x) > difference) {
        if (modifiedX < attackee.position.x) {
          modifiedX         += difference;
          modifiedDirection  = DIRECTION_E;
        } else {
          modifiedX         -= difference; 
          modifiedDirection  = DIRECTION_W;
        }
      }
      
      col = Math.floor( modifiedX / TILE_WIDTH );
      row = Math.floor( modifiedY / TILE_HEIGHT );
      
      if (walkable(map, row, col)) {
        self.position.x = modifiedX;
        self.direction  = modifiedDirection;
        update = true;
      }
      
      if (update) {
        modified.position   = self.position;
        modified.direction  = self.direction;
      }
    }
    
    return modified;
  }
  
  // If we got this far, the counter is a sleep counter
  if (self.counter > 0) {
    self.counter--;
    
    // npc needs to sleep, alert outer loop not to update
    return false;
  }
  
  // If we have a step equal to the length of the step array, we walked em all, 
  // we need to generate a new walking path
  if (self.step === self.steps.length) {
    
    self.steps.length = 0;
    self.step         = 0;
    
    // ~75% chance of starting a walk
    if (Math.random() < 0.76) {
      
      var options     = [];
      var randomizer  = 0;
      var walkRandom  = 0;
      
      direction = self.direction;
      
      // What row/col are we in?
      col = Math.floor( self.position.x / TILE_WIDTH );
      row = Math.floor( self.position.y / TILE_HEIGHT );
      
      // NPC can move maximum five tiles away
      for (j = 0; j < 5; j++) {
        
        randomizer     = Math.floor(Math.random() * 100);
        options.length = 0;
        
        // Add either our first or an additional tile step (having diminishing odds)
        if (randomizer > (16 + (12 * j))) {
          
          // Can we walk north? (and also was our last direction not south, to avoid walking in circles)
          if ((walkable(map, row - 1, col)) && ( direction !== DIRECTION_S )) {
            options.push(DIRECTION_N);
            if (direction == DIRECTION_N) {
              // If the last time we moved it was this way, increase the odds to keep going
              options.push(DIRECTION_N);
              options.push(DIRECTION_N);
              options.push(DIRECTION_N);
            }
          }
          
          // Can we walk east?
          if ((walkable(map, row, col + 1)) && ( direction !== DIRECTION_W )) {
            options.push(DIRECTION_E);
            if (direction == DIRECTION_E) {
              // If the last time we moved it was this way, increase the odds to keep going
              options.push(DIRECTION_E);
              options.push(DIRECTION_E);
              options.push(DIRECTION_E);
            }
          }
          
          // Can we walk south?
          if ((walkable(map, row + 1, col)) && ( direction !== DIRECTION_N )) {
            options.push(DIRECTION_S);
            if (direction == DIRECTION_S) {
              // If the last time we moved it was this way, increase the odds to keep going
              options.push(DIRECTION_S);
              options.push(DIRECTION_S);
              options.push(DIRECTION_S);
            }
          }
          
          // Can we walk west?
          if ((walkable(map, row, col - 1)) && ( direction !== DIRECTION_E )) {
            options.push(DIRECTION_W);
            if (direction == DIRECTION_W) {
              // If the last time we moved it was this way, increase the odds to keep going
              options.push(DIRECTION_W);
              options.push(DIRECTION_W);
              options.push(DIRECTION_W);
            }
          }
          
          direction   = options[ Math.floor(Math.random() * options.length) ];
          walkRandom  = Math.floor(Math.random() * 32) - 16;
          
          switch (direction) {
            case DIRECTION_N:
              self.steps.push({
                x: (col * 32) + 16 + walkRandom, 
                y: ((row - 1) * 32) + 16 + walkRandom
              });
              break;
            case DIRECTION_E:
              self.steps.push({
                x: ((col + 1) * 32) + 16 + walkRandom,
                y: ((row * 32) + 16 + walkRandom)
              });
              break;
            case DIRECTION_S:
              self.steps.push({
                x: (col * 32) + 16 + walkRandom,
                y: ((row + 1) * 32) + 16 + walkRandom
              });
              break;
            case DIRECTION_W:
              self.steps.push({
                x: ((col - 1) * 32) + 16 + walkRandom,
                y: ((row * 32) + 16 + walkRandom)
              });
              break;
          }
        } else {
          break;
        }
        
      }
    } else {
      // If we aren't resuming our walk, sleep for a second or two
      self.counter   = Math.floor( Math.random() * 100 );
  
      // Boradcast our position one last time so clients know the npc has stopped    
      modified.direction = self.direction;
      modified.position  = self.position;
    }
  }
  
  // Walk along the generated path
  if (self.steps.length > 0) {
    
    var npc_step  = self.steps[self.step];
    direction     = self.direction;
    
    if (self.position.y > npc_step.y) {
      direction = DIRECTION_N;
      self.position.y--;
    } else if (self.position.y < npc_step.y) {
      direction = DIRECTION_S;
      self.position.y++;
    }
    
    if (self.position.x > npc_step.x) {
      direction = DIRECTION_W;
      self.position.x--;
    } else if (self.position.x < npc_step.x) {
      direction = DIRECTION_E;
      self.position.x++;
    }
    
    if ((self.position.x == npc_step.x) &&
        (self.position.y == npc_step.y)) {
      self.step++;
    }
    
    self.direction = direction;
    
    modified.direction = self.direction;
    modified.position  = self.position;
  }
  
  self.taunt--;
  if (self.taunt === 0) {
    // ~25% chance of emoting every 10-30 seconds
    if (Math.random() < 0.26) {
      
      var emote = self.emotes[getRandomInt(0, self.emotes.length - 1)];
      modified.blurb = emote;
    }
    self.taunt = 30 * getRandomInt(10, 30);
  }
  
  return modified;
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = NPC;