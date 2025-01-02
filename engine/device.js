'use strict';
const { getAndroidToolPath } = require("android-tools-bin");
const cp = require('child_process'),
    net = require('net'),
    assert = require('assert');

module.exports = {
    initDevice, execSync, execAdb, execAdbSocket, killAdbProc,
    deviceInfo: {}
};

const procs = [], sockets = [];
function execSync(cmd, pwd) {
    let out = "";
    try {
        out = cp.execSync(cmd, { encoding: 'utf8', cwd: pwd || '.' }).trim();
    }
    catch (err) {
    }
    return out;
};

let adb = getAndroidToolPath("adb");
function execAdb(cmd) {
    return execSync(adb + " " + cmd);
}

function exec(cmd, name, pwd, restart) {
    let proc = cp.exec(cmd, {
        encoding: 'utf8', cwd: pwd || '.'
    });
    proc.isRunning = true;
    proc.shouldStop = !restart;
    proc.name = name || cmd;
    proc.on('exit', () => {
        if (!proc.shouldStop) exec(cmd, name, pwd, restart);
        proc.isRunning = false;
    });
    procs.push(proc);
    return proc;
};

function execAdbSocket(cmd, port, name, cbData) {
    execSync(`${adb} forward tcp:${port} localabstract:${name}`);
    const proc = exec(adb + " " + cmd, name);
    proc.stdout.on('data', d => {
        if (!proc.hasSocket) setTimeout(() => {
            if (proc.hasSocket) return;
            proc.hasSocket = true;
            trySocket(proc, port, name, cbData);
        }, 500);
    });
    return proc;
}

function trySocket(proc, port, name, cbData) {
    if (!proc.socketTry) proc.socketTry = 1;
    else proc.socketTry++;

    proc.socket = net.connect({ port });
    proc.socket.on('data', cbData);
    proc.socket.on('error', err => console.log('stream error', port, name, err));
    proc.socket.isOpen = true;
    proc.socket.name = name;
    sockets.push(proc.socket);
    proc.socket.on('connect', () => {
        //console.log('***** starting stream', port, name, proc.socketTry);
    });
    proc.socket.on('end', () => {
        proc.socket.isOpen = false;
        if (proc.socket.shouldClose) return;
        //console.log(`socket ${port}/${name} has closed - program may need to be restarted.`);
        if (proc.socketTry < 5) setTimeout(() => {
            trySocket(proc, port, name, cbData);
        }, 2000);
    });
}

function killAdbProc(proc) {
    if (!proc) return;
    if (proc.socket && proc.socket.isOpen) {
        proc.socket.shouldClose = true;
        proc.socket.end();
    }
    if (proc.isRunning) {
        proc.shouldStop = true;
        proc.kill();
    }
}

function initDevice(vw, vh, serial) {
    if (serial) {
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\:[0-9]{1,5}$/.test(serial)) { // is ip:port
            execAdb(`connect ${serial}`);
        }
        adb += ` -s ${serial}`;
    }

    const info = module.exports.deviceInfo;
    info.abi = execAdb("shell -x getprop ro.product.cpu.abi");
    if (info.abi == "") {
        process.exit(1);
    }
    info.sdk = execAdb("shell -x getprop ro.build.version.sdk");

    const dumpsys = execAdb("shell -x dumpsys window");
    let found = dumpsys.match(/init=(\d+)x(\d+)/);
    assert(found);
    info.w = parseInt(found[1]);
    info.h = parseInt(found[2]);
    if ((info.w > info.h && vw < vh) || (info.w < info.h && vw > vh)) {
        info.vw = vh;
        info.vh = vw;
    }
    else {
        info.vw = vw;
        info.vh = vh;
    }
    found = dumpsys.match(/mCurrentRotation=(?:ROTATION_)?(\d+)/);
    if (found) info.rot = parseInt(found[1]);
    info.rot = info.rot || 0;
    if (info.rot == 1) info.rot = 90;
}