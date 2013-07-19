window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
})();

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

var _ether;
var _lastDownTarget;
function Ether() {

    this.blackTile = new Image();
    this.blackTile.src = "resource/black.png";
    this.placeholderTile = new Image();
    this.placeholderTile.src = "resource/placeholder.png";
    this.terrainTiles = new Image();
    this.terrainTiles.src = "resource/grass_and_water.png";

    this.padding = 128;

    return true;
}

Ether.prototype.initialize = function(element){
	
    var self = this;
    _ether = this;

    self.debug = true;
	
	self.element = element;
	
	self.canvas =  document.createElement( 'canvas' );
	self.canvas.width = 800;
	self.canvas.height = 600;
	self.canvas.setAttribute('id', 'ether.viewport');
    self.context = self.canvas.getContext( '2d' );
    element.appendChild( self.canvas );
    
    self.canvasBuffer = document.createElement('canvas');
    self.canvasBuffer.width = 800 + (self.padding * 2);
    self.canvasBuffer.height = 600 + (self.padding * 2);
    self.canvasBuffer.setAttribute('id', 'ether.buffer');
    //self.canvasBuffer.setAttribute('style', 'display: none;');
    self.contextBuffer = self.canvasBuffer.getContext('2d');
    element.appendChild(self.canvasBuffer);

	self.canvasHeatMap =  document.createElement( 'canvas' );
	self.canvasHeatMap.width = 800;
	self.canvasHeatMap.height = 600;
	self.canvasHeatMap.setAttribute('id', 'ether.heatMap');
	//self.canvasBuffer.setAttribute('style', 'display: none;');
	self.contextHeatMap = self.canvasHeatMap.getContext('2d');
	element.appendChild(self.canvasHeatMap);

	self.canvasTiles =  document.createElement( 'canvas' );
	self.canvasTiles.width = 64;
	self.canvasTiles.height = 64;
	self.canvasTiles.setAttribute('id', 'ether.tiles');
	self.canvasTiles.setAttribute('style', 'display: none;');
	self.contextTiles = self.canvasTiles.getContext('2d');
	element.appendChild(self.canvasTiles);

	var miniMapContainer = document.createElement( 'div' );
	miniMapContainer.setAttribute('id', 'miniMap');

	self.miniMap = document.createElement('canvas');
	self.miniMap.width = 200;
	self.miniMap.height = 200;
	self.miniMap.setAttribute('id', 'ether.miniMap');
	self.miniMapContext = self.miniMap.getContext('2d');

	miniMapContainer.appendChild(self.miniMap);
	element.appendChild(miniMapContainer);

	self.coordinates = { x: 1604, y: 1209 };
	self.tileWidth = 64;
	self.tileHeight = 32;
	self.halfTileHeight = 16;
	self.initialPass = true;
	self.currentStamp = 0;

	self.lookupMap = {};
	self.tiles = {};

	if (this.terrainTiles.width == 0) {
	    this.terrainTiles.addEventListener('load', function () {
	        self.loadTiles();
	    }, false);
	} else {
	    self.loadTiles();
	}

	/* Round to even
	if (Math.floor(width)%2!=0)
		width = width - 1;
	*/
    
    $.getJSON('http://69.85.87.77/map.json')
    .done(function (json) {
        
        self.map = json;

	    self.drawTerrain();
	    self.drawMiniMap();

	    // Wire Events:
        var miniMap = document.getElementById("ether.miniMap")
	    miniMap.addEventListener("mousedown", function (e) {
	        var mousePosition = getMousePosition(self.miniMap, e);
	        console.log("Minimap MouseDown: " + mousePosition.x + ", " + mousePosition.y);
	    });

	    var viewPort = document.getElementById("ether.viewport")
	    viewPort.addEventListener("mousedown", function (e) {
	        var mousePosition = getMousePosition(self.canvas, e);
	        console.log("Viewport MouseDown: " + mousePosition.x + ", " + mousePosition.y);

	        _lastDownTarget = e.target;

	        self.map.cells[self.mouseTile.y][self.mouseTile.x] = self.currentStamp;

	        //var stringMap = JSON.stringify(self.map);

	        syncChanges();

	        //console.log(stringMap);

	    });

	    viewPort.addEventListener("mousemove", function (e) {
	        var mousePosition = getMousePosition(self.canvas, e);
	        console.log("Viewport MouseMove: " + mousePosition.x + ", " + mousePosition.y);

            /*
	        var localTileCoordinates = { x: 0, y: Math.floor(mousePosition.y / self.halfTileHeight) };
	        var xOffset = ((localTileCoordinates.y % 2) * 32);

	        localTileCoordinates.x = Math.floor((mousePosition.x + xOffset) / self.tileWidth);

	        var tileID = self.map.cells[self.viewPortStartTileY + localTileCoordinates.y][self.viewPortStartTileX + localTileCoordinates.x];
	        */

	        var rgb = getPixel(self.contextHeatMap, mousePosition.x, mousePosition.y);

	        self.mouseTile = self.lookupMap[rgbToHex(rgb[0], rgb[1], rgb[2])];

	        if (self.mouseTile) {
	            self.updateTile(self.currentStamp, self.mouseTile);
	        }
	    });

	    document.addEventListener("keydown", function (e) {

	        if (_lastDownTarget == _ether.canvas) {

	            switch (e.keyCode) {

                    // W
	                case 87:
	                    _ether.coordinates = {
	                        y: _ether.coordinates.y -= 4,
	                        x: _ether.coordinates.x
	                    };
	                    break;
	                // S
	                case 83:
	                    _ether.coordinates = {
	                        y: _ether.coordinates.y += 4,
	                        x: _ether.coordinates.x
	                    };
	                    break;
	                // A
	                case 65:
	                    _ether.coordinates = {
	                        y: _ether.coordinates.y,
	                        x: _ether.coordinates.x -=4
	                    };
	                    break;
	                // D
	                case 68:
	                    _ether.coordinates = {
	                        y: _ether.coordinates.y,
	                        x: _ether.coordinates.x += 4
	                    };
	                    break;

	            }

	            _ether.drawTerrain();

	        }

	    });

	})
    .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ', ' + error;
        console.log("Request Failed: " + err);
    });
	
	// If I need to set any css:
	/*  
	var viewport = $("#ether.viewport", self.element);
	viewport.css("overflow", "hidden");
	viewport.css("margin", "0px");
	viewport.css("padding", "0px");
	*/
};

Ether.prototype.loadTiles = function () {

    var count = 0;
    var tile;
    var radioItem;
    var radioImage;

    var tileFields = document.getElementById('tileFields');

    for (var i = 0; i < this.terrainTiles.height; i+=64) {

        for (var j = 0; j < this.terrainTiles.width; j += 64) {

            this.contextTiles.clearRect(0, 0, 64, 64);
            this.contextTiles.drawImage(this.terrainTiles, 
                                        j,
                                        i,
                                        64,
                                        64,
                                        0,
                                        0, 64, 64);

            tile = document.createElement('div');
            tile.setAttribute('style', 'float: left;');

            radioItem = document.createElement('input');
            radioItem.setAttribute('type', 'radio');
            radioItem.setAttribute('name', 'tiles');
            radioItem.setAttribute('value', count);
            radioItem.onclick = tileClick;

            if (count == 0) {
                radioItem.setAttribute('checked', 'checked');
            }

            tile.appendChild(radioItem);

            radioImage = new Image(64, 64);
            radioImage.src = this.canvasTiles.toDataURL();

            tile.appendChild(radioImage);

            tileFields.appendChild(tile);

            count++;
            //self.tiles[count] = 
        }

    }
}

Ether.prototype.updateTile = function (tileID, tile) {
    this.drawTerrain();

    tileMapX = tileID % 4;
    tileMapY = Math.floor(tileID / 4);

    translatedTileMapX = (tileMapX * 64);
    translatedTileMapY = (tileMapY * 64);

    var rowOffset = ((tile.y % 2) * 32) - 32;

    var xOffset = this.coordinates.x % this.tileWidth;
    var yOffset = (this.coordinates.y % this.tileHeight);

    var currTileX = ((tile.x - this.viewPortStartTileX) * this.tileWidth) + xOffset + rowOffset;
    var currTileY = ((tile.y - this.viewPortStartTileY) * this.halfTileHeight) - this.tileHeight + yOffset;

    this.context.drawImage(this.terrainTiles,
                           translatedTileMapX,
                           translatedTileMapY,
                           64,
                           64,
                           currTileX,
                           currTileY, 64, 64);

    if (this.debug) {

        this.context.beginPath();
        this.context.moveTo(currTileX + 32, currTileY + 16);
        this.context.lineTo(currTileX + 64, currTileY + 32);
        this.context.lineTo(currTileX + 32, currTileY + 48);
        this.context.lineTo(currTileX, currTileY + 32);
        this.context.lineTo(currTileX + 32, currTileY + 16);
        this.context.strokeStyle = "#000";
        this.context.stroke();

        this.context.font = '12pt Calibri';
        this.context.fillStyle = 'yellow';
        this.context.fillText(tile.y +
                              ", " +
                              tile.x,
                              ((tile.x - this.viewPortStartTileX) * this.tileWidth) + xOffset + 10,
                              ((tile.y - this.viewPortStartTileY) * this.halfTileHeight) - this.tileHeight + 32 + 5);
    }
}

Ether.prototype.drawTerrain = function () {

    var data = this.map.cells;
    var tileWidth = 64;
    var tileHeight = 32;
    var halfTileHeight = 16;

    var coordinatePosition = this.coordinates;

    var xOffset = 0;
    var yOffset = 0;

    var totalWidth = this.canvasBuffer.width;
    var totalHeight = this.canvasBuffer.height;

    // First we locate the tile our player is in, coordinate to tile
    this.tilePositionX = Math.floor(coordinatePosition.x / tileWidth);
    this.tilePositionY = Math.floor(coordinatePosition.y / tileHeight);

    xOffset = (coordinatePosition.x % tileWidth) + this.padding;
    yOffset = (coordinatePosition.y % tileHeight) + this.padding;

    // Now we determine how many tiles we can display in our viewport
    this.viewPortTileWidth = Math.ceil(totalWidth / tileWidth);
    this.viewPortTileHeight = Math.ceil(totalHeight / halfTileHeight) + 1; // Half height as they are staggered
    
    // Get the first tile to display in the viewport
    this.viewPortStartTileX = this.tilePositionX - (Math.floor(this.viewPortTileWidth / 2));
    this.viewPortStartTileY = this.tilePositionY - (Math.floor(this.viewPortTileHeight / 2));

    var rowOffset = 0;
    var tileID = 0;

    var tileMapX = 0;
    var tileMapY = 0;
    var translatedTileMapX = 0;
    var translatedTileMapY = 0;

    // Loop through our map, load up new tiles and draw them
    for (var iY = this.viewPortStartTileY; iY < (this.viewPortTileHeight + this.viewPortStartTileY) ; iY++) {

        rowOffset = iY % 2;

        if (rowOffset == 0) {
            rowOffset = -32;
        } else {
            rowOffset = 0;
        }

        for (var iX = this.viewPortStartTileX; iX < (this.viewPortTileWidth + this.viewPortStartTileX) ; iX++) {

            

            if ((data[iY] == undefined) || (data[iY][iX] == undefined)) {
                this.contextBuffer.drawImage(this.blackTile,
                                       0,
                                       0,
                                       64,
                                       64,
                                       ((iX - this.viewPortStartTileX) * tileWidth) + rowOffset - xOffset,
                                       ((iY - this.viewPortStartTileY) * halfTileHeight) - tileHeight - yOffset, 64, 64);
            } else {

                tileID = data[iY][iX];

                tileMapX = tileID % 4;
                tileMapY = Math.floor(tileID / 4);

                translatedTileMapX = (tileMapX * 64);
                translatedTileMapY = (tileMapY * 64);

                this.contextBuffer.drawImage(this.terrainTiles,
                                       translatedTileMapX,
                                       translatedTileMapY,
                                       64,
                                       64,
                                       ((iX - this.viewPortStartTileX) * tileWidth) + rowOffset - xOffset,
                                       ((iY - this.viewPortStartTileY) * halfTileHeight) - tileHeight - yOffset, 64, 64);
            }

            if ((this.debug) && (tileID > 0)) {
                var currTileX = ((iX - this.viewPortStartTileX) * tileWidth) + rowOffset;
                var currTileY = ((iY - this.viewPortStartTileY) * halfTileHeight) - tileHeight;

                this.context.beginPath();

                this.context.moveTo(currTileX, currTileY);
                this.context.lineTo(currTileX + 64, currTileY);
                this.context.lineTo(currTileX + 64, currTileY + 64);
                this.context.lineTo(currTileX, currTileY + 64);
                this.context.lineTo(currTileX, currTileY);

                this.context.globalAlpha = 1.0;
                this.context.strokeStyle = "#FFFFFF";
                this.context.stroke();
            }
        }
    }


    if (true) { //this.initialPass) {
        
        this.lookupMap = {};
        xOffset = 0;

        var colorRGB;
        var goldenRatioConjugate = 0.618033988749895;
        var h = Math.random();
        var color = "";

        for (var iY = this.viewPortStartTileY; iY < (this.viewPortTileHeight + this.viewPortStartTileY) ; iY++) {

            if (xOffset == 0) {
                xOffset = -32;
            } else {
                xOffset = 0;
            }

            for (var iX = this.viewPortStartTileX; iX < (this.viewPortTileWidth + this.viewPortStartTileX) ; iX++) {

                var currTileX = ((iX - this.viewPortStartTileX) * tileWidth) + rowOffset - xOffset;
                var currTileY = ((iY - this.viewPortStartTileY) * halfTileHeight) - tileHeight - yOffset;

                this.contextHeatMap.beginPath();
                
                this.contextHeatMap.moveTo(currTileX + 32, currTileY + 16);
                this.contextHeatMap.lineTo(currTileX + 64, currTileY + 32);
                this.contextHeatMap.lineTo(currTileX + 32, currTileY + 48);
                this.contextHeatMap.lineTo(currTileX, currTileY + 32);
                this.contextHeatMap.lineTo(currTileX + 32, currTileY + 16);

                // Random color:
                do {
                    //h += goldenRatioConjugate + Math.random();
                    //h %= 1;

                    //colorRGB = hsv2rgb(h, 0.5, 0.95);
                    //color = rgbToHex(colorRGB.r, colorRGB.g, colorRGB.b);

                    color = get_random_color();

                } while (this.lookupMap[color]);


                this.contextHeatMap.fillStyle = color;
                this.contextHeatMap.fill();

                this.lookupMap[color] = {
                    y: iY,
                    x: iX,
                };

            }
        }

        this.initialPass = false;

    }

    if (this.debug) {
            
        xOffset = 0;

        for (var iY = this.viewPortStartTileY; iY < (this.viewPortTileHeight + this.viewPortStartTileY) ; iY++) {

            if (xOffset == 0) {
                xOffset = -32;
            } else {
                xOffset = 0;
            }

            for (var iX = this.viewPortStartTileX; iX < (this.viewPortTileWidth + this.viewPortStartTileX) ; iX++) {

                if ((data[iY] == undefined) || (data[iY] == undefined)) {
                    tileID = 1;
                } else {
                    tileID = data[iY][iX];
                }

                var currTileX = ((iX - this.viewPortStartTileX) * tileWidth) + rowOffset - xOffset;
                var currTileY = ((iY - this.viewPortStartTileY) * halfTileHeight) - tileHeight - yOffset;

                this.context.beginPath();

                this.context.moveTo(currTileX + 32, currTileY + 16);
                this.context.lineTo(currTileX + 64, currTileY + 32);
                this.context.lineTo(currTileX + 32, currTileY + 48);
                this.context.lineTo(currTileX, currTileY + 32);
                this.context.lineTo(currTileX + 32, currTileY + 16);

                this.context.globalAlpha = 1.0;
                this.context.strokeStyle = "#000";
                this.context.stroke();

                if (tileID > 0) {
                    this.context.font = '8pt Calibri';
                    this.context.fillStyle = 'white';
                    this.context.fillText(tileID + "|" + iY + ", " + iX,
                                            ((iX - this.viewPortStartTileX) * tileWidth) + xOffset + 10,
                                            ((iY - this.viewPortStartTileY) * halfTileHeight) + 5);
                } else {
                    this.context.font = '8pt Calibri';
                    this.context.fillStyle = 'grey';
                    this.context.fillText(iY + ", " + iX,
                                            ((iX - this.viewPortStartTileX) * tileWidth) + xOffset + 10,
                                            ((iY - this.viewPortStartTileY) * halfTileHeight) + 5);
                }
            }
        }

    }

    this.context.drawImage(this.canvasBuffer,
                           0,
                           0);

    /*this.context.drawImage(this.canvasBuffer,
                           xOffset,
                           yOffset,
                           800,
                           600,
                           0,
                           0);
                           */
}

Ether.prototype.drawMiniMap = function () {

    var tileWidth = 4;
    var tileHeight = 2;
    var halfTileHeight = 1;

    var coordinatePosition = { x: 1604, y: 1209 };

    // First we locate the tile our player is in, coordinate to tile
    var tilePositionX = Math.floor(coordinatePosition.x / tileWidth);
    var tilePositionY = Math.floor(coordinatePosition.y / tileHeight);

    // Now we determine how many tiles we can display in our viewport
    var viewPortTileWidth = Math.ceil(this.miniMap.width / tileWidth);
    var viewPortTileHeight = Math.ceil(this.miniMap.height / halfTileHeight) + 1; // Half height as they are staggered

    // Get the first tile to display in the viewport
    var viewPortStartTileX = tilePositionX - (Math.floor(viewPortTileWidth / 2));
    var viewPortStartTileY = tilePositionY - (Math.floor(viewPortTileHeight / 2));

    var xOffset = 0;

    var imageData = this.miniMapContext.createImageData(this.miniMap.width, this.miniMap.height);

    var pixelX = 0;
    var pixelY = 0;

    // Loop through our map, load up new tiles and draw them
    for (var iY = viewPortStartTileY; iY < (viewPortTileHeight + viewPortStartTileY) ; iY++) {

        if (xOffset == 0) {
            xOffset = -2;
        } else {
            xOffset = 0;
        }

        for (var iX = viewPortStartTileX; iX < (viewPortTileWidth + viewPortStartTileX) ; iX++) {

            pixelX = ((iX - viewPortStartTileX) * tileWidth) + xOffset;
            pixelY = ((iY - viewPortStartTileY) * halfTileHeight) - tileHeight;

            setPixel(imageData, pixelX, pixelY, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 1, pixelY, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 2, pixelY, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 3, pixelY, 0, 255, 0, 0xff);

            setPixel(imageData, pixelX, pixelY, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 1, pixelY + 1, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 2, pixelY + 1, 0, 255, 0, 0xff);
            setPixel(imageData, pixelX + 3, pixelY + 1, 0, 255, 0, 0xff);
        }
    }

    this.miniMapContext.putImageData(imageData, 0, 0);

    //alert(data);
}




function tileClick(e) {
    _ether.currentStamp = parseInt(e.currentTarget.value);
}

function syncChanges() {

    $.ajax({
        type: "POST",
        url: "http://69.85.87.77/",
        data: { map: JSON.stringify(_ether.map) }
    })
    .done(function (msg) {
        alert("Data Saved: " + msg);
    })
    .fail(function (jqXHR, textStatus) {
        alert("Data Failed: " + textStatus);
    });

}

function errorHandler(e) {
    var msg = '';
    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    };
    console.log('Error: ' + msg);
}

function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

function getPixel(context, x, y) {
    var data = context.getImageData(x, y, 1, 1).data;
    return data;
}

function setPixel(imageData, x, y, r, g, b, a) {
    index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
    imageData.data[index + 0] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = a;
}

function getMousePosition(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function rgbaToHex(r, g, b, a) {
    if (r > 255 || g > 255 || b > 255 || a > 255)
        throw "Invalid color component";
    return (256 + r).toString(16).substr(1) + ((1 << 24) + (g << 16) | (b << 8) | a).toString(16).substr(1);
}

function hsv2rgb(h, s, v) {
    // Adapted from http://www.easyrgb.com/math.html
    // hsv values = 0 - 1, rgb values = 0 - 255
    var r, g, b;
    var RGB = new Array();
    if (s == 0) {
        RGB['red'] = RGB['green'] = RGB['blue'] = Math.round(v * 255);
    } else {
        // h must be < 1
        var var_h = h * 6;
        if (var_h == 6) var_h = 0;
        //Or ... var_i = floor( var_h )
        var var_i = Math.floor(var_h);
        var var_1 = v * (1 - s);
        var var_2 = v * (1 - s * (var_h - var_i));
        var var_3 = v * (1 - s * (1 - (var_h - var_i)));
        if (var_i == 0) {
            var_r = v;
            var_g = var_3;
            var_b = var_1;
        } else if (var_i == 1) {
            var_r = var_2;
            var_g = v;
            var_b = var_1;
        } else if (var_i == 2) {
            var_r = var_1;
            var_g = v;
            var_b = var_3
        } else if (var_i == 3) {
            var_r = var_1;
            var_g = var_2;
            var_b = v;
        } else if (var_i == 4) {
            var_r = var_3;
            var_g = var_1;
            var_b = v;
        } else {
            var_r = v;
            var_g = var_1;
            var_b = var_2
        }
        //rgb results = 0 ÷ 255  
        RGB['r'] = Math.round(var_r * 255);
        RGB['g'] = Math.round(var_g * 255);
        RGB['b'] = Math.round(var_b * 255);
    }
    return RGB;
};