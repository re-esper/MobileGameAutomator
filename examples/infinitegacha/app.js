require('../../engine/engine');

const TARGET_SSR = 3;

(async () => {
    await InitEngine(1920, 1080);
    console.log("engine initialized");
    
    while (true)
    {
        let p;
        while (!(p = Find("reroll.png")))
        {
            await Touch(1734, 70);
            await Sleep(0.25);            
        }

        const r = FindAll("5stars.png");
        console.log(`ssr count: ${r.length}`);
        if (r.length >= TARGET_SSR) break;

        await Touch(p.x, p.y);

        await TouchEx("okey.png", { retry: true, delay: 0.5 });
    }

    console.log("done");

})();
