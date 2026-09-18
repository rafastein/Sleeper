'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../ambo-core');
const config = require('../config');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const homeSource = source.slice(source.indexOf('    function createHomeKeeperLeaders('), source.indexOf('    function createHomeRecordCard('));
const rowsSource = source.slice(source.indexOf('    function getLeagueRows('), source.indexOf('    function renderLeaguePanel('));
const registry = require('../data/managers.json');

function element(tag, className = '', textContent = '') {
    return { tag, className, textContent, children: [], dataset: {}, events: {},
        append(...items) { this.children.push(...items); },
        appendChild(item) { this.append(item); },
        addEventListener(name, callback) { this.events[name] = callback; },
        get lastElementChild() { return this.children.at(-1); }
    };
}

function all(node) { return [node, ...node.children.flatMap(all)]; }
function byClass(node, name) { return all(node).filter(item => item.className.split(' ').includes(name)); }
function textOf(node) { return all(node).map(item => String(item.textContent)).join(' '); }

// Stable fixtures: real leaders will change after every round of the live season.
function keeperFixture(year) {
    const league = { season: String(year), settings: { divisions: 3 },
        metadata: { division_1: 'AMBO Norte', division_2: 'AMBO Central', division_3: 'AMBO Sul' } };
    const rosters = Array.from({ length: 12 }, (_, i) => ({
        roster_id: i + 1, owner_id: `fixture-keeper-${i + 1}`,
        settings: { division: i % 3 + 1, wins: i < 3 ? 1 : 0, losses: i < 3 ? 0 : 1, ties: 0, fpts: 100 + i }
    }));
    const users = rosters.map(roster => ({ user_id: roster.owner_id, display_name: `Fixture ${roster.roster_id}` }));
    return { year, seriesKey: 'keeper', leagues: [{ league, rosters, users, usedFallback: true,
        standings: core.calculateStandings([], [], rosters, league).standings }] };
}

function render(series = 'keeper', change = () => {}, missing = false, year = 2026) {
    const payload = series === 'keeper' ? keeperFixture(year)
        : JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'snapshots', String(year), `${series}.json`)));
    change(payload);
    const calls = [];
    const context = {
        core, config, year, series, createElement: element,
        getHomeSnapshot: () => missing ? null : payload,
        state: { managerRegistry: registry },
        getSeriesIcon: key => key === 'keeper' ? 'K' : key === 'serieA' ? 'A' : 'B',
        createAvatar: (avatar, name) => element('img', 'avatar', name),
        createHomeProfileButton: (name, id) => Object.assign(element('button', 'home-manager-link', name), { canonicalId: id }),
        openHomeSeason: (...args) => calls.push(args),
        getUserForRoster: core.getUserForRoster,
        getManagerName: core.getManagerName,
        getTeamName: core.getTeamName,
        getRosterPoints: core.getRosterPoints,
        formatNumber: value => Number(value).toFixed(2).replace('.', ',')
    };
    const card = vm.runInNewContext(`${rowsSource}\n${homeSource}\ncreateHomeSeasonCard(year, series, [])`, context);
    return { card, calls, payload };
}

test('Home Keeper mostra um líder por grupo, na ordem dos grupos, sem pontuação nem pódio geral', () => {
    const { card } = render();
    const leaders = byClass(card, 'home-group-leader');
    assert.equal(leaders.length, 3);
    assert.equal(leaders.map(row => byClass(row, 'home-group-leader__group')[0].textContent).join('|'), 'Líder · AMBO Norte|Líder · AMBO Central|Líder · AMBO Sul');
    assert.equal(leaders.map(row => byClass(row, 'home-manager-link')[0].textContent).join('|'), 'Fixture 1|Fixture 2|Fixture 3');
    assert.ok(leaders.every(row => byClass(row, 'home-manager-link')[0].canonicalId));
    assert.equal(byClass(card, 'home-podium__place').length, 0);
    assert.doesNotMatch(textOf(card), /pontos|\d+º/);
    assert.match(textOf(card), /1-0 · FPTS/);
    assert.doesNotMatch(textOf(card), /V[–-]D/);
    assert.match(textOf(card), /1 liga · 12 managers/);
});

test('Home Keeper recalcula líderes pela campanha e usa os nomes de grupo do snapshot', () => {
    const { card } = render('keeper', payload => {
        const snapshot = payload.leagues[0];
        snapshot.league.metadata.division_1 = 'Grupo renomeado';
        snapshot.rosters.find(roster => roster.roster_id === 10).settings.wins = 10;
    });
    const leader = byClass(card, 'home-group-leader')[0];
    assert.equal(byClass(leader, 'home-group-leader__group')[0].textContent, 'Líder · Grupo renomeado');
    assert.equal(byClass(leader, 'home-manager-link')[0].textContent, 'Fixture 10');
});

test('dados de grupo incompletos não viram um pódio inventado', () => {
    const { card } = render('keeper', payload => { delete payload.leagues[0].rosters[0].settings.division; });
    assert.match(textOf(card), /Líderes por grupo indisponíveis/);
    assert.equal(byClass(card, 'home-group-leader').length, 0);
    assert.equal(byClass(card, 'home-podium').length, 0);
    assert.equal(byClass(card, 'home-card-button').length, 2);
});

test('sem snapshot a Home mantém o atalho de classificação sem inventar líderes', () => {
    const { card } = render('keeper', () => {}, true);
    assert.match(textOf(card), /Acompanhe a temporada/);
    assert.equal(byClass(card, 'home-group-leader').length, 0);
    assert.equal(byClass(card, 'home-card-button').length, 1);
});

test('Home mantém pódio e pontos combinados nas Séries A e B', () => {
    for (const series of ['serieA', 'serieB']) {
        const { card } = render(series);
        assert.equal(byClass(card, 'home-podium__place').map(item => item.textContent).join('|'), '1º|2º|3º');
        assert.equal(byClass(card, 'home-group-leader').length, 0);
        assert.equal((textOf(card).match(/pontos combinados/g) || []).length, 3);
    }
});

test('ações dos cards continuam abrindo a classificação e os playoffs da série correta', () => {
    for (const series of ['keeper', 'serieA', 'serieB']) {
        const { card, calls } = render(series);
        byClass(card, 'home-card-button').forEach(button => button.events.click());
        assert.deepEqual(calls, [[series, 'season'], [series, 'playoffs']]);
    }
});
