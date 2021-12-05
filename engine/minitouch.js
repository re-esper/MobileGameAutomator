'use strict';
const { deviceInfo, execAdb, execAdbSocket, killAdbProc } = require('./common'),
    path = require('path');

const name = 'minitouch';
const rdir = '/data/local/tmp/';
const port = 1718;
const m = module.exports = {
    proc: null,
    running: false
};

m.init = () => {
    const basedir = path.join(__dirname, '..', 'node_modules/@devicefarmer/minitouch-prebuilt/prebuilt');

    let dir = path.join(basedir, deviceInfo.abi, 'bin');
    execAdb(`push ${dir}/${name} ${rdir}`);
    execAdb(`shell -x chmod 775 ${rdir}/${name}`);
};

m.start = () => {
    m.proc = execAdbSocket(`shell -x ${rdir}/${name}`, port, name, cbData);
    //m.proc = execAdbSocket(`shell -x su root -c ${rdir}/${name}`, port, name, cbData);
};

m.stop = () => {
    cbDataInit();
    killAdbProc(m.proc);
    m.proc = null;
    execAdb(`shell -x killall ${name}`);
    m.running = false;
};

let max_contacts, max_x, max_y, max_pressure;
function cbDataInit() {
    max_contacts = -1;
    max_x = max_y = 0;
}

function cbData(d) {
    d = d.toString();
    let matches = d.match(/\^ (\d+) (\d+) (\d+) (\d+)/);
    if (matches) {
        console.log("minitouch inited");
        m.running = true;
        max_contacts = parseInt(matches[1]);
        max_x = parseInt(matches[2]);
        max_y = parseInt(matches[3]);
        max_pressure = parseInt(matches[4]);
    }
}

function transform_xy(x, y) {
    if (deviceInfo.rot == 90) {
        [x, y] = [deviceInfo.vw - y, x];
    }
    else if (deviceInfo.rot == 180) {
        [x, y] = [deviceInfo.vw - x, deviceInfo.vh - y];
    }
    else if (deviceInfo.rot == 270) {
        [x, y] = [y, deviceInfo.vh - x];
    }
    return [x, y];
}
m.action = (type, x = 0, y = 0) => {
    if (max_contacts <= 0) return;
    if (['u', 'm', 'd'].indexOf(type) < 0) return;

    let txt = '', c = '\nc\n';
    if (type === 'u') txt = `u 0 ${c}`;
    else {
        [x, y] = transform_xy(x, y);
        x = Math.floor(x / deviceInfo.vw * max_x);
        y = Math.floor(y / deviceInfo.vh * max_y);
        txt = `${type} 0 ${x} ${y} 50 ${c}`;
    }
    m.proc.socket.write(txt);
};
