// Setting 'baseUrl' to the folder 'engine' makes the requiring of 
// our engine files simpler, we can require('actors') rather than
// 									require('./engine/actors')
requirejs.config({
    baseUrl: 'engine',
	paths: {
		jquery: "//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min"
    }
});

// This call will start loading all of our required files:
requirejs(['jquery', './main']);