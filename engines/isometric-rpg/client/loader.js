// Setting 'baseUrl' to the folder 'engine' makes the requiring of 
// our engine files simpler, we can require('actors') rather than
// 									require('./engine/actors')
requirejs.config({
    baseUrl: 'client/engine',
	paths: {
		jquery: "//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min",
		pixi: "//www.assembledrealms.com/js/pixi",
		lodash: "//www.assembledrealms.com/js/lodash.min",
		keyboard: "//www.assembledrealms.com/js/keyboard",
		stats: "//www.assembledrealms.com/js/stats.min"
    },
	shim: {
		'pixi': {
			exports: 'PIXI'
		},
		'lodash': {
			exports: '_'
		},
		'stats': {
			exports: 'Stats'
		}
	}
});

// This call will start loading all of our required files:
requirejs(['jquery', 'lodash', 'pixi', 'keyboard', 'stats', '../main']);