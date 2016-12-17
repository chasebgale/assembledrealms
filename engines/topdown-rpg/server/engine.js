/*
Due to security concerns, non-local require and eval statements will prevent 
the server from compiling. 

A valid require statement will look like: 

  var actor = require('./actor'); 
  var boss  = require('./actors/boss');

This loads actor.js from /server/ and boss.js from /server/actors/, 
Restricted to reading files from your realm's directory, require target string
should start with a '.' and should not contain '..'

Access to protected functionality is exposed via the following functions:
  
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

var npc     = require('./npc');
var player  = require('./player');

global.DIRECTION_N   = 0;
global.DIRECTION_W   = 1;
global.DIRECTION_S   = 2;
global.DIRECTION_E   = 3;
global.DIRECTION_NE  = 4;
global.DIRECTION_NW  = 5;
global.DIRECTION_SE  = 6;
global.DIRECTION_SW  = 7;

global.TILE_WIDTH  = 32;
global.TILE_HEIGHT = 32;

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

}

// Called when first loading your realm
Engine.prototype.initialize = function (callback) {
  
  var self = this;
  
  self.readFile('client/maps/town.json', function (error, data) {
    if (error) {
      return callback(error);
    }
    self.maps.push(JSON.parse(data));
    
    // Create the dark necromancer npc with the id '0'
    var necromancer = new npc(0);
    
    // Manually assigning my clothes, not randomly generating
    necromancer.layers = [10, 19, 1, 2, 4, 13];
    
    // Overriding the default spawn location
    necromancer.position = { x: 14 * 32, y: 2 * 32 };
    
    // Adding special taunts
    necromancer.emotes = [
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
    
    self.npcs[necromancer.id] = necromancer;
    self.npcKeys = Object.keys(self.npcs);
    
    self.spawn();
    
    callback();
  });

};

// Called every 32ms, 30 fps - update the broadcast object and the server 
// broadcasts it for you
Engine.prototype.tick = function () {
    
  var self           = this;
    
  var i              = 0;
  var j              = 0;
  var row            = 0;
  var col            = 0;
  var distance       = 0;
  var direction      = -1;
  var attackBounding = 32;
  
  var npc;
  var player;
  var map;
  var modified;
  
  self.tickCount++;
  
  // Check if we need to create more bad guys
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
    modified  = player.tick();
    
    var bounds = { 
      left:   player.position.x - 150,
      right:  player.position.x + 150,
      top:    player.position.y - 150,
      bottom: player.position.y + 150
    };
    
    // Is this player triggering an unfortunate NPC? 
    for (j = 1; j < self.npcKeys.length; j++) {
      npc = self.npcs[self.npcKeys[j]];
      
      // First check we weed out npcs outside of our vertical hit box
      if ((npc.position.x > bounds.left) && (npc.position.x < bounds.right)) {
        // Second check, is the npc inside of our horizontal hit box?
        if ((npc.position.y > bounds.top) && (npc.position.y < bounds.bottom)) {
          
          // If this npc is not attacking someone else, direct it to this player
          if (!npc.attacking) {
            npc.attacking     = true;
            npc.target        = self.playerKeys[i];
            
            // Clear out any existing walkpaths
            npc.steps         = [];
            npc.step          = 0;
          }
          
          player.attackers[self.npcKeys[j]] = npc;
          modified.attckers = player.attackers; 
        }
      }
    }
      
    // Distance between two points using pythagorean theorem
    // More accurate hit box, i.e. a 300px circumfrence circle around the player instead of the 300px bounding box used above
    // Slower to calculate, no need for percision in this game
    // distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
      
    if ((modified !== {}) && (modified !== false)) {
      if (self.broadcast.players[player.id]) {
        // If we had out-of-loop additions to our broadcast (e.g. experience, health, stamina)
        // add them to the modified tracker so they don't get overwritten
        
        // Object.assign(modified, self.broadcast.players[player.id]);
        
        for (var nextKey in self.broadcast.players[player.id]) {
          modified[nextKey] = self.broadcast.players[player.id][nextKey];
        }
      }
      self.broadcast.players[player.id] = modified;
    }
    
  }
  
  // Loop through npcs
  for (i = 0; i < self.npcKeys.length; i++) {
    
    direction = -1;
    npc = self.npcs[self.npcKeys[i]];
    map = self.maps[npc.map];
    
    modified = npc.tick(map, self.players[npc.target], self.walkable);
    
    if ((modified !== {}) && (modified !== false)) {
      // Check if the npc caused an update to a player
      if (modified.attackee) {
        if (modified.attackee.death) {
          // If the player died as a result, overwrite any previously computed updates and replace 
          // with the modified values from the npc
          self.broadcast.players[player.id] = modified.attackee;
        } else {
          if (self.broadcast.players[player.id]) {
            self.broadcast.players[player.id].health = modified.attackee.health; 
          } else {
            self.broadcast.players[player.id] = {health: modified.attackee.health};
          }
        }
      }
      
      self.broadcast.npcs[self.npcKeys[i]] = modified;
    }
    
  }
    
};

// Register to handle the event when a player emits an attack
Engine.prototype.attack = function (existingPlayer) {
  
  var self    = this;
  var player  = self.players[existingPlayer.id];
  
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
    
    if (npc === undefined) {
      continue;
    }
    
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
    self.broadcast.players[player.id].attack  = true;
  } else {
    self.broadcast.players[player.id] = {
      stamina: player.stamina,
      attack:  true
    };
  }
  
};

Engine.prototype.move = function (existingPlayer, data) {
  var self    = this;
  var player  = self.players[existingPlayer.id];
  
  player.position.x = data.position.x;
  player.position.y = data.position.y;
  
  player.direction = data.direction;
  
  if (self.broadcast === undefined) {
    self.broadcast          = {};
    self.broadcast.players  = {};
  }
  
  if (self.broadcast.players === undefined) {
    self.broadcast.players  = {};
  }
  
  if (self.broadcast.players[player.id]) {
    self.broadcast.players[player.id].position  = player.position;
    self.broadcast.players[player.id].direction = player.direction;
  } else {
    self.broadcast.players[player.id] = {
      position: player.position,
      direction: player.direction
    };
  }
};

Engine.prototype.text = function (knownPlayerInfo, data) {
  this.emit("text", {player: {id: knownPlayerInfo.id, blurb: data}});
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

// Called from the backend when a player joins your realm
Engine.prototype.addPlayer = function (knownPlayerInfo) {
  
  var self          = this;
  var joiningPlayer = new player(knownPlayerInfo.id);
  var keys          = Object.keys(knownPlayerInfo);
  
  for (var i = 0; i < keys.length; i++) {
    joiningPlayer[keys[i]] = knownPlayerInfo[keys[i]];
  }
  
  self.players[joiningPlayer.id]  = joiningPlayer;
  self.playerKeys                 = Object.keys(self.players);
};

Engine.prototype.removePlayer = function (knownPlayerInfo) {
  var self = this;
  
  var playerDataToStore = self.players[knownPlayerInfo.id].serialize();
  
  self.broadcast.players[knownPlayerInfo.id] = {remove: true};

  delete self.players[knownPlayerInfo.id];
  self.playerKeys = Object.keys(self.players);
  
  return playerDataToStore;
};

Engine.prototype.spawn = function() {
  
  var self = this;
  
  var freshMeat = new npc(self.npcSpawnCount);
  
  // Create some random clothing
  freshMeat.randomize();      
  
  // Using this opportunity to demonstrate out-of-loop broadcasts... adding players and npcs
  // could easily be incorporated into the main broadcast loop
  self.emit('create', { 
    npcs: {
      npcSpawnCount: freshMeat
    },
    players: {}
  });
  
  self.npcs[self.npcSpawnCount] = freshMeat;
  self.npcKeys = Object.keys(self.npcs);
  
  self.npcSpawnCount++;
  
};

module.exports = Engine;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}