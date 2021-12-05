'use strict';
const assert = require('assert');
const { initDevice } = require('./common'),
    minicap = require('./minicap'),
    minitouch = require('./minitouch'),
    cv = require('opencv4nodejs-prebuilt'),
    conf = require('./config');

const m = module.exports = {};

m.init = (designWidth, designHeight) => {
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

m.sleep = async (s) => {
    if (conf.DEBUG) console.log(`sleep ${s}`);
    await sleep(s);
};

m.touch = async (x, y, duration = 0.05) => {
    if (conf.DEBUG) console.log(`touch ${x} ${y}`);
    minitouch.action('d', x, y);
    await sleep(duration);
    minitouch.action('u');
};

m.swipe = async (from_x, from_y, to_x, to_y, duration = 0.8, steps = 8) => {
    if (conf.DEBUG) console.log(`swipe ${from_x},${from_y} -> ${to_x},${to_y}`);
    minitouch.action('d', from_x, from_y);
    const interval = duration / (steps + 1);
    for (let i = 1; i <= steps; i++) {
        minitouch.action('m', from_x + (to_x - from_x) * i / steps, from_y + (to_y - from_y) * i / steps);
        await sleep(interval);
    }
    minitouch.action('u');
};

let tmplMatCaches = new Map();
function fetchTemplateMat(picture, isRGB = false) {
    const key = picture + (isRGB ? "" : "_0");
    if (tmplMatCaches.has(key)) return tmplMatCaches.get(key);
    let tMat = cv.imread(picture, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
    tmplMatCaches.set(key, tMat);
    return tMat;
}

function checkSimilarity(matA, matB) {
    assert(matA.rows == matB.rows && matA.cols == matB.cols);
    for (let c = 0; c < 3; c++) {
        const histA = cv.calcHist(matA, [{ channel: c, ranges: [0, 256], bins: 256 }]).convertTo(cv.CV_32F);
        const histB = cv.calcHist(matB, [{ channel: c, ranges: [0, 256], bins: 256 }]).convertTo(cv.CV_32F);
        const dist = histA.compareHist(histB, cv.HISTCMP_BHATTACHARYYA);
        if (dist > conf.THRESHOLD_SIMILARITY) return false;
    }
    return true;
}

function templateMatching(srcMat, tMat, maxResultCount = 1) {
    let results = [];
    let sMat = srcMat;
    while (true) {
        let matched = sMat.matchTemplate(tMat, conf.MATCH_METHOD);
        const minMax = matched.minMaxLoc();
        const r = minMax.maxLoc;

        if (minMax.maxVal < conf.THRESHOLD) break;
        results.push(r);
        if (results.length >= maxResultCount) break;

        if (sMat == srcMat) sMat = srcMat.copy();
        sMat.drawRectangle(new cv.Rect(r.x, r.y, tMat.cols, tMat.rows), new cv.Vec3(0, 0, 0), -1);
    }
    return results;
}
function templateMatchingRGB(srcMat, tmplMat, maxResultCount = 1) {
    let results = [];
    let sMat = srcMat.cvtColor(cv.COLOR_BGR2GRAY);
    let tMat = tmplMat.cvtColor(cv.COLOR_BGR2GRAY);
    while (true) {
        let matched = sMat.matchTemplate(tMat, conf.MATCH_METHOD);
        const minMax = matched.minMaxLoc();
        const r = minMax.maxLoc;

        if (minMax.maxVal < conf.THRESHOLD) break;

        // Checking colors
        const subMat = srcMat.getRegion(new cv.Rect(r.x, r.y, tMat.cols, tMat.rows));
        if (checkSimilarity(tmplMat, subMat)) {
            results.push(r);
            if (results.length >= maxResultCount) break;
        }
        // Filling
        sMat.drawRectangle(new cv.Rect(r.x, r.y, tMat.cols, tMat.rows), new cv.Vec3(0, 0, 0), -1);
    }
    return results;
}

// options: 'rgb', 'timeout', 'interval'
m.wait = (picture, options = {}) => {
    if (conf.DEBUG) console.log(`wait ${picture}`);
    const isRGB = ('rgb' in options) ? options.rgb : conf.MATCH_RGB;
    const timeout = ('timeout' in options) ? options.timeout : conf.FIND_TIMEOUT;
    const interval = ('interval' in options) ? options.interval : conf.FIND_INTERVAL;

    const tMat = fetchTemplateMat(picture, isRGB);
    const startTime = Date.now();
    return new Promise((resolve) => {
        function findTemplate() {
            if (minicap.lastFrame) {
                const mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
                const r = (isRGB ? templateMatchingRGB : templateMatching)(mat, tMat, 1);
                if (r.length > 0) {
                    resolve({ x: r[0].x + tMat.cols / 2, y: r[0].y + tMat.rows / 2 });
                    return;
                }
            }
            if (Date.now() > startTime + timeout * 1000) {
                throw `Picture ${picture} not found in screen`;
            }
            else {
                setTimeout(findTemplate, interval * 1000);
            }
        }
        findTemplate();
    });
}


m.find = (picture, isRGB = conf.MATCH_RGB) => {
    if (minicap.lastFrame == null) return null;
    let tMat = fetchTemplateMat(picture, isRGB);
    const mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
    const r = (isRGB ? templateMatchingRGB : templateMatching)(mat, tMat, 1);
    return r.length > 0 ? r[0] : null;
}

m.findAll = (picture, isRGB = conf.MATCH_RGB) => {
    if (minicap.lastFrame == null) return [];
    let tMat = fetchTemplateMat(picture, isRGB);
    const mat = cv.imdecode(minicap.lastFrame, isRGB ? cv.IMREAD_COLOR : cv.IMREAD_GRAYSCALE);
    let results = (isRGB ? templateMatchingRGB : templateMatching)(mat, tMat, conf.MAX_RESULT_COUNT);
    for (let i = 0; i < results.length; i++) {
        results[i].x += tMat.cols / 2;
        results[i].y += tMat.rows / 2;
    }
    return results;
}