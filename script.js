(() => {
    'use strict';

    const config = window.AMBO_CONFIG;
    const core = window.AMBO_CORE;
    const DIRECT_API_BASE_URL = config?.api?.directBaseUrl || 'https://api.sleeper.app/v1';
    const PROXY_ENDPOINT = config?.api?.proxyEndpoint || '/api/sleeper';
    const AVATAR_BASE_URL = 'https://sleepercdn.com/avatars/thumbs';
    const REQUEST_TIMEOUT_MS = Number(config?.api?.timeoutMs || 15000);
    const SEARCH_DEBOUNCE_MS = 180;

    if (!config || !core) {
        throw new Error('Configuração ou núcleo de cálculo não carregado.');
    }

    const configuredYears = Object.keys(config.leagueIds).map(Number);

    const state = {
        activeButton: null,
        championsButton: null,
        historyButton: null,
        requestToken: 0,
        resolvedLeagueIds: new Map(),
        managerRegistryPromise: null,
        discoveryUsersPromise: null,
        navButtons: new Map(),
        historyDataPromise: null,
        historyEntries: [],
        historyPayloads: [],
        historyManifest: null,
        historyFilter: 'all',
        historySort: 'points',
        historyQuery: '',
        currentHistoryRanking: [],
        currentProfileId: null,
        currentProfile: null,
        currentSeason: null,
        seasonSort: 'points',
        seasonQuery: '',
        currentView: 'champions',
        feedbackTimer: null,
        historySearchTimer: null,
        seasonSearchTimer: null,
        deferredInstallPrompt: null,
        serviceWorkerRegistration: null
    };

    const elements = {
        navigation: document.getElementById('navigation'),
        championsView: document.getElementById('champions-view'),
        rankingView: document.getElementById('ranking-view'),
        historyView: document.getElementById('history-view'),
        profileView: document.getElementById('profile-view'),
        pageEyebrow: document.getElementById('page-eyebrow'),
        pageTitle: document.getElementById('page-title'),
        pageDescription: document.getElementById('page-description'),
        lastUpdate: document.getElementById('last-update'),
        loading: document.getElementById('loading'),
        error: document.getElementById('error-message'),
        actionFeedback: document.getElementById('action-feedback'),
        copyLink: document.getElementById('copy-link'),
        sharePage: document.getElementById('share-page'),
        exportCsv: document.getElementById('export-csv'),
        installApp: document.getElementById('install-app'),
        networkStatus: document.getElementById('network-status'),
        networkDot: document.getElementById('network-dot'),
        championStats: document.getElementById('champion-stats'),
        championsBody: document.querySelector('#champions-table tbody'),
        championsRange: document.getElementById('champions-range'),
        championsCards: document.getElementById('champions-cards'),
        historyStats: document.getElementById('history-stats'),
        historyBody: document.querySelector('#history-table tbody'),
        historyCards: document.getElementById('history-cards'),
        historyStatus: document.getElementById('history-status'),
        historySeriesFilter: document.getElementById('history-series-filter'),
        historySort: document.getElementById('history-sort'),
        historySearch: document.getElementById('history-search'),
        historyResults: document.getElementById('history-results'),
        historyEmpty: document.getElementById('history-empty'),
        historyTableWrap: document.getElementById('history-table-wrap'),
        profileBack: document.getElementById('profile-back'),
        profileAvatar: document.getElementById('profile-avatar'),
        profileName: document.getElementById('profile-name'),
        profileMeta: document.getElementById('profile-meta'),
        profileBadges: document.getElementById('profile-badges'),
        profileStats: document.getElementById('profile-stats'),
        profileScope: document.getElementById('profile-scope'),
        profileHistoryBody: document.querySelector('#profile-history-table tbody'),
        profileCards: document.getElementById('profile-cards'),
        seasonStats: document.getElementById('season-stats'),
        combinedBody: document.querySelector('#combined-table tbody'),
        combinedCards: document.getElementById('combined-cards'),
        combinedTableWrap: document.getElementById('combined-table-wrap'),
        rankingStatus: document.getElementById('ranking-status'),
        seasonSearch: document.getElementById('season-search'),
        seasonSort: document.getElementById('season-sort'),
        seasonResults: document.getElementById('season-results'),
        seasonEmpty: document.getElementById('season-empty'),
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

    function showFeedback(message) {
        window.clearTimeout(state.feedbackTimer);
        elements.actionFeedback.textContent = message;
        elements.actionFeedback.hidden = false;
        state.feedbackTimer = window.setTimeout(() => {
            elements.actionFeedback.hidden = true;
        }, 2600);
    }

    function updateDocumentTitle() {
        document.title = `${elements.pageTitle.textContent} • AMBO`;
    }

    function formatNumber(value, fractionDigits = 2) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
    }

    function formatPlacement(value, digits = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '—';
        return `${formatNumber(number, digits)}º`;
    }

    function formatDateTime(value) {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
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

    function applyRankClass(element, rank, total) {
        if (rank === 1) element.classList.add('rank-row--first');
        if (rank === 2) element.classList.add('rank-row--second');
        if (rank === 3) element.classList.add('rank-row--third');
        if (total >= 8 && rank > total - 3) element.classList.add('rank-row--bottom');
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

    function createMobileMetric(label, value) {
        const metric = createElement('div', 'mobile-metric');
        metric.append(
            createElement('span', '', label),
            createElement('strong', '', value)
        );
        return metric;
    }

    function createMobileRankingCard({ rank, total, avatar, name, meta, score, metrics, onNameClick }) {
        const card = createElement('article', 'mobile-ranking-card');
        applyRankClass(card, rank, total);

        const header = createElement('div', 'mobile-ranking-card__header');
        header.appendChild(createElement('span', 'rank-number', rank));
        header.appendChild(createAvatar(avatar, name));

        const entity = createElement('div', 'mobile-ranking-card__entity');
        if (onNameClick) {
            const button = createElement('button', 'manager-link', name);
            button.type = 'button';
            button.addEventListener('click', onNameClick);
            entity.appendChild(button);
        } else {
            entity.appendChild(createElement('span', 'entity-name', name));
        }
        entity.appendChild(createElement('span', 'entity-meta', meta));
        header.appendChild(entity);
        header.appendChild(createElement('strong', 'mobile-ranking-card__score', score));

        const metricsGrid = createElement('div', 'mobile-ranking-card__metrics');
        metrics.forEach(metric => metricsGrid.appendChild(createMobileMetric(metric.label, metric.value)));
        card.append(header, metricsGrid);
        return card;
    }

    function showOnlyView(viewName) {
        const views = {
            champions: elements.championsView,
            history: elements.historyView,
            profile: elements.profileView,
            season: elements.rankingView
        };

        Object.entries(views).forEach(([name, view]) => {
            view.hidden = name !== viewName;
        });
        state.currentView = viewName;
    }

    function setActiveButton(button) {
        if (state.activeButton) {
            state.activeButton.classList.remove('is-active');
            state.activeButton.removeAttribute('aria-current');
        }
        state.activeButton = button;
        if (button) {
            button.classList.add('is-active');
            button.setAttribute('aria-current', 'page');
        }
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

    function writeRoute(route, mode = 'push') {
        const url = `${window.location.pathname}${core.serializeRoute(route)}${window.location.hash}`;
        const method = mode === 'replace' ? 'replaceState' : 'pushState';
        window.history[method]({ route }, '', url);
    }

    function currentHistoryRoute() {
        return {
            view: 'history',
            series: state.historyFilter,
            sort: state.historySort,
            query: state.historyQuery
        };
    }

    function currentSeasonRoute() {
        return {
            view: 'season',
            year: state.currentSeason?.year,
            series: state.currentSeason?.seriesKey,
            sort: state.seasonSort,
            query: state.seasonQuery
        };
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
        state.championsButton = championsButton;
        fragment.appendChild(championsButton);

        const historyButton = createElement('button', 'nav-button');
        historyButton.type = 'button';
        historyButton.dataset.view = 'history';
        historyButton.append(
            createElement('span', 'nav-button__icon', '∞'),
            createElement('span', '', 'Ranking histórico')
        );
        historyButton.addEventListener('click', () => showHistoricalRanking(historyButton));
        state.historyButton = historyButton;
        fragment.appendChild(historyButton);

        configuredYears.slice().sort((a, b) => b - a).forEach(year => {
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
                state.navButtons.set(`${year}:${seriesKey}`, button);
                fragment.appendChild(button);
            });
        });

        elements.navigation.replaceChildren(fragment);
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
        const tableFragment = document.createDocumentFragment();
        const cardFragment = document.createDocumentFragment();

        rows.forEach(champion => {
            const row = document.createElement('tr');
            row.appendChild(createElement('td', '', champion.year));
            ['keeper', 'serieA', 'serieB'].forEach(key => {
                const value = champion[key];
                row.appendChild(createElement('td', value ? 'champion-name' : 'empty-value', value || '—'));
            });
            tableFragment.appendChild(row);

            const card = createElement('article', 'mobile-champion-card');
            card.appendChild(createElement('strong', 'mobile-champion-card__year', champion.year));
            const grid = createElement('div', 'mobile-champion-card__grid');
            [
                ['Keeper', champion.keeper || '—'],
                ['Série A', champion.serieA || '—'],
                ['Série B', champion.serieB || '—']
            ].forEach(([label, value]) => {
                const item = createElement('div', 'mobile-champion-item');
                item.append(createElement('span', '', label), createElement('strong', '', value));
                grid.appendChild(item);
            });
            card.appendChild(grid);
            cardFragment.appendChild(card);
        });

        elements.championsBody.replaceChildren(tableFragment);
        elements.championsCards.replaceChildren(cardFragment);

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

    function showChampions(button = state.championsButton, options = {}) {
        state.requestToken += 1;
        state.currentSeason = null;
        state.currentProfile = null;
        showLoading(false);
        showError();
        setActiveButton(button);
        closeMobileMenu();

        elements.pageEyebrow.textContent = 'Histórico oficial';
        elements.pageTitle.textContent = 'Hall de campeões';
        elements.pageDescription.textContent = 'A história das ligas AMBO reunida em um só lugar.';
        elements.lastUpdate.textContent = `Base cadastrada até ${Math.max(...config.champions.map(item => item.year))}`;
        showOnlyView('champions');
        renderChampions();
        updateDocumentTitle();
        if (options.updateUrl !== false) writeRoute({ view: 'champions' }, options.replace ? 'replace' : 'push');
    }

    function isLocalDevelopment() {
        return window.location.protocol === 'file:'
            || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    }

    function getSleeperPath(url) {
        if (!String(url).startsWith(DIRECT_API_BASE_URL)) return null;
        const path = String(url).slice(DIRECT_API_BASE_URL.length);
        return path.startsWith('/') ? path : `/${path}`;
    }

    function getFetchCandidates(url) {
        const sleeperPath = getSleeperPath(url);
        const useProxy = Boolean(config.api?.preferProxy !== false && sleeperPath && !isLocalDevelopment());
        if (!useProxy) return [url];
        return [`${PROXY_ENDPOINT}?path=${encodeURIComponent(sleeperPath)}`, url];
    }

    async function fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            return await fetch(url, {
                signal: controller.signal,
                headers: { accept: 'application/json' }
            });
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    async function fetchJson(url) {
        const candidates = getFetchCandidates(url);
        let lastError = null;

        for (let index = 0; index < candidates.length; index += 1) {
            const candidate = candidates[index];
            try {
                const response = await fetchWithTimeout(candidate);
                if (!response.ok) {
                    const error = new Error(`requisição retornou ${response.status}`);
                    error.status = response.status;
                    throw error;
                }
                return await response.json();
            } catch (error) {
                lastError = error?.name === 'AbortError'
                    ? new Error('tempo de resposta excedido')
                    : error;
                const hasFallback = index < candidates.length - 1;
                if (!hasFallback) break;
                console.warn('Proxy indisponível; tentando a API do Sleeper diretamente.', lastError);
            }
        }

        throw lastError || new Error('não foi possível consultar o Sleeper');
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
        if (payload.schemaVersion !== 1 || !Array.isArray(payload.leagues)) return null;

        const validationErrors = [];
        payload.leagues.forEach((leagueSnapshot, index) => {
            const result = core.validateLeagueSnapshot(leagueSnapshot);
            if (!result.valid) validationErrors.push(`Liga ${index + 1}: ${result.errors.join('; ')}`);
        });
        if (validationErrors.length) {
            console.error(`Snapshot ${year}/${seriesKey} inválido:`, validationErrors);
            return null;
        }
        return payload;
    }

    function getHistoryScopeLabel(seriesKey = state.historyFilter) {
        if (seriesKey === 'serieA') return 'Série A';
        if (seriesKey === 'serieB') return 'Série B';
        return 'Séries A + B';
    }

    async function loadHistoricalData() {
        if (state.historyDataPromise) return state.historyDataPromise;

        state.historyDataPromise = (async () => {
            const basePath = String(config.data?.snapshotsBasePath || 'data/snapshots').replace(/\/$/, '');
            const [registry, manifest] = await Promise.all([
                loadManagerRegistry(),
                fetchOptionalJson(`${basePath}/manifest.json`)
            ]);

            const manifestEntries = Array.isArray(manifest?.snapshots) ? manifest.snapshots : [];
            const payloadResults = await Promise.all(manifestEntries.map(async entry => {
                const year = Number(entry.year);
                const seriesKey = String(entry.seriesKey || '');
                if (!year || !seriesKey) return null;

                const payload = await fetchOptionalJson(`${basePath}/${year}/${seriesKey}.json`);
                if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.leagues)) return null;
                if (payload.leagues.some(league => !core.validateLeagueSnapshot(league).valid)) return null;
                return payload;
            }));

            const payloads = payloadResults.filter(Boolean);
            const entries = core.buildHistoricalEntries(payloads, registry);
            state.historyEntries = entries;
            state.historyPayloads = payloads;
            state.historyManifest = manifest || { schemaVersion: 1, generatedAt: null, snapshots: [] };
            return { registry, manifest: state.historyManifest, payloads, entries };
        })();

        try {
            return await state.historyDataPromise;
        } catch (error) {
            state.historyDataPromise = null;
            throw error;
        }
    }

    function renderHistoricalRanking() {
        const fullRanking = core.aggregateHistoricalRanking(state.historyEntries, {
            seriesKey: state.historyFilter,
            sortBy: state.historySort
        });
        const ranking = core.filterBySearch(fullRanking, state.historyQuery, ['managerName']);
        const pointsRanking = core.aggregateHistoricalRanking(state.historyEntries, {
            seriesKey: state.historyFilter,
            sortBy: 'points'
        });
        const officialEntries = state.historyEntries.filter(entry =>
            !entry.provisional && (state.historyFilter === 'all' || entry.seriesKey === state.historyFilter)
        );
        const recuts = new Set(officialEntries.map(entry => `${entry.year}:${entry.seriesKey}`));
        const provisionalRecuts = new Set(state.historyEntries
            .filter(entry => entry.provisional && (state.historyFilter === 'all' || entry.seriesKey === state.historyFilter))
            .map(entry => `${entry.year}:${entry.seriesKey}`));
        const leader = pointsRanking[0];
        const expectedRecuts = configuredYears.length * (state.historyFilter === 'all' ? Object.keys(config.series).length : 1);

        state.currentHistoryRanking = ranking;
        setStats(elements.historyStats, [
            { label: 'Managers ranqueados', value: fullRanking.length, detail: state.historyQuery ? `${ranking.length} visível(is) na busca` : getHistoryScopeLabel() },
            { label: 'Recortes oficiais', value: recuts.size, detail: `${expectedRecuts} possíveis na configuração` },
            { label: 'Líder histórico', value: leader?.managerName || '—', detail: leader ? `${leader.totalPoints} pontos acumulados` : 'Sem dados oficiais' },
            { label: 'Período coberto', value: officialEntries.length ? `${Math.min(...officialEntries.map(item => item.year))}–${Math.max(...officialEntries.map(item => item.year))}` : '—', detail: provisionalRecuts.size ? `${provisionalRecuts.size} recorte(s) provisório(s) omitido(s)` : 'Somente snapshots validados' }
        ]);

        elements.historyStatus.textContent = recuts.size
            ? `${recuts.size} recorte${recuts.size === 1 ? '' : 's'} oficial${recuts.size === 1 ? '' : 'is'}`
            : 'Sem snapshots oficiais';
        elements.historyResults.textContent = `${ranking.length} de ${fullRanking.length} manager${fullRanking.length === 1 ? '' : 's'}`;
        elements.historyEmpty.hidden = ranking.length > 0;
        elements.historyTableWrap.hidden = ranking.length === 0;

        const tableFragment = document.createDocumentFragment();
        const cardFragment = document.createDocumentFragment();
        ranking.forEach((manager, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            applyRankClass(row, rank, ranking.length);

            const avatarCell = createElement('td', 'col-avatar');
            avatarCell.appendChild(createAvatar(manager.avatar, manager.managerName));
            const managerCell = document.createElement('td');
            const managerButton = createElement('button', 'manager-link', manager.managerName);
            managerButton.type = 'button';
            managerButton.addEventListener('click', () => showManagerProfile(manager.canonicalId));
            managerCell.append(
                managerButton,
                createElement('span', 'entity-meta', `${manager.firstYear}–${manager.lastYear} · ${manager.leagueAppearances} liga${manager.leagueAppearances === 1 ? '' : 's'}`)
            );

            row.append(
                createRankCell(rank),
                avatarCell,
                managerCell,
                createElement('td', 'points-value', manager.totalPoints),
                createElement('td', '', manager.titles),
                createElement('td', '', manager.podiums),
                createElement('td', '', manager.participations),
                createElement('td', '', formatPlacement(manager.bestFinish)),
                createElement('td', '', formatPlacement(manager.averageFinish, 2))
            );
            tableFragment.appendChild(row);

            cardFragment.appendChild(createMobileRankingCard({
                rank,
                total: ranking.length,
                avatar: manager.avatar,
                name: manager.managerName,
                meta: `${manager.firstYear}–${manager.lastYear} · ${manager.leagueAppearances} ligas`,
                score: `${manager.totalPoints} pts`,
                onNameClick: () => showManagerProfile(manager.canonicalId),
                metrics: [
                    { label: 'Títulos', value: manager.titles },
                    { label: 'Pódios', value: manager.podiums },
                    { label: 'Participações', value: manager.participations },
                    { label: 'Média', value: formatPlacement(manager.averageFinish, 2) }
                ]
            }));
        });
        elements.historyBody.replaceChildren(tableFragment);
        elements.historyCards.replaceChildren(cardFragment);
    }

    async function showHistoricalRanking(button = state.historyButton, options = {}) {
        const currentRequest = ++state.requestToken;
        state.currentSeason = null;
        state.currentProfile = null;
        setActiveButton(button);
        closeMobileMenu();
        showError();
        showLoading(true);
        showOnlyView('history');

        elements.pageEyebrow.textContent = 'Central histórica';
        elements.pageTitle.textContent = 'Ranking histórico';
        elements.pageDescription.textContent = 'Pontos, títulos, pódios e médias acumulados a partir dos snapshots oficiais.';
        elements.lastUpdate.textContent = 'Carregando histórico validado...';
        updateDocumentTitle();

        try {
            const data = await loadHistoricalData();
            if (currentRequest !== state.requestToken) return;
            renderHistoricalRanking();
            const updatedAt = formatDateTime(data.manifest?.generatedAt);
            elements.lastUpdate.textContent = updatedAt ? `Snapshots · ${updatedAt}` : 'Snapshots oficiais';
            if (options.updateUrl !== false) writeRoute(currentHistoryRoute(), options.replace ? 'replace' : 'push');
        } catch (error) {
            if (currentRequest !== state.requestToken) return;
            elements.historyBody.replaceChildren();
            elements.historyCards.replaceChildren();
            elements.historyStats.replaceChildren();
            elements.historyStatus.textContent = 'Histórico indisponível';
            elements.historyEmpty.hidden = false;
            elements.historyTableWrap.hidden = true;
            elements.lastUpdate.textContent = 'Dados indisponíveis';
            showError(`Não foi possível montar o ranking histórico: ${error.message}.`);
        } finally {
            if (currentRequest === state.requestToken) showLoading(false);
        }
    }

    async function showManagerProfile(canonicalId, options = {}) {
        if (!state.historyEntries.length) await loadHistoricalData();
        const profile = core.getHistoricalProfile(state.historyEntries, canonicalId, {
            seriesKey: state.historyFilter
        });

        if (!profile) {
            showError('Não há dados históricos oficiais suficientes para abrir este perfil.');
            await showHistoricalRanking(state.historyButton, { updateUrl: false });
            writeRoute(currentHistoryRoute(), 'replace');
            return;
        }

        state.currentProfileId = canonicalId;
        state.currentProfile = profile;
        state.currentSeason = null;
        showError();
        showOnlyView('profile');
        setActiveButton(state.historyButton);
        closeMobileMenu();

        elements.pageEyebrow.textContent = 'Perfil histórico';
        elements.pageTitle.textContent = profile.managerName;
        elements.pageDescription.textContent = `Desempenho acumulado no recorte ${getHistoryScopeLabel().toLowerCase()}.`;
        elements.lastUpdate.textContent = `${profile.firstYear}–${profile.lastYear}`;
        elements.profileAvatar.replaceChildren(createAvatar(profile.avatar, profile.managerName));
        elements.profileName.textContent = profile.managerName;
        elements.profileMeta.textContent = `${profile.participations} participação${profile.participations === 1 ? '' : 'ões'} em rankings combinados · ${profile.leagueAppearances} liga${profile.leagueAppearances === 1 ? '' : 's'} disputada${profile.leagueAppearances === 1 ? '' : 's'}`;
        elements.profileScope.textContent = getHistoryScopeLabel();
        updateDocumentTitle();

        const badges = [];
        if (profile.titles) badges.push(createElement('span', 'profile-badge profile-badge--gold', `${profile.titles} título${profile.titles === 1 ? '' : 's'}`));
        if (profile.podiums) badges.push(createElement('span', 'profile-badge', `${profile.podiums} pódio${profile.podiums === 1 ? '' : 's'}`));
        if (!badges.length) badges.push(createElement('span', 'profile-badge', 'Histórico oficial'));
        elements.profileBadges.replaceChildren(...badges);

        setStats(elements.profileStats, [
            { label: 'Pontos históricos', value: profile.totalPoints, detail: `${formatNumber(profile.averagePoints, 2)} por participação` },
            { label: 'Títulos', value: profile.titles, detail: '1º no ranking combinado anual' },
            { label: 'Pódios', value: profile.podiums, detail: 'Resultados entre os três primeiros' },
            { label: 'Melhor resultado', value: formatPlacement(profile.bestFinish), detail: getHistoryScopeLabel() },
            { label: 'Média de colocação', value: formatPlacement(profile.averageFinish, 2), detail: `${profile.participations} recortes oficiais` },
            { label: 'FPTS acumulado', value: formatNumber(profile.totalFpts), detail: `${profile.leagueAppearances} participações em ligas` }
        ]);

        const tableFragment = document.createDocumentFragment();
        const cardFragment = document.createDocumentFragment();
        profile.history.forEach(entry => {
            const openSeason = () => {
                const navButton = state.navButtons.get(`${entry.year}:${entry.seriesKey}`) || null;
                loadSeason(entry.year, entry.seriesKey, navButton);
            };
            const row = document.createElement('tr');
            const yearCell = document.createElement('td');
            const seasonButton = createElement('button', 'season-link', entry.year);
            seasonButton.type = 'button';
            seasonButton.title = `Abrir ${entry.seriesLabel} de ${entry.year}`;
            seasonButton.addEventListener('click', openSeason);
            yearCell.appendChild(seasonButton);
            row.append(
                yearCell,
                createElement('td', '', entry.seriesLabel),
                createElement('td', '', formatPlacement(entry.rank)),
                createElement('td', 'points-value', entry.points),
                createElement('td', '', formatPlacement(entry.bestLeagueRank)),
                createElement('td', '', formatNumber(entry.fpts)),
                createElement('td', '', entry.leagueAppearances)
            );
            tableFragment.appendChild(row);

            cardFragment.appendChild(createMobileRankingCard({
                rank: entry.rank,
                total: Math.max(profile.history.length, 8),
                avatar: null,
                name: `${entry.year} · ${entry.seriesLabel}`,
                meta: `${entry.leagueAppearances} liga${entry.leagueAppearances === 1 ? '' : 's'} disputada${entry.leagueAppearances === 1 ? '' : 's'}`,
                score: `${entry.points} pts`,
                onNameClick: openSeason,
                metrics: [
                    { label: 'Colocação', value: formatPlacement(entry.rank) },
                    { label: 'Melhor liga', value: formatPlacement(entry.bestLeagueRank) },
                    { label: 'FPTS', value: formatNumber(entry.fpts) },
                    { label: 'Série', value: entry.seriesLabel }
                ]
            }));
        });
        elements.profileHistoryBody.replaceChildren(tableFragment);
        elements.profileCards.replaceChildren(cardFragment);
        window.scrollTo({ top: 0, behavior: options.scroll === false ? 'auto' : 'smooth' });
        if (options.updateUrl !== false) {
            writeRoute({ view: 'profile', manager: canonicalId, series: state.historyFilter }, options.replace ? 'replace' : 'push');
        }
    }

    async function resolveLeagueIds(year, seriesKey) {
        const seasonConfig = config.leagueIds[year]?.[seriesKey];
        if (Array.isArray(seasonConfig)) return seasonConfig.map(String);
        if (!seasonConfig || typeof seasonConfig !== 'object') throw new Error('não há configuração de liga para esta temporada');

        const username = String(seasonConfig.username || '').trim();
        const previousLeagueIds = Array.isArray(seasonConfig.previousLeagueIds)
            ? seasonConfig.previousLeagueIds.map(String)
            : [];
        const expectedLeagues = Number(seasonConfig.expectedLeagues || previousLeagueIds.length || 2);
        const discoveryKey = String(seasonConfig.discoveryKey || core.normalizeAlias(username));
        if (!previousLeagueIds.length) throw new Error('a descoberta automática está incompleta no config.js');

        const cacheKey = `${year}:${seriesKey}`;
        if (state.resolvedLeagueIds.has(cacheKey)) return state.resolvedLeagueIds.get(cacheKey);

        const discoveryRequest = (async () => {
            const persistedUsers = await loadDiscoveryUsers();
            let userId = String(seasonConfig.userId || persistedUsers[discoveryKey]?.userId || '').trim();
            if (!userId) {
                if (!username) throw new Error(`user_id persistente ausente para ${seriesKey}`);
                const user = await fetchJson(`${DIRECT_API_BASE_URL}/user/${encodeURIComponent(username)}`);
                userId = String(user?.user_id || '');
                if (!userId) throw new Error(`usuário ${username} não encontrado no Sleeper`);
            }

            const leagues = await fetchJson(`${DIRECT_API_BASE_URL}/user/${encodeURIComponent(userId)}/leagues/nfl/${year}`);
            if (!Array.isArray(leagues)) throw new Error(`a API não retornou as ligas do usuário ${userId} em ${year}`);
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
            return await fetchJson(`${DIRECT_API_BASE_URL}/league/${leagueId}/${bracketName}`);
        } catch (error) {
            console.warn(`Não foi possível carregar ${bracketName} da liga ${leagueId}:`, error);
            return [];
        }
    }

    async function fetchLeagueSnapshot(leagueId, index) {
        const [league, rosters, users, winnersBracket, losersBracket] = await Promise.all([
            fetchJson(`${DIRECT_API_BASE_URL}/league/${leagueId}`),
            fetchJson(`${DIRECT_API_BASE_URL}/league/${leagueId}/rosters`),
            fetchJson(`${DIRECT_API_BASE_URL}/league/${leagueId}/users`),
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

    function renderCombinedStandings(standings, totalManagers) {
        const tableFragment = document.createDocumentFragment();
        const cardFragment = document.createDocumentFragment();

        standings.forEach(standing => {
            const officialRank = standing.officialRank;
            const row = document.createElement('tr');
            applyRankClass(row, officialRank, totalManagers);
            const avatarCell = createElement('td', 'col-avatar');
            avatarCell.appendChild(createAvatar(standing.avatar, standing.managerName));
            row.append(
                createRankCell(officialRank),
                avatarCell,
                createEntityCell(standing.managerName, `${standing.appearances} participação${standing.appearances === 1 ? '' : 'ões'} na rodada`),
                createElement('td', 'points-value', standing.points),
                createElement('td', '', formatPlacement(standing.bestRank)),
                createElement('td', '', formatNumber(standing.fpts)),
                createElement('td', '', standing.appearances)
            );
            tableFragment.appendChild(row);

            cardFragment.appendChild(createMobileRankingCard({
                rank: officialRank,
                total: totalManagers,
                avatar: standing.avatar,
                name: standing.managerName,
                meta: `${standing.appearances} liga${standing.appearances === 1 ? '' : 's'} combinada${standing.appearances === 1 ? '' : 's'}`,
                score: `${standing.points} pts`,
                metrics: [
                    { label: 'Melhor posição', value: formatPlacement(standing.bestRank) },
                    { label: 'FPTS', value: formatNumber(standing.fpts) },
                    { label: 'Ligas', value: standing.appearances },
                    { label: 'Posição oficial', value: formatPlacement(officialRank) }
                ]
            }));
        });

        elements.combinedBody.replaceChildren(tableFragment);
        elements.combinedCards.replaceChildren(cardFragment);
    }

    function getLeagueRows(snapshot, query = '') {
        const rows = snapshot.standings.map(standing => {
            const roster = snapshot.rosters.find(item => item.roster_id === standing.rosterId);
            const user = getUserForRoster(roster, snapshot.users);
            const wins = Number(roster?.settings?.wins || 0);
            const losses = Number(roster?.settings?.losses || 0);
            const ties = Number(roster?.settings?.ties || 0);
            return {
                standing,
                roster,
                user,
                managerName: getManagerName(user, roster),
                teamName: getTeamName(user, roster),
                campaign: ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`,
                fpts: getRosterPoints(roster)
            };
        });
        return core.filterBySearch(rows, query, ['managerName', 'teamName']);
    }

    function renderLeaguePanel(snapshot, query = '') {
        const panel = elements.leaguePanelTemplate.content.firstElementChild.cloneNode(true);
        panel.querySelector('.league-number').textContent = `Liga ${snapshot.index + 1}`;
        panel.querySelector('.league-name').textContent = snapshot.league.name || `Liga ${snapshot.index + 1}`;
        panel.querySelector('.league-season').textContent = snapshot.usedFallback ? 'Classificação parcial' : `Temporada ${snapshot.league.season}`;

        const body = panel.querySelector('tbody');
        const cards = panel.querySelector('.league-mobile-cards');
        const tableFragment = document.createDocumentFragment();
        const cardFragment = document.createDocumentFragment();
        const rows = getLeagueRows(snapshot, query);

        rows.forEach(item => {
            const { standing, roster, user, managerName, teamName, campaign, fpts } = item;
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
                createElement('td', '', formatNumber(fpts))
            );
            tableFragment.appendChild(row);

            cardFragment.appendChild(createMobileRankingCard({
                rank: standing.rank,
                total: snapshot.standings.length,
                avatar: user?.avatar,
                name: teamName,
                meta: managerName,
                score: `${standing.points} pts`,
                metrics: [
                    { label: 'Campanha', value: campaign },
                    { label: 'FPTS', value: formatNumber(fpts) },
                    { label: 'Colocação', value: formatPlacement(standing.rank) },
                    { label: 'Fonte', value: standing.source === 'playoff-bracket' ? 'Playoffs' : 'Temporada regular' }
                ]
            }));
        });

        if (!rows.length) {
            const empty = createElement('div', 'empty-state');
            empty.append(createElement('strong', '', 'Nenhum resultado nesta liga'), createElement('span', '', 'Limpe a busca para ver todos os participantes.'));
            cardFragment.appendChild(empty);
        }

        body.replaceChildren(tableFragment);
        cards.replaceChildren(cardFragment);
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

    function renderSeasonRanking() {
        if (!state.currentSeason) return;
        const fullCombined = state.currentSeason.combined;
        const searched = core.filterBySearch(fullCombined, state.seasonQuery, ['managerName']);
        const visible = core.sortSeasonRanking(searched, state.seasonSort);
        state.currentSeason.visibleCombined = visible;

        renderCombinedStandings(visible, fullCombined.length);
        elements.leaguePanels.replaceChildren(...state.currentSeason.snapshots.map(snapshot => renderLeaguePanel(snapshot, state.seasonQuery)));
        elements.seasonResults.textContent = `${visible.length} de ${fullCombined.length} manager${fullCombined.length === 1 ? '' : 's'}`;
        elements.seasonEmpty.hidden = visible.length > 0;
        elements.combinedTableWrap.hidden = visible.length === 0;
    }

    async function loadSeason(year, seriesKey, button, options = {}) {
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
        state.currentProfile = null;

        elements.pageEyebrow.textContent = `Temporada ${year}`;
        elements.pageTitle.textContent = `AMBO ${seriesLabel}`;
        elements.pageDescription.textContent = 'Ranking combinado das duas ligas, com busca, ordenação, classificação final e pontuação acumulada.';
        elements.lastUpdate.textContent = 'Carregando dados validados...';
        showOnlyView('season');
        updateDocumentTitle();

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
                if (!validation.valid) throw new Error(`Liga ${index + 1} inválida: ${validation.errors.join('; ')}`);
            });
            if (currentRequest !== state.requestToken) return;

            const combined = calculateCombinedStandings(snapshots, registry)
                .map((standing, index) => ({ ...standing, officialRank: index + 1 }));
            state.currentSeason = {
                year: Number(year),
                seriesKey,
                seriesLabel,
                snapshots,
                combined,
                visibleCombined: combined,
                sourceLabel,
                updatedAt
            };
            renderSeasonStats(year, seriesLabel, snapshots, combined);
            renderSeasonRanking();
            const formattedDate = formatDateTime(updatedAt);
            elements.lastUpdate.textContent = formattedDate ? `${sourceLabel} · ${formattedDate}` : sourceLabel;
            if (options.updateUrl !== false) writeRoute(currentSeasonRoute(), options.replace ? 'replace' : 'push');
        } catch (error) {
            if (currentRequest !== state.requestToken) return;
            console.error(error);
            state.currentSeason = null;
            elements.combinedBody.replaceChildren();
            elements.combinedCards.replaceChildren();
            elements.leaguePanels.replaceChildren();
            elements.seasonStats.replaceChildren();
            elements.rankingStatus.textContent = 'Falha de validação';
            elements.lastUpdate.textContent = 'Dados indisponíveis';
            showError(`Não foi possível carregar as ligas: ${error.message}.`);
        } finally {
            if (currentRequest === state.requestToken) showLoading(false);
        }
    }

    function sanitizeFileName(value) {
        return String(value || 'ambo')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }

    function getCurrentCsv() {
        if (state.currentView === 'champions') {
            return {
                filename: 'ambo-campeoes.csv',
                csv: core.rowsToCsv([
                    { key: 'year', label: 'Ano' },
                    { key: 'keeper', label: 'AMBO Keeper' },
                    { key: 'serieA', label: 'AMBO Série A' },
                    { key: 'serieB', label: 'AMBO Série B' }
                ], config.champions.slice().sort((a, b) => b.year - a.year))
            };
        }
        if (state.currentView === 'history') {
            return {
                filename: `ambo-ranking-historico-${sanitizeFileName(getHistoryScopeLabel())}.csv`,
                csv: core.rowsToCsv([
                    { label: 'Posição', value: (_, index) => index + 1 },
                    { key: 'managerName', label: 'Manager' },
                    { key: 'totalPoints', label: 'Pontos' },
                    { key: 'titles', label: 'Títulos' },
                    { key: 'podiums', label: 'Pódios' },
                    { key: 'participations', label: 'Participações' },
                    { key: 'bestFinish', label: 'Melhor posição' },
                    { label: 'Média', value: row => formatNumber(row.averageFinish, 2) },
                    { label: 'FPTS', value: row => formatNumber(row.totalFpts) }
                ], state.currentHistoryRanking.map((row, index) => ({ ...row, __index: index })))
            };
        }
        if (state.currentView === 'profile' && state.currentProfile) {
            return {
                filename: `ambo-perfil-${sanitizeFileName(state.currentProfile.managerName)}.csv`,
                csv: core.rowsToCsv([
                    { key: 'year', label: 'Ano' },
                    { key: 'seriesLabel', label: 'Série' },
                    { key: 'rank', label: 'Posição' },
                    { key: 'points', label: 'Pontos' },
                    { key: 'bestLeagueRank', label: 'Melhor liga' },
                    { label: 'FPTS', value: row => formatNumber(row.fpts) },
                    { key: 'leagueAppearances', label: 'Ligas' }
                ], state.currentProfile.history)
            };
        }
        if (state.currentView === 'season' && state.currentSeason) {
            return {
                filename: `ambo-${state.currentSeason.year}-${state.currentSeason.seriesKey}.csv`,
                csv: core.rowsToCsv([
                    { key: 'officialRank', label: 'Posição oficial' },
                    { key: 'managerName', label: 'Manager' },
                    { key: 'points', label: 'Pontos' },
                    { key: 'bestRank', label: 'Melhor posição' },
                    { label: 'FPTS', value: row => formatNumber(row.fpts) },
                    { key: 'appearances', label: 'Ligas' }
                ], state.currentSeason.visibleCombined)
            };
        }
        return null;
    }

    function downloadCsv() {
        const payload = getCurrentCsv();
        if (!payload) {
            showFeedback('Não há dados disponíveis para exportar.');
            return;
        }
        const blob = new Blob([`\uFEFF${payload.csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = payload.filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showFeedback('Arquivo CSV gerado.');
    }

    async function copyText(text) {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    async function copyCurrentLink() {
        try {
            await copyText(window.location.href);
            showFeedback('Link desta página copiado.');
        } catch (error) {
            console.error(error);
            showFeedback('Não foi possível copiar o link.');
        }
    }

    async function shareCurrentPage() {
        const shareData = {
            title: document.title,
            text: elements.pageDescription.textContent,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }
            await copyText(shareData.url);
            showFeedback('Compartilhamento indisponível; o link foi copiado.');
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.error(error);
                showFeedback('Não foi possível compartilhar agora.');
            }
        }
    }

    async function applyRoute(route, options = {}) {
        if (route.view === 'history' || route.view === 'profile') {
            state.historyFilter = route.series || 'all';
            state.historySort = route.view === 'history' ? (route.sort || 'points') : state.historySort;
            state.historyQuery = route.view === 'history' ? (route.query || '') : state.historyQuery;
        }
        elements.historySeriesFilter.value = state.historyFilter;
        elements.historySort.value = state.historySort;
        elements.historySearch.value = state.historyQuery;

        if (route.view === 'history') {
            await showHistoricalRanking(state.historyButton, { updateUrl: false });
        } else if (route.view === 'profile') {
            await loadHistoricalData();
            await showManagerProfile(route.manager, { updateUrl: false, scroll: false });
        } else if (route.view === 'season') {
            state.seasonSort = route.sort || 'points';
            state.seasonQuery = route.query || '';
            elements.seasonSort.value = state.seasonSort;
            elements.seasonSearch.value = state.seasonQuery;
            const button = state.navButtons.get(`${route.year}:${route.series}`) || null;
            await loadSeason(route.year, route.series, button, { updateUrl: false });
        } else {
            showChampions(state.championsButton, { updateUrl: false });
        }

        if (options.replace) {
            const normalizedRoute = route.view === 'season'
                ? currentSeasonRoute()
                : route.view === 'history'
                    ? currentHistoryRoute()
                    : route.view === 'profile'
                        ? { view: 'profile', manager: route.manager, series: state.historyFilter }
                        : { view: 'champions' };
            writeRoute(normalizedRoute, 'replace');
        }
    }

    function updateNetworkStatus() {
        const online = navigator.onLine;
        if (elements.networkStatus) {
            elements.networkStatus.textContent = online
                ? (isLocalDevelopment() ? 'API direta em modo local' : 'Dados com cache Vercel')
                : 'Modo offline · snapshots em cache';
        }
        if (elements.networkDot) {
            elements.networkDot.classList.toggle('is-online', online);
            elements.networkDot.classList.toggle('is-offline', !online);
        }
    }

    async function installPwa() {
        const promptEvent = state.deferredInstallPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        await promptEvent.userChoice;
        state.deferredInstallPrompt = null;
        elements.installApp.hidden = true;
    }

    async function registerServiceWorker() {
        if (config.pwa?.enabled === false || !('serviceWorker' in navigator)) return;
        if (!['http:', 'https:'].includes(window.location.protocol)) return;

        try {
            const registration = await navigator.serviceWorker.register(
                config.pwa?.serviceWorkerPath || '/sw.js',
                { scope: '/' }
            );
            state.serviceWorkerRegistration = registration;

            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showFeedback('Nova versão disponível. Atualize a página para aplicar.');
                    }
                });
            });
        } catch (error) {
            console.warn('Não foi possível registrar o modo instalável:', error);
        }
    }

    function initializeProductionFeatures() {
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        window.addEventListener('beforeinstallprompt', event => {
            event.preventDefault();
            state.deferredInstallPrompt = event;
            elements.installApp.hidden = false;
        });
        window.addEventListener('appinstalled', () => {
            state.deferredInstallPrompt = null;
            elements.installApp.hidden = true;
            showFeedback('AMBO instalada neste dispositivo.');
        });
        registerServiceWorker();
    }

    elements.historySeriesFilter.addEventListener('change', event => {
        state.historyFilter = event.target.value;
        renderHistoricalRanking();
        writeRoute(currentHistoryRoute(), 'replace');
    });
    elements.historySort.addEventListener('change', event => {
        state.historySort = event.target.value;
        renderHistoricalRanking();
        writeRoute(currentHistoryRoute(), 'replace');
    });
    elements.historySearch.addEventListener('input', event => {
        state.historyQuery = event.target.value;
        window.clearTimeout(state.historySearchTimer);
        state.historySearchTimer = window.setTimeout(() => {
            renderHistoricalRanking();
            writeRoute(currentHistoryRoute(), 'replace');
        }, SEARCH_DEBOUNCE_MS);
    });
    elements.seasonSort.addEventListener('change', event => {
        state.seasonSort = event.target.value;
        renderSeasonRanking();
        if (state.currentSeason) writeRoute(currentSeasonRoute(), 'replace');
    });
    elements.seasonSearch.addEventListener('input', event => {
        state.seasonQuery = event.target.value;
        window.clearTimeout(state.seasonSearchTimer);
        state.seasonSearchTimer = window.setTimeout(() => {
            renderSeasonRanking();
            if (state.currentSeason) writeRoute(currentSeasonRoute(), 'replace');
        }, SEARCH_DEBOUNCE_MS);
    });
    elements.profileBack.addEventListener('click', () => showHistoricalRanking(state.historyButton));
    elements.copyLink.addEventListener('click', copyCurrentLink);
    elements.sharePage.addEventListener('click', shareCurrentPage);
    elements.exportCsv.addEventListener('click', downloadCsv);
    elements.installApp.addEventListener('click', installPwa);
    elements.mobileMenuButton.addEventListener('click', toggleMobileMenu);
    elements.menuBackdrop.addEventListener('click', closeMobileMenu);

    function handleRouteError(error) {
        console.error(error);
        showLoading(false);
        showError(`Não foi possível abrir este endereço: ${error.message}.`);
    }

    window.addEventListener('popstate', () => {
        const route = core.parseRoute(window.location.search, { years: configuredYears });
        applyRoute(route, { replace: false }).catch(handleRouteError);
    });
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMobileMenu();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 820) closeMobileMenu();
    });

    initializeProductionFeatures();
    renderNavigation();
    const initialRoute = core.parseRoute(window.location.search, { years: configuredYears });
    applyRoute(initialRoute, { replace: true }).catch(handleRouteError);
})();
