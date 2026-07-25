#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config.js');
const core = require('../ambo-core.js');

const API_BASE_URL = 'https://api.sleeper.app/v1';
const ROOT = path.resolve(__dirname, '..');
const REQUEST_TIMEOUT_MS = 20000;

function parseArgs(argv) {
    const args = { years: [], series: [], allowFallback: false, dryRun: false };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--year') args.years.push(Number(argv[++index]));
        else if (value === '--series') args.series.push(String(argv[++index]));
        else if (value === '--allow-fallback') args.allowFallback = true;
        else if (value === '--dry-run') args.dryRun = true;
        else if (value === '--help' || value === '-h') args.help = true;
        else throw new Error(`argumento desconhecido: ${value}`);
    }

    return args;
}

function printHelp() {
    console.log(`Uso:
  npm run sync
  npm run sync -- --year 2025
  npm run sync -- --year 2025 --series serieA

Opções:
  --year ANO          Limita a sincronização a uma temporada (pode repetir)
  --series CHAVE      Limita a keeper, serieA ou serieB (pode repetir)
  --allow-fallback    Aceita classificação regular provisória
  --dry-run           Valida sem gravar arquivos
`);
}

function readJson(relativePath, fallback) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) return structuredClone(fallback);
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(relativePath, value, dryRun) {
    const absolutePath = path.join(ROOT, relativePath);
    if (dryRun) return;
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function fetchJson(url, optional = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'user-agent': 'AMBO-Sleeper-snapshot-sync/1.0' }
        });
        if (optional && response.status === 404) return [];
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') throw new Error(`timeout ao consultar ${url}`);
        throw new Error(`falha ao consultar ${url}: ${error.message}`);
    } finally {
        clearTimeout(timeout);
    }
}

function trimLeague(league) {
    return {
        league_id: String(league?.league_id || ''),
        name: league?.name || '',
        season: String(league?.season || ''),
        status: league?.status || null,
        previous_league_id: league?.previous_league_id ? String(league.previous_league_id) : null,
        settings: {
            playoff_teams: Number(league?.settings?.playoff_teams || 0),
            playoff_week_start: Number(league?.settings?.playoff_week_start || 0)
        }
    };
}

function trimRoster(roster) {
    const settings = roster?.settings || {};
    return {
        roster_id: Number(roster?.roster_id),
        owner_id: roster?.owner_id ? String(roster.owner_id) : null,
        metadata: roster?.metadata || null,
        settings: {
            wins: Number(settings.wins || 0),
            losses: Number(settings.losses || 0),
            ties: Number(settings.ties || 0),
            fpts: Number(settings.fpts || 0),
            fpts_decimal: Number(settings.fpts_decimal || 0),
            fpts_against: Number(settings.fpts_against || 0),
            fpts_against_decimal: Number(settings.fpts_against_decimal || 0)
        }
    };
}

function trimUser(user) {
    return {
        user_id: String(user?.user_id || ''),
        username: user?.username || null,
        display_name: user?.display_name || null,
        avatar: user?.avatar || null,
        metadata: user?.metadata || null
    };
}


function trimMatchup(matchup) {
    return {
        roster_id: Number(matchup?.roster_id),
        matchup_id: matchup?.matchup_id === null || matchup?.matchup_id === undefined
            ? null
            : Number(matchup.matchup_id),
        points: Number.isFinite(Number(matchup?.points)) ? Number(matchup.points) : null,
        custom_points: matchup?.custom_points === null || matchup?.custom_points === undefined
            ? null
            : Number(matchup.custom_points)
    };
}

async function fetchPlayoffMatchups(leagueId, league, winnersBracket, losersBracket) {
    const weeks = core.getPlayoffWeekNumbers(league, winnersBracket, losersBracket);
    const entries = await Promise.all(weeks.map(async week => {
        const rows = await fetchJson(`${API_BASE_URL}/league/${leagueId}/matchups/${week}`, true);
        return [String(week), (rows || []).map(trimMatchup)];
    }));

    return {
        weekStart: weeks[0] || null,
        weeks,
        matchupsByWeek: Object.fromEntries(entries)
    };
}

function findManager(registry, user) {
    const userId = String(user?.user_id || '');
    const aliases = [user?.username, user?.display_name]
        .map(core.normalizeAlias)
        .filter(Boolean);

    return registry.managers.find(manager =>
        manager.sleeperUserIds?.map(String).includes(userId)
        || [manager.displayName, ...(manager.aliases || [])]
            .map(core.normalizeAlias)
            .some(alias => aliases.includes(alias))
    );
}

function upsertManager(registry, user) {
    if (!user?.user_id) return;

    let manager = findManager(registry, user);
    const aliases = [...new Set([user.username, user.display_name].filter(Boolean))];

    if (!manager) {
        const baseName = user.display_name || user.username || `Manager ${user.user_id}`;
        let canonicalId = core.normalizeAlias(baseName) || `sleeper${user.user_id}`;
        const existingIds = new Set(registry.managers.map(item => item.canonicalId));
        if (existingIds.has(canonicalId)) canonicalId = `${canonicalId}-${user.user_id}`;

        manager = {
            canonicalId,
            displayName: baseName,
            sleeperUserIds: [],
            aliases: []
        };
        registry.managers.push(manager);
    }

    manager.sleeperUserIds = [...new Set([...(manager.sleeperUserIds || []).map(String), String(user.user_id)])];
    manager.aliases = [...new Set([...(manager.aliases || []), ...aliases])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    if (!manager.displayName || manager.displayName.startsWith('Manager ')) {
        manager.displayName = user.display_name || user.username || manager.displayName;
    }
}

async function resolveLeagueIds(year, seriesKey, seasonConfig, discoveryUsers) {
    if (Array.isArray(seasonConfig)) return seasonConfig.map(String);

    const username = String(seasonConfig?.username || '').trim();
    const discoveryKey = String(seasonConfig?.discoveryKey || core.normalizeAlias(username));
    const previousLeagueIds = Array.isArray(seasonConfig?.previousLeagueIds)
        ? seasonConfig.previousLeagueIds.map(String)
        : [];
    const nameIncludes = Array.isArray(seasonConfig?.nameIncludes)
        ? seasonConfig.nameIncludes.map(String).filter(Boolean)
        : [];
    const expectedLeagues = Number(seasonConfig?.expectedLeagues || previousLeagueIds.length || 1);

    if (!previousLeagueIds.length && !nameIncludes.length) {
        throw new Error(`${year}/${seriesKey}: previousLeagueIds ou nameIncludes ausentes`);
    }

    const persistedByUsername = Object.values(discoveryUsers.users || {}).find(item =>
        core.normalizeAlias(item?.username) === core.normalizeAlias(username)
    );
    let userId = String(
        seasonConfig?.userId
        || discoveryUsers.users?.[discoveryKey]?.userId
        || persistedByUsername?.userId
        || ''
    );
    let resolvedUser = null;

    if (!userId) {
        if (!username) throw new Error(`${year}/${seriesKey}: username ou userId ausente`);
        resolvedUser = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(username)}`);
        userId = String(resolvedUser?.user_id || '');
        if (!userId) throw new Error(`${year}/${seriesKey}: usuário ${username} não encontrado`);
    }

    discoveryUsers.users ||= {};
    discoveryUsers.users[discoveryKey] = {
        userId,
        username: resolvedUser?.username || username || discoveryUsers.users[discoveryKey]?.username || null,
        displayName: resolvedUser?.display_name || discoveryUsers.users[discoveryKey]?.displayName || null
    };

    const leagues = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(userId)}/leagues/nfl/${year}`);
    const ids = core.filterLeagueIdsForDiscovery(leagues, seasonConfig);

    if (ids.length !== expectedLeagues) {
        const candidates = (leagues || [])
            .map(league => `${league?.name || 'Sem nome'} (${league?.league_id || '?'})`)
            .join(', ');
        throw new Error(`${year}/${seriesKey}: encontradas ${ids.length} de ${expectedLeagues} ligas. Candidatas: ${candidates || 'nenhuma'}`);
    }

    return ids;
}

async function fetchLeagueSnapshot(leagueId, index) {
    const [league, rawRosters, rawUsers, winnersBracket, losersBracket] = await Promise.all([
        fetchJson(`${API_BASE_URL}/league/${leagueId}`),
        fetchJson(`${API_BASE_URL}/league/${leagueId}/rosters`),
        fetchJson(`${API_BASE_URL}/league/${leagueId}/users`),
        fetchJson(`${API_BASE_URL}/league/${leagueId}/winners_bracket`, true),
        fetchJson(`${API_BASE_URL}/league/${leagueId}/losers_bracket`, true)
    ]);

    const rosters = (rawRosters || []).map(trimRoster);
    const users = (rawUsers || []).map(trimUser);
    const playoffs = await fetchPlayoffMatchups(leagueId, league, winnersBracket, losersBracket);
    const calculated = core.calculateStandings(winnersBracket, losersBracket, rosters, league);
    const validation = core.validateStandings(calculated.standings, rosters.length);

    if (!validation.valid) {
        throw new Error(`liga ${leagueId}: ${validation.errors.join('; ')}`);
    }

    return {
        index,
        leagueId: String(leagueId),
        league: trimLeague(league),
        rosters,
        users,
        winnersBracket: winnersBracket || [],
        losersBracket: losersBracket || [],
        playoffs,
        standings: calculated.standings,
        usedFallback: calculated.usedFallback,
        validation
    };
}

function updateManifest(manifest, snapshot) {
    const entry = {
        year: snapshot.year,
        seriesKey: snapshot.seriesKey,
        generatedAt: snapshot.generatedAt,
        leagues: snapshot.leagues.map(league => league.leagueId),
        usedFallback: snapshot.leagues.some(league => league.usedFallback)
    };

    manifest.snapshots = (manifest.snapshots || [])
        .filter(item => !(Number(item.year) === snapshot.year && item.seriesKey === snapshot.seriesKey));
    manifest.snapshots.push(entry);
    manifest.snapshots.sort((a, b) => Number(b.year) - Number(a.year) || a.seriesKey.localeCompare(b.seriesKey));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) return printHelp();

    const allYears = Object.keys(config.leagueIds).map(Number).sort((a, b) => a - b);
    const selectedYears = args.years.length ? [...new Set(args.years)] : allYears;
    const selectedSeries = args.series.length ? [...new Set(args.series)] : Object.keys(config.series);

    selectedYears.forEach(year => {
        if (!config.leagueIds[year]) throw new Error(`temporada ${year} não está no config.js`);
    });
    selectedSeries.forEach(seriesKey => {
        if (!config.series[seriesKey]) throw new Error(`série ${seriesKey} não existe`);
    });

    const managerPath = config.data.managerRegistryPath;
    const discoveryPath = config.data.discoveryUsersPath;
    const snapshotBase = config.data.snapshotsBasePath;
    const managerRegistry = readJson(managerPath, { schemaVersion: 1, generatedAt: null, managers: [] });
    const discoveryUsers = readJson(discoveryPath, { schemaVersion: 1, generatedAt: null, users: {} });
    const manifestPath = `${snapshotBase}/manifest.json`;
    const manifest = readJson(manifestPath, { schemaVersion: 1, generatedAt: null, snapshots: [] });
    const generatedAt = new Date().toISOString();

    for (const year of selectedYears) {
        for (const seriesKey of selectedSeries) {
            const seasonConfig = config.leagueIds[year]?.[seriesKey];
            if (!seasonConfig) continue;

            process.stdout.write(`→ ${year} ${config.series[seriesKey]}: resolvendo ligas... `);
            const leagueIds = await resolveLeagueIds(year, seriesKey, seasonConfig, discoveryUsers);
            console.log(leagueIds.join(', '));

            const leagues = [];
            for (let index = 0; index < leagueIds.length; index += 1) {
                const leagueId = leagueIds[index];
                process.stdout.write(`  • liga ${index + 1}: baixando e validando... `);
                const snapshot = await fetchLeagueSnapshot(leagueId, index);
                if (snapshot.usedFallback && !args.allowFallback) {
                    throw new Error(`liga ${leagueId} ainda usa classificação provisória; rode com --allow-fallback somente se isso for intencional`);
                }
                snapshot.users.forEach(user => upsertManager(managerRegistry, user));
                leagues.push(snapshot);
                console.log(`OK (${snapshot.rosters.length} rosters, ${snapshot.validation.actualPointTotal} pontos)`);
            }

            const payload = {
                schemaVersion: 1,
                generatedAt,
                source: 'Sleeper API',
                year,
                seriesKey,
                seriesLabel: config.series[seriesKey],
                leagues
            };

            writeJson(`${snapshotBase}/${year}/${seriesKey}.json`, payload, args.dryRun);
            updateManifest(manifest, payload);
        }
    }

    managerRegistry.generatedAt = generatedAt;
    managerRegistry.managers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
    discoveryUsers.generatedAt = generatedAt;
    manifest.generatedAt = generatedAt;

    writeJson(managerPath, managerRegistry, args.dryRun);
    writeJson(discoveryPath, discoveryUsers, args.dryRun);
    writeJson(manifestPath, manifest, args.dryRun);

    console.log(args.dryRun
        ? '\n✓ Validação concluída sem gravar arquivos.'
        : '\n✓ Snapshots, user_ids e cadastro de managers atualizados.');
}

main().catch(error => {
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
});
