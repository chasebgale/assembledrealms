var DIRECTION_W = 0;
var DIRECTION_NW = 1;
var DIRECTION_N = 2;
var DIRECTION_NE = 3;
var DIRECTION_E = 4;
var DIRECTION_SE = 5;
var DIRECTION_S = 6;
var DIRECTION_SW = 7;

var RENDER_STACK_LANDSCAPE = 0;
var RENDER_STACK_AVATAR = 1;

// sin(45degrees) ~= .707 and cos(45degrees) ~= .707
var MOVEMENT_ANGLE = 0.707;

var CANVAS_WIDTH = 896;
var CANVAS_HEIGHT = 504;

var TILE_WIDTH = 64;
var TILE_WIDTH_HALF = 32;
var TILE_HEIGHT = 32;
var TILE_HEIGHT_HALF = 16;
var TILE_Y_OFFSET = 14;

var VIEWPORT_WIDTH_TILES = Math.ceil(CANVAS_WIDTH / 32) + 1;
var VIEWPORT_HEIGHT_TILES = Math.ceil(CANVAS_HEIGHT / 16) + 1;

var VIEWPORT_WIDTH_TILES_HALF = Math.ceil(VIEWPORT_WIDTH_TILES / 2);
var VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(VIEWPORT_HEIGHT_TILES / 2);

var MODE_PAINT = 0;
var MODE_MOVE = 1;
var MODE_DELETE = 2;