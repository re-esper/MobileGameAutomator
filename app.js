const bot = require('./engine/engine');

(async () => {
    await bot.init(1280, 720);
    console.log("engine initialized");
})();


