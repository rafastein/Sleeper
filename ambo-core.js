(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.AMBO_CORE = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function normalizeAlias(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')
            .trim();
    }

    function getRosterPoints(roster, key = 'fpts') {
        const settings = roster?.settings || {};
        const integer = Number(settings[key] || 0);
        const decimal = Number(settings[`${key}_decimal`] || 0) / 100;
        return integer + decimal;
    }

    function compareRegularSeasonRosters(a, b) {
        const settingsA = a?.settings || {};
        const settingsB = b?.settings || {};

        if ((settingsB.wins || 0) !== (settingsA.wins || 0)) {
            return (settingsB.wins || 0) - (settingsA.wins || 0);
        }

        if ((settingsB.ties || 0) !== (settingsA.ties || 0)) {
            return (settingsB.ties || 0) - (settingsA.ties || 0);
        }

        const pointsDifference = getRosterPoints(b) - getRosterPoints(a);
        if (pointsDifference !== 0) return pointsDifference;

        const againstDifference = getRosterPoints(a, 'fpts_against') - getRosterPoints(b, 'fpts_against');
        if (againstDifference !== 0) return againstDifference;

        return Number(a?.roster_id || 0) - Number(b?.roster_id || 0);
    }

    function getBracketRosterIds(bracket) {
        const rosterIds = new Set();

        (bracket || []).forEach(match => {
            ['t1', 't2', 'w', 'l'].forEach(key => {
                const rosterId = Number(match?.[key]);
                if (Number.isInteger(rosterId) && rosterId > 0) rosterIds.add(rosterId);
            });
        });

        return rosterIds;
    }

    function applyPlacementMatches(rankByRoster, bracket, rankOffset = 0) {
        (bracket || [])
            .filter(match => Number.isInteger(match?.p))
            .sort((a, b) => a.p - b.p)
            .forEach(match => {
                const winnerId = Number(match.w);
                const loserId = Number(match.l);
                const baseRank = Number(match.p) + rankOffset;

                if (Number.isInteger(winnerId) && winnerId > 0) {
                    rankByRoster.set(winnerId, baseRank);
                }

                if (Number.isInteger(loserId) && loserId > 0) {
                    rankByRoster.set(loserId, baseRank + 1);
                }
            });
    }

    function calculateStandings(winnersBracket, losersBracket, rosters, league) {
        if (!Array.isArray(rosters) || rosters.length === 0) {
            return { standings: [], usedFallback: true };
        }

        const rankByRoster = new Map();
        const configuredPlayoffTeams = Number(league?.settings?.playoff_teams);
        const inferredPlayoffTeams = getBracketRosterIds(winnersBracket).size;
        const playoffTeamCount = Number.isInteger(configuredPlayoffTeams) && configuredPlayoffTeams > 0
            ? Math.min(configuredPlayoffTeams, rosters.length)
            : inferredPlayoffTeams;

        applyPlacementMatches(rankByRoster, winnersBracket, 0);

        const losersPlacementRanks = (losersBracket || [])
            .filter(match => Number.isInteger(match?.p))
            .map(match => Number(match.p));

        const losersRankOffset = losersPlacementRanks.length > 0
            && playoffTeamCount > 0
            && Math.min(...losersPlacementRanks) <= playoffTeamCount
            ? playoffTeamCount
            : 0;

        applyPlacementMatches(rankByRoster, losersBracket, losersRankOffset);

        const occupiedRanks = new Set(rankByRoster.values());
        const availableRanks = Array.from({ length: rosters.length }, (_, index) => index + 1)
            .filter(rank => !occupiedRanks.has(rank));

        const unrankedRosters = rosters
            .filter(roster => !rankByRoster.has(roster.roster_id))
            .sort(compareRegularSeasonRosters);

        unrankedRosters.forEach((roster, index) => {
            rankByRoster.set(roster.roster_id, availableRanks[index]);
        });

        const fallbackRosterIds = new Set(unrankedRosters.map(roster => roster.roster_id));
        const standings = rosters
            .map(roster => {
                const rank = rankByRoster.get(roster.roster_id);
                return {
                    rank,
                    rosterId: roster.roster_id,
                    points: rosters.length + 1 - rank,
                    source: fallbackRosterIds.has(roster.roster_id)
                        ? 'regular-season-fallback'
                        : 'playoff-bracket'
                };
            })
            .sort((a, b) => a.rank - b.rank);

        return {
            standings,
            usedFallback: unrankedRosters.length > 0
        };
    }

    function validateStandings(standings, rosterCount) {
        const errors = [];
        const rows = Array.isArray(standings) ? standings : [];
        const expectedCount = Number(rosterCount || rows.length);
        const expectedRanks = Array.from({ length: expectedCount }, (_, index) => index + 1);
        const actualRanks = rows.map(row => Number(row.rank)).sort((a, b) => a - b);
        const rosterIds = rows.map(row => String(row.rosterId));

        if (rows.length !== expectedCount) {
            errors.push(`quantidade de posições ${rows.length} diferente da quantidade de rosters ${expectedCount}`);
        }

        if (new Set(rosterIds).size !== rosterIds.length) {
            errors.push('há roster repetido na classificação');
        }

        if (new Set(actualRanks).size !== actualRanks.length) {
            errors.push('há posição repetida na classificação');
        }

        if (actualRanks.length !== expectedRanks.length || actualRanks.some((rank, index) => rank !== expectedRanks[index])) {
            errors.push(`as posições devem formar a sequência de 1 a ${expectedCount}`);
        }

        rows.forEach(row => {
            const expectedPoints = expectedCount + 1 - Number(row.rank);
            if (Number(row.points) !== expectedPoints) {
                errors.push(`roster ${row.rosterId} deveria receber ${expectedPoints} pontos, mas recebeu ${row.points}`);
            }
        });

        const expectedPointTotal = expectedCount * (expectedCount + 1) / 2;
        const actualPointTotal = rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
        if (actualPointTotal !== expectedPointTotal) {
            errors.push(`soma de pontos ${actualPointTotal} diferente do total esperado ${expectedPointTotal}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            rosterCount: expectedCount,
            expectedPointTotal,
            actualPointTotal
        };
    }

    function validateLeagueSnapshot(snapshot) {
        const errors = [];

        if (!snapshot || typeof snapshot !== 'object') {
            return { valid: false, errors: ['snapshot ausente ou inválido'] };
        }

        if (!Array.isArray(snapshot.rosters)) errors.push('rosters ausentes');
        if (!Array.isArray(snapshot.users)) errors.push('users ausentes');
        if (!Array.isArray(snapshot.standings)) errors.push('standings ausentes');

        if (errors.length === 0) {
            const result = validateStandings(snapshot.standings, snapshot.rosters.length);
            errors.push(...result.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    function getUserForRoster(roster, users) {
        return (users || []).find(user => String(user.user_id) === String(roster?.owner_id)) || null;
    }

    function getManagerName(user, roster) {
        return user?.display_name || user?.username || roster?.metadata?.owner_name || 'Manager não identificado';
    }

    function getTeamName(user, roster) {
        return user?.metadata?.team_name || roster?.metadata?.team_name || getManagerName(user, roster);
    }

    function createIdentityIndex(registry) {
        const byUserId = new Map();
        const byAlias = new Map();

        (registry?.managers || []).forEach(manager => {
            const normalizedManager = {
                canonicalId: String(manager.canonicalId),
                displayName: manager.displayName || manager.canonicalId,
                sleeperUserIds: Array.isArray(manager.sleeperUserIds) ? manager.sleeperUserIds.map(String) : [],
                aliases: Array.isArray(manager.aliases) ? manager.aliases.filter(Boolean) : []
            };

            normalizedManager.sleeperUserIds.forEach(userId => byUserId.set(userId, normalizedManager));
            [normalizedManager.displayName, ...normalizedManager.aliases]
                .map(normalizeAlias)
                .filter(Boolean)
                .forEach(alias => byAlias.set(alias, normalizedManager));
        });

        return { byUserId, byAlias };
    }

    function resolveCanonicalManager(user, roster, identityIndex) {
        const userIds = [user?.user_id, roster?.owner_id].filter(Boolean).map(String);
        for (const userId of userIds) {
            const manager = identityIndex?.byUserId?.get(userId);
            if (manager) return manager;
        }

        const aliases = [
            user?.username,
            user?.display_name,
            user?.metadata?.team_name,
            roster?.metadata?.owner_name,
            roster?.metadata?.team_name
        ].map(normalizeAlias).filter(Boolean);

        for (const alias of aliases) {
            const manager = identityIndex?.byAlias?.get(alias);
            if (manager) return manager;
        }

        const managerName = getManagerName(user, roster);
        const ownerId = userIds[0];
        return {
            canonicalId: ownerId ? `sleeper:${ownerId}` : `alias:${normalizeAlias(managerName) || roster?.roster_id || 'unknown'}`,
            displayName: managerName,
            sleeperUserIds: ownerId ? [ownerId] : [],
            aliases: [managerName]
        };
    }

    function calculateCombinedStandings(leagueSnapshots, registry = { managers: [] }) {
        const combined = new Map();
        const identityIndex = createIdentityIndex(registry);

        (leagueSnapshots || []).forEach(snapshot => {
            snapshot.standings.forEach(standing => {
                const roster = snapshot.rosters.find(item => item.roster_id === standing.rosterId);
                if (!roster) return;

                const user = getUserForRoster(roster, snapshot.users);
                const identity = resolveCanonicalManager(user, roster, identityIndex);
                const current = combined.get(identity.canonicalId) || {
                    ownerKey: identity.canonicalId,
                    avatar: user?.avatar || null,
                    managerName: identity.displayName || getManagerName(user, roster),
                    points: 0,
                    bestRank: Number.POSITIVE_INFINITY,
                    fpts: 0,
                    appearances: 0
                };

                current.avatar ||= user?.avatar || null;
                current.points += standing.points;
                current.bestRank = Math.min(current.bestRank, standing.rank);
                current.fpts += getRosterPoints(roster);
                current.appearances += 1;
                combined.set(identity.canonicalId, current);
            });
        });

        return [...combined.values()].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
            if (b.fpts !== a.fpts) return b.fpts - a.fpts;
            return a.managerName.localeCompare(b.managerName, 'pt-BR');
        });
    }



    function buildHistoricalEntries(snapshotPayloads, registry = { managers: [] }) {
        const entries = [];

        (snapshotPayloads || []).forEach(payload => {
            if (!payload || !Array.isArray(payload.leagues)) return;

            const year = Number(payload.year);
            const seriesKey = String(payload.seriesKey || '');
            const seriesLabel = payload.seriesLabel || seriesKey;
            const provisional = payload.leagues.some(league => Boolean(league.usedFallback));
            const combined = calculateCombinedStandings(payload.leagues, registry);

            combined.forEach((standing, index) => {
                entries.push({
                    canonicalId: standing.ownerKey,
                    managerName: standing.managerName,
                    avatar: standing.avatar || null,
                    year,
                    seriesKey,
                    seriesLabel,
                    rank: index + 1,
                    points: Number(standing.points || 0),
                    bestLeagueRank: Number(standing.bestRank || 0),
                    fpts: Number(standing.fpts || 0),
                    leagueAppearances: Number(standing.appearances || 0),
                    provisional
                });
            });
        });

        return entries.sort((a, b) =>
            b.year - a.year
            || a.seriesKey.localeCompare(b.seriesKey)
            || a.rank - b.rank
        );
    }

    function sortHistoricalRanking(ranking, sortBy = 'points') {
        const rows = [...(ranking || [])];
        const byName = (a, b) => a.managerName.localeCompare(b.managerName, 'pt-BR');
        const pointsComparator = (a, b) =>
            b.totalPoints - a.totalPoints
            || b.titles - a.titles
            || b.podiums - a.podiums
            || a.averageFinish - b.averageFinish
            || b.totalFpts - a.totalFpts
            || byName(a, b);

        const comparators = {
            points: pointsComparator,
            titles: (a, b) => b.titles - a.titles || b.podiums - a.podiums || pointsComparator(a, b),
            podiums: (a, b) => b.podiums - a.podiums || b.titles - a.titles || pointsComparator(a, b),
            average: (a, b) => a.averageFinish - b.averageFinish || b.participations - a.participations || pointsComparator(a, b)
        };

        return rows.sort(comparators[sortBy] || pointsComparator);
    }

    function aggregateHistoricalRanking(entries, options = {}) {
        const seriesKey = options.seriesKey || 'all';
        const includeProvisional = options.includeProvisional === true;
        const sortBy = options.sortBy || 'points';
        const aggregate = new Map();

        (entries || []).forEach(entry => {
            if (seriesKey !== 'all' && entry.seriesKey !== seriesKey) return;
            if (!includeProvisional && entry.provisional) return;

            const canonicalId = String(entry.canonicalId || '');
            if (!canonicalId) return;

            const current = aggregate.get(canonicalId) || {
                canonicalId,
                managerName: entry.managerName || canonicalId,
                avatar: entry.avatar || null,
                totalPoints: 0,
                titles: 0,
                podiums: 0,
                participations: 0,
                leagueAppearances: 0,
                bestFinish: Number.POSITIVE_INFINITY,
                finishTotal: 0,
                totalFpts: 0,
                firstYear: Number.POSITIVE_INFINITY,
                lastYear: Number.NEGATIVE_INFINITY,
                history: []
            };

            if (entry.year >= current.lastYear) {
                current.managerName = entry.managerName || current.managerName;
                current.avatar = entry.avatar || current.avatar;
            }

            current.totalPoints += Number(entry.points || 0);
            current.titles += Number(entry.rank) === 1 ? 1 : 0;
            current.podiums += Number(entry.rank) <= 3 ? 1 : 0;
            current.participations += 1;
            current.leagueAppearances += Number(entry.leagueAppearances || 0);
            current.bestFinish = Math.min(current.bestFinish, Number(entry.rank));
            current.finishTotal += Number(entry.rank || 0);
            current.totalFpts += Number(entry.fpts || 0);
            current.firstYear = Math.min(current.firstYear, Number(entry.year));
            current.lastYear = Math.max(current.lastYear, Number(entry.year));
            current.history.push({ ...entry });
            aggregate.set(canonicalId, current);
        });

        const ranking = [...aggregate.values()].map(manager => ({
            ...manager,
            averageFinish: manager.participations ? manager.finishTotal / manager.participations : 0,
            averagePoints: manager.participations ? manager.totalPoints / manager.participations : 0,
            history: manager.history.sort((a, b) => b.year - a.year || a.seriesKey.localeCompare(b.seriesKey))
        }));

        return sortHistoricalRanking(ranking, sortBy);
    }

    function getHistoricalProfile(entries, canonicalId, options = {}) {
        return aggregateHistoricalRanking(entries, options)
            .find(manager => manager.canonicalId === String(canonicalId)) || null;
    }

    function filterBySearch(rows, query, fields = []) {
        const normalizedQuery = normalizeAlias(query);
        if (!normalizedQuery) return [...(rows || [])];

        return (rows || []).filter(row => fields.some(field => {
            const value = typeof field === 'function' ? field(row) : row?.[field];
            return normalizeAlias(value).includes(normalizedQuery);
        }));
    }

    function sortSeasonRanking(rows, sortBy = 'points') {
        const list = [...(rows || [])];
        const byName = (a, b) => String(a.managerName || '').localeCompare(String(b.managerName || ''), 'pt-BR');
        const comparators = {
            points: (a, b) => Number(b.points || 0) - Number(a.points || 0)
                || Number(a.bestRank || Infinity) - Number(b.bestRank || Infinity)
                || Number(b.fpts || 0) - Number(a.fpts || 0)
                || byName(a, b),
            fpts: (a, b) => Number(b.fpts || 0) - Number(a.fpts || 0)
                || Number(b.points || 0) - Number(a.points || 0)
                || byName(a, b),
            bestRank: (a, b) => Number(a.bestRank || Infinity) - Number(b.bestRank || Infinity)
                || Number(b.points || 0) - Number(a.points || 0)
                || byName(a, b),
            name: byName
        };
        return list.sort(comparators[sortBy] || comparators.points);
    }

    function csvEscape(value) {
        const text = value === null || value === undefined ? '' : String(value);
        return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function rowsToCsv(columns, rows) {
        const normalizedColumns = (columns || []).map(column =>
            typeof column === 'string'
                ? { key: column, label: column }
                : column
        );
        const header = normalizedColumns.map(column => csvEscape(column.label)).join(';');
        const body = (rows || []).map((row, rowIndex) => normalizedColumns.map(column => {
            const value = typeof column.value === 'function' ? column.value(row, rowIndex) : row?.[column.key];
            return csvEscape(value);
        }).join(';'));
        return [header, ...body].join('\r\n');
    }

    function parseRoute(search, options = {}) {
        const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
        const allowedViews = new Set(['champions', 'history', 'profile', 'season']);
        const allowedSeries = new Set(['all', 'serieA', 'serieB']);
        const allowedHistorySorts = new Set(['points', 'titles', 'podiums', 'average']);
        const allowedSeasonSorts = new Set(['points', 'fpts', 'bestRank', 'name']);
        const configuredYears = new Set((options.years || []).map(Number));

        const view = allowedViews.has(params.get('view')) ? params.get('view') : 'champions';
        const series = allowedSeries.has(params.get('series')) ? params.get('series') : 'all';
        const yearValue = Number(params.get('year'));
        const year = Number.isInteger(yearValue) && (!configuredYears.size || configuredYears.has(yearValue))
            ? yearValue
            : null;
        const historySort = allowedHistorySorts.has(params.get('sort')) ? params.get('sort') : 'points';
        const seasonSort = allowedSeasonSorts.has(params.get('sort')) ? params.get('sort') : 'points';

        if (view === 'season' && (!year || series === 'all')) {
            return { view: 'champions' };
        }
        if (view === 'profile' && !params.get('manager')) {
            return { view: 'history', series, sort: historySort, query: params.get('q') || '' };
        }

        return {
            view,
            year,
            series,
            sort: view === 'season' ? seasonSort : historySort,
            query: params.get('q') || '',
            manager: params.get('manager') || null
        };
    }

    function serializeRoute(route = {}) {
        const params = new URLSearchParams();
        const view = route.view || 'champions';
        params.set('view', view);

        if (view === 'history') {
            if (route.series && route.series !== 'all') params.set('series', route.series);
            if (route.sort && route.sort !== 'points') params.set('sort', route.sort);
            if (route.query) params.set('q', route.query);
        } else if (view === 'profile') {
            if (route.manager) params.set('manager', route.manager);
            if (route.series && route.series !== 'all') params.set('series', route.series);
        } else if (view === 'season') {
            if (route.year) params.set('year', String(route.year));
            if (route.series) params.set('series', route.series);
            if (route.sort && route.sort !== 'points') params.set('sort', route.sort);
            if (route.query) params.set('q', route.query);
        }

        return `?${params.toString()}`;
    }

    return Object.freeze({
        normalizeAlias,
        getRosterPoints,
        compareRegularSeasonRosters,
        getBracketRosterIds,
        applyPlacementMatches,
        calculateStandings,
        validateStandings,
        validateLeagueSnapshot,
        getUserForRoster,
        getManagerName,
        getTeamName,
        createIdentityIndex,
        resolveCanonicalManager,
        calculateCombinedStandings,
        buildHistoricalEntries,
        sortHistoricalRanking,
        aggregateHistoricalRanking,
        getHistoricalProfile,
        filterBySearch,
        sortSeasonRanking,
        csvEscape,
        rowsToCsv,
        parseRoute,
        serializeRoute
    });
}));
