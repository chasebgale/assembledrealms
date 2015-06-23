var util 			= require('util');
var EventEmitter 	= require('events').EventEmitter;

var DIRECTION_N = 0;
var DIRECTION_W = 1;
var DIRECTION_S = 2;
var DIRECTION_E = 3;

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
	
Engine.prototype.tick = function () {
		
	tick_count++;
	
	if ((tick_count % 1800) == 0) {
		this.spawn();
	}
	
	var direction 	= Math.floor(Math.random() * weightedDirection.length);
	var npc_keys 	= Object.keys(npcs);
	
	for (var i = 0; i < npc_keys.length; i++) {
		
		if (Math.random() > 0.5) {
			continue;
		}
		
		switch (direction) {
			case DIRECTION_N:
				npcs[npc_keys[i]].position.y += 1;
				break;
			case DIRECTION_E:
				npcs[npc_keys[i]].position.x += 1;
				break;
			case DIRECTION_S:
				npcs[npc_keys[i]].position.y -= 1;
				break;
			case DIRECTION_W:
				npcs[npc_keys[i]].position.x -= 1;
				break;
		}
		
		broadcast.npcs[npc_keys[i]] = npcs[npc_keys[i]];
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
		layers: [0, 4, 7, 8, 9]
	};
    
	this.emit('create', { 
		npcs: {npc_spawn_count: npcs[npc_spawn_count]},
		players: {}
	});
	
	npc_spawn_count++;
	
};

