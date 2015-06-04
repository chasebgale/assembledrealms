// Setting 'baseUrl' to the folder 'engine' makes the requiring of 
// our engine files simpler, we can require('actors') rather than
// 									require('./engine/actors')
requirejs.config({
    baseUrl: __id + '/client/', //engine',
	paths: {
		jquery: 	"//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min",
		pixi: 		"//www.assembledrealms.com/js/pixi",
		keyboard: 	"//www.assembledrealms.com/js/keyboard",
		stats: 		"//www.assembledrealms.com/js/stats.min",
		main:		"main",
		actors:		"./engine/actors", 
		avatar:		"./engine/avatar", 
		constants:	"./engine/constants", 
		terrain:	"./engine/terrain", 
		objects:	"./engine/objects"
    },
	shim: {
		'pixi': {
			exports: 'PIXI'
		},
		'stats': {
			exports: 'Stats'
		}
	}
});

// This call will start loading all of our required files:
requirejs(['jquery', 'pixi', 'keyboard', 'stats', 'main']);