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
	
	if ((tick_count % 1800) == 0) {
		this.spawn();
	}
	
	var direction 	= weightedDirection[ Math.floor(Math.random() * weightedDirection.length) ];
	var npc_keys 	= Object.keys(npcs);
	
	for (var i = 0; i < npc_keys.length; i++) {
		
		if (npcs[npc_keys[i]].steps.length > npcs[npc_keys[i]].step) {
			// If we have a step greater than the steps array, the npc has walked over all the step, 
			// we need to generate a new walking path
			
			// What row/col are we in?
			var row = Math.floor( npcs[npc_keys[i]].position.x / TILE_WIDTH );
			var col = Math.floor( npcs[npc_keys[i]].position.y / TILE_HEIGHT );
		}
		
		if (Math.random() > 0.5) {
			continue;
		}
		
		switch (direction) {
			case DIRECTION_N:
				npcs[npc_keys[i]].position.y -= 1;
				break;
			case DIRECTION_E:
				npcs[npc_keys[i]].position.x += 1;
				break;
			case DIRECTION_S:
				npcs[npc_keys[i]].position.y += 1;
				break;
			case DIRECTION_W:
				npcs[npc_keys[i]].position.x -= 1;
				break;
		}
		
		npcs[npc_keys[i]].direction = direction;
		broadcast.npcs[npc_keys[i]] = npcs[npc_keys[i]];
		
		direction = weightedDirection[ Math.floor(Math.random() * weightedDirection.length) ];
	}
		
};

Engine.prototype.addBroadcast = function (player) {
	broadcast.players[player.id] = player;
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
		step: 1,
		steps: [] // Pathfinding
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

