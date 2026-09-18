'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../ambo-core');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const mobileSource = source.slice(source.indexOf('    function createMobileRankingCard('), source.indexOf('    function showOnlyView('));
const renderSource = source.slice(source.indexOf('    function getLeagueRows('), source.indexOf('    function getRosterPresentation('));
const csvSource = source.slice(source.indexOf('    function getCurrentCsv('), source.indexOf('    function downloadCsv('));

function element(tag, className = '', textContent = '') {
    const node = { tag, className, textContent, children: [], attributes: {},
        append(...items) {
            for (const item of items) {
                if (item.tag === 'fragment') this.append(...item.children);
                else { this.children.push(item); item.parent = this; }
            }
        },
        appendChild(item) { this.append(item); },
        replaceChildren(...items) { this.children = []; this.append(...items); },
        setAttribute(key, value) { this.attributes[key] = value; },
        remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); },
        addEventListener() {} };
    node.classList = { add(value) { node.className += ` ${value}`; } };
    return node;
}

function template() {
    const panel = element('article', 'panel');
    const selectors = {};
    for (const selector of ['.league-number', '.league-name', '.league-season', '.league-mobile-cards', 'tbody']) {
        selectors[selector] = element('div'); panel.append(selectors[selector]);
    }
    const headings = element('tr');
    ['th.col-rank', '.avatar', '.league-team-heading', '.campaign', '.league-points-heading', '.fpts'].forEach(selector => {
        selectors[selector] = element('th'); headings.append(selectors[selector]);
    });
    panel.append(headings);
    panel.headings = headings;
    panel.querySelector = selector => selectors[selector];
    return panel;
}

function render(year = 2026, change = () => {}) {
    const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'snapshots', String(year), 'keeper.json'))).leagues[0];
    if (year === 2026) snapshot.usedFallback = true;
    change(snapshot);
    const context = {
        snapshot, core, createElement: element,
        document: { createElement: element, createDocumentFragment: () => element('fragment') },
        elements: { leaguePanelTemplate: { content: { firstElementChild: { cloneNode: template } } } },
        getUserForRoster: core.getUserForRoster, getManagerName: core.getManagerName,
        getTeamName: core.getTeamName, getRosterPoints: core.getRosterPoints,
        createAvatar: () => element('img'), applyRankClass: () => {},
        createRankCell: value => element('td', '', value),
        createEntityCell: (primary, secondary) => element('td', '', [primary, secondary].filter(Boolean).join(' · ')),
        createMobileMetric: (label, value) => element('div', '', `${label}: ${value}`),
        formatNumber: value => Number(value).toFixed(2).replace('.', ','),
        formatPlacement: value => `${value}º`,
        state: { currentView: 'season', currentSeason: { year, seriesKey: 'keeper', snapshots: [snapshot] } }
    };
    return vm.runInNewContext(`${mobileSource}\n${renderSource}\n${csvSource}\n({ panels: renderKeeperPanels(snapshot), csv: getCurrentCsv(), ordinary: renderLeaguePanel(snapshot) })`, context);
}

test('Keeper atual mostra três grupos e não uma posição geral como se fosse do grupo', () => {
    const { panels } = render();
    assert.equal(panels.length, 3);
    assert.equal(panels.map(panel => panel.querySelector('.league-name').textContent).join('|'), 'AMBO Norte|AMBO Central|AMBO Sul');
    for (const panel of panels) {
        const rows = panel.querySelector('tbody').children;
        assert.equal(rows.length, 4);
        assert.equal(panel.headings.children.length, 5, 'grupo não distribui pontos de ranking');
        assert.equal(rows.map(row => row.children[0].textContent).join(','), '1,2,3,4');
        assert.ok(rows.every(row => row.children.length === 5));
    }
});

test('grupos e classificação final Keeper usam linhas mobile compactas', () => {
    const { panels } = render(2025);
    assert.equal(panels.length, 4);
    for (const panel of panels) {
        const cards = panel.querySelector('.league-mobile-cards');
        assert.match(cards.attributes['aria-label'], /Classificação/);
        for (const card of cards.children) {
            assert.match(card.className, /--compact/);
            assert.equal(card.children.length, 1);
            assert.equal(card.children[0].children.length, 4);
            assert.match(card.children[0].children[2].children[1].textContent, /FPTS/);
        }
    }
    const final = panels[3];
    assert.equal(final.querySelector('.league-name').textContent, 'Classificação final da liga Keeper');
    assert.equal(final.querySelector('tbody').children.length, 12);
    assert.equal(final.headings.children.length, 5, 'Keeper final também não tem pontos de ranking');
    assert.ok(final.querySelector('tbody').children.every(row => row.children.length === 5));
    assert.ok(final.querySelector('.league-mobile-cards').children.every(card => !String(card.children[0].children[3].textContent).includes('pts')));
});

test('todos os anos históricos exibem três grupos e a classificação final separada', () => {
    for (let year = 2021; year <= 2025; year++) {
        const { panels } = render(year);
        assert.equal(panels.length, 4, String(year));
        assert.equal(panels[3].querySelector('.league-number').textContent, 'Resultado após os playoffs');
    }
});

test('ausência de grupo não esconde participantes nem inventa composição', () => {
    const { panels } = render(2026, snapshot => { delete snapshot.rosters[0].settings.division; });
    assert.equal(panels.length, 2);
    assert.equal(panels[0].attributes.role, 'status');
    assert.match(panels[0].textContent, /tabela abaixo é geral/);
    assert.equal(panels[1].querySelector('tbody').children.length, 12);
});

test('ligas individuais preservam colunas desktop e recebem linhas mobile compactas com V–D e FPTS', () => {
    const { ordinary } = render();
    assert.equal(ordinary.headings.children.length, 6);
    assert.equal(ordinary.querySelector('tbody').children.length, 12);
    const card = ordinary.querySelector('.league-mobile-cards').children[0];
    assert.equal(card.children.length, 1);
    assert.match(card.className, /--compact/);
    assert.match(card.children[0].children[2].children[1].textContent, /V–D(?:–E)? \d+-\d+(?:-\d+)? · FPTS/);
    assert.match(card.children[0].children[3].textContent, /pts$/);
});

test('CSV Keeper distingue posição no grupo de posição final após playoffs', () => {
    const current = render().csv;
    assert.match(current.csv, /Grupo;Posição no grupo \(temporada regular\);Posição final após playoffs/);
    assert.equal(current.csv.trim().split(/\r?\n/).length, 13);
    assert.equal(current.csv.trim().split(/\r?\n/)[1].split(';')[2], '');
    const historical = render(2025).csv;
    assert.match(historical.csv, /AMBO Norte/);
    assert.ok(Number(historical.csv.trim().split(/\r?\n/)[1].split(';')[2]) > 0);
    const withoutGroups = render(2026, snapshot => { delete snapshot.rosters[0].settings.division; }).csv;
    assert.doesNotMatch(withoutGroups.csv.split(/\r?\n/)[0], /Pontos/);
});

test('Keeper informa V–D–E quando há empate, sem trocar campanha por pontos', () => {
    const { panels, ordinary } = render(2026, snapshot => { snapshot.rosters.forEach(roster => { roster.settings.ties = 1; }); });
    const keeperScore = panels[0].querySelector('.league-mobile-cards').children[0].children[0].children[3];
    assert.match(keeperScore.textContent, /^\d+-\d+-1$/);
    assert.equal(keeperScore.children[0].textContent, 'V–D–E');
    const leagueMeta = ordinary.querySelector('.league-mobile-cards').children[0].children[0].children[2].children[1].textContent;
    assert.match(leagueMeta, /V–D–E \d+-\d+-1/);
});

test('nome do manager e nome de equipe distintos aparecem sem duplicar nomes iguais', () => {
    const { ordinary } = render(2026, snapshot => {
        snapshot.rosters.forEach((roster, index) => {
            const user = core.getUserForRoster(roster, snapshot.users);
            user.metadata = { ...user.metadata, team_name: index === 0 ? 'Equipe personalizada de teste' : user.display_name };
        });
    });
    const cards = ordinary.querySelector('.league-mobile-cards').children;
    const entities = cards.map(card => card.children[0].children[2]);
    assert.ok(entities.some(entity => entity.children.length === 3), 'equipe personalizada preservada');
    assert.ok(entities.some(entity => entity.children.length === 2), 'nome idêntico não é repetido');
    for (const entity of entities.filter(node => node.children.length === 3)) {
        assert.notEqual(entity.children[0].textContent, entity.children[2].textContent);
    }
});
