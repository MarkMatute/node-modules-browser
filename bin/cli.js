#!/usr/bin/env node

const mod = require('../build');

(async() => {
    await mod.start();
})();

console.log('Html generated...');