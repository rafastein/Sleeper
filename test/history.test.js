'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../ambo-core.js');

const registry = {
    managers: [
        { canonicalId: 'alpha', displayName: 'Alpha', sleeperUserIds: ['a'], aliases: ['Alpha'] },
        { canonicalId: 'beta', displayName: 'Beta', sleeperUserIds: ['b'], aliases: ['Beta'] },
        { canonicalId: 'gamma', displayName: 'Gamma', sleeperUserIds: ['c'], aliases: ['Gamma'] }
    ]
};

function league(index, rows, usedFallback = false) {
    return {
        index,
        leagueId: `league-${index}`,
        league: { name: `Liga ${index + 1}`, season: '2024' },
        usedFallback,
        standings: rows.map((row, position) => ({
            rosterId: position + 1,
            rank: row.rank,
            points: row.points
        })),
        rosters: rows.map((row, position) => ({
            roster_id: position + 1,
            owner_id: row.userId,
            settings: {
                fpts: row.fpts,
                fpts_decimal: row.decimal || 0
            }
        })),
        users: rows.map(row => ({
            user_id: row.userId,
            display_name: row.name,
            avatar: null
        }))
    };
}

const payloads = [
    {
        schemaVersion: 1,
        year: 2024,
        seriesKey: 'serieA',
        seriesLabel: 'Série A',
        leagues: [league(0, [
            { userId: 'a', name: 'Alpha', rank: 1, points: 3, fpts: 1200 },
            { userId: 'b', name: 'Beta', rank: 2, points: 2, fpts: 1100 },
            { userId: 'c', name: 'Gamma', rank: 3, points: 1, fpts: 1000 }
        ])]
    },
    {
        schemaVersion: 1,
        year: 2023,
        seriesKey: 'serieA',
        seriesLabel: 'Série A',
        leagues: [league(0, [
            { userId: 'b', name: 'Beta', rank: 1, points: 3, fpts: 1250 },
            { userId: 'a', name: 'Alpha', rank: 2, points: 2, fpts: 1150 },
            { userId: 'c', name: 'Gamma', rank: 3, points: 1, fpts: 1050 }
        ])]
    },
    {
        schemaVersion: 1,
        year: 2024,
        seriesKey: 'serieB',
        seriesLabel: 'Série B',
        leagues: [league(0, [
            { userId: 'a', name: 'Alpha', rank: 1, points: 3, fpts: 1300 },
            { userId: 'c', name: 'Gamma', rank: 2, points: 2, fpts: 1200 },
            { userId: 'b', name: 'Beta', rank: 3, points: 1, fpts: 1000 }
        ])]
    }
];

test('gera uma entrada histórica por manager em cada ano e série', () => {
    const entries = core.buildHistoricalEntries(payloads, registry);

    assert.equal(entries.length, 9);
    assert.deepEqual(
        entries.filter(entry => entry.canonicalId === 'alpha').map(entry => [entry.year, entry.seriesKey, entry.rank]),
        [[2024, 'serieA', 1], [2024, 'serieB', 1], [2023, 'serieA', 2]]
    );
});

test('ranking histórico acumula pontos, títulos, pódios e média', () => {
    const entries = core.buildHistoricalEntries(payloads, registry);
    const ranking = core.aggregateHistoricalRanking(entries);
    const alpha = ranking.find(manager => manager.canonicalId === 'alpha');

    assert.equal(ranking[0].canonicalId, 'alpha');
    assert.equal(alpha.totalPoints, 8);
    assert.equal(alpha.titles, 2);
    assert.equal(alpha.podiums, 3);
    assert.equal(alpha.participations, 3);
    assert.equal(alpha.bestFinish, 1);
    assert.equal(Number(alpha.averageFinish.toFixed(2)), 1.33);
});

test('filtro por série considera somente o recorte escolhido', () => {
    const entries = core.buildHistoricalEntries(payloads, registry);
    const ranking = core.aggregateHistoricalRanking(entries, { seriesKey: 'serieB' });

    assert.equal(ranking.length, 3);
    assert.equal(ranking[0].canonicalId, 'alpha');
    assert.equal(ranking[0].totalPoints, 3);
    assert.equal(ranking[0].participations, 1);
});

test('snapshots provisórios não entram no histórico oficial', () => {
    const provisionalPayload = {
        schemaVersion: 1,
        year: 2025,
        seriesKey: 'serieA',
        seriesLabel: 'Série A',
        leagues: [league(0, [
            { userId: 'c', name: 'Gamma', rank: 1, points: 3, fpts: 1400 },
            { userId: 'a', name: 'Alpha', rank: 2, points: 2, fpts: 1300 },
            { userId: 'b', name: 'Beta', rank: 3, points: 1, fpts: 1200 }
        ], true)]
    };

    const entries = core.buildHistoricalEntries([...payloads, provisionalPayload], registry);
    const official = core.aggregateHistoricalRanking(entries);
    const includingProvisional = core.aggregateHistoricalRanking(entries, { includeProvisional: true });

    assert.equal(official.find(manager => manager.canonicalId === 'gamma').titles, 0);
    assert.equal(includingProvisional.find(manager => manager.canonicalId === 'gamma').titles, 1);
});

test('perfil histórico retorna trajetória em ordem decrescente de ano', () => {
    const entries = core.buildHistoricalEntries(payloads, registry);
    const profile = core.getHistoricalProfile(entries, 'alpha');

    assert.equal(profile.managerName, 'Alpha');
    assert.deepEqual(profile.history.map(entry => entry.year), [2024, 2024, 2023]);
});

test('Hall oficial complementa títulos antigos sem duplicar o mesmo ano e série', () => {
    const historicalEntries = [
        {
            canonicalId: 'scp', managerName: 'SCPATRIOTS', avatar: null,
            year: 2022, seriesKey: 'serieA', seriesLabel: 'Série A', rank: 1,
            points: 24, bestLeagueRank: 1, fpts: 3000, leagueAppearances: 2, provisional: false
        },
        {
            canonicalId: 'dede', managerName: 'dedebenjor', avatar: null,
            year: 2024, seriesKey: 'serieA', seriesLabel: 'Série A', rank: 1,
            points: 23, bestLeagueRank: 1, fpts: 2900, leagueAppearances: 2, provisional: false
        },
        {
            canonicalId: 'scp', managerName: 'SCPATRIOTS', avatar: null,
            year: 2024, seriesKey: 'serieA', seriesLabel: 'Série A', rank: 2,
            points: 22, bestLeagueRank: 2, fpts: 2800, leagueAppearances: 2, provisional: false
        }
    ];
    const officialRegistry = {
        managers: [
            { canonicalId: 'scp', displayName: 'SCPATRIOTS', sleeperUserIds: [], aliases: ['SCPATRIOTS'] },
            { canonicalId: 'dede', displayName: 'dedebenjor', sleeperUserIds: [], aliases: ['dedebenjor'] }
        ]
    };
    const officialChampions = [
        { year: 2024, serieA: 'dedebenjor' },
        { year: 2022, serieA: 'SCPATRIOTS' },
        { year: 2021, serieA: 'SCPATRIOTS', serieB: 'dedebenjor' },
        { year: 2019, serieA: 'SCPATRIOTS' }
    ];

    const ranking = core.aggregateHistoricalRanking(historicalEntries, {
        sortBy: 'titles',
        officialChampions,
        registry: officialRegistry
    });

    const scp = ranking.find(manager => manager.canonicalId === 'scp');
    const dede = ranking.find(manager => manager.canonicalId === 'dede');

    assert.equal(ranking[0].canonicalId, 'scp');
    assert.equal(scp.titles, 3);
    assert.equal(dede.titles, 2);
    assert.equal(scp.secondPlaces, 1);
    assert.equal(scp.history.filter(entry => entry.officialTitleOnly).length, 2);
});

test('ordenação por títulos desempata por vices e depois por terceiros lugares', () => {
    const ranking = core.sortHistoricalRanking([
        { managerName: 'Terceiro', titles: 2, secondPlaces: 1, thirdPlaces: 3, totalPoints: 100, averageFinish: 4, totalFpts: 1000 },
        { managerName: 'Primeiro', titles: 2, secondPlaces: 2, thirdPlaces: 0, totalPoints: 90, averageFinish: 5, totalFpts: 900 },
        { managerName: 'Segundo', titles: 2, secondPlaces: 1, thirdPlaces: 4, totalPoints: 80, averageFinish: 6, totalFpts: 800 }
    ], 'titles');

    assert.deepEqual(ranking.map(manager => manager.managerName), ['Primeiro', 'Segundo', 'Terceiro']);
});


test('Hall oficial reconhece títulos da categoria Keeper', () => {
    const awards = core.buildOfficialTitleAwards([
        { year: 2022, keeper: 'rafastein' }
    ], {
        managers: [{
            canonicalId: 'rafa',
            displayName: 'rafastein',
            aliases: ['rafastein'],
            sleeperUserIds: []
        }]
    }, 'keeper');

    assert.equal(awards.length, 1);
    assert.equal(awards[0].seriesKey, 'keeper');
    assert.equal(awards[0].seriesLabel, 'Keeper');
    assert.equal(awards[0].canonicalId, 'rafa');
});
