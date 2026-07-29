'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('página inicial possui resumo, temporada recente, recordes e campeões', () => {
    const html = read('index.html');
    assert.match(html, /id="home-view"/);
    assert.match(html, /id="home-stats"/);
    assert.match(html, /id="home-season-cards"/);
    assert.match(html, /id="home-records"/);
    assert.match(html, /id="home-recent-champions"/);
});

test('Home usa snapshots e ranking histórico, sem dados fixos de campeão recente', () => {
    const script = read('script.js');
    const home = script.match(/function getHomeRanking[\s\S]*?function getTitleCounts/);
    assert.ok(home, 'lógica da Home não encontrada');
    assert.match(home[0], /aggregateHistoricalRanking/);
    assert.match(home[0], /calculateCombinedStandings/);
    assert.match(home[0], /state\.historyPayloads/);
    assert.match(home[0], /config\.champions/);
});

test('menu inclui Início antes do Hall e a Home oculta exportação CSV', () => {
    const script = read('script.js');
    assert.match(script, /createElement\('span', '', 'Início'\)/);
    assert.match(script, /elements\.exportCsv\.hidden = viewName === 'home'/);
});
