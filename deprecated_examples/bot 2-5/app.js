const bot = require('../engine/engine');

async function waitTouch(pic, delay = 0.5)
{
    const p = await bot.wait(pic, { 'timeout': 120 });
    await bot.sleep(delay);
    bot.touch(p.x, p.y);
}
async function touchAny() {
    await bot.touch(640, 40);
}

async function enterCampaign()
{
    await waitTouch("tpl1636472533600.png");
    await waitTouch("tpl1636471282033.png");
    await waitTouch("tpl1636471321360.png");
    await bot.sleep(1);
    await waitTouch("tpl1637033278990.png");
    await bot.sleep(4);
    await waitTouch("tpl1636471454032.png", 2);
}

async function fight()
{
    await waitTouch("tpl1636472286842.png", 2);
    await bot.sleep(8);
    await waitTouch("tpl1636477276973.png");
    await waitTouch("tpl1636472330246.png");
    await waitTouch("tpl1636472356649.png");
    await waitTouch("tpl1636472370725.png", 2);

    await bot.sleep(10);
    await waitTouch("tpl1636472445532.png");

    for (let i = 0; i < 4; i++) {
        await bot.sleep(1);
        await touchAny();
    }
    while (!bot.find("tpl1636472470647.png")) {
        await bot.sleep(1);
        await touchAny();
    }
    await bot.sleep(0.5);
    await bot.touch(800, 320);
    await bot.sleep(0.5);
    await waitTouch("tpl1636474620880.png");
}

async function moveForward()
{
    const targets = [];
    const mystery = bot.findAll("tpl1637126930625.png", true);
    for (let r of mystery) {
        targets.push({ type: "mystery", x: r.x, y: r.y  });
    }
    const t2targets = [];
    for (let pic of ["tpl1637126867799.png", "tpl1637187947399.png", "tpl1637188093380.png"]) {
        const boon = bot.findAll(pic, true);
        for (let r of boon) {
            t2targets.push({ type: "boon", x: r.x, y: r.y  });
        }
    }
    let boons = t2targets.length;
    const healer = bot.findAll("tpl1637126766509.png", true);
    for (let r of healer) {
        t2targets.push({ type: "healer", x: r.x, y: r.y  });
    }
    while (t2targets.length > 0) {
        const index = Math.floor(Math.random() * t2targets.length);
        targets.push(t2targets[index]);
        t2targets.splice(index, 1);
    }
    // try to go
    for (let t of targets) {
        await bot.touch(t.x, t.y);
        await bot.sleep(2);
        if (t.type == "mystery") {
            const p = bot.find("tpl1637126786336.png"); // "前往"
            if (p == null) continue;
            if (bot.find("tpl1637192098656.png")) {
                console.log("找到 神秘的陌生人!!!!!!");
            }
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            await bot.touch(620, 320);
            await bot.sleep(2);
            await bot.touch(620, 600); // "选择"
            await bot.sleep(2);
            await touchAny();
            return true;
        }
        else if (t.type == "boon") {
            const p = bot.find("tpl1637126881597.png"); // "揭示"
            if (p == null) continue;
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            await touchAny();
            return true;
        }
        else if (t.type == "healer") {
            const p = bot.find("tpl1637126786336.png"); // "前往"
            if (p == null) continue;
            await bot.touch(p.x, p.y);
            await bot.sleep(2);
            await touchAny();
            return true;
        }
    }
    return false;
}

async function leaveCampaign()
{
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
    await bot.wait("tpl1636475041948.png", { 'timeout': 40, 'interval': 1 });
    await bot.sleep(2);
    await touchAny();
}

(async () => {
    await bot.init(1280, 720);
    console.log("engine initialized");

    let round = 0;
    while (true) {
        await enterCampaign();
        await bot.sleep(10);
        await fight();

        await bot.sleep(4);

        let step = 1;
        while (await moveForward()) {
            step++;
            await bot.sleep(3);
        }

        await bot.sleep(2);
        await leaveCampaign();
        round++;
        console.log(`轮 ${round}, 步数 = ${step}`);
        await bot.sleep(4);
    }
})();


