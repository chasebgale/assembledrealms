var DIRECTION_N = 0;
var DIRECTION_W = 1;
var DIRECTION_S = 2;
var DIRECTION_E = 3;

var npcs 			= {};
var players 		= {};
var npc_spawn_count = 0;
var tick_count		= 0;

// Double the odds of walking north / east, so the npc naturally heads towards player spawn
var weightedDirection = [DIRECTION_N, DIRECTION_N, DIRECTION_E, DIRECTION_E, DIRECTION_S, DIRECTION_W];

module.exports = {
	initialize: function () {
		spawn();
	},
	tick: function () {
		
		tick_count++;
		
		if ((tick_count % 1800) == 0) {
			spawn();
		}
		
		var direction 	= Math.floor(Math.random() * weightedDirection.length);
		var npc_keys 	= Object.keys(npcs);
		
		for (var i = 0; i < npc_keys.length; i++) {
			
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
		}
		
	},
	npcs: function () {
		return npcs;
	},
	players: function () {
		return players;
	},
	addPlayer: function (player) {
		players[player.id] = player;
	}
};

var spawn = function() {
	
	npcs[npc_spawn_count] = {
		position: {x: -41 * 32, y: 41 * 32},
		direction: 0,
		life: 100,
		experience: 0,
		layers: [0, 4, 7, 8, 9]
	};
    
    npc_spawn_count++;
	
};