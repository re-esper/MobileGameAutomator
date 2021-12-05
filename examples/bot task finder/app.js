const bot = require('../engine/engine');
const assert = require('assert');


async function waitTouch(pic, delay = 0.5) {
    const p = await bot.wait(pic, { timeout: 120 });
    await bot.sleep(delay);
    bot.touch(p.x, p.y);
}
async function touchAny() {
    await bot.touch(640, 40);
}

async function enterCampaign(teamNo) {
    await waitTouch("tpl1636472533600.png");
    await waitTouch("tpl1636471282033.png");

    await bot.sleep(3.5);

    const startx = 280, starty = 180, stepx = 360, stepy = 168;
    const teamx = startx + ((teamNo - 1) % 3) * stepx;
    const teamy = starty + parseInt((teamNo - 1) / 3) * stepy;
    await bot.touch(teamx, teamy);

    await bot.sleep(1);
    await waitTouch("tpl1637033278990.png");
}

async function leaveCampaign(step) {
    while (true) { // 可能因"任务完成"弹框而无法点到
        await waitTouch("tpl1636474671865.png");
        await bot.sleep(2);
        const p = bot.find("tpl1636474686005.png");
        if (p) {
            await bot.sleep(1);
            bot.touch(p.x, p.y);
            break;
        }
    }
    await waitTouch("tpl1636474703663.png");
    if (step > 1) {
        await bot.wait("tpl1636475041948.png", { 'timeout': 40, 'interval': 1 });
        await bot.sleep(2);
        await touchAny();
    }
}

const CS_UNKNOWN = 0, CS_PREPARE = 1, CS_COMMAND = 2, CS_READY = 3, CS_VICTORY = 4;
function checkCombatState() {
    if (bot.find("tpl1637888836386.png")) { // "已登场 0/n"
        return CS_PREPARE;
    }
    if (bot.find("tpl1637886388354.png", true)) { // 黄色 "就绪"
        return CS_COMMAND;
    }
    if (bot.find("tpl1636472445532.png")) { // 胜利
        return CS_VICTORY;
    }
    return CS_UNKNOWN;
}

async function setCommand(skillNo, target = -1) {
    const enemy_x_table = [636, 712, 788];
    const enemy_y = 180;
    const cmd_x = 466 + (skillNo - 1) * 166;
    const cmd_y = 352;
    if (target == -1) {
        await bot.touch(cmd_x, cmd_y);
        await bot.sleep(1.5);
    }
    else {
        const enemy_x = enemy_x_table[target];
        await bot.swipe(cmd_x, cmd_y, enemy_x, enemy_y);
        await bot.sleep(1.5);
    }
}

async function fight() {
    while (true) {
        const state = checkCombatState();
        switch (state) {
            case CS_COMMAND:
                await setCommand(1);
                await setCommand(1);
                await setCommand(1);
                await bot.touch(1152, 352);
                await bot.sleep(8);
                break;
            case CS_PREPARE:
                await bot.touch(1152, 352);
                await bot.sleep(8);
                break;
            case CS_VICTORY:
                await bot.sleep(1);
                await touchAny();
                return;
            default: // CS_UNKNOWN
                await bot.sleep(1);
        }
    }
}

async function pickTreasure() {
    await bot.wait("tpl1636472470647.png", { timeout: 120 });
    await bot.touch(800, 320);
    await bot.sleep(0.5);
    await bot.touch(800, 640);
}

async function moveForward(tier, direction) {
    const enterBoon = async (p) => {
        await bot.touch(p.x, p.y);
        await bot.sleep(1);
        await touchAny();
    }
    const enterHealer = async (p) => {
        await bot.touch(p.x, p.y);
        await bot.sleep(2);
        await touchAny();
    }
    const enterMystery = async (p) => {
        await bot.touch(p.x, p.y);
        await bot.sleep(4);
        await bot.touch(620, 320);
        await bot.sleep(2);
        await bot.touch(620, 600); // "选择"
        await bot.sleep(2);
        await touchAny();
    }

    if (direction !== "l" && direction !== "r") {
        if (tier == 1) {
            let p = bot.find("tpl1636471454032.png"); // "开始"
            assert(p);
            await bot.touch(p.x, p.y);
            return "combat";
        }
        let p = bot.find("tpl1637126930625.png", true); // mystery
        if (p) {
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            if (bot.find("tpl1637192098656.png")) {
                const p2 = bot.find("tpl1637126786336.png"); // "前往"
                assert(p2);
                await enterMystery(p2);
                return "stranger";
            }
            return "mystery";
        }
        p = bot.find("tpl1637126766509.png", true); // healer
        if (p && p.y < 520) {
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            const p2 = bot.find("tpl1637126786336.png"); // "前往"
            assert(p2);
            await enterHealer(p2);
            return "healer";
        }
        for (let pic of ["tpl1637126867799.png", "tpl1637187947399.png", "tpl1637188093380.png"]) { // boons
            p = bot.find(pic, true);
            if (p && p.y < 520) break;
        }
        if (p && p.y < 520) {
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            const p2 = bot.find("tpl1637126881597.png"); // "揭示"
            assert(p2);
            await enterBoon(p2);
            return "boon";
        }
        // 没找到, 可能是单战斗或双战斗+任意选择
        direction = Math.random() > 0.5 ? "r" : "l";
    }
    const map_y = 278 + (tier - 1) * 40;
    const left_x = 215, right_x = 715;
    for (let x = 0; x <= 500; x += 100) {
        const map_x = direction === "l" ? left_x + x : right_x - x;
        await bot.touch(map_x, map_y);
        await bot.sleep(2);
        let p = bot.find("tpl1636471454032.png"); // "开始"
        if (p) {
            await bot.touch(p.x, p.y);
            return "combat";
        }
        p = bot.find("tpl1637126881597.png"); // "揭示"
        if (p) {
            await enterBoon(p);
            return "boon";
        }
        p = bot.find("tpl1637126786336.png"); // "前往"
        if (p) {
            await enterHealer(p);
            return "healer";
        }
    }
    assert.fail("未能找到关卡!");
}

const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
function ask(text) {
    return new Promise((resolve) => {
        readline.question(text, (input) => resolve(input));
    });
}

function parseBountyAction(optext) {
    let ops = {};
    if (optext === "1") return ops;
    for (var i = 0; i < optext.length; i += 2) {
        const step = parseInt(optext[i]);
        if (!(step > 1 && step < 7)) return null;
        const direction = optext[i + 1];
        if (!(direction == "r" || direction == "l")) return null;
        ops[step] = direction;
    }
    return Object.keys(ops).length > 0 ? ops : null;
}

(async () => {
    await bot.init(1280, 720);
    console.log("engine initialized");

    let teamNo = 1; /*NaN;
    while (isNaN(teamNo) || teamNo < 1 || teamNo > 9) {
        teamNo = parseInt(await ask("使用队伍编号? "));
    }*/

    let round = 0, strangers = 0;
    let beep = false;
    while (true) {
        await enterCampaign(teamNo);
        await bot.sleep(5);
        if (beep) {
            process.stderr.write("\007");
            beep = false;
        }


        // 回车 - 放弃当前悬赏
        // "1" - 所有分歧点按默认决策(神秘点 > 非战斗点 > 战斗)
        // 例"2r4l" - 第n层左l或右r, 其它按默认决策
        let optext = await ask("路线规划? ");
        let ops = parseBountyAction(optext);

        let step = 1;
        if (ops) {
            round++;
            while (true) {
                const kind = await moveForward(step, ops[step]);
                console.log(`步 ${step} -> ${kind}`);
                if (kind === "combat") {
                    await bot.sleep(10);
                    await fight();
                    await bot.sleep(2);
                    await pickTreasure();
                    await bot.sleep(2);
                }
                else if (kind == "mystery" || kind == "stranger") {
                    kind == "stranger" && strangers++;
                    console.log(`神秘陌生人 ${strangers} / ${round}`);
                    beep = true;
                    break;
                }
                step++;
                await bot.sleep(3);
            }
        }
        await leaveCampaign(step);
        await bot.sleep(4);
    }
})();


