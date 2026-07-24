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
