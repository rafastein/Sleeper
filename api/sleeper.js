const DIRECT_BASE_URL = 'https://api.sleeper.app/v1';
const TIMEOUT_MS = 10000;

const ALLOWED_PATHS = [
    /^\/user\/[A-Za-z0-9_-]+$/,
    /^\/user\/[A-Za-z0-9_-]+\/leagues\/nfl\/20\d{2}$/,
    /^\/league\/\d+$/,
    /^\/league\/\d+\/(rosters|users|winners_bracket|losers_bracket)$/,
    /^\/league\/\d+\/matchups\/\d{1,2}$/
];

function normalizePath(value) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') return null;
    const path = raw.trim();
    if (!path.startsWith('/') || path.includes('..') || path.includes('\\') || path.includes('?') || path.includes('#')) {
        return null;
    }
    return path;
}

function isAllowedPath(path) {
    return Boolean(path && ALLOWED_PATHS.some(pattern => pattern.test(path)));
}

async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    const path = normalizePath(request.query?.path);
    if (!isAllowedPath(path)) {
        return response.status(400).json({ error: 'Endpoint do Sleeper não permitido.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const upstream = await fetch(`${DIRECT_BASE_URL}${path}`, {
            signal: controller.signal,
            headers: {
                accept: 'application/json',
                'user-agent': 'AMBO-Sleeper-Vercel-Proxy/1.0'
            }
        });
        const body = await upstream.text();

        response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        response.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
        response.setHeader('X-AMBO-Source', 'sleeper-proxy');
        return response.status(upstream.status).send(body);
    } catch (error) {
        const message = error?.name === 'AbortError'
            ? 'A API do Sleeper excedeu o tempo de resposta.'
            : 'Não foi possível consultar a API do Sleeper.';
        response.setHeader('Cache-Control', 'no-store');
        return response.status(502).json({ error: message });
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = handler;
module.exports.normalizePath = normalizePath;
module.exports.isAllowedPath = isAllowedPath;
