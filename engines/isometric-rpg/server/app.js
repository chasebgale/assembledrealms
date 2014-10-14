var express = require('express');
var app = express();
var io = require('socket.io').listen(app);

io.sockets.on('connection', function (client) {

	client.on('auth', processAuthorization);
	client.on('message', processMessage);
	client.on('update', processUpdate);
	
	function processAuthorization(data) {
		// data.id === user ID
		// data.auth === validated session key
		
		// The idea here is to only AUTH and allow access to registered, logged in clients
		// I'm thinking I'll have to write an API call on assembledrealms.com to validate, so:
		
		// 1. User logs in on website
		// 2. User navigates to realm page, which in turn serves HTML from [this server] in an iframe
		// 3. HTML served back is blank black page, sends handshake (userID and sessionKey) after load
		// 4. [this server] receives handshake and calls main site API to validate session
		
		// This prevents someone loading this page outside of assembledrealms.com and handing in whatever
		// user ID they want to trash someones characters or whatnot.
		
		// FOR NOW, just accept a userID and trust it.
		client.set('userID', data.userID);
		
		// TODO: Once we have the userID, lookup all his character(s) or valid info in the local REDIS DB
		var redisData = {characterName: 'Tony Stark', characterLocation: {x: 2432, y: 1121}, characterExp: 12399, characterTitle: "Iron Man"};
		
		// Notify client auth was successful
		client.emit('auth-success', redisData);
		
		// Notify everyone else of a new player
		client.broadcast.emit('player-new', redisData);
	}
	
	function processMessage(data) {
		client.get('userID', function(error, userID) {
			if(userID !== undefined) {
				client.broadcast.emit('player-message', {
					userID: userID,
					message: data
				});
			}
		});
	}

});

app.listen(3000, function(){
  console.log("Express server listening on port 3000, request to port 80 are redirected to 3000 by Fedora.");
});