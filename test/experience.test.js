'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../ambo-core.js');

test('serializa e restaura a rota de uma temporada', () => {
    const search = core.serializeRoute({
        view: 'season',
        year: 2025,
        series: 'serieA',
        sort: 'fpts',
        query: 'Jp Tavares'
    });
    const route = core.parseRoute(search, { years: [2024, 2025] });

    assert.equal(route.view, 'season');
    assert.equal(route.year, 2025);
    assert.equal(route.series, 'serieA');
    assert.equal(route.sort, 'fpts');
    assert.equal(route.query, 'Jp Tavares');
});

test('rota inválida de temporada volta para a página inicial', () => {
    const route = core.parseRoute('?view=season&year=1999&series=serieA', { years: [2024, 2025] });
    assert.deepEqual(route, { view: 'home' });
});

test('a raiz do site representa a página inicial sem query string', () => {
    assert.deepEqual(core.parseRoute('', { years: [2024, 2025] }).view, 'home');
    assert.equal(core.serializeRoute({ view: 'home' }), '');
});

test('busca ignora maiúsculas, espaços e acentos', () => {
    const rows = [
        { managerName: 'José Tavares' },
        { managerName: 'Rafastein' }
    ];
    const result = core.filterBySearch(rows, 'jose tavares', ['managerName']);
    assert.deepEqual(result.map(row => row.managerName), ['José Tavares']);
});

test('ordenação da temporada por FPTS preserva os dados originais', () => {
    const rows = [
        { managerName: 'Alpha', points: 20, bestRank: 1, fpts: 2500 },
        { managerName: 'Beta', points: 22, bestRank: 2, fpts: 2400 }
    ];
    const sorted = core.sortSeasonRanking(rows, 'fpts');

    assert.equal(sorted[0].managerName, 'Alpha');
    assert.equal(rows[0].managerName, 'Alpha');
    assert.notEqual(sorted, rows);
});

test('CSV usa ponto e vírgula e protege aspas, quebras de linha e separadores', () => {
    const csv = core.rowsToCsv([
        { key: 'name', label: 'Manager' },
        { key: 'note', label: 'Observação' }
    ], [
        { name: 'Rafa', note: 'Campeão; "invicto"\n2025' }
    ]);

    assert.equal(csv, 'Manager;Observação\r\nRafa;"Campeão; ""invicto""\n2025"');
});

test('CSV permite colunas calculadas com o índice da linha', () => {
    const csv = core.rowsToCsv([
        { label: 'Posição', value: (_row, index) => index + 1 },
        { key: 'name', label: 'Manager' }
    ], [{ name: 'A' }, { name: 'B' }]);

    assert.equal(csv, 'Posição;Manager\r\n1;A\r\n2;B');
});

test('ranking histórico usa títulos como ordenação padrão na URL', () => {
    const route = core.parseRoute('?view=history', { years: [2024, 2025] });
    const search = core.serializeRoute({ view: 'history', sort: 'titles' });

    assert.equal(route.sort, 'titles');
    assert.equal(search, '?view=history');
});


test('serializa e restaura uma rota Keeper', () => {
    const search = core.serializeRoute({ view: 'season', year: 2025, series: 'keeper' });
    const route = core.parseRoute(search, { years: [2025] });

    assert.equal(route.view, 'season');
    assert.equal(route.series, 'keeper');
    assert.equal(route.year, 2025);
});

test('descoberta por nome encontra somente a liga Keeper', () => {
    const leagues = [
        { league_id: '1', name: 'AMBO Keeper' },
        { league_id: '2', name: 'AMBO Série B 1' },
        { league_id: '3', name: 'Outra Keeper Experimental' }
    ];
    const result = core.filterLeagueIdsForDiscovery(leagues, {
        nameIncludes: ['ambo', 'keeper']
    });

    assert.deepEqual(result, ['1']);
});

test('descoberta por previous_league_id continua funcionando', () => {
    const leagues = [
        { league_id: 'nova-a', name: 'Liga A', previous_league_id: 'antiga-a' },
        { league_id: 'nova-b', name: 'Liga B', previous_league_id: 'outra' }
    ];
    const result = core.filterLeagueIdsForDiscovery(leagues, {
        previousLeagueIds: ['antiga-a']
    });

    assert.deepEqual(result, ['nova-a']);
});
