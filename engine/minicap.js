'use strict';
const { deviceInfo, execAdb, execAdbSocket, killAdbProc } = require('./common'),
    path = require('path'),
    conf = require('./config');

const name = 'minicap';
const rdir = '/data/local/tmp/';
const port = 1717;
const m = module.exports = {
    proc: null,
    running: false
};

m.init = () => {
    const basedir = path.join(__dirname, '..', '/node_modules/@devicefarmer/minicap-prebuilt/prebuilt');

    let dir = path.join(basedir, deviceInfo.abi, 'bin');
    execAdb(`push ${dir}/${name} ${rdir}`);
    execAdb(`shell -x chmod 775 ${rdir}/${name}`);

    dir = path.join(basedir, deviceInfo.abi, 'lib', 'android-' + deviceInfo.sdk);
    execAdb(`push ${dir}/${name}.so ${rdir}`);
    execAdb(`shell -x chmod 775 ${rdir}/${name}.so`);
};

m.start = () => {
    const w = deviceInfo.w, h = deviceInfo.h;
    const vw = deviceInfo.vw, vh = deviceInfo.vh;
    const rot = deviceInfo.rot;
    const args = `-P ${w}x${h}@${vw}x${vh}/${rot} -r ${conf.CAPTURE_FPS}`;
    cbDataInit();
    m.proc = execAdbSocket(`shell -x LD_LIBRARY_PATH=${rdir}/ ${rdir}/${name} ${args}`, port, name, cbData);
};

m.stop = () => {
    killAdbProc(m.proc);
    m.proc = null;
    execAdb(`shell -x killall ${name}`);
    m.running = false;
};

let readBannerBytes, bannerLength, readFrameBytes, frameBodyLength, frameBody, banner;
function cbDataInit() {
    readBannerBytes = 0;
    bannerLength = 2;
    readFrameBytes = 0;
    frameBodyLength = 0;
    frameBody = Buffer.alloc(0);
    banner = {
        version: 0,
        length: 0,
        pid: 0,
        realWidth: 0,
        realHeight: 0,
        virtualWidth: 0,
        virtualHeight: 0,
        orientation: 0,
        quirks: 0
    };
}

m.lastFrame = null;

function cbData(chunk) {
    if (!m.running) {
        console.log("minicap inited");
        m.running = true;
    }
    for (var cursor = 0, len = chunk.length; cursor < len;) {
        if (readBannerBytes < bannerLength) {
            switch (readBannerBytes) {
                case 0:
                    // version
                    banner.version = chunk[cursor];
                    break;
                case 1:
                    // length
                    banner.length = bannerLength = chunk[cursor];
                    break;
                case 2:
                case 3:
                case 4:
                case 5:
                    // pid
                    banner.pid += (chunk[cursor] << ((readBannerBytes - 2) * 8)) >>> 0;
                    break;
                case 6:
                case 7:
                case 8:
                case 9:
                    // real width
                    banner.realWidth += (chunk[cursor] << ((readBannerBytes - 6) * 8)) >>> 0;
                    break;
                case 10:
                case 11:
                case 12:
                case 13:
                    // real height
                    banner.realHeight += (chunk[cursor] << ((readBannerBytes - 10) * 8)) >>> 0;
                    break;
                case 14:
                case 15:
                case 16:
                case 17:
                    // virtual width
                    banner.virtualWidth += (chunk[cursor] << ((readBannerBytes - 14) * 8)) >>> 0;
                    break;
                case 18:
                case 19:
                case 20:
                case 21:
                    // virtual height
                    banner.virtualHeight += (chunk[cursor] << ((readBannerBytes - 18) * 8)) >>> 0;
                    break;
                case 22:
                    // orientation
                    banner.orientation += chunk[cursor] * 90;
                    break;
                case 23:
                    // quirks
                    banner.quirks = chunk[cursor];
                    break;
            }
            cursor += 1;
            readBannerBytes += 1;
        }
        else if (readFrameBytes < 4) {
            frameBodyLength += (chunk[cursor] << (readFrameBytes * 8)) >>> 0;
            cursor += 1;
            readFrameBytes += 1;
        }
        else {
            if (len - cursor >= frameBodyLength) {
                frameBody = Buffer.concat([frameBody, chunk.slice(cursor, cursor + frameBodyLength)]);

                // Sanity check for JPG header, only here for debugging purposes.
                if (frameBody[0] !== 0xFF || frameBody[1] !== 0xD8) {
                    console.error('Frame body does not start with JPG header', frameBody);
                    process.exit(1);
                }

                m.lastFrame = frameBody;

                cursor += frameBodyLength;
                frameBodyLength = readFrameBytes = 0;
                frameBody = Buffer.alloc(0);
            }
            else {
                frameBody = Buffer.concat([frameBody, chunk.slice(cursor, len)]);

                frameBodyLength -= len - cursor;
                readFrameBytes += len - cursor;
                cursor = len;
            }
        }
    }
}
