/*
Due to security concerns, require() and eval() statements will prevent 
the server from compiling. Access to protected functionality is exposed
via the following functions:
  
Engine.readFile(file, function (error, data) {});
  Restricted to reading files from your realm's directory, urls should not start 
  with '/' and should not contain '..' - attempts to read outside of your directory
  are blocked
  
Engine.emit(type, message);
  Broadcast a message of 'type' to all connected clients, out of the normal broadcast loop.
  'message' can be an object or string
  
If you find yourself needing additional functionality, contact me
  @chasebgale
  chase@assembledrealms.com
*/

var DIRECTION_N   = 0;
var DIRECTION_W   = 1;
var DIRECTION_S   = 2;
var DIRECTION_E   = 3;

var DIRECTION_NE  = 4;
var DIRECTION_NW  = 5;
var DIRECTION_SE  = 6;
var DIRECTION_SW  = 7;


var TILE_WIDTH  = 32;
var TILE_HEIGHT = 32;

var EMOTES_NECROMANCER = [
  "I have given you life... now honor me with DEATH!",
  "Destroy these fleshy fools!",
  "Purge these foolish humans from my lair!!",
  "/me scowls",
  "ATTACK! Attack the humans!",
  "Hmmmm... It's so bright in here... Why no dynamic lighting?",
  "All you can do is punch? Pathetic coding...",
  "Wait, no blood? Only one death animation? Boooring...",
  "These human invaders... seem so... simplistic in nature..."
];

var EMOTES_HUMAN = [
  "Holy moly it's dark down here... or at least, it should be...",
  "I think I've made a huge mistake...",
  "I smell the stench of the undead... Out with thee!!",
  "/me shivers, looks around nervously..."
];

function Engine () {

  this.npcs            = {};
  this.npcKeys         = [];
  
  this.players         = {};
  this.playerKeys      = [];
  
  this.npcSpawnCount   = 1;
  this.tickCount       = 0;
  
  this.maps            = [];
  
  this.actors = {
    players: this.players, 
    npcs: this.npcs
  };
  
  this.broadcast = {
    players: {},
    npcs: {}
  };
  
  this.settings = {
    events: ["move"]
  };

}

Engine.prototype.initialize = function (callback) {
  
  var self = this;
  
  self.readFile('client/maps/town.json', function (error, data) {
    if (error) {
      return callback(error);
    }
    self.maps.push(JSON.parse(data));
    
    // Create the dark necromancer 'Chase' - too spooky
    self.npcs[0] = {
      id:         0,
      direction:  0,
      health:     1000,
      experience: 1000,
      layers:     [10, 19, 1, 2, 4, 13],
      step:       0,
      steps:      [],     // Pathfinding
      counter:    0,      // Sleep/wait
      taunt:      30 * 3, // 30 ticks per second times 3 = 90 ticks or 3 second delay
      attacking:  false,
      cooldown:   0,
      target:     -1,
      map:        0,      // Index of map in map array this npc is on
      position:   { x: 14 * 32, y: 2 * 32 }
    };
    
    self.npcKeys = Object.keys(self.npcs);
    
    self.spawn();
    
    callback();
  });

};

Engine.prototype.tick = function () {
    
  var self           = this;
    
  var i              = 0;
  var j              = 0;
  var row            = 0;
  var col            = 0;
  var modified       = false;
  var distance       = 0;
  var direction      = -1;
  var difference     = 4;
  var attackBounding = 32;
  var player;
  var map;
  var npc;
  
  self.tickCount++;
  
  if (self.tickCount > 1800) {
    // Every minute fire and reset
    self.tickCount = 0;
    
    var toughness = 0;
    
    for (i = 0; i < self.playerKeys.length; i++) {
      // Factor the players experience with an additional +1 for being alive
      toughness += (self.players[self.playerKeys[i]].experience === undefined ? 0 : self.players[self.playerKeys[i]].experience) + 1;
    }
    
    // For every 6 baddies you've killed, you can handle an additional spawn
    toughness /= 6;
    
    // Even if we have no players, we need +1 for the necromancer and +1 for one spawn
    toughness += 2;
    
    toughness = Math.round(toughness);
    
    // If we have less npcs than players' combined stength, spawn new ones:
    while (self.npcKeys.length < toughness) {
      self.spawn();
    }
  }
  
  // Loop through connected players
  for (i = 0; i < self.playerKeys.length; i++) {
    player    = self.players[self.playerKeys[i]];
    map       = self.maps[player.map];
    modified  = false;
    
    player.counter++;
    
    // Ded?
    if (player.death) {
      if (player.counter > 220) {
        player.position   = {x: 448, y: 192};
        player.direction  = 0;
        player.health     = 100;
        player.stamina    = 100;
        player.experience = 0;
        player.death      = false;
        player.counter    = 0;
        player.attackers  = {};
        
        self.broadcast.players[player.id] = player;
      }
      continue;
    }
    
    // Is this player triggering an unfortunate NPC? 
    for (j = 1; j < self.npcKeys.length; j++) {
      npc = self.npcs[self.npcKeys[j]];
      
      // If this npc is attacking a player, move on to the next npc
      if (npc.attacking) {
        continue;   
      }
      
      // Distance between two points using pythagorean theorem
      distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
      
      if (distance < 300) {
        npc.attacking     = true;
        npc.target        = self.playerKeys[i];
        
        // Clear out any existing walkpaths
        npc.steps         = [];
        npc.step          = 0;
        
        player.attackers[self.npcKeys[j]] = npc;
        
        console.log('NPC[%s] spotted a player...', self.npcKeys[j]);
        
        break;
      }
    }
    
    // Pulse health/stamina updates every ~2/5ths of a second (every 384ms)
    if (player.counter > 12) {
      if (player.stamina < 100) {
        player.stamina++;
        modified = true;
      }
      if (player.health < 100) {
        player.health++;
        modified = true;
      }
      
      player.counter = 0;
      
      if (modified) {
        if (self.broadcast.players[player.id]) {
          self.broadcast.players[player.id].stamina = player.stamina;
          self.broadcast.players[player.id].health = player.health;   
        } else {
          self.broadcast.players[player.id] = {stamina: player.stamina, health: player.health};
        }
      }
    }
    
  }
  
  // Loop through npcs
  for (i = 0; i < self.npcKeys.length; i++) {
    
    direction = -1;
    npc = self.npcs[self.npcKeys[i]];
    map = self.maps[npc.map];
    
    // Is this npc in attack mode?
    if (npc.attacking) {
      
      player = self.players[npc.target];
      
      if (player.death) {
        npc.attacking = false;
        console.log('NPC[%s] skipped as player is dead...', self.npcKeys[i]);
        continue;
      }
      
      npc.counter++;
      
      if (npc.cooldown > 0) {
        npc.cooldown++;
        if (npc.cooldown == 20) {
          npc.cooldown = 0;
        } else {
          continue;
        }
      }
      
      var distance_x = npc.position.x-player.position.x;
      var distance_y = npc.position.y-player.position.y;
      
      distance = Math.sqrt( Math.pow(distance_x , 2) + Math.pow(distance_y,2) );
      
      if (npc.counter % 2) {
        
        if (distance < 33) {
          
          npc.cooldown = 1;
          
          if (self.broadcast.npcs[self.npcKeys[i]]) {
            self.broadcast.npcs[self.npcKeys[i]].attack = true;
          } else {
            self.broadcast.npcs[self.npcKeys[i]] = {attack: true};
          }
          
          player.health -= 10;
          
          if (player.health > 0) {
            if (self.broadcast.players[player.id]) {
              self.broadcast.players[player.id].health = player.health;   
            } else {
              self.broadcast.players[player.id] = {health: player.health};
            }
          } else {
            // Player dies, oh no
            player.counter    = 0;
            player.death      = true;
            player.attackers  = {};
            
            npc.target = -1;
            npc.attacking = false;
            
            self.broadcast.players[player.id] = player;
          }
          
          continue;
        }
      }
      
      if (npc.counter > 45) {
        // Once per second and a half we check if the player has ran out of range
        npc.counter = 0;
        
        if (distance > 300) {
          npc.attacking = false;  
          npc.target = -1;
          delete player.attackers[self.npcKeys[i]];
          continue;
        }
      }
      
      // NPC should follow it's target
      if (distance > 32) {
  
        var originalX = npc.position.x;
        var originalY = npc.position.y;
        var originalDirection = npc.direction;
  
        // Vertical movement
        if (Math.abs(distance_y) > difference) {
          if (originalY < player.position.y) {
            originalY         += difference;
            originalDirection  = DIRECTION_S;
          } else {
            originalY         -= difference; 
            originalDirection  = DIRECTION_N;
          }
        }
        
        // Test if the proposed vertical movement is valid:
        col = Math.floor( originalX / TILE_WIDTH );
        row = Math.floor( originalY / TILE_HEIGHT );
        
        if (this.walkable( map, row, col )) {
          npc.position.y = originalY;
          npc.direction  = originalDirection;
        }
        
        // Horizontal movement
        if (Math.abs(distance_x) > difference) {
          if (originalX < player.position.x) {
            originalX         += difference;
            originalDirection  = DIRECTION_E;
          } else {
            originalX         -= difference; 
            originalDirection  = DIRECTION_W;
          }
        }
        
        col = Math.floor( originalX / TILE_WIDTH );
        row = Math.floor( originalY / TILE_HEIGHT );
        
        if (this.walkable( map, row, col )) {
          npc.position.x = originalX;
          npc.direction  = originalDirection;
        }
      }
      
      if (self.broadcast.npcs[self.npcKeys[i]]) {
        self.broadcast.npcs[self.npcKeys[i]].position = npc.position;
        self.broadcast.npcs[self.npcKeys[i]].direction = npc.direction;
      } else {
        self.broadcast.npcs[self.npcKeys[i]] = {position: npc.position,
                        direction: npc.direction};
      }
      continue;
    }
    
    // If we got this far, the counter is a sleep counter
    if (npc.counter > 0) {
      npc.counter--;
      continue;
    }
    
    if (npc.step === npc.steps.length) {
      // If we have a step equal to the length of the step array, we walked em all, 
      // we need to generate a new walking path
      
      npc.steps.length  = 0;
      npc.step      = 0;
      
      // ~75% chance of starting a walk
      if (Math.random() < 0.76) {
        
        var options     = [];
        var randomizer  = 0;
        var walkRandom  = 0;
        
        direction = npc.direction;
        
        // What row/col are we in?
        col = Math.floor( npc.position.x / TILE_WIDTH );
        row = Math.floor( npc.position.y / TILE_HEIGHT );
        
        // NPC can move maximum five tiles away
        for (j = 0; j < 5; j++) {
          
          randomizer     = Math.floor(Math.random() * 100);
          options.length = 0;
          
          // Add either our first or an additional tile step (having diminishing odds)
          if (randomizer > (16 + (12 * j))) {
            
            // Can we walk north? (and also was our last direction not south, to avoid walking in circles)
            if ((this.walkable( map, row - 1, col )) && ( direction !== DIRECTION_S )) {
              options.push(DIRECTION_N);
              if (direction == DIRECTION_N) {
                // If the last time we moved it was this way, increase the odds to keep going
                options.push(DIRECTION_N);
                options.push(DIRECTION_N);
                options.push(DIRECTION_N);
              }
            }
            
            // Can we walk east?
            if ((this.walkable( map, row, col + 1 )) && ( direction !== DIRECTION_W )) {
              options.push(DIRECTION_E);
              if (direction == DIRECTION_E) {
                // If the last time we moved it was this way, increase the odds to keep going
                options.push(DIRECTION_E);
                options.push(DIRECTION_E);
                options.push(DIRECTION_E);
              }
            }
            
            // Can we walk south?
            if ((this.walkable( map, row + 1, col )) && ( direction !== DIRECTION_N )) {
              options.push(DIRECTION_S);
              if (direction == DIRECTION_S) {
                // If the last time we moved it was this way, increase the odds to keep going
                options.push(DIRECTION_S);
                options.push(DIRECTION_S);
                options.push(DIRECTION_S);
              }
            }
            
            // Can we walk west?
            if ((this.walkable( map, row, col - 1 )) && ( direction !== DIRECTION_E )) {
              options.push(DIRECTION_W);
              if (direction == DIRECTION_W) {
                // If the last time we moved it was this way, increase the odds to keep going
                options.push(DIRECTION_W);
                options.push(DIRECTION_W);
                options.push(DIRECTION_W);
              }
            }
            
            direction   = options[ Math.floor(Math.random() * options.length) ];
            walkRandom = Math.floor(Math.random() * 32) - 16;
            
            switch (direction) {
              case DIRECTION_N:
                npc.steps.push({
                  x: (col * 32) + 16 + walkRandom, 
                  y: ((row - 1) * 32) + 16 + walkRandom
                });
                break;
              case DIRECTION_E:
                npc.steps.push({
                  x: ((col + 1) * 32) + 16 + walkRandom,
                  y: ((row * 32) + 16 + walkRandom)
                });
                break;
              case DIRECTION_S:
                npc.steps.push({
                  x: (col * 32) + 16 + walkRandom,
                  y: ((row + 1) * 32) + 16 + walkRandom
                });
                break;
              case DIRECTION_W:
                npc.steps.push({
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
        npc.counter   = Math.floor( Math.random() * 100 );
        self.broadcast.npcs[self.npcKeys[i]] = {
          position: npc.position,
          direction: npc.direction
        };
      }
    }
    
    if (npc.steps.length > 0) {
      
      var npc_step  = npc.steps[npc.step];

      direction = npc.direction;
      
      if (npc.position.y > npc_step.y) {
        direction = DIRECTION_N;
        npc.position.y--;
      } else if (npc.position.y < npc_step.y) {
        direction = DIRECTION_S;
        npc.position.y++;
      }
      
      if (npc.position.x > npc_step.x) {
        direction = DIRECTION_W;
        npc.position.x--;
      } else if (npc.position.x < npc_step.x) {
        direction = DIRECTION_E;
        npc.position.x++;
      }
      
      if ((npc.position.x == npc_step.x) &&
        (npc.position.y == npc_step.y)) {
        npc.step++;
      }
      
      npc.direction = direction;
      self.broadcast.npcs[self.npcKeys[i]] = {
        position: npc.position,
        direction: npc.direction
      };
    }
    
    npc.taunt--;
    if (npc.taunt === 0) {
      // ~25% chance of emoting every 10-30 seconds
      if (Math.random() < 0.26) {
        
        // Kind of a goofy way of handling a special NPC
        var emote_target = EMOTES_HUMAN;
        if (npc.id === 0) {
          emote_target = EMOTES_NECROMANCER;
        }
        
        var emote = emote_target[getRandomInt(0, emote_target.length - 1)];
      
        console.log('NPC[%s] is emoting: %s', npc.id, emote);
        
        if (self.broadcast.npcs[npc.id]) {
          self.broadcast.npcs[npc.id].blurb = emote;
        } else {
          self.broadcast.npcs[npc.id] = {
            blurb: emote
          };
        }
      }
      npc.taunt = 30 * getRandomInt(10, 30);
    }
  }
    
};

Engine.prototype.walkable = function (map, row, col) {
  if (map.terrain.index[row] !== undefined) {
    if (map.terrain.index[row][col] !== undefined) {
      if ((map.terrain.index[row][col][2] !== undefined) &&
        (map.terrain.index[row][col][2] !== null)) {
        return false;
      } else {
        return true;
      }
    }
  }
  
  return false;
};

Engine.prototype.attack = function (player) {
  
  var self = this;
  
  if (player.stamina < 10) {
    return;   
  }
  
  if (!player.attackers) {
    return;
  }
  
  if (player.attackers == {}) {
    return;
  }
  
  var tx = 0;
  var ty = 0;
  var th = 0;
  var tw = 0;
  var npc;
  
  player.stamina -= 10;
  
  // TODO: Different hitboxes based up direction the npc is looking

  tw = 64;
  th = 64;
  tx = player.position.x - 32;
  ty = player.position.y - 32;
  
  // tmi
  // console.log('Player %s is at {x: %d, y: %d} and has attacked!', player.id, tx, ty);
  
  var attackers = Object.keys(player.attackers);
  
  // tmi
  // console.log('[PLAYER %s]: Attacks at %s', player.id, JSON.stringify(attackers));
  
  for (var i = 0; i < attackers.length; i++) {
    npc = self.npcs[attackers[i]];
    
    if ((npc.position.x > tx) && (npc.position.x < (tx + tw))) {
      if ((npc.position.y > ty) && (npc.position.y < (ty + th))) {
        npc.health -= (10 + player.experience);
        if (self.broadcast.npcs[attackers[i]]) {
          self.broadcast.npcs[attackers[i]].health = npc.health;
        } else {
          self.broadcast.npcs[attackers[i]] = {
            health: npc.health
          };
        }
        
        if (npc.health < 1) {
          delete self.npcs[attackers[i]];
          delete player.attackers[attackers[i]];
          self.npcKeys = Object.keys(self.npcs);
          player.experience++;
          
          if (self.broadcast.players[player.id]) {
            self.broadcast.players[player.id].experience = player.experience;
          } else {
            self.broadcast.players[player.id] = {
              experience: player.experience
            };
          }
        }
        
        break;
      }
    }
  }
  
  if (self.broadcast.players[player.id]) {
    self.broadcast.players[player.id].stamina = player.stamina;
  } else {
    self.broadcast.players[player.id] = {
      stamina: player.stamina
    };
  }
  
};

Engine.prototype.addBroadcast = function (player) {
  this.broadcast.players[player.id] = {
    position: player.position,
    direction: player.direction
  };
};

Engine.prototype.broadcastComplete = function () {
  this.broadcast = {
    players: {},
    npcs:    {}
  };
};
  
Engine.prototype.broadcast = function () {
  return this.broadcast;
};
  
Engine.prototype.actors = function () {
  return this.actors;
};
  
Engine.prototype.npcs = function () {
  return this.npcs;
};
  
Engine.prototype.players = function () {
  return this.players;
};

// Add player from the DB definition, player has joined before
Engine.prototype.addPlayer = function (player) {
  
  var self= this;
  
  // If we are missing the experience attribute the database has no record of this player so 
  // we set the default values, a player's structure is saved to the database when they disconnect
  if (player.experience === undefined) {
    player.direction  = 0;
    player.health     = 100;
    player.stamina    = 100;
    player.experience = 0;
    player.counter    = 0;
    player.map        = 0;
    player.attackers  = {};
    player.position   = {
      x: 448,
      y: 192
    };
  }
  
  self.players[player.id] = player;
  self.playerKeys = Object.keys(self.players);
};

Engine.prototype.removePlayer = function (player) {
  var self = this;
  
  self.broadcast.players[player.id] = {remove: true};
  delete self.players[player.id];
  self.playerKeys = Object.keys(self.players);
};

Engine.prototype.spawn = function() {
  
  var self = this;
  
  self.npcs[self.npcSpawnCount] = {
    id:         self.npcSpawnCount,
    direction:  0,
    health:     100,
    experience: 0,
    layers:     [],
    step:       0,
    steps:      [],   // Pathfinding
    counter:    0,    // Generic counter used for a variety of functions
    attacking:  false,
    cooldown:   0,
    taunt:      30 * 10, // 30 ticks per second times 10 = 300 ticks or 10 second delay
    target:     -1,
    map:        0,    // Index of map in map array this npc is on
    position:   {
      x: -41 * 32,
      y: 41 * 32
    }
  };
  
  // NPC assets are loaded into the movieclip (client-side) in the same order
  // as the array, so the 'bottom' piece is the one with the lowest index
  
  // Head: 5-10
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(5, 10));
  
  // Torso: 14-19
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(14, 19));
  
  // Torso detail: 20-22
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(20, 22));
  
  // Belt: 0-1
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(0, 1));
  
  // Legs: 11-13
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(11, 13));
  
  // Feet: 2-3
  self.npcs[self.npcSpawnCount].layers.push(getRandomInt(2, 3));
  
  // Hands: 4
  rand = Math.random();
  if (rand <= 0.5) {
    self.npcs[self.npcSpawnCount].layers.push(4);
  }
  
  self.npcKeys = Object.keys(self.npcs);
  
  // Using this opportunity to demonstrate out-of-loop broadcasts... adding players and npcs
  // could easily be incorporated into the main broadcast loop
  self.emit('create', { 
    npcs: {
      npcSpawnCount: self.npcs[self.npcSpawnCount]
    },
    players: {}
  });
  
  // ~19% chance of emoting on spawn 
  if (Math.random() < 0.2) {
    var emote = EMOTES_HUMAN[getRandomInt(0, EMOTES_HUMAN.length - 1)];
  
    console.log('NPC[%d] is emoting: %s', self.npcSpawnCount, emote);
    
    if (self.broadcast.npcs[self.npcSpawnCount]) {
      self.broadcast.npcs[self.npcSpawnCount].blurb = emote;
    } else {
      self.broadcast.npcs[self.npcSpawnCount] = {
        blurb: emote
      };
    }
  }
  
  self.npcSpawnCount++;
  
};

module.exports = Engine;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
