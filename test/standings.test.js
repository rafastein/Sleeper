'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../ambo-core.js');

function makeRosters(count = 12) {
    return Array.from({ length: count }, (_, index) => ({
        roster_id: index + 1,
        owner_id: `user-${index + 1}`,
        settings: {
            wins: count - index,
            losses: index,
            ties: 0,
            fpts: 1000 + index,
            fpts_decimal: index,
            fpts_against: 900 + index,
            fpts_against_decimal: 0
        }
    }));
}

const completeWinnersBracket = [
    { p: 1, w: 1, l: 2 },
    { p: 3, w: 3, l: 4 },
    { p: 5, w: 5, l: 6 }
];

const completeLosersBracket = [
    { p: 1, w: 7, l: 8 },
    { p: 3, w: 9, l: 10 },
    { p: 5, w: 11, l: 12 }
];

test('transforma os dois brackets em posições únicas de 1 a 12', () => {
    const rosters = makeRosters();
    const result = core.calculateStandings(
        completeWinnersBracket,
        completeLosersBracket,
        rosters,
        { settings: { playoff_teams: 6 } }
    );

    assert.equal(result.usedFallback, false);
    assert.deepEqual(result.standings.map(row => row.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.deepEqual(result.standings.map(row => row.points), [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
});

test('uma liga de 12 participantes distribui exatamente 78 pontos', () => {
    const result = core.calculateStandings(
        completeWinnersBracket,
        completeLosersBracket,
        makeRosters(),
        { settings: { playoff_teams: 6 } }
    );
    const validation = core.validateStandings(result.standings, 12);

    assert.equal(validation.valid, true);
    assert.equal(validation.actualPointTotal, 78);
    assert.equal(validation.expectedPointTotal, 78);
});

test('FPTS considera a parte decimal do Sleeper', () => {
    const roster = { settings: { fpts: 1501, fpts_decimal: 82 } };
    assert.equal(core.getRosterPoints(roster), 1501.82);
});

test('bracket incompleto usa fallback sem repetir posições', () => {
    const result = core.calculateStandings(
        [{ p: 1, w: 1, l: 2 }],
        [],
        makeRosters(),
        { settings: { playoff_teams: 6 } }
    );
    const validation = core.validateStandings(result.standings, 12);

    assert.equal(result.usedFallback, true);
    assert.equal(validation.valid, true);
    assert.equal(new Set(result.standings.map(row => row.rank)).size, 12);
});

test('validador rejeita posições duplicadas e soma incorreta', () => {
    const invalid = [
        { rosterId: 1, rank: 1, points: 12 },
        { rosterId: 2, rank: 1, points: 12 }
    ];
    const validation = core.validateStandings(invalid, 2);

    assert.equal(validation.valid, false);
    assert.match(validation.errors.join(' '), /posição repetida/);
});

test('cadastro canônico soma duas contas do mesmo manager', () => {
    const registry = {
        managers: [{
            canonicalId: 'rafa',
            displayName: 'rafastein',
            sleeperUserIds: ['old-user', 'new-user'],
            aliases: ['Rafa', 'rafastein']
        }]
    };

    const snapshots = [
        {
            leagueId: 'one',
            standings: [{ rosterId: 1, rank: 1, points: 12 }],
            rosters: [{ roster_id: 1, owner_id: 'old-user', settings: { fpts: 1000, fpts_decimal: 50 } }],
            users: [{ user_id: 'old-user', display_name: 'Rafa antigo', avatar: null }]
        },
        {
            leagueId: 'two',
            standings: [{ rosterId: 2, rank: 4, points: 9 }],
            rosters: [{ roster_id: 2, owner_id: 'new-user', settings: { fpts: 1100, fpts_decimal: 25 } }],
            users: [{ user_id: 'new-user', display_name: 'rafastein', avatar: null }]
        }
    ];

    const combined = core.calculateCombinedStandings(snapshots, registry);

    assert.equal(combined.length, 1);
    assert.equal(combined[0].managerName, 'rafastein');
    assert.equal(combined[0].points, 21);
    assert.equal(combined[0].appearances, 2);
    assert.equal(combined[0].fpts, 2100.75);
});


test('co-owner cujo nome corresponde ao nome da equipe é exibido como manager principal', () => {
    const roster = {
        roster_id: 4,
        owner_id: 'dedebenjor-id',
        co_owners: ['jptavares-id'],
        metadata: null
    };
    const users = [
        {
            user_id: 'dedebenjor-id',
            username: 'dedebenjor',
            display_name: 'dedebenjor',
            metadata: { team_name: 'Jptavares' }
        },
        {
            user_id: 'jptavares-id',
            username: 'Jptavares',
            display_name: 'Jptavares',
            metadata: null
        }
    ];

    const manager = core.getUserForRoster(roster, users);
    assert.equal(manager.user_id, 'jptavares-id');
    assert.equal(core.getManagerName(manager, roster), 'Jptavares');
});

test('owner original continua sendo usado quando o nome da equipe não identifica um co-owner', () => {
    const roster = {
        roster_id: 4,
        owner_id: 'owner-id',
        co_owners: ['co-owner-id'],
        metadata: null
    };
    const users = [
        {
            user_id: 'owner-id',
            username: 'owner',
            display_name: 'Owner',
            metadata: { team_name: 'Recife Bucs' }
        },
        {
            user_id: 'co-owner-id',
            username: 'guest',
            display_name: 'Guest',
            metadata: null
        }
    ];

    const manager = core.getUserForRoster(roster, users);
    assert.equal(manager.user_id, 'owner-id');
});
