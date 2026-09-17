const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const helper = source.slice(source.indexOf('    function createMobileRankingCard('), source.indexOf('    function showOnlyView('));

function element(tag, className, text) {
    const node = { tag, className, text, children: [],
        append(...items) { this.children.push(...items); },
        appendChild(item) { this.children.push(item); },
        addEventListener() {} };
    node.classList = { add(name) { node.className += ` ${name}`; } };
    return node;
}
function build(options) {
    const context = { createElement: element,
        createAvatar: () => element('img', 'avatar'),
        applyRankClass: () => {},
        createMobileMetric: (label, value) => element('div', 'mobile-metric', `${label} ${value}`),
        options };
    return vm.runInNewContext(`${helper}\ncreateMobileRankingCard(options)`, context);
}

test('linha compacta mantém posição, avatar, nome, FPTS e pontos sem grade de métricas', () => {
    const card = build({ rank: 1, total: 12, name: 'Helber61', meta: 'FPTS 290,92', score: '23 pts', compact: true });
    assert.match(card.className, /--compact/);
    assert.equal(card.children.length, 1);
    const header = card.children[0];
    assert.equal(header.children.length, 4);
    assert.equal(header.children[0].text, 1);
    assert.equal(header.children[2].children[0].text, 'Helber61');
    assert.equal(header.children[2].children[1].text, 'FPTS 290,92');
    assert.equal(header.children[3].text, '23 pts');
});

test('cards de outras telas continuam preservando métricas', () => {
    const card = build({ rank: 2, name: 'Manager', meta: 'Liga', score: '19 pts', metrics: [{ label: 'Campanha', value: '1-0' }] });
    assert.equal(card.children.length, 2);
    assert.equal(card.children[1].children[0].text, 'Campanha 1-0');
});

test('ranking combinado ativa modo compacto sem alterar a tabela desktop', () => {
    const render = source.slice(source.indexOf('    function renderCombinedStandings('), source.indexOf('    function getLeagueRows('));
    assert.match(render, /compact: true/);
    assert.match(render, /createElement\('td', '', standing.appearances\)/);
    const mobile = render.slice(render.indexOf('cardFragment.appendChild'));
    assert.doesNotMatch(mobile, /Melhor posição|Posição oficial|combinada|metrics:/);
});
