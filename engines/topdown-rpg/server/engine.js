var EventEmitter  = require('events').EventEmitter;
var util          = require('util');
var fs            = require('fs');

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

var npcs            = {};
var npcKeys         = [];
var players         = {};
var npcSpawnCount   = 1;
var tickCount       = 0;
var playerKeys      = [];
var maps            = [];

var actors = {
  players: players, 
  npcs: npcs
};

var broadcast = {
  players: {},
  npcs: {}
};

var settings = {
  events: ["move"]
};

function Engine () {
  EventEmitter.call(this);
}

util.inherits(Engine, EventEmitter);
module.exports = Engine;

Engine.prototype.initialize = function (callback) {
  
  var self = this;
  
  // TODO: Implement a 'readJSON' function outside of here so the user doesn't have access to 'fs' to read any file they want,
  // 'readJSON' would be restricted to thier directory and would only read .json and return the parsed object
  
  // Perhaps first scan the engine file and remove any occurance of 'fs.' then append the engine.js file with 
  //   var fs = require('fs');
  //   function readJSON { fs. etc etc
  
  fs.readFile(__dirname + '/../client/maps/town.json', function (error, data) {
    if (error) {
      return callback(error);
    }
    maps.push(JSON.parse(data));
    
    // Create the dark necromancer 'Chase'
    npcs[0] = {
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
      map:        0,    // Index of map in map array this npc is on
      position:   {
        x: 14 * 32,
        y: 2 * 32
      }
    };
    
    npcKeys = Object.keys(npcs);
    
    self.spawn();
    
    callback();
  });

};

Engine.prototype.tick = function () {
    
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
  
  tickCount++;
  
  if (tickCount > 1800) {
    // Every minute fire and reset
    tickCount = 0;
    
    var toughness = 0;
    
    for (i = 0; i < playerKeys.length; i++) {
      // Factor the players experience with an additional +1 for being alive
      toughness += (players[playerKeys[i]].experience === undefined ? 0 : players[playerKeys[i]].experience) + 1;
    }
    
    // For every 6 baddies you've killed, you can handle an additional spawn
    toughness /= 6;
    
    // Even if we have no players, we need +1 for the necromancer and +1 for one spawn
    toughness += 2;
    
    toughness = Math.round(toughness);
    
    // If we have less npcs than players' combined stength, spawn new ones:
    while (npcKeys.length < toughness) {
      this.spawn();
    }
  }
  
  for (i = 0; i < playerKeys.length; i++) {
    player    = players[playerKeys[i]];
    map       = maps[player.map];
    modified  = false;
    
    player.counter++;
    
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
        
        broadcast.players[player.id] = player;
      }
      continue;
    }
    
    // Is this player triggering an unfortunate NPC?
    for (j = 1; j < npcKeys.length; j++) {
      npc = npcs[npcKeys[j]];
      
      // If this npc is attacking a player, move on to the next npc
      if (npc.attacking) {
        continue;   
      }
      
      // Distance between two points using pythagorean theorem
      distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
      
      if (distance < 300) {
        npc.attacking     = true;
        npc.target        = playerKeys[i];
        
        // Clear out any existing walkpaths
        npc.steps         = [];
        npc.step          = 0;
        
        player.attackers[npcKeys[j]] = npc;
        
        this.emit('debug', 'NPC[' + npcKeys[j] + '] spotted a player...');
        
        break;
      }
    }
    
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
        if (broadcast.players[player.id]) {
          broadcast.players[player.id].stamina = player.stamina;
          broadcast.players[player.id].health = player.health;   
        } else {
          broadcast.players[player.id] = {stamina: player.stamina, health: player.health};
        }
      }
    }
    
  }
  
  for (i = 0; i < npcKeys.length; i++) {
    
    direction = -1;
    npc = npcs[npcKeys[i]];
    map = maps[npc.map];
    
    // Is this npc in attack mode?
    if (npc.attacking) {
      
      player = players[npc.target];
      
      if (player.death) {
        npc.attacking = false;
        this.emit('debug', 'NPC[' + npcKeys[i] + '] skipped as player is dead...');
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
          
          if (broadcast.npcs[npcKeys[i]]) {
            broadcast.npcs[npcKeys[i]].attack = true;
          } else {
            broadcast.npcs[npcKeys[i]] = {attack: true};
          }
          
          player.health -= 10;
          
          if (player.health > 0) {
            if (broadcast.players[player.id]) {
              broadcast.players[player.id].health = player.health;   
            } else {
              broadcast.players[player.id] = {health: player.health};
            }
          } else {
            // Player dies, oh no
            player.counter    = 0;
            player.death      = true;
            player.attackers  = {};
            
            npc.target = -1;
            npc.attacking = false;
            
            broadcast.players[player.id] = player;
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
          delete player.attackers[npcKeys[i]];
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
      
      if (broadcast.npcs[npcKeys[i]]) {
        broadcast.npcs[npcKeys[i]].position = npc.position;
        broadcast.npcs[npcKeys[i]].direction = npc.direction;
      } else {
        broadcast.npcs[npcKeys[i]] = {position: npc.position,
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
        broadcast.npcs[npcKeys[i]] = {
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
      broadcast.npcs[npcKeys[i]] = {
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
      
        this.emit('debug', 'NPC[' + npc.id + '] is emoting: ' + emote);
        
        if (broadcast.npcs[npc.id]) {
          broadcast.npcs[npc.id].blurb = emote;
        } else {
          broadcast.npcs[npc.id] = {
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
  //if (player.direction == DIRECTION_N) {
  tw = 64;
  th = 64;
  tx = player.position.x - 32;
  ty = player.position.y - 32; // }
  
  this.emit('debug', 'Player ' + player.id + ' is attacking: ' + tx + ', ' + ty);
  
  var attackers = Object.keys(player.attackers);
  
  console.log('player.attackers: ' + JSON.stringify(player.attackers));
  console.log('attackers: ' + JSON.stringify(attackers));
  
  for (var i = 0; i < attackers.length; i++) {
    npc = npcs[attackers[i]];
    
    // this.emit('debug', 'testing attack against ' + JSON.stringify(npc.position));
    
    if ((npc.position.x > tx) && (npc.position.x < (tx + tw))) {
      if ((npc.position.y > ty) && (npc.position.y < (ty + th))) {
        npc.health -= (10 + player.experience);
        if (broadcast.npcs[attackers[i]]) {
          broadcast.npcs[attackers[i]].health = npc.health;
        } else {
          broadcast.npcs[attackers[i]] = {
            health: npc.health
          };
        }
        
        if (npc.health < 1) {
          delete npcs[attackers[i]];
          delete player.attackers[attackers[i]];
          npcKeys = Object.keys(npcs);
          player.experience++;
          
          if (broadcast.players[player.id]) {
            broadcast.players[player.id].experience = player.experience;
          } else {
            broadcast.players[player.id] = {
              experience: player.experience
            };
          }
        }
        
        break;
      }
    }
  }
  
  if (broadcast.players[player.id]) {
    broadcast.players[player.id].stamina = player.stamina;
  } else {
    broadcast.players[player.id] = {
      stamina: player.stamina
    };
  }
  
};

Engine.prototype.addBroadcast = function (player) {
  broadcast.players[player.id] = {
    position: player.position,
    direction: player.direction
  };
};

Engine.prototype.broadcastComplete = function () {
  broadcast = {
    players: {},
    npcs:    {}
  };
};
  
Engine.prototype.broadcast = function () {
  return broadcast;
};
  
Engine.prototype.actors = function () {
  return actors;
};
  
Engine.prototype.npcs = function () {
  return npcs;
};
  
Engine.prototype.players = function () {
  return players;
};

// Add player from the DB definition, player has joined before
Engine.prototype.addPlayer = function (player) {
  
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
  
  players[player.id] = player;
  playerKeys = Object.keys(players);
};

Engine.prototype.removePlayer = function (player) {
  broadcast.players[player.id] = {remove: true};
  delete players[player.id];
  playerKeys = Object.keys(players);
};

Engine.prototype.spawn = function() {
  
  npcs[npcSpawnCount] = {
    id:         npcSpawnCount,
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
  npcs[npcSpawnCount].layers.push(getRandomInt(5, 10));
  
  // Torso: 14-19
  npcs[npcSpawnCount].layers.push(getRandomInt(14, 19));
  
  // Torso detail: 20-22
  npcs[npcSpawnCount].layers.push(getRandomInt(20, 22));
  
  // Belt: 0-1
  npcs[npcSpawnCount].layers.push(getRandomInt(0, 1));
  
  // Legs: 11-13
  npcs[npcSpawnCount].layers.push(getRandomInt(11, 13));
  
  // Feet: 2-3
  npcs[npcSpawnCount].layers.push(getRandomInt(2, 3));
  
  // Hands: 4
  rand = Math.random();
  if (rand <= 0.5) {
    npcs[npcSpawnCount].layers.push(4);
  }
  
  npcKeys = Object.keys(npcs);
  
  this.emit('create', { 
    npcs: {
      npcSpawnCount: npcs[npcSpawnCount]
    },
    players: {}
  });
  
  // ~19% chance of emoting on spawn
  if (Math.random() < 0.2) {
    var emote = EMOTES_HUMAN[getRandomInt(0, EMOTES_HUMAN.length - 1)];
  
    this.emit('debug', 'NPC[' + npcSpawnCount + '] is emoting: ' + emote);
    
    if (broadcast.npcs[npcSpawnCount]) {
      broadcast.npcs[npcSpawnCount].blurb = emote;
    } else {
      broadcast.npcs[npcSpawnCount] = {
        blurb: emote
      };
    }
  }
  
  npcSpawnCount++;
  
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
