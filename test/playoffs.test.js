const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../ambo-core');
const proxy = require('../api/sleeper');
const ROOT = path.resolve(__dirname, '..');

const league = {
    settings: {
        playoff_teams: 6,
        playoff_week_start: 15
    }
};

const winnersBracket = [
    { r: 1, m: 1, t1: 3, t2: 6, w: 3, l: 6 },
    { r: 1, m: 2, t1: 4, t2: 5, w: 5, l: 4 },
    { r: 2, m: 3, t1: 1, t2_from: { w: 1 }, w: 1, l: 3 },
    { r: 2, m: 4, t1: 2, t2_from: { w: 2 }, w: 5, l: 2 },
    { r: 2, m: 5, t1_from: { l: 1 }, t2_from: { l: 2 }, w: 6, l: 4, p: 5 },
    { r: 3, m: 6, t1_from: { w: 3 }, t2_from: { w: 4 }, w: 5, l: 1, p: 1 },
    { r: 3, m: 7, t1_from: { l: 3 }, t2_from: { l: 4 }, w: 3, l: 2, p: 3 }
];

const matchupsByWeek = {
    15: [
        { roster_id: 3, matchup_id: 1, points: 110.1, custom_points: null },
        { roster_id: 6, matchup_id: 1, points: 99.2, custom_points: null },
        { roster_id: 4, matchup_id: 2, points: 101.3, custom_points: null },
        { roster_id: 5, matchup_id: 2, points: 115.4, custom_points: null }
    ],
    16: [
        { roster_id: 1, matchup_id: 3, points: 120.9, custom_points: null },
        { roster_id: 3, matchup_id: 3, points: 96.15, custom_points: null },
        { roster_id: 2, matchup_id: 4, points: 61.7, custom_points: null },
        { roster_id: 5, matchup_id: 4, points: 115.4, custom_points: 116.7 },
        { roster_id: 6, matchup_id: 5, points: 108.2, custom_points: null },
        { roster_id: 4, matchup_id: 5, points: 97.8, custom_points: null }
    ],
    17: [
        { roster_id: 1, matchup_id: 6, points: 72.35, custom_points: null },
        { roster_id: 5, matchup_id: 6, points: 94.3, custom_points: null },
        { roster_id: 3, matchup_id: 7, points: 110.33, custom_points: null },
        { roster_id: 2, matchup_id: 7, points: 88.5, custom_points: null }
    ]
};

test('calcula as semanas dos playoffs a partir da configuração da liga', () => {
    assert.deepEqual(core.getPlayoffWeekNumbers(league, winnersBracket), [15, 16, 17]);
});

test('monta rodadas, progressão e final usando o bracket do Sleeper', () => {
    const result = core.buildPlayoffRounds(winnersBracket, league, matchupsByWeek);
    assert.equal(result.totalRounds, 3);
    assert.equal(result.rounds[0].label, 'Quartas de final');
    assert.equal(result.rounds[1].label, 'Semifinais');
    assert.equal(result.rounds[2].label, 'Final');
    assert.equal(result.championRosterId, 5);
    assert.equal(result.completed, true);

    const final = result.rounds[2].matches.find(match => match.placement === 1);
    assert.equal(final.team1RosterId, 1);
    assert.equal(final.team2RosterId, 5);
    assert.equal(final.team1Score, 72.35);
    assert.equal(final.team2Score, 94.3);
    assert.equal(final.winnerRosterId, 5);
});

test('placar corrigido pelo comissário tem prioridade', () => {
    const result = core.buildPlayoffRounds(winnersBracket, league, matchupsByWeek);
    const semifinal = result.rounds[1].matches.find(match => match.matchId === 4);
    assert.equal(semifinal.team2Score, 116.7);
    assert.equal(semifinal.team2ScoreDetails.originalPoints, 115.4);
    assert.equal(semifinal.team2ScoreDetails.customPoints, 116.7);
});

const losersBracket = [
    { r: 1, m: 8, t1: 7, t2: 12, w: 7, l: 12 },
    { r: 1, m: 9, t1: 8, t2: 11, w: 8, l: 11 },
    { r: 1, m: 10, t1: 9, t2: 10, w: 9, l: 10 },
    { r: 2, m: 11, t1_from: { w: 8 }, t2_from: { w: 9 }, w: 8, l: 9, p: 5 },
    { r: 2, m: 12, t1: 6, t2_from: { w: 10 }, w: 6, l: 10 },
    { r: 3, m: 13, t1: 7, t2_from: { w: 12 }, w: 7, l: 6, p: 1 },
    { r: 3, m: 14, t1_from: { l: 11 }, t2: 11, w: 9, l: 11, p: 3 }
];

test('consolação usa rótulos de 7º, 9º e 11º lugares', () => {
    const result = core.buildPlayoffRounds(losersBracket, league, {}, { bracketType: 'losers' });
    const final = result.rounds[2].matches.find(match => match.placement === 1);
    const third = result.rounds[2].matches.find(match => match.placement === 3);
    const fifth = result.rounds[1].matches.find(match => match.placement === 5);
    assert.equal(final.placementLabel, 'Disputa do 7º lugar');
    assert.equal(third.placementLabel, 'Disputa do 9º lugar');
    assert.equal(fifth.placementLabel, 'Disputa do 11º lugar');
});

test('rota de playoffs preserva liga, chave e rodada', () => {
    const query = core.serializeRoute({
        view: 'playoffs',
        year: 2025,
        series: 'serieA',
        league: 2,
        bracket: 'losers',
        round: 3
    });
    assert.equal(query, '?view=playoffs&year=2025&series=serieA&league=2&bracket=losers&round=3');
    assert.deepEqual(core.parseRoute(query, { years: [2025] }), {
        view: 'playoffs',
        year: 2025,
        series: 'serieA',
        sort: 'titles',
        query: '',
        manager: null,
        league: 2,
        bracket: 'losers',
        round: 3
    });
});

test('proxy aceita matchups semanais e bloqueia semanas inválidas', () => {
    assert.equal(proxy.isAllowedPath('/league/123456/matchups/17'), true);
    assert.equal(proxy.isAllowedPath('/league/123456/matchups/170'), false);
    assert.equal(proxy.isAllowedPath('/league/123456/matchups/week17'), false);
});

test('interface e sincronizador incluem os playoffs', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const script = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
    const sync = fs.readFileSync(path.join(ROOT, 'scripts/sync-data.js'), 'utf8');
    assert.match(html, /id="season-playoffs-tab"/);
    assert.match(html, /id="playoff-bracket-desktop"/);
    assert.match(html, /data-bracket="winners"/);
    assert.match(script, /function renderPlayoffs\(\)/);
    assert.match(sync, /matchups\/\$\{week\}/);
});
