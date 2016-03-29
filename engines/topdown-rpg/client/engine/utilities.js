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

function isNumber (o) {
	return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
}
		
function setPixel (imageData, x, y, r, g, b, a) {
	var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
	imageData.data[index+0] = r;
	imageData.data[index+1] = g;
	imageData.data[index+2] = b;
	imageData.data[index+3] = a;
}

function getPixel (imageData, x, y) {
	var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
	return {r: imageData.data[index+0],
			g: imageData.data[index+1],
			b: imageData.data[index+2],
			a: imageData.data[index+3]};
}

function shadeColor2(color, percent) {   
  var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
  return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}