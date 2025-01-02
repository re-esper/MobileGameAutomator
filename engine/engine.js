 'use strict';
const assert = require('assert');
const fs = require('fs');
const { initDevice } = require('./device'),
    minicap = require('./minicap'),
    minitouch = require('./minitouch'),
    cv = require('opencv4nodejs-prebuilt'),
    conf = require('./config');

global.InitEngine = (designWidth, designHeight) => {
    const args = process.argv.slice(2);
    initDevice(designWidth, designHeight, args[0]);
    minicap.init();
    minitouch.init();
    minicap.start();
    minitouch.start();
    return new Promise((resolve) => {
        function checkIfRunning() {
            if (minicap.running && minitouch.running) {
                resolve();
            }
            else {
                setTimeout(checkIfRunning, 100);
            }
        }
        checkIfRunning();
    });
};

process.on('exit', () => {
    minicap.stop();
    minitouch.stop();
});
process.on('SIGTERM', () => process.exit(1));
process.on('SIGINT', () => process.exit(1));

function sleep(s) {
    return new Promise((resolve) => {
        setTimeout(resolve, s * 1000);
    });
}

async function touch(x, y, duration = 0.05) {    
    minitouch.action('d', x, y);
    await sleep(duration);
    minitouch.action('u');
}

function templateMatching(srcMat, tmplMat, confidence = 0.99) {
    let matched = srcMat.matchTemplate(tmplMat, cv.TM_CCOEFF_NORMED);
	const minMax = matched.minMaxLoc();
	if (minMax.maxVal > confidence) {
		return minMax.maxLoc;
	}
	return null;
}

function templateMatchingAll(srcMat, tmplMat, limit, confidence = 0.99) {
    let results = [];
    let matched = srcMat.matchTemplate(tmplMat, cv.TM_CCOEFF_NORMED);
	const data = matched.getData();
	const rows = matched.rows;
	const cols = matched.cols;
	const w = tmplMat.cols;
	const h = tmplMat.rows;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const c = data.readFloatLE((y * cols + x) * 4);
			if (c > confidence) {
				let intersect = false;
				for (let r of results) {
					intersect = Math.abs(x - r.x) < w && y - r.y < h;
					if (intersect) {
						if (c > r.c) {
							r.x = x; r.y = y; r.c = c;
						}
						break;
					}
				}
				if (!intersect) {
					results.push({ x: x, y: y, c: c });
				}
				if (results.length >= limit) break;					
			}
		}
	}
	return results;
}

let tmplMatCaches = new Map();
function fetchTemplateMat(picture, isRGB = false) {
    const key = picture + (isRGB ? "" : "_0");
    if (tmplMatCaches.has(key)) return tmplMatCaches.get(key);
    let tMat = cv.imread(picture, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
    tmplMatCaches.set(key, tMat);
    return tMat;
}

// region: [x, y, width, height]
function findPic(picture, region = null, confidence = conf.THRESHOLD, isRGB = conf.MATCH_RGB) {
    if (minicap.lastFrame == null) return null;
    let tMat = fetchTemplateMat(picture, isRGB);
	let mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);

	let offsetx = 0, offsety = 0;
	if (typeof(region) === "array" && region.length == 4) {
		if (region[2] > tMat.cols || region[3] > tMat.rows)
			throw `Picture ${picture} is larger than the target region ${region}`;
		[offsetx, offsety] = region;
		mat = mat.getRegion(new cv.Rect(offsetx, offsety, region[2], region[3]));
	}

    let result = templateMatching(mat, tMat, confidence);
	return result ? { x: offsetx + result.x + tMat.cols / 2, y: offsety + result.y + tMat.rows / 2 } : null;
}

function findAllPic(picture, region = null, confidence = conf.THRESHOLD, isRGB = conf.MATCH_RGB) {
    if (minicap.lastFrame == null) return [];
    let tMat = fetchTemplateMat(picture, isRGB);
    let mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);

	let offsetx = 0, offsety = 0;
	if (typeof(region) === "array" && region.length == 4) {
		if (region[2] > tMat.cols || region[3] > tMat.rows)
			throw `Picture ${picture} is larger than the target region ${region}`;
		[offsetx, offsety] = region;
		mat = mat.getRegion(new cv.Rect(offsetx, offsety, region[2], region[3]));
	}

    let results = templateMatchingAll(mat, tMat, conf.FINDALL_LIMIT, confidence);
    for (let i = 0; i < results.length; i++) {
        results[i].x += offsetx + tMat.cols / 2;
        results[i].y += offsety + tMat.rows / 2;
    }
    return results;
}

function waitPic(picture, reverseCheck, timeout, interval, region, confidence, isRGB)  {
    const tMat = fetchTemplateMat(picture, isRGB);
	let offsetx = 0, offsety = 0, regionw = 0, regionh = 0;
	if (typeof(region) === "array" && region.length == 4) {
		if (region[2] > tMat.cols || region[3] > tMat.rows)
			throw `Picture ${picture} is larger than the target region ${region}`;
		[offsetx, offsety, regionw, regionh] = region;
	}	
    const startTime = Date.now();
    return new Promise((resolve) => {
        function findTemplate() {
            if (minicap.lastFrame) {
                let mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
				if (regionw > 0 && regionh > 0) {
					mat = mat.getRegion(new cv.Rect(offsetx, offsety, regionw, regionh));
				}

                const r = templateMatching(mat, tMat, confidence);
                if (r && !reverseCheck) {
                    resolve({ x: offsetx + r.x + tMat.cols / 2, y: offsety + r.y + tMat.rows / 2 });
                    return;
                }
				else if (!r && reverseCheck) {
					resolve();
					return;
				}
            }
            if (Date.now() > startTime + timeout * 1000) {
                if (!reverseCheck)
					throw `Picture ${picture} not found in screen`;
				else
					throw `Picture ${picture} always found in screen`;
            }
            else {
                setTimeout(findTemplate, interval * 1000);
            }
        }
        findTemplate();
    });
}

// APIs
global.Sleep = async (s) => {
    if (conf.DEBUG) console.log(`sleep ${s}`);
    await sleep(s);
};

global.Swipe = async (from_x, from_y, to_x, to_y, duration = 0.8, steps = 8) => {
    if (conf.DEBUG) console.log(`swipe ${from_x},${from_y} -> ${to_x},${to_y}`);
    minitouch.action('d', from_x, from_y);
    const interval = duration / (steps + 1);
    for (let i = 1; i <= steps; i++) {
        minitouch.action('m', from_x + (to_x - from_x) * i / steps, from_y + (to_y - from_y) * i / steps);
        await sleep(interval);
    }
    minitouch.action('u');
};

// Touch(x, y, [duration]) or Touch(picture, [duration])
global.Touch = async (x, y, duration = 0.05) => {
	const t = typeof(x);
	if (t === "number") {
		assert(typeof(y) === "number");
		if (conf.DEBUG) console.log(`touch ${x} ${y}`);
		await touch(x, y, duration);
	}
	else if (t === "string") {
		duration = typeof(y) === "number" ? y : 0.05;
		const r = findPic(x);
		if (r) {
			if (conf.DEBUG) console.log(`touch ${x} at ${r.x},${r.y}`);
			await touch(r.x, r.y, duration);
		}
		else {
			if (conf.DEBUG) console.log(`touch ${x} but not found`);
		}	
	}
};

// options: 'rgb', 'timeout', 'interval', 'confidence', 'region'
global.Wait = async (picture, options = {}) => {
    if (conf.DEBUG) console.log(`wait ${picture}`);

    const timeout = ('timeout' in options) ? options.timeout : conf.FIND_TIMEOUT;
    const interval = ('interval' in options) ? options.interval : conf.FIND_INTERVAL;
	const confidence = ('confidence' in options) ? options.confidence : conf.THRESHOLD;
    const isRGB = ('rgb' in options) ? options.rgb : conf.MATCH_RGB;
	const region = ('region' in options) ? options.region : null;

	return await waitPic(picture, false, timeout, interval, region, confidence, isRGB);		
}

global.WaitGone = async (picture, options = {}) => {
    if (conf.DEBUG) console.log(`wait ${picture} to not exist`);

    const timeout = ('timeout' in options) ? options.timeout : conf.FIND_TIMEOUT;
    const interval = ('interval' in options) ? options.interval : conf.FIND_INTERVAL;
	const confidence = ('confidence' in options) ? options.confidence : conf.THRESHOLD;
    const isRGB = ('rgb' in options) ? options.rgb : conf.MATCH_RGB;
	const region = ('region' in options) ? options.region : null;

	return await waitPic(picture, true, timeout, interval, region, confidence, isRGB);
}

global.Find = findPic;

global.FindAll = findAllPic;

// options: 'delay', 'waitgone', 'retry', 'retrytime', 'rgb', 'timeout', 'interval', 'confidence', 'region'
global.TouchEx = async (picture, options = {}) => {
	const delay = ('delay' in options) ? options.delay : conf.ACTION_DELAY;
	const retry = ('retry' in options) ? options.retry : false;
    let waitgone = ('waitgone' in options) ? options.waitgone : false;
	if (retry) waitgone = true;
	const interval = ('interval' in options) ? options.interval : conf.FIND_INTERVAL;
	const retrytime = ('retrytime' in options) ? options.retrytime : conf.RETRY_INTERVAL;

	const p = await Wait(picture, options);
	await sleep(delay);
	await touch(p.x, p.y);
	let t = 0;
	while (waitgone) {
		await sleep(interval);
		t += interval;
		const p2 = findPic(picture);
		if (!p2) break;
		if (retry && t >= retrytime) {
			t = 0;
			await touch(p2.x, p2.y);
		}
	}
}

global.Snapshot = (filepath) => {
	if (minicap.lastFrame) {
		let p = filepath.lastIndexOf(".");
		filepath = filepath.substr(0, p < 0 ? filepath.length : p) + ".jpg";
		fs.writeFileSync(filepath, minicap.lastFrame);
	}	
}