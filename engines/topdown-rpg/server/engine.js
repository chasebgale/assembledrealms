var util 			= require('util');
var EventEmitter 	= require('events').EventEmitter;

var DIRECTION_N = 0;
var DIRECTION_W = 1;
var DIRECTION_S = 2;
var DIRECTION_E = 3;

var TILE_WIDTH 	= 32;
var TILE_HEIGHT = 32;

var npcs 			= {};
var players 		= {};
var actors			= {"players": players, "npcs": npcs};
var broadcast		= {"players": {}, "npcs": {}};
var npc_spawn_count = 0;
var tick_count		= 0;
var player_keys     = [];
var npc_keys        = [];

// Double the odds of walking north / east, so the npc naturally heads towards player spawn
var weightedDirection = [DIRECTION_N, DIRECTION_N, DIRECTION_E, DIRECTION_E, DIRECTION_S, DIRECTION_W];

function Engine () {
	EventEmitter.call(this);
};

util.inherits(Engine, EventEmitter);
module.exports = Engine;

Engine.prototype.initialize = function () {
	this.spawn();
};

Engine.prototype.tick = function (map) {
		
	tick_count++;
    
    // var npc_keys    = Object.keys(npcs);
    // var player_keys = Object.keys(players);
	
	if (tick_count > 1800) {
        // Every minute fire and reset
        tick_count = 0;
        
        // If we have less than 10 npc's, spawn a new one:
        if (npc_keys.length < 10) {
            this.spawn();
        }
	}
	
	var direction   = -1;
	var distance    = 0;
    var i   		= 0;
    var j 			= 0;
    var npc         = undefined;
    var player      = undefined;
    var difference  = 0;
    var modified    = false;
    
    var attack_bounding = 32;
    
    for (i = 0; i < player_keys.length; i++) {
        player      = players[player_keys[i]];
        modified    = false;
        
        player.counter++;
        
        if (player.death) {
            if (player.counter > 220) {
                player.position     = {x: 220, y: 220};
    			player.direction    = 0;
                player.health       = 100;
                player.stamina      = 100;
                player.experience   = 0;
                player.death        = false;
                player.counter      = 0;
                
                broadcast.players[player.id] = player;
            }
            continue;
        }
        
        // Is this player triggering an unfortunate NPC?
        for (j = 0; j < npc_keys.length; j++) {
            npc = npcs[npc_keys[j]];
            
            // If this npc is attacking a player, move on to the next npc
            if (npc.attacking) {
                continue;   
            }
            
            // Distance between two points using pythagorean theorem
            distance = Math.sqrt( (npc.position.x-player.position.x)*(npc.position.x-player.position.x) + (npc.position.y-player.position.y)*(npc.position.y-player.position.y) );
            
            if (distance < 300) {
                npc.attacking = true;
                npc.target    = player_keys[i];
                
                this.emit('debug', 'NPC[' + npc_keys[j] + '] spotted a player...');
                
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
	
	for (i = 0; i < npc_keys.length; i++) {
        
        direction = -1;
        npc = npcs[npc_keys[i]];
        
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
                    
                    if (broadcast.npcs[npc_keys[i]]) {
                        broadcast.npcs[npc_keys[i]].attack = true;
                    } else {
                        broadcast.npcs[npc_keys[i]] = {attack: true};
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
                        player.counter      = 0;
                        player.death        = true;
                        
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
            if (difference > attack_bounding) {
                if (difference > attack_bounding + 2) {
                    difference = 3;   
                }
                
                if (npc.position.y < player.position.y) {
                    npc.position.y += difference;
                    npc.direction   = DIRECTION_S;
                } else {
                    npc.position.y -= difference; 
                    npc.direction   = DIRECTION_N;
                }
            }
            
            // X calculations
            difference = Math.abs(npc.position.x - player.position.x);
            if (difference > attack_bounding) {
                if (difference > attack_bounding + 2) {
                    difference = 3;   
                }
                
                if (npc.position.x < player.position.x) {
                    npc.position.x += difference;
                    npc.direction   = DIRECTION_E;
                } else {
                    npc.position.x -= difference; 
                    npc.direction   = DIRECTION_W;
                }
            }
            
            if (broadcast.npcs[npc_keys[i]]) {
                broadcast.npcs[npc_keys[i]].position = npc.position;
                broadcast.npcs[npc_keys[i]].direction = npc.direction;
            } else {
                broadcast.npcs[npc_keys[i]] = {position: npc.position,
                                                direction: npc.direction};
            }
            continue;
        }
        
        // If we got this far, the counter is a sleep counter
        if (npc.counter > 0) {
            npc.counter--;
            continue;
        }
		
		if (npcs[npc_keys[i]].step === npcs[npc_keys[i]].steps.length) {
			// If we have a step equal to the length of the step array, we walked em all, 
			// we need to generate a new walking path
			
			npcs[npc_keys[i]].steps.length 	= 0;
			npcs[npc_keys[i]].step 			= 0;
			
			// ~25% chance of resuming a walk
			if (Math.random() < 0.26) {
				
				// What row/col are we in?
				var col = Math.floor( npcs[npc_keys[i]].position.x / TILE_WIDTH );
				var row = Math.floor( npcs[npc_keys[i]].position.y / TILE_HEIGHT );
				
				var options 	= [];
				var randomizer 	= 0;
				var walk_random = 0;
				
				// NPC can move maximum five tiles away
				for (j = 0; j < 5; j++) {
					
					randomizer 		= Math.floor(Math.random() * 100);
					options.length 	= 0;
					
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
						walk_random = Math.floor(Math.random() * 32) - 16;
						
						switch (direction) {
							case DIRECTION_N:
								npcs[npc_keys[i]].steps.push({x: (col * 32) + 16 + walk_random, y: ((row - 1) * 32) + 16 + walk_random});
								break;
							case DIRECTION_E:
								npcs[npc_keys[i]].steps.push({x: ((col + 1) * 32) + 16 + walk_random, y: ((row * 32) + 16 + walk_random)});
								break;
							case DIRECTION_S:
								npcs[npc_keys[i]].steps.push({x: (col * 32) + 16 + walk_random, y: ((row + 1) * 32) + 16 + walk_random});
								break;
							case DIRECTION_W:
								npcs[npc_keys[i]].steps.push({x: ((col - 1) * 32) + 16 + walk_random, y: ((row * 32) + 16 + walk_random)});
								break;
						}
					} else {
						break;
					}
					
				}
			} else {
                // If we aren't resuming our walk, sleep for a second or two
                npcs[npc_keys[i]].counter = Math.floor( Math.random() * 100 );
                broadcast.npcs[npc_keys[i]] = {position: npcs[npc_keys[i]].position,
                                               direction: npcs[npc_keys[i]].direction};
            }
        }
		
		if (npcs[npc_keys[i]].steps.length > 0) {
			
			var npc_step	= npcs[npc_keys[i]].steps[npcs[npc_keys[i]].step];

			direction = npcs[npc_keys[i]].direction;
			
			if (npcs[npc_keys[i]].position.y > npc_step.y) {
				direction = DIRECTION_N;
				npcs[npc_keys[i]].position.y--;
			} else if (npcs[npc_keys[i]].position.y < npc_step.y) {
				direction = DIRECTION_S;
				npcs[npc_keys[i]].position.y++;
			}
			
			if (npcs[npc_keys[i]].position.x > npc_step.x) {
				direction = DIRECTION_W;
				npcs[npc_keys[i]].position.x--;
			} else if (npcs[npc_keys[i]].position.x < npc_step.x) {
				direction = DIRECTION_E;
				npcs[npc_keys[i]].position.x++;
			}
			
			if ((npcs[npc_keys[i]].position.x == npc_step.x) &&
				(npcs[npc_keys[i]].position.y == npc_step.y)) {
				npcs[npc_keys[i]].step++;
			}
			
			npcs[npc_keys[i]].direction = direction;
			broadcast.npcs[npc_keys[i]] = {position: npcs[npc_keys[i]].position,
                                           direction: npcs[npc_keys[i]].direction};
		
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
    
    // var npc_keys    = Object.keys(npcs);
    var tx          = 0;
    var ty          = 0;
    var th          = 0;
    var tw          = 0;
    var npc         = undefined;
    
    player.stamina -= 10;
    
    //if (player.direction == DIRECTION_N) {
        tw = 64;
        th = 64;
        tx = player.position.x - 32;
        ty = player.position.y - 32;
    //}   
    
    this.emit('debug', 'Player ' + player.id + ' is attacking: ' + tx + ', ' + ty);
    
    for (var i = 0; i < npc_keys.length; i++) {
        npc = npcs[npc_keys[i]];
        
        // this.emit('debug', 'testing attack against ' + JSON.stringify(npc.position));
        
        if ((npc.position.x > tx) && (npc.position.x < (tx + tw))) {
            if ((npc.position.y > ty) && (npc.position.y < (ty + th))) {
                npc.health -= 10;
                if (broadcast.npcs[npc_keys[i]]) {
                    broadcast.npcs[npc_keys[i]].health = npc.health;
                } else {
                    broadcast.npcs[npc_keys[i]] = {health: npc.health};
                }
                
                if (npc.health < 1) {
                    delete npcs[npc_keys[i]];
                    npc_keys = Object.keys(npcs);
                }
                
                break;
            }
        }
    }
    
    if (broadcast.players[player.id]) {
        broadcast.players[player.id].stamina = player.stamina;
    } else {
        broadcast.players[player.id] = {stamina: player.stamina};
    }
    
};

Engine.prototype.addBroadcast = function (player) {
	broadcast.players[player.id] = {position: player.position,
									direction: player.direction};
};

Engine.prototype.broadcastComplete = function () {
	broadcast = {"players": {}, "npcs": {}};
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
	
Engine.prototype.addPlayer = function (player) {
	players[player.id] = player;
	player_keys = Object.keys(players);
};

Engine.prototype.removePlayer = function (player) {
	delete players[player.id];
	player_keys = Object.keys(players);
};

Engine.prototype.spawn = function() {
	
	npcs[npc_spawn_count] = {
		id: npc_spawn_count,
		position: {x: -41 * 32, y: 41 * 32},
		direction: 0,
		health: 100,
		experience: 0,
		layers: [],
		step: 0,
		steps: [], // Pathfinding
        counter: 0, // generic counter used for a variety of functions
        attacking: false,
        cooldown: 0,
        target: -1
	};
	
	// NPC assets are loaded into the movieclip (client-side) in the same order
	// as the array, so the 'bottom' piece is the one with the lowest index
	
	// Head: 5-10
	npcs[npc_spawn_count].layers.push(getRandomInt(5, 10));
	
	// Torso: 13-18
	npcs[npc_spawn_count].layers.push(getRandomInt(13, 18));
	
	// Torso detail: 19-21
	npcs[npc_spawn_count].layers.push(getRandomInt(19, 21));
	
	// Belt: 0-1
	npcs[npc_spawn_count].layers.push(getRandomInt(0, 1));
	
	// Legs: 11-12
	npcs[npc_spawn_count].layers.push(getRandomInt(11, 12));
	
	// Feet: 2-3
	npcs[npc_spawn_count].layers.push(getRandomInt(2, 3));
	
	// Hands: 4
	rand = Math.random();
	if (rand <= 0.5) {
		npcs[npc_spawn_count].layers.push(4);
	}
	
	npc_keys = Object.keys(npcs);
    
	this.emit('create', { 
		npcs: {npc_spawn_count: npcs[npc_spawn_count]},
		players: {}
	});
	
	npc_spawn_count++;
	
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
