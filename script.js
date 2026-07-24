(() => {
    'use strict';

    const API_BASE_URL = 'https://api.sleeper.app/v1';
    const AVATAR_BASE_URL = 'https://sleepercdn.com/avatars/thumbs';
    const REQUEST_TIMEOUT_MS = 15000;
    const config = window.AMBO_CONFIG;

    const state = {
        activeButton: null,
        requestToken: 0,
        resolvedLeagueIds: new Map()
    };

    const elements = {
        navigation: document.getElementById('navigation'),
        championsView: document.getElementById('champions-view'),
        rankingView: document.getElementById('ranking-view'),
        pageEyebrow: document.getElementById('page-eyebrow'),
        pageTitle: document.getElementById('page-title'),
        pageDescription: document.getElementById('page-description'),
        lastUpdate: document.getElementById('last-update'),
        loading: document.getElementById('loading'),
        error: document.getElementById('error-message'),
        championStats: document.getElementById('champion-stats'),
        championsBody: document.querySelector('#champions-table tbody'),
        championsRange: document.getElementById('champions-range'),
        seasonStats: document.getElementById('season-stats'),
        combinedBody: document.querySelector('#combined-table tbody'),
        rankingStatus: document.getElementById('ranking-status'),
        leaguePanels: document.getElementById('league-panels'),
        leaguePanelTemplate: document.getElementById('league-panel-template'),
        sidebar: document.getElementById('sidebar'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
        menuBackdrop: document.getElementById('menu-backdrop')
    };

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null) element.textContent = String(text);
        return element;
    }

    function showLoading(show) {
        elements.loading.hidden = !show;
    }

    function showError(message = '') {
        elements.error.textContent = message;
        elements.error.hidden = !message;
    }

    function formatNumber(value, fractionDigits = 2) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(Number.isFinite(value) ? value : 0);
    }

    function getRosterPoints(roster, key = 'fpts') {
        const settings = roster?.settings || {};
        const integer = Number(settings[key] || 0);
        const decimal = Number(settings[`${key}_decimal`] || 0) / 100;
        return integer + decimal;
    }

    function getUserForRoster(roster, users) {
        return users.find(user => user.user_id === roster?.owner_id) || null;
    }

    function getManagerName(user, roster) {
        return user?.display_name || user?.username || roster?.metadata?.owner_name || 'Manager não identificado';
    }

    function getTeamName(user, roster) {
        return user?.metadata?.team_name || roster?.metadata?.team_name || getManagerName(user, roster);
    }

    function getInitials(name) {
        return String(name || '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
    }

    function createAvatar(avatarId, name) {
        if (!avatarId) {
            return createElement('span', 'avatar-placeholder', getInitials(name));
        }

        const image = createElement('img', 'avatar');
        image.src = `${AVATAR_BASE_URL}/${encodeURIComponent(avatarId)}`;
        image.alt = `Avatar de ${name}`;
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => {
            image.replaceWith(createElement('span', 'avatar-placeholder', getInitials(name)));
        }, { once: true });
        return image;
    }

    function createEntityCell(primary, secondary) {
        const cell = document.createElement('td');
        cell.append(
            createElement('span', 'entity-name', primary),
            createElement('span', 'entity-meta', secondary)
        );
        return cell;
    }

    function createRankCell(rank) {
        const cell = createElement('td', 'col-rank');
        cell.appendChild(createElement('span', 'rank-number', rank));
        return cell;
    }

    function applyRankClass(row, rank, total) {
        if (rank === 1) row.classList.add('rank-row--first');
        if (rank === 2) row.classList.add('rank-row--second');
        if (rank === 3) row.classList.add('rank-row--third');
        if (total >= 8 && rank > total - 3) row.classList.add('rank-row--bottom');
    }

    function createStatCard(label, value, detail) {
        const card = createElement('article', 'stat-card');
        card.append(
            createElement('span', 'stat-card__label', label),
            createElement('strong', 'stat-card__value', value),
            createElement('span', 'stat-card__detail', detail)
        );
        return card;
    }

    function setStats(container, stats) {
        container.replaceChildren(...stats.map(stat => createStatCard(stat.label, stat.value, stat.detail)));
    }

    function setActiveButton(button) {
        if (state.activeButton) state.activeButton.classList.remove('is-active');
        state.activeButton = button;
        if (button) button.classList.add('is-active');
    }

    function closeMobileMenu() {
        document.body.classList.remove('menu-open');
        elements.sidebar.classList.remove('is-open');
        elements.mobileMenuButton.classList.remove('is-open');
        elements.mobileMenuButton.setAttribute('aria-expanded', 'false');
        elements.mobileMenuButton.setAttribute('aria-label', 'Abrir menu');
    }

    function toggleMobileMenu() {
        const willOpen = !elements.sidebar.classList.contains('is-open');
        document.body.classList.toggle('menu-open', willOpen);
        elements.sidebar.classList.toggle('is-open', willOpen);
        elements.mobileMenuButton.classList.toggle('is-open', willOpen);
        elements.mobileMenuButton.setAttribute('aria-expanded', String(willOpen));
        elements.mobileMenuButton.setAttribute('aria-label', willOpen ? 'Fechar menu' : 'Abrir menu');
    }

    function renderNavigation() {
        const fragment = document.createDocumentFragment();

        const championsButton = createElement('button', 'nav-button');
        championsButton.type = 'button';
        championsButton.dataset.view = 'champions';
        championsButton.append(
            createElement('span', 'nav-button__icon', '★'),
            createElement('span', '', 'Campeões')
        );
        championsButton.addEventListener('click', () => showChampions(championsButton));
        fragment.appendChild(championsButton);

        const years = Object.keys(config.leagueIds).map(Number).sort((a, b) => b - a);
        years.forEach(year => {
            fragment.appendChild(createElement('p', 'nav-year', year));

            Object.entries(config.series).forEach(([seriesKey, seriesLabel]) => {
                if (!config.leagueIds[year]?.[seriesKey]) return;

                const button = createElement('button', 'nav-button');
                button.type = 'button';
                button.dataset.year = String(year);
                button.dataset.series = seriesKey;
                button.append(
                    createElement('span', 'nav-button__icon', seriesLabel.replace('Série ', '')),
                    createElement('span', '', seriesLabel)
                );
                button.addEventListener('click', () => loadSeason(year, seriesKey, button));
                fragment.appendChild(button);
            });
        });

        elements.navigation.replaceChildren(fragment);
        showChampions(championsButton);
    }

    function getTitleCounts() {
        const counts = new Map();
        config.champions.forEach(row => {
            ['keeper', 'serieA', 'serieB'].forEach(key => {
                const name = row[key];
                if (name) counts.set(name, (counts.get(name) || 0) + 1);
            });
        });
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
    }

    function renderChampions() {
        const rows = config.champions.slice().sort((a, b) => b.year - a.year);
        const fragment = document.createDocumentFragment();

        rows.forEach(champion => {
            const row = document.createElement('tr');
            row.appendChild(createElement('td', '', champion.year));

            ['keeper', 'serieA', 'serieB'].forEach(key => {
                const value = champion[key];
                row.appendChild(createElement('td', value ? 'champion-name' : 'empty-value', value || '—'));
            });
            fragment.appendChild(row);
        });

        elements.championsBody.replaceChildren(fragment);

        const years = rows.map(row => row.year);
        const titleCounts = getTitleCounts();
        const leader = titleCounts[0] || ['—', 0];
        const totalTitles = titleCounts.reduce((sum, [, count]) => sum + count, 0);

        elements.championsRange.textContent = `${Math.min(...years)}–${Math.max(...years)}`;
        setStats(elements.championStats, [
            { label: 'Temporadas registradas', value: years.length, detail: 'Histórico disponível no projeto' },
            { label: 'Maior campeão geral', value: leader[0], detail: `${leader[1]} títulos somando as categorias` },
            { label: 'Títulos registrados', value: totalTitles, detail: `${titleCounts.length} campeões diferentes` }
        ]);
    }

    function showChampions(button) {
        state.requestToken += 1;
        showLoading(false);
        showError();
        setActiveButton(button);
        closeMobileMenu();

        elements.pageEyebrow.textContent = 'Histórico oficial';
        elements.pageTitle.textContent = 'Hall de campeões';
        elements.pageDescription.textContent = 'A história das ligas AMBO reunida em um só lugar.';
        elements.lastUpdate.textContent = `Base cadastrada até ${Math.max(...config.champions.map(item => item.year))}`;
        elements.championsView.hidden = false;
        elements.rankingView.hidden = true;
        renderChampions();
    }

    async function fetchJson(url) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`requisição retornou ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('tempo de resposta excedido');
            }
            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    async function resolveLeagueIds(year, seriesKey) {
        const seasonConfig = config.leagueIds[year]?.[seriesKey];

        if (Array.isArray(seasonConfig)) {
            return seasonConfig.map(String);
        }

        if (!seasonConfig || typeof seasonConfig !== 'object') {
            throw new Error('não há configuração de liga para esta temporada');
        }

        const username = String(seasonConfig.username || '').trim();
        const previousLeagueIds = Array.isArray(seasonConfig.previousLeagueIds)
            ? seasonConfig.previousLeagueIds.map(String)
            : [];
        const expectedLeagues = Number(seasonConfig.expectedLeagues || previousLeagueIds.length || 2);

        if (!username || !previousLeagueIds.length) {
            throw new Error('a descoberta automática está incompleta no config.js');
        }

        const cacheKey = `${year}:${seriesKey}`;
        if (state.resolvedLeagueIds.has(cacheKey)) {
            return state.resolvedLeagueIds.get(cacheKey);
        }

        const discoveryRequest = (async () => {
            const user = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(username)}`);
            if (!user?.user_id) {
                throw new Error(`usuário ${username} não encontrado no Sleeper`);
            }

            const leagues = await fetchJson(
                `${API_BASE_URL}/user/${encodeURIComponent(user.user_id)}/leagues/nfl/${year}`
            );

            if (!Array.isArray(leagues)) {
                throw new Error(`a API não retornou as ligas de ${username} em ${year}`);
            }

            const previousIds = new Set(previousLeagueIds);
            const matchedLeagueIds = [...new Set(
                leagues
                    .filter(league => previousIds.has(String(league?.previous_league_id || '')))
                    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR'))
                    .map(league => String(league?.league_id || ''))
                    .filter(Boolean)
            )];

            if (matchedLeagueIds.length !== expectedLeagues) {
                throw new Error(
                    `foram encontradas ${matchedLeagueIds.length} de ${expectedLeagues} ligas renovadas para ${username} em ${year}`
                );
            }

            return matchedLeagueIds;
        })();

        state.resolvedLeagueIds.set(cacheKey, discoveryRequest);

        try {
            return await discoveryRequest;
        } catch (error) {
            state.resolvedLeagueIds.delete(cacheKey);
            throw error;
        }
    }

    async function fetchOptionalBracket(leagueId, bracketName) {
        try {
            return await fetchJson(`${API_BASE_URL}/league/${leagueId}/${bracketName}`);
        } catch (error) {
            console.warn(`Não foi possível carregar ${bracketName} da liga ${leagueId}:`, error);
            return [];
        }
    }

    async function fetchLeagueSnapshot(leagueId, index) {
        const [league, rosters, users, winnersBracket, losersBracket] = await Promise.all([
            fetchJson(`${API_BASE_URL}/league/${leagueId}`),
            fetchJson(`${API_BASE_URL}/league/${leagueId}/rosters`),
            fetchJson(`${API_BASE_URL}/league/${leagueId}/users`),
            fetchOptionalBracket(leagueId, 'winners_bracket'),
            fetchOptionalBracket(leagueId, 'losers_bracket')
        ]);

        const calculated = calculateStandings(winnersBracket, losersBracket, rosters, league);

        return {
            index,
            leagueId,
            league,
            rosters,
            users,
            standings: calculated.standings,
            usedFallback: calculated.usedFallback
        };
    }

    function compareRegularSeasonRosters(a, b) {
        const settingsA = a.settings || {};
        const settingsB = b.settings || {};

        if ((settingsB.wins || 0) !== (settingsA.wins || 0)) return (settingsB.wins || 0) - (settingsA.wins || 0);
        if ((settingsB.ties || 0) !== (settingsA.ties || 0)) return (settingsB.ties || 0) - (settingsA.ties || 0);

        const pointsDifference = getRosterPoints(b) - getRosterPoints(a);
        if (pointsDifference !== 0) return pointsDifference;

        const againstDifference = getRosterPoints(a, 'fpts_against') - getRosterPoints(b, 'fpts_against');
        if (againstDifference !== 0) return againstDifference;

        return (a.roster_id || 0) - (b.roster_id || 0);
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

    /**
     * O campo `p` informa a colocação disputada dentro de cada bracket.
     * No winners bracket, p: 1 representa 1º/2º, p: 3 representa 3º/4º etc.
     * No losers bracket, o Sleeper reinicia essa numeração em 1; por isso é
     * necessário somar a quantidade de times dos playoffs para obter 7º–12º.
     */
    function calculateStandings(winnersBracket, losersBracket, rosters, league) {
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

        // Algumas respostas podem trazer posições absolutas no losers bracket.
        // Só aplicamos o deslocamento quando a numeração reinicia em 1.
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

    function calculateCombinedStandings(leagueSnapshots) {
        const combined = new Map();

        leagueSnapshots.forEach(snapshot => {
            snapshot.standings.forEach(standing => {
                const roster = snapshot.rosters.find(item => item.roster_id === standing.rosterId);
                if (!roster) return;

                const user = getUserForRoster(roster, snapshot.users);
                const ownerKey = roster.owner_id || `sem-owner:${snapshot.leagueId}:${roster.roster_id}`;
                const managerName = getManagerName(user, roster);
                const current = combined.get(ownerKey) || {
                    ownerKey,
                    avatar: user?.avatar || null,
                    managerName,
                    points: 0,
                    bestRank: Number.POSITIVE_INFINITY,
                    fpts: 0,
                    appearances: 0
                };

                current.avatar ||= user?.avatar || null;
                current.managerName = current.managerName === 'Manager não identificado' ? managerName : current.managerName;
                current.points += standing.points;
                current.bestRank = Math.min(current.bestRank, standing.rank);
                current.fpts += getRosterPoints(roster);
                current.appearances += 1;
                combined.set(ownerKey, current);
            });
        });

        return [...combined.values()].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
            if (b.fpts !== a.fpts) return b.fpts - a.fpts;
            return a.managerName.localeCompare(b.managerName, 'pt-BR');
        });
    }

    function renderCombinedStandings(standings) {
        const fragment = document.createDocumentFragment();

        standings.forEach((standing, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            applyRankClass(row, rank, standings.length);

            const avatarCell = createElement('td', 'col-avatar');
            avatarCell.appendChild(createAvatar(standing.avatar, standing.managerName));

            const pointsCell = createElement('td', 'points-value', standing.points);
            row.append(
                createRankCell(rank),
                avatarCell,
                createEntityCell(standing.managerName, `${standing.appearances} participação${standing.appearances === 1 ? '' : 'ões'} na rodada`),
                pointsCell,
                createElement('td', '', `${standing.bestRank}º`),
                createElement('td', '', formatNumber(standing.fpts)),
                createElement('td', '', standing.appearances)
            );
            fragment.appendChild(row);
        });

        elements.combinedBody.replaceChildren(fragment);
    }

    function renderLeaguePanel(snapshot) {
        const panel = elements.leaguePanelTemplate.content.firstElementChild.cloneNode(true);
        panel.querySelector('.league-number').textContent = `Liga ${snapshot.index + 1}`;
        panel.querySelector('.league-name').textContent = snapshot.league.name || `Liga ${snapshot.index + 1}`;
        panel.querySelector('.league-season').textContent = snapshot.usedFallback ? 'Classificação parcial' : `Temporada ${snapshot.league.season}`;

        const body = panel.querySelector('tbody');
        const fragment = document.createDocumentFragment();

        snapshot.standings.forEach(standing => {
            const roster = snapshot.rosters.find(item => item.roster_id === standing.rosterId);
            const user = getUserForRoster(roster, snapshot.users);
            const managerName = getManagerName(user, roster);
            const teamName = getTeamName(user, roster);
            const wins = Number(roster?.settings?.wins || 0);
            const losses = Number(roster?.settings?.losses || 0);
            const ties = Number(roster?.settings?.ties || 0);
            const campaign = ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

            const row = document.createElement('tr');
            applyRankClass(row, standing.rank, snapshot.standings.length);

            const avatarCell = createElement('td', 'col-avatar');
            avatarCell.appendChild(createAvatar(user?.avatar, managerName));

            row.append(
                createRankCell(standing.rank),
                avatarCell,
                createEntityCell(teamName, managerName),
                createElement('td', '', campaign),
                createElement('td', 'points-value', standing.points),
                createElement('td', '', formatNumber(getRosterPoints(roster)))
            );
            fragment.appendChild(row);
        });

        body.replaceChildren(fragment);
        return panel;
    }

    function renderSeasonStats(year, seriesLabel, snapshots, combined) {
        const allFallback = snapshots.every(snapshot => snapshot.usedFallback);
        const anyFallback = snapshots.some(snapshot => snapshot.usedFallback);
        const leader = combined[0];

        setStats(elements.seasonStats, [
            { label: 'Temporada', value: year, detail: seriesLabel },
            { label: 'Managers únicos', value: combined.length, detail: `${snapshots.length} ligas combinadas` },
            { label: 'Líder combinado', value: leader?.managerName || '—', detail: leader ? `${leader.points} pontos no ranking` : 'Sem dados disponíveis' }
        ]);

        elements.rankingStatus.textContent = allFallback
            ? 'Classificação regular'
            : anyFallback
                ? 'Dados parcialmente provisórios'
                : 'Playoffs concluídos';
    }

    async function loadSeason(year, seriesKey, button) {
        const seasonConfig = config.leagueIds[year]?.[seriesKey];
        if (!seasonConfig) {
            showError('Não há configuração de liga cadastrada para esta temporada.');
            return;
        }

        const currentRequest = ++state.requestToken;
        const seriesLabel = config.series[seriesKey] || seriesKey;

        setActiveButton(button);
        closeMobileMenu();
        showError();
        showLoading(true);

        elements.pageEyebrow.textContent = `Temporada ${year}`;
        elements.pageTitle.textContent = `AMBO ${seriesLabel}`;
        elements.pageDescription.textContent = 'Ranking combinado das duas ligas, com classificação final, campanha e pontuação acumulada.';
        elements.lastUpdate.textContent = 'Atualizando dados...';
        elements.championsView.hidden = true;
        elements.rankingView.hidden = false;

        try {
            const leagueIds = await resolveLeagueIds(year, seriesKey);
            if (currentRequest !== state.requestToken) return;

            const snapshots = (await Promise.all(
                leagueIds.map((leagueId, index) => fetchLeagueSnapshot(leagueId, index))
            )).sort((a, b) => a.index - b.index);

            if (currentRequest !== state.requestToken) return;

            const combined = calculateCombinedStandings(snapshots);
            renderCombinedStandings(combined);
            elements.leaguePanels.replaceChildren(...snapshots.map(renderLeaguePanel));
            renderSeasonStats(year, seriesLabel, snapshots, combined);

            const now = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date());
            elements.lastUpdate.textContent = `Atualizado em ${now}`;
        } catch (error) {
            if (currentRequest !== state.requestToken) return;
            console.error(error);
            elements.combinedBody.replaceChildren();
            elements.leaguePanels.replaceChildren();
            elements.seasonStats.replaceChildren();
            elements.rankingStatus.textContent = 'Falha ao carregar';
            elements.lastUpdate.textContent = 'Dados indisponíveis';
            showError(`Não foi possível carregar as ligas: ${error.message}. Confira a conexão e a configuração da temporada.`);
        } finally {
            if (currentRequest === state.requestToken) showLoading(false);
        }
    }

    elements.mobileMenuButton.addEventListener('click', toggleMobileMenu);
    elements.menuBackdrop.addEventListener('click', closeMobileMenu);
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMobileMenu();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 820) closeMobileMenu();
    });

    renderNavigation();
})();
