require('./engine/engine');

(async () => {
    await InitEngine(1920, 1080);
    console.log("engine initialized");	
})();
