'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('index.html');
const css = read('styles.css');
const script = read('script.js');

test('celular tem barra superior com menu de ações e navegação inferior com 4 abas', () => {
    assert.match(html, /id="actions-toggle"[^>]*aria-controls="page-actions"/);
    assert.match(html, /id="page-actions"/);
    const tabs = [...html.matchAll(/class="bottom-nav__item" data-tab="(\w+)"/g)].map(match => match[1]);
    assert.deepEqual(tabs, ['home', 'season', 'history', 'champions']);
    assert.match(html, /id="season-sheet"[^>]*role="dialog"/);
});

test('abas inferiores refletem a tela aberta, inclusive perfil e playoffs', () => {
    assert.match(script, /BOTTOM_TAB_BY_VIEW = \{ home: 'home', season: 'season', playoffs: 'season', history: 'history', profile: 'history', champions: 'champions' \}/);
    assert.match(script, /updateBottomNav\(\);/);
});

test('escala tipográfica: todo font-size usa token e nenhum token fica abaixo de 12px', () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;]+);/g)].map(match => match[1].trim());
    const literal = sizes.filter(value => !value.startsWith('var(--fs-') && value !== '16px');
    assert.deepEqual(literal, []);
    const tokens = [...css.matchAll(/--fs-[\w-]+:\s*([0-9.]+)rem;/g)].map(match => Number(match[1]));
    assert.ok(Math.min(...tokens) >= 0.75);
});

test('redesign não introduz cores novas', () => {
    const start = css.indexOf('/* Redesign mobile 8.0');
    const base = css.slice(0, start);
    const redesign = css.slice(start);
    const colors = value => new Set([...value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map(match => match[0].replace(/\s+/g, '')));
    const baseColors = colors(base);
    const novas = [...colors(redesign)].filter(color => !baseColors.has(color));
    assert.deepEqual(novas, []);
});

test('temporada no celular esconde indicadores, cabeçalho e filtros do ranking combinado', () => {
    const block = css.slice(css.indexOf('/* 8.0.2'));
    for (const selector of ['#season-stats', '#combined-panel > .panel__header', '#combined-panel > .history-toolbar']) {
        assert.ok(block.includes(selector), selector);
    }
    assert.match(script, /compactSeason \? '' : \(route\.query \|\| ''\)/);
});
