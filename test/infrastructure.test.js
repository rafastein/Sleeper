const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const proxy = require('../api/sleeper');
const config = require('../config');

function readJson(file) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

test('proxy aceita somente endpoints usados pelo projeto', () => {
    const valid = [
        '/user/rafastein',
        '/user/123456/leagues/nfl/2025',
        '/league/1051278540760530944',
        '/league/1051278540760530944/rosters',
        '/league/1051278540760530944/users',
        '/league/1051278540760530944/winners_bracket',
        '/league/1051278540760530944/losers_bracket'
    ];
    valid.forEach(value => assert.equal(proxy.isAllowedPath(value), true, value));
});

test('proxy bloqueia caminhos externos e traversal', () => {
    const invalid = [
        'https://example.com',
        '/../secret',
        '/league/123?admin=true',
        '/league/abc/rosters',
        '/user/name/leagues/nba/2025'
    ];
    invalid.forEach(value => assert.equal(proxy.isAllowedPath(proxy.normalizePath(value)), false, value));
});

test('configuração usa proxy com fallback para a API oficial', () => {
    assert.equal(config.api.preferProxy, true);
    assert.equal(config.api.proxyEndpoint, '/api/sleeper');
    assert.match(config.api.directBaseUrl, /^https:\/\/api\.sleeper\.app\/v1$/);
});

test('manifesto PWA possui ícones e modo standalone', () => {
    const manifest = readJson('manifest.webmanifest');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});

test('vercel.json configura cache e cabeçalhos de segurança', () => {
    const vercel = readJson('vercel.json');
    assert.ok(vercel.functions['api/sleeper.js']);
    const allHeaders = vercel.headers.flatMap(rule => rule.headers || []);
    assert.ok(allHeaders.some(header => header.key === 'X-Content-Type-Options' && header.value === 'nosniff'));
    assert.ok(allHeaders.some(header => header.key === 'Service-Worker-Allowed' && header.value === '/'));
    assert.ok(allHeaders.some(header => header.value.includes('stale-while-revalidate')));
});

test('página registra manifesto, monitoramento e instalação', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /id="install-app"/);
    assert.match(html, /_vercel\/insights\/script\.js/);
    assert.match(html, /_vercel\/speed-insights\/script\.js/);
});

test('ranking histórico não exibe coluna de pontos', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const match = html.match(/<table id="history-table"[\s\S]*?<\/table>/);
    assert.ok(match, 'tabela histórica não encontrada');
    assert.doesNotMatch(match[0], />Pontos<\/th>/);

    const script = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
    const renderMatch = script.match(/function renderHistoricalRanking\(\)[\s\S]*?async function showHistoricalRanking/);
    assert.ok(renderMatch, 'renderização histórica não encontrada');
    assert.doesNotMatch(renderMatch[0], /manager\.totalPoints/);
});


test('Keeper exibe somente a classificação da liga, sem ranking combinado', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.match(html, /id="combined-panel"/);

    const script = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
    assert.match(script, /elements\.combinedPanel\.hidden = isKeeper/);
    assert.match(script, /singleLeague: isKeeper/);
    assert.match(script, /Classificação final da liga Keeper/);
});
