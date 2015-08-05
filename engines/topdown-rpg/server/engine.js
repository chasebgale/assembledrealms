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
    
    var npc_keys = Object.keys(npcs);
	
	if (tick_count > 1800) {
        // Every minute fire and reset
        tick_count = 0;
        
        // If we have less than 10 npc's, spawn a new one:
        if (npc_keys.length < 10) {
            this.spawn();
        }
	}
	
	//var direction 	= weightedDirection[ Math.floor(Math.random() * weightedDirection.length) ];
	var direction   = -1;
	var i 			= 0;
	var j 			= 0;
	
	for (i = 0; i < npc_keys.length; i++) {
        
        direction = -1;
        
        if (npcs[npc_keys[i]].sleep > 0) {
            npcs[npc_keys[i]].sleep--;
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
				
				// NPC can move maximum five tiles away
				for (j = 0; j < 5; j++) {
					
					randomizer 		= Math.floor(Math.random() * 100);
					options.length 	= 0;
					
					// Add either our first or an additional tile step (having diminishing odds)
					if (randomizer > (40 + (12 * j))) {
						
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
						
						direction = options[ Math.floor(Math.random() * options.length) ];
						
						switch (direction) {
							case DIRECTION_N:
								npcs[npc_keys[i]].steps.push({x: (col * 32) + 16, y: ((row - 1) * 32) + 16});
								break;
							case DIRECTION_E:
								npcs[npc_keys[i]].steps.push({x: ((col + 1) * 32) + 16, y: ((row * 32) + 16)});
								break;
							case DIRECTION_S:
								npcs[npc_keys[i]].steps.push({x: (col * 32) + 16, y: ((row + 1) * 32) + 16});
								break;
							case DIRECTION_W:
								npcs[npc_keys[i]].steps.push({x: ((col - 1) * 32) + 16, y: ((row * 32) + 16)});
								break;
						}
					} else {
						break;
					}
					
				}
			} else {
                // If we aren't resuming our walk, sleep for a second or two
                npcs[npc_keys[i]].sleep = Math.floor( Math.random() * 100 );
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
}

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
};

Engine.prototype.spawn = function() {
	
	npcs[npc_spawn_count] = {
		id: npc_spawn_count,
		position: {x: -41 * 32, y: 41 * 32},
		direction: 0,
		life: 100,
		experience: 0,
		layers: [0],
		step: 0,
		steps: [], // Pathfinding
        sleep: 0
	};
	
	// Head: 1, 2, 3
	var rand = Math.random();
	if (rand <= 0.2) {
		npcs[npc_spawn_count].layers.push(1);
	} else if (rand <= 0.4) {
		npcs[npc_spawn_count].layers.push(2);
	} else if (rand <= 0.6) {
		npcs[npc_spawn_count].layers.push(3);
	}
	
	// Torso: 4, 5, 6
	rand = Math.random();
	if (rand <= 0.2) {
		npcs[npc_spawn_count].layers.push(4);
	} else if (rand <= 0.4) {
		npcs[npc_spawn_count].layers.push(5);
	} else if (rand <= 0.6) {
		npcs[npc_spawn_count].layers.push(6);
	}
	
	// Legs: 7
	rand = Math.random();
	if (rand <= 0.5) {
		npcs[npc_spawn_count].layers.push(7);
	}
	
	// Hands: 8
	rand = Math.random();
	if (rand <= 0.5) {
		npcs[npc_spawn_count].layers.push(8);
	}
	
	// Feet: 9
	rand = Math.random();
	if (rand <= 0.5) {
		npcs[npc_spawn_count].layers.push(9);
	}
	
    
	this.emit('create', { 
		npcs: {npc_spawn_count: npcs[npc_spawn_count]},
		players: {}
	});
	
	npc_spawn_count++;
	
};

