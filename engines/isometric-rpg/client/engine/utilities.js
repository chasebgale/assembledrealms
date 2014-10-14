function directionFromAngle(angle) {
    if ((angle > 337.5) || (angle < 22.5)) {
        return DIRECTION_E;
    }

    if ((angle > 22.5) && (angle < 67.5)) {
        return DIRECTION_NE;
    }

    if ((angle > 67.5) && (angle < 112.5)) {
        return DIRECTION_N;
    }

    if ((angle > 112.5) && (angle < 157.5)) {
        return DIRECTION_NW;
    }

    if ((angle > 157.5) && (angle < 202.5)) {
        return DIRECTION_W;
    }

    if ((angle > 202.5) && (angle < 247.5)) {
        return DIRECTION_SW;
    }

    if ((angle > 247.5) && (angle < 292.5)) {
        return DIRECTION_S;
    }

    if ((angle > 292.5) && (angle < 337.5)) {
        return DIRECTION_SE;
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lineDistanceSqrt(point1, point2) {
    var xs = 0;
    var ys = 0;

    xs = point2.x - point1.x;
    xs = xs * xs;

    ys = point2.y - point1.y;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
}

function lineDistanceManhattan(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}




function zombieSpriteJSON() {
    var container = {};
    var prefix_worker = "";
    var rows, cols;

    var prefix = "skeleton_row";

    container.frames = {};

    for (rows = 0; rows < 8; rows++) {
        for (cols = 0; cols < 36; cols++) {
            prefix_worker = prefix + rows + "_" + "col" + cols + ".png";
            container.frames[prefix_worker] = {};
            container.frames[prefix_worker].frame = { "x": cols * 128, "y": rows * 128, "w": 128, "h": 128 };
            container.frames[prefix_worker].rotated = false;
            container.frames[prefix_worker].trimmed = false;
            container.frames[prefix_worker].spriteSourceSize = { "x": 0, "y": 0, "w": 128, "h": 128 };
            container.frames[prefix_worker].sourceSize = { "w": 128, "h": 128 };
        }
    }

    container.meta = {
        "app": "http://www.texturepacker.com",
        "version": "1.0",
        "image": "skeleton_0.png",
        "format": "RGBA8888",
        "size": { "w": 1345, "h": 299 },
        "scale": "1",
        "smartupdate": "$TexturePacker:SmartUpdate:17e4a2d92ff3e27832c3f4938cec7c85$"
    };

    return JSON.stringify(container);
}