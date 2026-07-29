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

        if (snapshot.playoffs !== undefined) {
            const playoffValidation = validatePlayoffData(snapshot.playoffs);
            errors.push(...playoffValidation.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    function getRosterUserCandidates(roster, users) {
        const userById = new Map((users || []).map(user => [String(user?.user_id || ''), user]));
        const candidateIds = [
            roster?.owner_id,
            ...(Array.isArray(roster?.co_owners) ? roster.co_owners : [])
        ].filter(Boolean).map(String);

        return [...new Set(candidateIds)]
            .map(userId => userById.get(userId))
            .filter(Boolean);
    }

    function getUserForRoster(roster, users) {
        const candidates = getRosterUserCandidates(roster, users);
        if (!candidates.length) return null;

        const owner = candidates.find(user => String(user?.user_id) === String(roster?.owner_id)) || candidates[0];
        const teamNames = [
            roster?.metadata?.team_name,
            owner?.metadata?.team_name
        ].map(normalizeAlias).filter(Boolean);

        if (teamNames.length && candidates.length > 1) {
            const matchingCoOwner = candidates.find(user => {
                if (String(user?.user_id) === String(roster?.owner_id)) return false;
                const aliases = [user?.username, user?.display_name]
                    .map(normalizeAlias)
                    .filter(Boolean);
                return aliases.some(alias => teamNames.includes(alias));
            });
            if (matchingCoOwner) return matchingCoOwner;
        }

        return owner;
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



    function filterLeagueIdsForDiscovery(leagues, discoveryConfig = {}) {
        const previousLeagueIds = Array.isArray(discoveryConfig.previousLeagueIds)
            ? discoveryConfig.previousLeagueIds.map(String).filter(Boolean)
            : [];
        const includeTokens = Array.isArray(discoveryConfig.nameIncludes)
            ? discoveryConfig.nameIncludes.map(normalizeAlias).filter(Boolean)
            : [];
        const excludeTokens = Array.isArray(discoveryConfig.nameExcludes)
            ? discoveryConfig.nameExcludes.map(normalizeAlias).filter(Boolean)
            : [];
        const previousSet = new Set(previousLeagueIds);

        if (!previousSet.size && !includeTokens.length) return [];

        return [...new Set(
            (leagues || [])
                .filter(league => {
                    const previousId = String(league?.previous_league_id || '');
                    const normalizedName = normalizeAlias(league?.name || '');
                    const matchesPrevious = !previousSet.size || previousSet.has(previousId);
                    const matchesName = !includeTokens.length
                        || includeTokens.every(token => normalizedName.includes(token));
                    const isExcluded = excludeTokens.some(token => normalizedName.includes(token));
                    return matchesPrevious && matchesName && !isExcluded;
                })
                .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR')
                    || String(a?.league_id || '').localeCompare(String(b?.league_id || '')))
                .map(league => String(league?.league_id || ''))
                .filter(Boolean)
        )];
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

    function buildOfficialTitleAwards(champions = [], registry = { managers: [] }, seriesKey = 'all') {
        const identityIndex = createIdentityIndex(registry);
        const awards = new Map();
        const seriesLabels = { keeper: 'Keeper', serieA: 'Série A', serieB: 'Série B' };

        (champions || []).forEach(row => {
            const year = Number(row?.year);
            if (!Number.isInteger(year)) return;

            ['keeper', 'serieA', 'serieB'].forEach(key => {
                if (seriesKey !== 'all' && key !== seriesKey) return;
                const rawName = row?.[key];
                if (!rawName) return;

                const normalizedName = normalizeAlias(rawName);
                if (!normalizedName) return;
                const registered = identityIndex.byAlias.get(normalizedName);
                const canonicalId = registered?.canonicalId || `alias:${normalizedName}`;

                awards.set(`${year}:${key}`, {
                    year,
                    seriesKey: key,
                    seriesLabel: seriesLabels[key] || key,
                    canonicalId,
                    managerName: registered?.displayName || String(rawName),
                    source: 'official'
                });
            });
        });

        return [...awards.values()];
    }

    function sortHistoricalRanking(ranking, sortBy = 'titles') {
        const rows = [...(ranking || [])];
        const byName = (a, b) => a.managerName.localeCompare(b.managerName, 'pt-BR');
        const titleComparator = (a, b) =>
            Number(b.titles || 0) - Number(a.titles || 0)
            || Number(b.secondPlaces || 0) - Number(a.secondPlaces || 0)
            || Number(b.thirdPlaces || 0) - Number(a.thirdPlaces || 0)
            || Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
            || Number(a.averageFinish || Infinity) - Number(b.averageFinish || Infinity)
            || Number(b.totalFpts || 0) - Number(a.totalFpts || 0)
            || byName(a, b);
        const pointsComparator = (a, b) =>
            Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
            || titleComparator(a, b);

        const comparators = {
            points: pointsComparator,
            titles: titleComparator,
            podiums: (a, b) => Number(b.podiums || 0) - Number(a.podiums || 0) || titleComparator(a, b),
            average: (a, b) => Number(a.averageFinish || Infinity) - Number(b.averageFinish || Infinity) || Number(b.participations || 0) - Number(a.participations || 0) || titleComparator(a, b)
        };

        return rows.sort(comparators[sortBy] || titleComparator);
    }

    function aggregateHistoricalRanking(entries, options = {}) {
        const seriesKey = options.seriesKey || 'all';
        const includeProvisional = options.includeProvisional === true;
        const sortBy = options.sortBy || 'titles';
        const registry = options.registry || { managers: [] };
        const officialChampions = Array.isArray(options.officialChampions) ? options.officialChampions : [];
        const aggregate = new Map();
        const snapshotTitleAwards = new Map();

        const createManager = (canonicalId, managerName, avatar = null) => ({
            canonicalId,
            managerName: managerName || canonicalId,
            avatar: avatar || null,
            totalPoints: 0,
            titles: 0,
            secondPlaces: 0,
            thirdPlaces: 0,
            podiums: 0,
            participations: 0,
            leagueAppearances: 0,
            bestFinish: Number.POSITIVE_INFINITY,
            finishTotal: 0,
            totalFpts: 0,
            firstYear: Number.POSITIVE_INFINITY,
            lastYear: Number.NEGATIVE_INFINITY,
            history: []
        });

        (entries || []).forEach(entry => {
            if (seriesKey !== 'all' && entry.seriesKey !== seriesKey) return;
            if (!includeProvisional && entry.provisional) return;

            const canonicalId = String(entry.canonicalId || '');
            if (!canonicalId) return;

            const current = aggregate.get(canonicalId)
                || createManager(canonicalId, entry.managerName, entry.avatar);

            if (entry.year >= current.lastYear) {
                current.managerName = entry.managerName || current.managerName;
                current.avatar = entry.avatar || current.avatar;
            }

            const rank = Number(entry.rank);
            current.totalPoints += Number(entry.points || 0);
            current.secondPlaces += rank === 2 ? 1 : 0;
            current.thirdPlaces += rank === 3 ? 1 : 0;
            current.participations += 1;
            current.leagueAppearances += Number(entry.leagueAppearances || 0);
            current.bestFinish = Math.min(current.bestFinish, rank);
            current.finishTotal += rank || 0;
            current.totalFpts += Number(entry.fpts || 0);
            current.firstYear = Math.min(current.firstYear, Number(entry.year));
            current.lastYear = Math.max(current.lastYear, Number(entry.year));
            current.history.push({ ...entry });
            aggregate.set(canonicalId, current);

            if (rank === 1) {
                snapshotTitleAwards.set(`${entry.year}:${entry.seriesKey}`, {
                    year: Number(entry.year),
                    seriesKey: entry.seriesKey,
                    seriesLabel: entry.seriesLabel,
                    canonicalId,
                    managerName: entry.managerName || canonicalId,
                    source: 'snapshot'
                });
            }
        });

        const titleAwards = new Map(snapshotTitleAwards);
        buildOfficialTitleAwards(officialChampions, registry, seriesKey)
            .forEach(award => titleAwards.set(`${award.year}:${award.seriesKey}`, award));

        titleAwards.forEach(award => {
            let canonicalId = String(award.canonicalId || '');
            const normalizedAwardName = normalizeAlias(award.managerName);
            const matchingManager = [...aggregate.values()].find(manager =>
                manager.canonicalId === canonicalId
                || normalizeAlias(manager.managerName) === normalizedAwardName
            );

            if (matchingManager) canonicalId = matchingManager.canonicalId;
            if (!canonicalId) return;

            const current = aggregate.get(canonicalId)
                || createManager(canonicalId, award.managerName, null);

            current.titles += 1;
            current.bestFinish = Math.min(current.bestFinish, 1);
            current.firstYear = Math.min(current.firstYear, Number(award.year));
            current.lastYear = Math.max(current.lastYear, Number(award.year));

            const hasSnapshotEntry = current.history.some(entry =>
                Number(entry.year) === Number(award.year)
                && entry.seriesKey === award.seriesKey
            );

            if (!hasSnapshotEntry) {
                current.history.push({
                    canonicalId,
                    managerName: current.managerName,
                    avatar: current.avatar,
                    year: Number(award.year),
                    seriesKey: award.seriesKey,
                    seriesLabel: award.seriesLabel,
                    rank: 1,
                    points: null,
                    bestLeagueRank: null,
                    fpts: null,
                    leagueAppearances: 0,
                    provisional: false,
                    officialTitleOnly: true
                });
            }

            aggregate.set(canonicalId, current);
        });

        const ranking = [...aggregate.values()].map(manager => ({
            ...manager,
            podiums: manager.titles + manager.secondPlaces + manager.thirdPlaces,
            averageFinish: manager.participations ? manager.finishTotal / manager.participations : Number.POSITIVE_INFINITY,
            averagePoints: manager.participations ? manager.totalPoints / manager.participations : 0,
            bestFinish: Number.isFinite(manager.bestFinish) ? manager.bestFinish : 0,
            firstYear: Number.isFinite(manager.firstYear) ? manager.firstYear : 0,
            lastYear: Number.isFinite(manager.lastYear) ? manager.lastYear : 0,
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

    function getEffectiveMatchupPoints(matchup) {
        if (!matchup || typeof matchup !== 'object') return null;
        const customPoints = matchup.custom_points;
        if (customPoints !== null && customPoints !== undefined && Number.isFinite(Number(customPoints))) {
            return Number(customPoints);
        }
        return Number.isFinite(Number(matchup.points)) ? Number(matchup.points) : null;
    }

    function getPlayoffRoundCount(...brackets) {
        return brackets
            .flatMap(bracket => Array.isArray(bracket) ? bracket : [])
            .reduce((maximum, match) => Math.max(maximum, Number(match?.r) || 0), 0);
    }

    function getPlayoffWeekNumbers(league, ...brackets) {
        const roundCount = getPlayoffRoundCount(...brackets);
        if (!roundCount) return [];

        const configuredStart = Number(league?.settings?.playoff_week_start);
        const playoffWeekStart = Number.isInteger(configuredStart) && configuredStart > 0
            ? configuredStart
            : 15;

        return Array.from({ length: roundCount }, (_, index) => playoffWeekStart + index);
    }

    function getBracketSourceReference(match, slot) {
        const direct = match?.[slot];
        if (direct && typeof direct === 'object') return direct;
        const from = match?.[`${slot}_from`];
        return from && typeof from === 'object' ? from : null;
    }

    function resolveBracketRosterId(match, slot, matchById, seen = new Set()) {
        const direct = Number(match?.[slot]);
        if (Number.isInteger(direct) && direct > 0) return direct;

        const reference = getBracketSourceReference(match, slot);
        if (!reference) return null;

        const outcome = Object.prototype.hasOwnProperty.call(reference, 'w') ? 'w'
            : Object.prototype.hasOwnProperty.call(reference, 'l') ? 'l'
                : null;
        if (!outcome) return null;

        const sourceId = Number(reference[outcome]);
        if (!Number.isInteger(sourceId) || seen.has(sourceId)) return null;
        const sourceMatch = matchById.get(sourceId);
        if (!sourceMatch) return null;

        const resolved = Number(sourceMatch?.[outcome]);
        if (Number.isInteger(resolved) && resolved > 0) return resolved;

        seen.add(sourceId);
        const sourceSlot = outcome === 'w' ? null : null;
        void sourceSlot;
        return null;
    }

    function groupMatchupsById(rows) {
        const groups = new Map();
        (rows || []).forEach(row => {
            const matchupId = row?.matchup_id;
            if (matchupId === null || matchupId === undefined) return;
            const key = String(matchupId);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(row);
        });
        return [...groups.values()];
    }

    function findScoreRows(rows, rosterId1, rosterId2) {
        const firstId = Number(rosterId1);
        const secondId = Number(rosterId2);
        const groups = groupMatchupsById(rows);

        if (Number.isInteger(firstId) && Number.isInteger(secondId)) {
            const group = groups.find(items => {
                const ids = new Set(items.map(item => Number(item?.roster_id)));
                return ids.has(firstId) && ids.has(secondId);
            });
            if (group) return group;
        }

        if (Number.isInteger(firstId) || Number.isInteger(secondId)) {
            const target = Number.isInteger(firstId) ? firstId : secondId;
            const group = groups.find(items => items.some(item => Number(item?.roster_id) === target));
            if (group) return group;
        }

        return [];
    }

    function getRoundLabel(round, totalRounds) {
        const roundNumber = Number(round);
        const remaining = Number(totalRounds) - roundNumber;
        if (remaining === 0) return 'Final';
        if (remaining === 1) return 'Semifinais';
        if (remaining === 2) return 'Quartas de final';
        if (remaining === 3) return 'Oitavas de final';
        return `Rodada ${roundNumber}`;
    }

    function getPlacementLabel(placement, options = {}) {
        const value = Number(placement);
        if (!Number.isInteger(value) || value < 1) return '';

        const offset = Math.max(0, Number(options?.offset) || 0);
        const finalPlacement = value + offset;

        if (finalPlacement === 1) return 'Disputa do título';
        if (finalPlacement === 3) return 'Disputa do 3º lugar';
        return `Disputa do ${finalPlacement}º lugar`;
    }

    function buildPlayoffRounds(bracket, league, matchupsByWeek = {}, options = {}) {
        const matches = Array.isArray(bracket) ? bracket : [];
        const matchById = new Map(matches.map(match => [Number(match?.m), match]));
        const totalRounds = getPlayoffRoundCount(matches);
        const weekNumbers = getPlayoffWeekNumbers(league, matches);
        const rounds = [];
        const bracketType = options?.bracketType === 'losers' ? 'losers' : 'winners';
        const placementOffset = bracketType === 'losers'
            ? Math.max(0, Number(league?.settings?.playoff_teams || 0))
            : 0;

        for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
            const week = weekNumbers[roundNumber - 1] || null;
            const weekRows = matchupsByWeek?.[week] || matchupsByWeek?.[String(week)] || [];
            const roundMatches = matches
                .filter(match => Number(match?.r) === roundNumber)
                .sort((a, b) => Number(a?.m || 0) - Number(b?.m || 0))
                .map(match => {
                    const team1RosterId = resolveBracketRosterId(match, 't1', matchById);
                    const team2RosterId = resolveBracketRosterId(match, 't2', matchById);
                    const scoreRows = findScoreRows(weekRows, team1RosterId, team2RosterId);
                    const scoreByRoster = new Map(scoreRows.map(row => [
                        Number(row?.roster_id),
                        {
                            points: getEffectiveMatchupPoints(row),
                            originalPoints: Number.isFinite(Number(row?.points)) ? Number(row.points) : null,
                            customPoints: row?.custom_points === null || row?.custom_points === undefined
                                ? null
                                : Number(row.custom_points)
                        }
                    ]));
                    const winnerRosterId = Number.isInteger(Number(match?.w)) && Number(match.w) > 0
                        ? Number(match.w)
                        : null;
                    const loserRosterId = Number.isInteger(Number(match?.l)) && Number(match.l) > 0
                        ? Number(match.l)
                        : null;

                    return {
                        matchId: Number(match?.m),
                        round: roundNumber,
                        week,
                        placement: Number.isInteger(Number(match?.p)) ? Number(match.p) : null,
                        placementLabel: getPlacementLabel(match?.p, { offset: placementOffset }),
                        team1RosterId,
                        team2RosterId,
                        winnerRosterId,
                        loserRosterId,
                        team1Score: scoreByRoster.get(team1RosterId)?.points ?? null,
                        team2Score: scoreByRoster.get(team2RosterId)?.points ?? null,
                        team1ScoreDetails: scoreByRoster.get(team1RosterId) || null,
                        team2ScoreDetails: scoreByRoster.get(team2RosterId) || null,
                        isBye: Boolean((team1RosterId && !team2RosterId) || (!team1RosterId && team2RosterId)),
                        completed: Boolean(winnerRosterId),
                        raw: match
                    };
                });

            rounds.push({
                round: roundNumber,
                label: getRoundLabel(roundNumber, totalRounds),
                week,
                matches: roundMatches
            });
        }

        const championshipMatch = matches.find(match => Number(match?.p) === 1)
            || matches.slice().sort((a, b) => Number(b?.r || 0) - Number(a?.r || 0))[0]
            || null;
        const championRosterId = Number.isInteger(Number(championshipMatch?.w))
            ? Number(championshipMatch.w)
            : null;
        const matchesWithTeams = rounds.flatMap(round => round.matches)
            .filter(match => match.team1RosterId || match.team2RosterId);

        return {
            rounds,
            totalRounds,
            championRosterId,
            completed: matchesWithTeams.length > 0 && matchesWithTeams.every(match => match.completed || match.isBye),
            matchCount: matchesWithTeams.length
        };
    }

    function validatePlayoffData(playoffs) {
        const errors = [];
        if (!playoffs || typeof playoffs !== 'object') {
            return { valid: false, errors: ['dados de playoffs inválidos'] };
        }
        if (!playoffs.matchupsByWeek || typeof playoffs.matchupsByWeek !== 'object' || Array.isArray(playoffs.matchupsByWeek)) {
            errors.push('matchupsByWeek dos playoffs ausente ou inválido');
        } else {
            Object.entries(playoffs.matchupsByWeek).forEach(([week, rows]) => {
                if (!/^\d+$/.test(String(week))) errors.push(`semana de playoffs inválida: ${week}`);
                if (!Array.isArray(rows)) errors.push(`matchups da semana ${week} não são uma lista`);
            });
        }
        return { valid: errors.length === 0, errors };
    }

    function parseRoute(search, options = {}) {
        const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
        const allowedViews = new Set(['home', 'champions', 'history', 'profile', 'season', 'playoffs']);
        const allowedSeries = new Set(['all', 'keeper', 'serieA', 'serieB']);
        const allowedHistorySorts = new Set(['points', 'titles', 'podiums', 'average']);
        const allowedSeasonSorts = new Set(['points', 'fpts', 'bestRank', 'name']);
        const configuredYears = new Set((options.years || []).map(Number));

        const view = allowedViews.has(params.get('view')) ? params.get('view') : 'home';
        const series = allowedSeries.has(params.get('series')) ? params.get('series') : 'all';
        const yearValue = Number(params.get('year'));
        const year = Number.isInteger(yearValue) && (!configuredYears.size || configuredYears.has(yearValue))
            ? yearValue
            : null;
        const historySort = allowedHistorySorts.has(params.get('sort')) ? params.get('sort') : 'titles';
        const seasonSort = allowedSeasonSorts.has(params.get('sort')) ? params.get('sort') : 'points';

        if ((view === 'season' || view === 'playoffs') && (!year || series === 'all')) {
            return { view: 'home' };
        }
        if (view === 'profile' && !params.get('manager')) {
            return { view: 'history', series, sort: historySort, query: params.get('q') || '' };
        }

        const leagueValue = Number(params.get('league'));
        const league = Number.isInteger(leagueValue) && leagueValue > 0 ? leagueValue : 1;
        const bracket = params.get('bracket') === 'losers' ? 'losers' : 'winners';
        const roundValue = Number(params.get('round'));
        const round = Number.isInteger(roundValue) && roundValue > 0 ? roundValue : 1;

        return {
            view,
            year,
            series,
            sort: view === 'season' ? seasonSort : historySort,
            query: params.get('q') || '',
            manager: params.get('manager') || null,
            league,
            bracket,
            round
        };
    }

    function serializeRoute(route = {}) {
        const params = new URLSearchParams();
        const view = route.view || 'home';
        if (view !== 'home') params.set('view', view);

        if (view === 'history') {
            if (route.series && route.series !== 'all') params.set('series', route.series);
            if (route.sort && route.sort !== 'titles') params.set('sort', route.sort);
            if (route.query) params.set('q', route.query);
        } else if (view === 'profile') {
            if (route.manager) params.set('manager', route.manager);
            if (route.series && route.series !== 'all') params.set('series', route.series);
        } else if (view === 'season') {
            if (route.year) params.set('year', String(route.year));
            if (route.series) params.set('series', route.series);
            if (route.sort && route.sort !== 'points') params.set('sort', route.sort);
            if (route.query) params.set('q', route.query);
        } else if (view === 'playoffs') {
            if (route.year) params.set('year', String(route.year));
            if (route.series) params.set('series', route.series);
            if (Number(route.league) > 1) params.set('league', String(route.league));
            if (route.bracket === 'losers') params.set('bracket', 'losers');
            if (Number(route.round) > 1) params.set('round', String(route.round));
        }

        const query = params.toString();
        return query ? `?${query}` : '';
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
        getRosterUserCandidates,
        getUserForRoster,
        getManagerName,
        getTeamName,
        createIdentityIndex,
        resolveCanonicalManager,
        calculateCombinedStandings,
        filterLeagueIdsForDiscovery,
        buildHistoricalEntries,
        buildOfficialTitleAwards,
        sortHistoricalRanking,
        aggregateHistoricalRanking,
        getHistoricalProfile,
        filterBySearch,
        sortSeasonRanking,
        getEffectiveMatchupPoints,
        getPlayoffRoundCount,
        getPlayoffWeekNumbers,
        buildPlayoffRounds,
        validatePlayoffData,
        csvEscape,
        rowsToCsv,
        parseRoute,
        serializeRoute
    });
}));
