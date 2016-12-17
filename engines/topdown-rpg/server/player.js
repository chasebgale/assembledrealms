var PLAYER = function (id) {
  this.id           = id;
  // Setup some default values:
  this.direction    = 0;
  this.health       = 100;
  this.stamina      = 100;
  this.experience   = 0;
  this.counter      = 0;        // Sleep/wait
  this.map          = 0;        // Index of map in map array this npc is on
  this.attackers    = {};
  this.position     = {
    x: 448,
    y: 192
  };
};

PLAYER.prototype.tick = function () {
  
  var self      = this;
  var modified  = {};
  
  self.counter++;
    
  // Player Ded?
  if (self.death) {
    if (self.counter > 220) {
      modified.position   = {x: 448, y: 192};
      modified.direction  = 0;
      modified.health     = 100;
      modified.stamina    = 100;
      
      if (self.experience > 10) {
        modified.experience -= Math.round(self.experience * 0.2);
      }
      
      modified.death      = false;
      modified.counter    = 0;
      modified.attackers  = {};
      
      var keys = Object.keys(modified);
  
      for (var i = 0; i < keys.length; i++) {
        self[keys[i]] = modified[keys[i]];
      }
      
      //self.broadcast.players[player.id] = player;
      // Returning an object lets the outer loop know what has been modified
      // and needs to be broadcast, in this case, broadcast *all* properties of the player
      return modified;
    }
    return false;
  }
  
  // Pulse health/stamina updates every ~2/5ths of a second (every 384ms)
  if (self.counter > 12) {
    
    if (self.stamina < 100) {
      self.stamina      += 2;
      modified.stamina  = self.stamina;
    }
    
    if (self.health < 100) {
      self.health++;
      modified.health = self.health;
    }
    
    self.counter = 0;
  }
  
  if (modified !== {}) {
    return modified;
  } else {
    return false;
  }
  
};

PLAYER.prototype.serialize = function () {
  var storage = {
    direction:  this.direction,
    health:     this.health,
    stamina:    this.stamina,
    experience: this.experience,
    map:        this.map,
    attackers:  {},
    position:   this.position
  };
  
  return storage;
};

module.exports = PLAYER;