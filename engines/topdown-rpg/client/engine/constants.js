var DIRECTION_N = 0;
var DIRECTION_W = 1;
var DIRECTION_S = 2;
var DIRECTION_E = 3;


var RENDER_STACK_LANDSCAPE = 0;
var RENDER_STACK_AVATAR = 1;

// sin(45degrees) ~= .707 and cos(45degrees) ~= .707
// var MOVEMENT_ANGLE = 0.707;
// TODO: Using the correct angle slows down drawing and exposes edges, try to fix
var MOVEMENT_ANGLE = 0.5;

var CANVAS_WIDTH = 896;
var CANVAS_WIDTH_HALF = 448;

var CANVAS_HEIGHT = 504;
var CANVAS_HEIGHT_HALF = 252;

var TILE_WIDTH = 32;
var TILE_WIDTH_HALF = 16;
var TILE_HEIGHT = 32;
var TILE_HEIGHT_HALF = 16;
var TILE_Y_OFFSET = 14;

var VIEWPORT_WIDTH_TILES = Math.ceil(CANVAS_WIDTH / TILE_WIDTH) + 1;
var VIEWPORT_HEIGHT_TILES = Math.ceil(CANVAS_HEIGHT / TILE_HEIGHT) + 1;

var VIEWPORT_WIDTH_TILES_HALF = Math.ceil(VIEWPORT_WIDTH_TILES / 2);
var VIEWPORT_HEIGHT_TILES_HALF = Math.ceil(VIEWPORT_HEIGHT_TILES / 2);

var MODE_PAINT = 0;
var MODE_MOVE = 1;
var MODE_DELETE = 2;

var EMOTES_NPC_CREATED = [
    "Holy moly it's dark down here...",
    "I've made a huge mistake.",
    "I smell the stench of the undead...",
    "/me shivers a little bit"
];