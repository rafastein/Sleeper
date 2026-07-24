(() => {
    'use strict';

    const API_BASE_URL = 'https://api.sleeper.app/v1';
    const AVATAR_BASE_URL = 'https://sleepercdn.com/avatars/thumbs';
    const REQUEST_TIMEOUT_MS = 15000;
    const config = window.AMBO_CONFIG;
    const core = window.AMBO_CORE;

    if (!config || !core) {
        throw new Error('Configuração ou núcleo de cálculo não carregado.');
    }

    const state = {
        activeButton: null,
        requestToken: 0,
        resolvedLeagueIds: new Map(),
        managerRegistryPromise: null,
        discoveryUsersPromise: null
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
        return core.getRosterPoints(roster, key);
    }

    function getUserForRoster(roster, users) {
        return core.getUserForRoster(roster, users);
    }

    function getManagerName(user, roster) {
        return core.getManagerName(user, roster);
    }

    function getTeamName(user, roster) {
        return core.getTeamName(user, roster);
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

    async function fetchOptionalJson(url) {
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`requisição retornou ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Arquivo local indisponível em ${url}:`, error);
            return null;
        }
    }

    function loadManagerRegistry() {
        if (!state.managerRegistryPromise) {
            state.managerRegistryPromise = fetchOptionalJson(config.data?.managerRegistryPath || 'data/managers.json')
                .then(registry => registry || { schemaVersion: 1, managers: [] });
        }
        return state.managerRegistryPromise;
    }

    function loadDiscoveryUsers() {
        if (!state.discoveryUsersPromise) {
            state.discoveryUsersPromise = fetchOptionalJson(config.data?.discoveryUsersPath || 'data/discovery-users.json')
                .then(data => data?.users || {});
        }
        return state.discoveryUsersPromise;
    }

    async function loadLocalSeasonSnapshot(year, seriesKey) {
        const dataConfig = config.data || {};
        const enabled = dataConfig.preferSnapshots !== false;
        const years = Array.isArray(dataConfig.snapshotYears) ? dataConfig.snapshotYears.map(Number) : [];
        if (!enabled || (years.length && !years.includes(Number(year)))) return null;

        const basePath = String(dataConfig.snapshotsBasePath || 'data/snapshots').replace(/\/$/, '');
        const payload = await fetchOptionalJson(`${basePath}/${year}/${seriesKey}.json`);
        if (!payload) return null;

        if (payload.schemaVersion !== 1 || !Array.isArray(payload.leagues)) {
            console.warn(`Snapshot ${year}/${seriesKey} ignorado: formato inválido.`);
            return null;
        }

        const validationErrors = [];
        payload.leagues.forEach((leagueSnapshot, index) => {
            const result = core.validateLeagueSnapshot(leagueSnapshot);
            if (!result.valid) {
                validationErrors.push(`Liga ${index + 1}: ${result.errors.join('; ')}`);
            }
        });

        if (validationErrors.length) {
            console.error(`Snapshot ${year}/${seriesKey} inválido:`, validationErrors);
            return null;
        }

        return payload;
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
        const discoveryKey = String(seasonConfig.discoveryKey || core.normalizeAlias(username));

        if (!previousLeagueIds.length) {
            throw new Error('a descoberta automática está incompleta no config.js');
        }

        const cacheKey = `${year}:${seriesKey}`;
        if (state.resolvedLeagueIds.has(cacheKey)) {
            return state.resolvedLeagueIds.get(cacheKey);
        }

        const discoveryRequest = (async () => {
            const persistedUsers = await loadDiscoveryUsers();
            let userId = String(seasonConfig.userId || persistedUsers[discoveryKey]?.userId || '').trim();

            if (!userId) {
                if (!username) {
                    throw new Error(`user_id persistente ausente para ${seriesKey}`);
                }
                const user = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(username)}`);
                userId = String(user?.user_id || '');
                if (!userId) throw new Error(`usuário ${username} não encontrado no Sleeper`);
            }

            const leagues = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(userId)}/leagues/nfl/${year}`);
            if (!Array.isArray(leagues)) {
                throw new Error(`a API não retornou as ligas do usuário ${userId} em ${year}`);
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
                throw new Error(`foram encontradas ${matchedLeagueIds.length} de ${expectedLeagues} ligas renovadas em ${year}`);
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

        const calculated = core.calculateStandings(winnersBracket, losersBracket, rosters, league);

        return {
            index,
            leagueId,
            league,
            rosters,
            users,
            winnersBracket,
            losersBracket,
            standings: calculated.standings,
            usedFallback: calculated.usedFallback
        };
    }

    function calculateCombinedStandings(leagueSnapshots, registry) {
        return core.calculateCombinedStandings(leagueSnapshots, registry);
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
        elements.lastUpdate.textContent = 'Carregando dados validados...';
        elements.championsView.hidden = true;
        elements.rankingView.hidden = false;

        try {
            const [registry, localSnapshot] = await Promise.all([
                loadManagerRegistry(),
                loadLocalSeasonSnapshot(year, seriesKey)
            ]);

            if (currentRequest !== state.requestToken) return;

            let snapshots;
            let sourceLabel;
            let updatedAt;

            if (localSnapshot) {
                snapshots = localSnapshot.leagues.slice().sort((a, b) => a.index - b.index);
                sourceLabel = 'Snapshot oficial';
                updatedAt = localSnapshot.generatedAt;
            } else {
                const leagueIds = await resolveLeagueIds(year, seriesKey);
                if (currentRequest !== state.requestToken) return;

                snapshots = (await Promise.all(
                    leagueIds.map((leagueId, index) => fetchLeagueSnapshot(leagueId, index))
                )).sort((a, b) => a.index - b.index);
                sourceLabel = 'Sleeper API';
                updatedAt = new Date().toISOString();
            }

            snapshots.forEach((snapshot, index) => {
                const validation = core.validateLeagueSnapshot(snapshot);
                if (!validation.valid) {
                    throw new Error(`Liga ${index + 1} inválida: ${validation.errors.join('; ')}`);
                }
            });

            if (currentRequest !== state.requestToken) return;

            const combined = calculateCombinedStandings(snapshots, registry);
            renderCombinedStandings(combined);
            elements.leaguePanels.replaceChildren(...snapshots.map(renderLeaguePanel));
            renderSeasonStats(year, seriesLabel, snapshots, combined);

            const formattedDate = updatedAt
                ? new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(new Date(updatedAt))
                : null;
            elements.lastUpdate.textContent = formattedDate
                ? `${sourceLabel} · ${formattedDate}`
                : sourceLabel;
        } catch (error) {
            if (currentRequest !== state.requestToken) return;
            console.error(error);
            elements.combinedBody.replaceChildren();
            elements.leaguePanels.replaceChildren();
            elements.seasonStats.replaceChildren();
            elements.rankingStatus.textContent = 'Falha de validação';
            elements.lastUpdate.textContent = 'Dados indisponíveis';
            showError(`Não foi possível carregar as ligas: ${error.message}.`);
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
