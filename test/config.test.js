'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config.js');

test('todas as temporadas possuem as duas séries', () => {
    for (const [year, season] of Object.entries(config.leagueIds)) {
        assert.ok(season.serieA, `${year} sem Série A`);
        assert.ok(season.serieB, `${year} sem Série B`);
    }
});

test('anos de snapshot existem na configuração', () => {
    for (const year of config.data.snapshotYears) {
        assert.ok(config.leagueIds[year], `snapshot configurado para ano inexistente: ${year}`);
    }
});
