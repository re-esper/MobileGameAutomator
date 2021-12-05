'use strict';

const cv = require('opencv4nodejs-prebuilt');

let config = {};

config.DEBUG = false;
config.CAPTURE_FPS = 4;
config.THRESHOLD = 0.7;
config.THRESHOLD_SIMILARITY = 0.3;
config.OPDELAY = 0.1;
config.FIND_TIMEOUT = 20;
config.FIND_INTERVAL = 0.5;
config.MATCH_METHOD = cv.TM_CCOEFF_NORMED;
config.MATCH_RGB = false;
config.MAX_RESULT_COUNT = 10;

module.exports = config;