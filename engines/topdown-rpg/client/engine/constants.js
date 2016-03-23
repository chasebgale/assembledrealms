var DIRECTION_N   = 0;
var DIRECTION_W   = 1;
var DIRECTION_S   = 2;
var DIRECTION_E   = 3;

var DIRECTION_NE  = 4;
var DIRECTION_NW  = 5;
var DIRECTION_SE  = 6;
var DIRECTION_SW  = 7;

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

var KEY_CODES = {
  0 : "Windows Menu (Windows-oriented keyboard used on Mac)",
  3 : "break",
  8 : "backspace",
  9 : "tab",
  12 : 'clear',
  13 : "enter",
  16 : "shift",
  17 : "ctrl ",
  18 : "alt",
  19 : "pause/break",
  20 : "caps lock",
  27 : "escape",
  32 : "spacebar",
  33 : "page up",
  34 : "page down",
  35 : "end",
  36 : "home",
  37 : "left",
  38 : "up",
  39 : "right",
  40 : "down",
  41 : "select",
  42 : "print",
  43 : "execute",
  44 : "print_screen",
  45 : "insert ",
  46 : "delete",
  48 : "0",
  49 : "1",
  50 : "2",
  51 : "3",
  52 : "4",
  53 : "5",
  54 : "6",
  55 : "7",
  56 : "8",
  57 : "9",
  59 : "semicolon (firefox), equals",
  60 : "<",
  61 : "equals (firefox)",
  63 : "ß",
  65 : "a",
  66 : "b",
  67 : "c",
  68 : "d",
  69 : "e",
  70 : "f",
  71 : "g",
  72 : "h",
  73 : "i",
  74 : "j",
  75 : "k",
  76 : "l",
  77 : "m",
  78 : "n",
  79 : "o",
  80 : "p",
  81 : "q",
  82 : "r",
  83 : "s",
  84 : "t",
  85 : "u",
  86 : "v",
  87 : "w",
  88 : "x",
  89 : "y",
  90 : "z",
  91 : "Windows Key / Left ⌘ / Chromebook Search key",
  92 : "right window key ",
  93 : "Windows Menu / Right ⌘",
  96 : "numpad 0 ",
  97 : "numpad 1 ",
  98 : "numpad 2 ",
  99 : "numpad 3 ",
  100 : "numpad 4 ",
  101 : "numpad 5 ",
  102 : "numpad 6 ",
  103 : "numpad 7 ",
  104 : "numpad 8 ",
  105 : "numpad 9 ",
  106 : "multiply ",
  107 : "add",
  108 : "numpad period (firefox)",
  109 : "subtract ",
  110 : "decimal point",
  111 : "divide ",
  112 : "f1 ",
  113 : "f2 ",
  114 : "f3 ",
  115 : "f4 ",
  116 : "f5 ",
  117 : "f6 ",
  118 : "f7 ",
  119 : "f8 ",
  120 : "f9 ",
  121 : "f10",
  122 : "f11",
  123 : "f12",
  124 : "f13",
  125 : "f14",
  126 : "f15",
  127 : "f16",
  128 : "f17",
  129 : "f18",
  130 : "f19",
  144 : "num lock ",
  145 : "scroll lock",
  160 : "^",
  163 : "#",
  167 : "page forward (Chromebook)",
  173 : "minus (firefox), mute/unmute",
  174 : "decrease volume level",
  175 : "increase volume level",
  176 : "next",
  177 : "previous",
  178 : "stop",
  179 : "play/pause",
  180 : "e-mail",
  181 : "mute/unmute (firefox)",
  182 : "decrease volume level (firefox)",
  183 : "increase volume level (firefox)",
  186 : "semi-colon / ñ",
  187 : "equal sign ",
  188 : "comma",
  189 : "dash ",
  190 : "period ",
  191 : "forward slash / ç",
  192 : "grave accent ",
  193 : "?, / or °",
  194 : "numpad period (chrome)",
  219 : "open bracket ",
  220 : "back slash ",
  221 : "close bracket ",
  222 : "single quote ",
  223 : "`",
  224 : "left or right ⌘ key (firefox)",
  225 : "altgr",
  226 : "< /git >",
  230 : "GNOME Compose Key",
  255 : "toggle touchpad"
};