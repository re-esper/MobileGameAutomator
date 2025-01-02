const bot = require('../engine/engine');
const assert = require('assert');

const TEAM = 5; // 使用队伍
const SKILL = 1; // 使用技能

async function waitTouch(pic, delay = 0.5)
{
    const p = await bot.wait(pic, { timeout: 120 });
    await bot.sleep(delay);
    bot.touch(p.x, p.y);
}
async function touchAny() {
    await bot.touch(640, 40);
}

async function enterCampaign(teamNo)
{
    await waitTouch("tpl1637886206702.png");
    await waitTouch("tpl1636471282033.png");

    await bot.sleep(3.5);

    const startx = 280, starty = 180, stepx = 360, stepy = 168;
    const teamx = startx + ((teamNo - 1) % 3) * stepx;
    const teamy = starty + parseInt((teamNo - 1) / 3) * stepy;
    await bot.touch(teamx, teamy);

    await bot.sleep(1);
    await waitTouch("tpl1637033278990.png");
}

const CS_UNKNOWN = 0, CS_PREPARE = 1, CS_COMMAND = 2, CS_READY = 3, CS_VICTORY = 4;
function checkCombatState()
{
    if (bot.find("tpl1637888836386.png")) { // "已登场 0/n"
        return CS_PREPARE;
    }
    if (bot.find("tpl1637886388354.png", true)) { // 黄色 "就绪"
        return CS_COMMAND;
    }
    if (bot.find("tpl1636472370725.png", true)) { // 绿色 "就绪"
        return CS_READY;
    }
    if (bot.find("tpl1636472445532.png")) { // 胜利
        return CS_VICTORY;
    }
    return CS_UNKNOWN;
}

const ST_UNKNOWN = 0, ST_TARGET = 1, ST_AOE = 2; // skill type
let skillType = ST_UNKNOWN;
async function setCommand(kind, skillNo) {
    const enemy_x_table = [ 636, 712, 788 ];
    const enemy_y = 180;
    const cmd_x = 466 + (skillNo - 1) * 166;
    const cmd_y = 352;

    if (skillType == ST_UNKNOWN) {
        await bot.touch(cmd_x, cmd_y);
        await bot.sleep(2);
        if (bot.find("tpl1636472370725.png", true)) {
            skillType = ST_AOE;
            console.log(`技能 ${SKILL} 是 非指向性`);
            return;
        }
        else {
            skillType = ST_TARGET;
            console.log(`技能 ${SKILL} 是 指向性 `);
        }
    }

    if (skillType == ST_AOE) {
        await bot.touch(cmd_x, cmd_y);
        await bot.sleep(1.5);
    }
    else { // ST_TARGET
        const indexes = [
            [ 2, 1, 0 ], // 小怪关首回合
            [ 1, 0, 2 ], // Boss关首回合
            [ 0, 1, 2 ], // 非首回合
        ][kind];
        for (let index of indexes) {
            const enemy_x = enemy_x_table[index];
            await bot.swipe(cmd_x, cmd_y, enemy_x, enemy_y);
            await bot.sleep(1.5);
            if (bot.find("tpl1636472370725.png", true)) {
                return;
            }
        }
        assert.fail('战斗指令设置失败');
    }
}
async function fight(stageNo)
{
    let isFirstTurn = true;
    while (true) {
        const state = checkCombatState();
        switch (state) {
            case CS_COMMAND:
                const kind = isFirstTurn ? (stageNo < 4 ? 0 : 1) : 2;
                await setCommand(kind, SKILL);
                break;
            case CS_PREPARE:
                await bot.touch(1152, 352);
                await bot.sleep(8);
                break;
            case CS_READY:
                isFirstTurn = false;
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

async function enterCombat(stageNo)
{
    const map_y_table = [-1, 378, 484, -1];
    if (stageNo == 1 || stageNo >= 4) {
        await waitTouch("tpl1636471454032.png", 2);
        return;
    }
    const y = map_y_table[stageNo - 1];
    for (let x = 215; x <= 715; x += 100) {
        await bot.touch(x, y);
        await bot.sleep(2);
        const p = bot.find("tpl1636471454032.png");
        if (p) {
            await bot.touch(p.x, p.y);
            return;
        }
    }
    assert.fail('无法进入关卡');
}

async function pickTreasure(stageNo)
{
    await bot.wait(stageNo > 1 ? "tpl1637903769715.png" : "tpl1636472470647.png", { timeout: 120 });
    await bot.touch(800, 320);
    await bot.sleep(0.5);
    await bot.touch(800, 640);
}

async function openChest()
{
    await bot.wait("tpl1638112096.png");
    await bot.sleep(4);
    await bot.touch(670, 152);
    await bot.sleep(0.5);
    await bot.touch(452, 508);
    await bot.sleep(0.5);
    await bot.touch(910, 508);
    await bot.sleep(1);
    await bot.touch(670, 382);
    await bot.sleep(5.5);
    await bot.touch(632, 608);
}

(async () => {
    await bot.init(1280, 720);
    console.log("engine initialized");

    let round = 0;
    while (true) {
        console.time("用时");
        await enterCampaign(TEAM);
        await bot.sleep(4);

        for (let stageNo = 1; stageNo <= 4; stageNo++) {
            await enterCombat(stageNo);
            await bot.sleep(10);
            await fight(stageNo);
            if (stageNo < 4) {
                await bot.sleep(2);
                await pickTreasure(stageNo);
                await bot.sleep(2);
            }
        }

        await bot.sleep(10);
        await openChest();

        round++;
        console.log(`轮 ${round} 完成`);
        console.timeEnd("用时");
        await bot.sleep(5);
    }
})();


