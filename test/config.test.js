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

test('Keeper usa descoberta opcional pelo usuário rafastein', () => {
    for (const [year, season] of Object.entries(config.leagueIds)) {
        assert.equal(season.keeper.username, 'rafastein', `${year} com usuário Keeper incorreto`);
        assert.deepEqual(season.keeper.nameIncludes, ['keeper'], `${year} sem filtro Keeper`);
        assert.equal(season.keeper.expectedLeagues, 1, `${year} deve localizar uma liga Keeper`);
        assert.equal(season.keeper.optional, true, `${year} deve permitir ausência da Keeper sem interromper a sincronização`);
    }
});

test('anos de snapshot existem na configuração', () => {
    for (const year of config.data.snapshotYears) {
        assert.ok(config.leagueIds[year], `snapshot configurado para ano inexistente: ${year}`);
    }
});

const fs = require('node:fs');
const path = require('node:path');

test('sincronizador ignora somente recortes opcionais com zero ligas', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'sync-data.js'), 'utf8');
    assert.match(source, /seasonConfig\?\.optional === true && ids\.length === 0/);
    assert.match(source, /console\.log\('IGNORADA'\)/);
    assert.match(source, /recorte\(s\) opcional\(is\) não foram encontrados/);
});

test('interface trata Keeper opcional sem tentar carregar uma lista vazia', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
    assert.match(source, /seasonConfig\.optional === true && matchedLeagueIds\.length === 0/);
    assert.match(source, /a liga \${seriesLabel} de \${year} ainda não foi localizada no Sleeper/);
});
