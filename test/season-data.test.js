const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../season-data');
const core = require('../ambo-core');

const validate = rows => {
    if (!rows.length || rows.some(row => !row.valid)) throw new Error('invalid');
};
const saved = { leagues: [{ valid: true, score: 100 }], generatedAt: '2026-09-15T09:00:00Z' };

test('temporada atual consulta novos resultados mesmo com snapshot salvo', async () => {
    const result = await load({ preferLive: true, validate,
        loadLive: async () => [{ valid: true, score: 200 }],
        loadSaved: async () => { throw new Error('snapshot não deve ser lido'); }
    });
    assert.equal(result.snapshots[0].score, 200);
    assert.equal(result.live, true);
    assert.equal(result.stale, false);
});

test('falha de rede conserva dados e data anteriores com aviso de desatualização', async () => {
    const result = await load({ preferLive: true, validate,
        loadLive: async () => { throw new Error('offline'); }, loadSaved: async () => saved });
    assert.deepEqual(result.snapshots, saved.leagues);
    assert.equal(result.updatedAt, saved.generatedAt);
    assert.equal(result.stale, true);
    assert.equal(result.live, false);
});

test('dados novos inválidos não substituem classificação válida', async () => {
    const result = await load({ preferLive: true, validate,
        loadLive: async () => [{ valid: false }], loadSaved: async () => saved });
    assert.equal(result.stale, true);
    assert.deepEqual(result.snapshots, saved.leagues);
});

test('falha sem snapshot é propagada em vez de mostrar tabela vazia como atualizada', async () => {
    await assert.rejects(load({ preferLive: true, validate,
        loadLive: async () => { throw new Error('offline'); }, loadSaved: async () => null }), /offline/);
});

test('temporadas anteriores continuam usando dados históricos sem consultar API', async () => {
    const result = await load({ preferLive: false, validate,
        loadLive: async () => { throw new Error('não consultar'); }, loadSaved: async () => saved });
    assert.equal(result.live, false);
    assert.equal(result.stale, false);
});

test('nova rodada altera classificação e pontos sem criar campeão histórico', () => {
    const rosters = [
        { roster_id: 1, owner_id: '1', settings: { wins: 1, losses: 0, fpts: 110 } },
        { roster_id: 2, owner_id: '2', settings: { wins: 0, losses: 1, fpts: 100 } }
    ];
    assert.equal(core.calculateStandings([], [], rosters, {}).standings[0].rosterId, 1);
    rosters[1].settings = { wins: 1, losses: 1, fpts: 240 };
    rosters[0].settings = { wins: 1, losses: 1, fpts: 200 };
    const result = core.calculateStandings([], [], rosters, {});
    assert.equal(result.standings[0].rosterId, 2);
    assert.equal(result.standings[0].points, 2);
    const entries = core.buildHistoricalEntries([{ year: 2026, seriesKey: 'keeper', leagues: [{
        rosters, users: [], ...result
    }] }]);
    assert.ok(entries.every(entry => entry.provisional));
    assert.equal(core.aggregateHistoricalRanking(entries).length, 0);
});
