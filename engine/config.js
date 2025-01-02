'use strict';

const cv = require('opencv4nodejs-prebuilt');

let config = {};

config.DEBUG = false;
config.CAPTURE_FPS = 4;
config.THRESHOLD = 0.85;
config.ACTION_DELAY = 0.1;
config.FIND_TIMEOUT = 120;
config.FIND_INTERVAL = 0.25;
config.MATCH_RGB = true;
config.FINDALL_LIMIT = 1000;
config.RETRY_INTERVAL = 1;

module.exports = config;