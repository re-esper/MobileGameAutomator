const bot = require('../../engine/engine');

const ROUND = 45;

(async () => {
    await InitEngine(1920, 1080);
    console.log("engine initialized");

    let r = 0;
    while (r < ROUND)
    {
        // 强化 50x2
        for (let i = 0; i < 2; i++) {
            await TouchEx("1upgrade.png", { retry: true, delay: 1 });
            await TouchEx("dots.png", { delay: 1 });
            await TouchEx("grade_n.png", { delay: 3 });
            await TouchEx("tick.png", { delay: 2 });
            await Sleep(1);
            await TouchEx("upgrade.png");
            await Sleep(20);
            await TouchEx("okey.png", { retry: true, delay: 2 });
            await Sleep(1);
        }

        // 分解 100
        await TouchEx("1disenchant.png", { retry: true, delay: 1 });
        await TouchEx("dots.png", { delay: 1 });        
        await TouchEx("grade_n.png", { delay: 2 });
        await TouchEx("tick.png", { delay: 2 });
        await Sleep(1);
        await TouchEx("disenchant.png");
        await Sleep(8);        
        await Touch(640, 40);
        await Sleep(2);

        r++;
        console.log(`progress: ${r*100} / ${ROUND*100}`);
    }
    
    console.log("done");
})();