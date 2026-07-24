/**
 * Configuração central do projeto AMBO.
 * Este arquivo funciona no navegador e também nos scripts Node usados para
 * sincronizar e validar snapshots.
 */
const KEEPER_DISCOVERY = Object.freeze({
    discoveryKey: 'keeperSeed',
    username: 'rafastein',
    nameIncludes: ['keeper'],
    expectedLeagues: 1
});

function keeperDiscovery() {
    return { ...KEEPER_DISCOVERY };
}

const AMBO_CONFIG = Object.freeze({
    leagueIds: {
        2025: {
            keeper: keeperDiscovery(),
            serieA: {
                discoveryKey: 'serieASeed',
                username: 'Jptavares',
                previousLeagueIds: ['1051278540760530944', '1051278597819854848'],
                expectedLeagues: 2
            },
            serieB: {
                discoveryKey: 'serieBSeed',
                username: 'rafastein',
                previousLeagueIds: ['1126717143111917568', '1126717395566989312'],
                expectedLeagues: 2
            }
        },
        2024: {
            keeper: keeperDiscovery(),
            serieA: ['1051278540760530944', '1051278597819854848'],
            serieB: ['1126717143111917568', '1126717395566989312']
        },
        2023: {
            keeper: keeperDiscovery(),
            serieA: ['989658378832011264', '989658509971116032'],
            serieB: ['989661009860243456', '989661264643211264']
        },
        2022: {
            keeper: keeperDiscovery(),
            serieA: ['786638128248139776', '786638212645892096'],
            serieB: ['786646187062198272', '786646606844981248']
        },
        2021: {
            keeper: keeperDiscovery(),
            serieA: ['651842956122185728', '651842832386056192'],
            serieB: ['711300543254953984', '711301089126866944']
        },
        2020: {
            keeper: keeperDiscovery(),
            serieA: ['593817346833960960', '593818329571971072'],
            serieB: ['593834118790291456', '593830974849073152']
        }
    },

    series: {
        keeper: 'Keeper',
        serieA: 'Série A',
        serieB: 'Série B'
    },

    data: {
        managerRegistryPath: 'data/managers.json',
        discoveryUsersPath: 'data/discovery-users.json',
        snapshotsBasePath: 'data/snapshots',
        preferSnapshots: true,
        snapshotYears: [2020, 2021, 2022, 2023, 2024, 2025]
    },

    api: {
        directBaseUrl: 'https://api.sleeper.app/v1',
        proxyEndpoint: '/api/sleeper',
        preferProxy: true,
        timeoutMs: 15000
    },

    pwa: {
        enabled: true,
        serviceWorkerPath: '/sw.js'
    },

    monitoring: {
        vercelAnalytics: true,
        speedInsights: true
    },

    champions: [
        { year: 2024, keeper: 'Jptavares', serieA: 'dedebenjor', serieB: 'Jptavares' },
        { year: 2023, keeper: 'GuiZilse', serieA: 'L_Bezerra', serieB: 'Jotaa' },
        { year: 2022, keeper: 'rafastein', serieA: 'SCPATRIOTS', serieB: 'DanHen' },
        { year: 2021, keeper: 'CanelaShow', serieA: 'SCPATRIOTS', serieB: 'dedebenjor' },
        { year: 2020, keeper: 'RobertoJr', serieA: 'rdfseabra', serieB: 'fabiofirmo' },
        { year: 2019, keeper: 'Jotaa', serieA: 'SCPATRIOTS', serieB: 'Miranda12s' },
        { year: 2018, keeper: 'L_Bezerra', serieA: 'rafastein', serieB: null },
        { year: 2017, keeper: null, serieA: 'DanHen', serieB: null }
    ]
});

if (typeof window !== 'undefined') {
    window.AMBO_CONFIG = AMBO_CONFIG;
}

if (typeof module === 'object' && module.exports) {
    module.exports = AMBO_CONFIG;
}
