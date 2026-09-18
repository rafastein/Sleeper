'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../ambo-core');
const sync = require('../scripts/sync-data');

function fixture() {
    const league = {
        league_id: 'keeper-2025', season: '2025', status: 'complete',
        settings: { divisions: 3, playoff_teams: 6 },
        metadata: { division_1: 'Norte', division_2: 'Central', division_3: 'Sul' }
    };
    const rosters = Array.from({ length: 12 }, (_, i) => ({
        roster_id: i + 1, owner_id: `user-${i + 1}`,
        settings: { division: i % 3 + 1, wins: 3, losses: 1, ties: 0, fpts: 100, fpts_decimal: i }
    }));
    const winnersBracket = [{ p: 1, w: 1, l: 2 }, { p: 3, w: 3, l: 4 }, { p: 5, w: 5, l: 6 }];
    const losersBracket = [{ p: 1, w: 7, l: 8 }, { p: 3, w: 9, l: 10 }, { p: 5, w: 11, l: 12 }];
    return { leagueId: league.league_id, league, rosters, users: [], winnersBracket, losersBracket,
        ...core.calculateStandings(winnersBracket, losersBracket, rosters, league) };
}

test('Keeper calcula posições 1–4 em cada grupo, sem pontos de título ou playoff', () => {
    const snapshot = fixture();
    const before = structuredClone(snapshot);
    const result = core.buildDivisionStandings(snapshot.league, snapshot.rosters);
    assert.equal(result.complete, true);
    assert.deepEqual(result.groups.map(group => group.name), ['Norte', 'Central', 'Sul']);
    for (const group of result.groups) {
        assert.deepEqual(group.standings.map(row => row.rank), [1, 2, 3, 4]);
        assert.ok(group.standings.every(row => row.source === 'regular-season' && !('points' in row)));
    }
    assert.deepEqual(result.groups[0].standings.map(row => row.rosterId), [10, 7, 4, 1]);
    assert.equal(snapshot.standings[0].rosterId, 1, 'campeão continua sendo o vencedor dos playoffs');
    assert.deepEqual(snapshot, before, 'não pode alterar os dados de origem');
});

test('grupos respeitam vitórias, empates e FPTS com casas decimais', () => {
    const snapshot = fixture();
    snapshot.rosters[0].settings.wins = 4;
    snapshot.rosters[3].settings.ties = 1;
    const group = core.buildDivisionStandings(snapshot.league, snapshot.rosters).groups[0];
    assert.deepEqual(group.standings.map(row => row.rosterId), [1, 4, 10, 7]);
});

test('composição e nomes vêm de cada temporada, sem usar grupos fixos de 2026', () => {
    const snapshot = fixture();
    snapshot.league.metadata.division_1 = 'Grupo de outro ano';
    snapshot.rosters[0].settings.division = 2;
    snapshot.rosters[1].settings.division = 1;
    const groups = core.buildDivisionStandings(snapshot.league, snapshot.rosters).groups;
    assert.equal(groups[0].name, 'Grupo de outro ano');
    assert.ok(groups[0].standings.some(row => row.rosterId === 2));
    assert.ok(!groups[0].standings.some(row => row.rosterId === 1));
});

test('dados incompletos são sinalizados sem atribuir um grupo por adivinhação', () => {
    const snapshot = fixture();
    delete snapshot.rosters[0].settings.division;
    snapshot.rosters[1].settings.division = 9;
    const result = core.buildDivisionStandings(snapshot.league, snapshot.rosters);
    assert.equal(result.complete, false);
    assert.deepEqual(result.unassignedRosterIds, [1, 2]);
    assert.equal(core.buildDivisionStandings({}, [{ roster_id: 1 }]).complete, false);
    assert.equal(core.buildDivisionStandings({}, []).complete, false);
});

test('normalização preserva número, nomes e vínculo de grupo na sincronização futura', () => {
    const snapshot = fixture();
    const league = sync.trimLeague({ ...snapshot.league, metadata: { ...snapshot.league.metadata, unrelated: 'omitido' } });
    assert.equal(league.settings.divisions, 3);
    assert.deepEqual(league.metadata, snapshot.league.metadata);
    assert.equal(sync.trimRoster(snapshot.rosters[2]).settings.division, 3);
    assert.equal(sync.trimRoster({ settings: {} }).settings.division, null);
    assert.equal(sync.parseArgs(['--divisions-only']).divisionsOnly, true);
});

test('recuperação histórica altera somente os grupos e preserva estatísticas salvas', () => {
    const snapshot = fixture();
    snapshot.league.metadata.note = 'preservar';
    const before = structuredClone(snapshot);
    const liveRosters = structuredClone(snapshot.rosters);
    liveRosters[0].settings.wins = 999;
    liveRosters[0].owner_id = 'outro-owner';
    const result = sync.enrichSnapshotDivisions(snapshot, before.league, liveRosters);
    assert.deepEqual(result, before);
    assert.deepEqual(snapshot, before);
});

test('recuperação rejeita liga errada, temporada errada, rosters diferentes ou grupos ausentes', () => {
    const snapshot = fixture();
    assert.throws(() => sync.enrichSnapshotDivisions(snapshot, { ...snapshot.league, league_id: 'outra' }, snapshot.rosters), /divergente/);
    assert.throws(() => sync.enrichSnapshotDivisions(snapshot, { ...snapshot.league, season: '2026' }, snapshot.rosters), /divergente/);
    assert.throws(() => sync.enrichSnapshotDivisions(snapshot, snapshot.league, snapshot.rosters.slice(1)), /participantes divergentes/);
    const incomplete = structuredClone(snapshot.rosters);
    delete incomplete[0].settings.division;
    assert.throws(() => sync.enrichSnapshotDivisions(snapshot, snapshot.league, incomplete), /grupos incompletos/);
});

test('snapshots Keeper de 2021–2026 têm os três grupos e mantêm as posições gerais dos brackets', () => {
    for (let year = 2021; year <= 2026; year++) {
        const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'snapshots', String(year), 'keeper.json')));
        const snapshot = payload.leagues[0];
        const divisions = core.buildDivisionStandings(snapshot.league, snapshot.rosters);
        assert.equal(divisions.complete, true, String(year));
        assert.equal(divisions.groups.length, 3, String(year));
        assert.ok(divisions.groups.every(group => group.standings.length === 4), String(year));
        assert.deepEqual(core.calculateStandings(snapshot.winnersBracket, snapshot.losersBracket, snapshot.rosters, snapshot.league).standings, snapshot.standings);
    }
});
