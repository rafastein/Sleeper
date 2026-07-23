/**
 * Dados editáveis do projeto AMBO.
 * Para cadastrar uma nova temporada, adicione o ano em LEAGUE_IDS.
 * Cada série precisa conter os dois IDs das ligas que formam o ranking combinado.
 */
window.AMBO_CONFIG = Object.freeze({
    leagueIds: {
        2024: {
            serieA: ['1051278540760530944', '1051278597819854848'],
            serieB: ['1126717143111917568', '1126717395566989312']
        },
        2023: {
            serieA: ['989658378832011264', '989658509971116032'],
            serieB: ['989661009860243456', '989661264643211264']
        },
        2022: {
            serieA: ['786638128248139776', '786638212645892096'],
            serieB: ['786646187062198272', '786646606844981248']
        },
        2021: {
            serieA: ['651842956122185728', '651842832386056192'],
            serieB: ['711300543254953984', '711301089126866944']
        },
        2020: {
            serieA: ['593817346833960960', '593818329571971072'],
            serieB: ['593834118790291456', '593830974849073152']
        }
    },

    series: {
        serieA: 'Série A',
        serieB: 'Série B'
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
