'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../ambo-core.js');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

test('plural usa singular só para 1 e aceita plural irregular', () => {
    assert.equal(core.plural(1, 'participação', 'participações'), '1 participação');
    assert.equal(core.plural(11, 'participação', 'participações'), '11 participações');
    assert.equal(core.plural(0, 'vice'), '0 vices');
    assert.equal(core.plural(1, 'terceiro'), '1 terceiro');
});

test('perfil não monta mais "participaçãoões" nem rebaixa o recorte para minúsculas', () => {
    assert.doesNotMatch(script, /participação\$\{[^}]*'ões'/);
    assert.doesNotMatch(script, /getHistoryScopeLabel\(\)\.toLowerCase\(\)/);
});

test('rota ?view=champions abre o Hall de campeões', () => {
    assert.equal(core.parseRoute('?view=champions', { years: [2025] }).view, 'champions');
    const applyRoute = script.slice(script.indexOf('async function applyRoute('), script.indexOf('function updateNetworkStatus('));
    assert.match(applyRoute, /route\.view === 'champions'\)\s*\{\s*showChampions\(/);
});

test('trajetória do perfil no celular não desenha avatar com iniciais do ano', () => {
    const profile = script.slice(script.indexOf('async function showManagerProfile('), script.indexOf('async function resolveLeagueIds('));
    assert.match(profile, /avatar: false,/);
    assert.doesNotMatch(profile, /label: 'Colocação'/);
    assert.match(profile, /compact: true/);
});
