var EventEmitter  = require('events').EventEmitter;
var util          = require('util');
var fs            = require('fs');

var DIRECTION_N = 0;
var DIRECTION_W = 1;
var DIRECTION_S = 2;
var DIRECTION_E = 3;

var TILE_WIDTH  = 32;
var TILE_HEIGHT = 32;

var npcs            = {};
var npcKeys         = [];
var players         = {};
var npcSpawnCount   = 0;
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
  var original       = 0;
  var direction      = -1;
  var difference     = 0;
  var attackBounding = 32;
  var player;
  var map;
  var npc;
  
  tickCount++;
  
  if (tickCount > 1800) {
    // Every minute fire and reset
    tickCount = 0;
    
    // If we have less npc's than players, spawn a new one:
    if (npcKeys.length < playerKeys.length + 2) {
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
          
        player.position   = {x: 220, y: 220};
        player.direction  = 0;
        player.health     = 100;
        player.stamina    = 100;
        player.experience = 0;
        player.death      = false;
        player.counter    = 0;
        
        broadcast.players[player.id] = player;
      }
      continue;
    }
    
    // Is this player triggering an unfortunate NPC?
    for (j = 0; j < npcKeys.length; j++) {
      npc = npcs[npcKeys[j]];
      
      // If this npc is attacking a player, move on to the next npc
      if (npc.attacking) {
        continue;   
      }
      
      // Distance between two points using pythagorean theorem
      distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
      
      if (distance < 300) {
        npc.attacking = true;
        npc.target    = playerKeys[i];
        
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
      
      if (npc.counter % 2) {
        distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
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
            player.counter  = 0;
            player.death    = true;
            
            broadcast.players[player.id] = player;
          }
          
          continue;
        }
      }
      
      if (npc.counter > 45) {
        // Once per second and a half we check if the player has ran out of range
        npc.counter = 0;
        distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
        if (distance > 300) {
          npc.attacking = false;  
          continue;
        }
      }
      
      // Y calculations
      difference = Math.abs(npc.position.y - player.position.y);
      if (difference > attackBounding) {
        if (difference > attackBounding + 2) {
          difference = 3;   
        }
        
        original = npc.position.y;
        
        if (npc.position.y < player.position.y) {
          npc.position.y += difference;
          npc.direction   = DIRECTION_S;
        } else {
          npc.position.y -= difference; 
          npc.direction   = DIRECTION_N;
        }
        
        col = Math.floor( npc.position.x / TILE_WIDTH );
        row = Math.floor( npc.position.y / TILE_HEIGHT );
        
        if (!this.walkable( map, row, col )) {
          npc.position.y = original;
        }
      }
      
      // X calculations
      difference = Math.abs(npc.position.x - player.position.x);
      if (difference > attackBounding) {
        if (difference > attackBounding + 2) {
          difference = 3;   
        }
        
        original = npc.position.x;
        
        if (npc.position.x < player.position.x) {
          npc.position.x += difference;
          npc.direction   = DIRECTION_E;
        } else {
          npc.position.x -= difference; 
          npc.direction   = DIRECTION_W;
        }
        
        col = Math.floor( npc.position.x / TILE_WIDTH );
        row = Math.floor( npc.position.y / TILE_HEIGHT );
        
        if (!this.walkable( map, row, col )) {
          npc.position.x = original;
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
    
    if (npcs[npcKeys[i]].step === npcs[npcKeys[i]].steps.length) {
      // If we have a step equal to the length of the step array, we walked em all, 
      // we need to generate a new walking path
      
      npcs[npcKeys[i]].steps.length  = 0;
      npcs[npcKeys[i]].step      = 0;
      
      // ~25% chance of resuming a walk
      if (Math.random() < 0.26) {
        
        var options     = [];
        var randomizer  = 0;
        var walkRandom  = 0;
        
        // What row/col are we in?
        col = Math.floor( npcs[npcKeys[i]].position.x / TILE_WIDTH );
        row = Math.floor( npcs[npcKeys[i]].position.y / TILE_HEIGHT );
        
        // NPC can move maximum five tiles away
        for (j = 0; j < 5; j++) {
          
          randomizer    = Math.floor(Math.random() * 100);
          options.length  = 0;
          
          // Add either our first or an additional tile step (having diminishing odds)
          if (randomizer > (16 + (12 * j))) {
            
            // Can we walk north? (and also was our last direction not south, to avoid walking in circles)
            if ((this.walkable( map, row - 1, col )) && ( direction !== DIRECTION_S )) {
              options.push(DIRECTION_N);
              if (direction == DIRECTION_N) {
                // If the last time we moved it was this way, double the odds to keep going
                options.push(DIRECTION_N);
              }
            }
            
            // Can we walk east?
            if ((this.walkable( map, row, col + 1 )) && ( direction !== DIRECTION_W )) {
              options.push(DIRECTION_E);
              if (direction == DIRECTION_E) {
                // If the last time we moved it was this way, double the odds to keep going
                options.push(DIRECTION_E);
              }
            }
            
            // Can we walk south?
            if ((this.walkable( map, row + 1, col )) && ( direction !== DIRECTION_N )) {
              options.push(DIRECTION_S);
              if (direction == DIRECTION_S) {
                // If the last time we moved it was this way, double the odds to keep going
                options.push(DIRECTION_S);
              }
            }
            
            // Can we walk west?
            if ((this.walkable( map, row, col - 1 )) && ( direction !== DIRECTION_E )) {
              options.push(DIRECTION_W);
              if (direction == DIRECTION_W) {
                // If the last time we moved it was this way, double the odds to keep going
                options.push(DIRECTION_W);
              }
            }
            
            direction   = options[ Math.floor(Math.random() * options.length) ];
            walkRandom = Math.floor(Math.random() * 32) - 16;
            
            switch (direction) {
              case DIRECTION_N:
                npcs[npcKeys[i]].steps.push({
                  x: (col * 32) + 16 + walkRandom, 
                  y: ((row - 1) * 32) + 16 + walkRandom
                });
                break;
              case DIRECTION_E:
                npcs[npcKeys[i]].steps.push({
                  x: ((col + 1) * 32) + 16 + walkRandom,
                  y: ((row * 32) + 16 + walkRandom)
                });
                break;
              case DIRECTION_S:
                npcs[npcKeys[i]].steps.push({
                  x: (col * 32) + 16 + walkRandom,
                  y: ((row + 1) * 32) + 16 + walkRandom
                });
                break;
              case DIRECTION_W:
                npcs[npcKeys[i]].steps.push({
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
        npcs[npcKeys[i]].counter   = Math.floor( Math.random() * 100 );
        broadcast.npcs[npcKeys[i]] = {
          position: npcs[npcKeys[i]].position,
          direction: npcs[npcKeys[i]].direction
        };
      }
    }
    
    if (npcs[npcKeys[i]].steps.length > 0) {
      
      var npc_step  = npcs[npcKeys[i]].steps[npcs[npcKeys[i]].step];

      direction = npcs[npcKeys[i]].direction;
      
      if (npcs[npcKeys[i]].position.y > npc_step.y) {
        direction = DIRECTION_N;
        npcs[npcKeys[i]].position.y--;
      } else if (npcs[npcKeys[i]].position.y < npc_step.y) {
        direction = DIRECTION_S;
        npcs[npcKeys[i]].position.y++;
      }
      
      if (npcs[npcKeys[i]].position.x > npc_step.x) {
        direction = DIRECTION_W;
        npcs[npcKeys[i]].position.x--;
      } else if (npcs[npcKeys[i]].position.x < npc_step.x) {
        direction = DIRECTION_E;
        npcs[npcKeys[i]].position.x++;
      }
      
      if ((npcs[npcKeys[i]].position.x == npc_step.x) &&
        (npcs[npcKeys[i]].position.y == npc_step.y)) {
        npcs[npcKeys[i]].step++;
      }
      
      npcs[npcKeys[i]].direction = direction;
      broadcast.npcs[npcKeys[i]] = {
        position: npcs[npcKeys[i]].position,
        direction: npcs[npcKeys[i]].direction
      };
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
  
  for (var i = 0; i < npcKeys.length; i++) {
    npc = npcs[npcKeys[i]];
    
    // this.emit('debug', 'testing attack against ' + JSON.stringify(npc.position));
    
    if ((npc.position.x > tx) && (npc.position.x < (tx + tw))) {
      if ((npc.position.y > ty) && (npc.position.y < (ty + th))) {
        npc.health -= 10;
        if (broadcast.npcs[npcKeys[i]]) {
          broadcast.npcs[npcKeys[i]].health = npc.health;
        } else {
          broadcast.npcs[npcKeys[i]] = {
            health: npc.health
          };
        }
        
        if (npc.health < 1) {
          delete npcs[npcKeys[i]];
          npcKeys = Object.keys(npcs);
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

Engine.prototype.createPlayer = function () {
  var player = {
    id:         0, // Note: This value will be overwritten
    direction:  0,
    health:     100,
    stamina:    100,
    experience: 0,
    counter:    0,
    map:        0,
    position:   {
      x: 220,
      y: 220
    },
  };
  
  return player;
};
  
Engine.prototype.addPlayer = function (player) {
  players[player.id] = player;
  playerKeys = Object.keys(players);
};

Engine.prototype.removePlayer = function (player) {
  
  this.emit('destroy', player);
  
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
  
  // Torso: 13-18
  npcs[npcSpawnCount].layers.push(getRandomInt(13, 18));
  
  // Torso detail: 19-21
  npcs[npcSpawnCount].layers.push(getRandomInt(19, 21));
  
  // Belt: 0-1
  npcs[npcSpawnCount].layers.push(getRandomInt(0, 1));
  
  // Legs: 11-12
  npcs[npcSpawnCount].layers.push(getRandomInt(11, 12));
  
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
  
  npcSpawnCount++;
  
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
