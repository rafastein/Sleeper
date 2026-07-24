'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config.js');

test('todas as temporadas possuem Keeper, Série A e Série B', () => {
    for (const [year, season] of Object.entries(config.leagueIds)) {
        assert.ok(season.keeper, `${year} sem Keeper`);
        assert.ok(season.serieA, `${year} sem Série A`);
        assert.ok(season.serieB, `${year} sem Série B`);
    }
});

test('Keeper usa descoberta pelo usuário rafastein', () => {
    for (const [year, season] of Object.entries(config.leagueIds)) {
        assert.equal(season.keeper.username, 'rafastein', `${year} com usuário Keeper incorreto`);
        assert.deepEqual(season.keeper.nameIncludes, ['keeper'], `${year} sem filtro Keeper`);
        assert.equal(season.keeper.expectedLeagues, 1, `${year} deve localizar uma liga Keeper`);
    }
});

test('anos de snapshot existem na configuração', () => {
    for (const year of config.data.snapshotYears) {
        assert.ok(config.leagueIds[year], `snapshot configurado para ano inexistente: ${year}`);
    }
});
