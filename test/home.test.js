'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('página inicial possui resumo, temporada atual, recordes e campeões', () => {
    const html = read('index.html');
    assert.match(html, /id="home-view"/);
    assert.match(html, /id="home-stats"/);
    assert.match(html, /id="home-season-cards"/);
    assert.match(html, /id="home-records"/);
    assert.match(html, /id="home-recent-champions"/);
});

test('temporada atual é o primeiro bloco da Home, antes do hero e dos números históricos', () => {
    const html = read('index.html');
    assert.match(html, /<section id="home-view"[^>]*>\s*<article id="home-current-season"/);
    const current = html.indexOf('id="home-current-season"');
    assert.ok(current < html.indexOf('class="home-hero panel'));
    assert.ok(current < html.indexOf('id="home-stats"'));
    assert.equal((html.match(/id="home-season-cards"/g) || []).length, 1);
    assert.equal((html.match(/id="home-season-title"/g) || []).length, 1);
});

test('textos da Home usam temporada atual e eliminam o fechamento central viva', () => {
    const html = read('index.html');
    const script = read('script.js');
    assert.doesNotMatch(html + script, /última temporada|temporada mais recente|reunidos em uma central viva/i);
    assert.match(html, /Ver temporada atual/);
    assert.match(html, /aria-label="Temporada atual"/);
    assert.match(html, /Campeões, rankings, playoffs e trajetórias das ligas Keeper, Série A e Série B\.<\/p>/);
    assert.match(script, /Acompanhe a temporada atual e revisite campeões, rankings, playoffs e trajetórias históricas\./);
});

test('página inicial usa o título curto Ligas AMBO', () => {
    const script = read('script.js');
    assert.match(script, /elements\.pageTitle\.textContent = 'Ligas AMBO'/);
    assert.doesNotMatch(script, /Tudo o que importa nas ligas AMBO/);
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
