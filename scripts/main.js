// IDs das ligas (substitua pelos IDs reais das suas ligas)
const LEAGUE_ID_LEFT_1 = '1051278540760530944';
const LEAGUE_ID_LEFT_2 = '1051278597819854848';
const LEAGUE_ID_RIGHT_1 = '1126717395566989312';
const LEAGUE_ID_RIGHT_2 = '1126717143111917568';

// URLs da API do Sleeper
const API_BASE_URL = 'https://api.sleeper.app/v1';
const ROSTERS_URL = (leagueId) => `${API_BASE_URL}/league/${leagueId}/rosters`;
const USERS_URL = (leagueId) => `${API_BASE_URL}/league/${leagueId}/users`;

// Função para buscar dados da API
async function fetchData(url) {
    try {
        const response = await fetch(url);
        return response.json();
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return [];
    }
}

// Função para calcular pontos com base na posição
function getPointsByPosition(position) {
    if (typeof position !== 'number' || isNaN(position) || position < 1 || position > 12) {
        console.warn('Posição inválida:', position);
        return 0;
    }
    return 13 - position;
}

// Função para calcular o ranking geral
async function calculateRanking(leagueId1, leagueId2) {
    const [rosters1, users1, rosters2, users2] = await Promise.all([
        fetchData(ROSTERS_URL(leagueId1)),
        fetchData(USERS_URL(leagueId1)),
        fetchData(ROSTERS_URL(leagueId2)),
        fetchData(USERS_URL(leagueId2)),
    ]);

    if (!rosters1.length || !rosters2.length || !users1.length || !users2.length) {
        console.error('Dados incompletos das ligas. Verifique os IDs das ligas.');
        return [];
    }

    const userMap = new Map();
    [...users1, ...users2].forEach((user) => {
        if (!userMap.has(user.user_id)) {
            userMap.set(user.user_id, user);
        }
    });

    const ranking = new Map();

    const processRosters = (rosters, leagueId) => {
        rosters.sort((a, b) => {
            if (b.settings.wins !== a.settings.wins) {
                return b.settings.wins - a.settings.wins;
            }
            return b.settings.fpts - a.settings.fpts;
        });

        rosters.forEach((roster, index) => {
            const userId = roster.owner_id;
            const position = index + 1;
            const points = getPointsByPosition(position);
            const pf = parseFloat(roster.settings.fpts) || 0;

            if (!ranking.has(userId)) {
                ranking.set(userId, { totalPoints: 0, totalPF: 0, bestRank: 13 });
            }
            ranking.get(userId).totalPoints += points;
            ranking.get(userId).totalPF += pf;
            ranking.get(userId).bestRank = Math.min(ranking.get(userId).bestRank, position);
        });
    };

    processRosters(rosters1, leagueId1);
    processRosters(rosters2, leagueId2);

    const rankingList = Array.from(ranking.entries()).map(([userId, data]) => {
        const user = userMap.get(userId);
        return {
            userId,
            displayName: user.display_name,
            avatar: user.avatar ? `https://sleepercdn.com/avatars/${user.avatar}` : 'https://via.placeholder.com/40',
            totalPoints: data.totalPoints,
            totalPF: data.totalPF,
            bestRank: data.bestRank,
        };
    });

    rankingList.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
        }
        if (a.bestRank !== b.bestRank) {
            return a.bestRank - b.bestRank;
        }
        return b.totalPF - a.totalPF;
    });

    return rankingList;
}

// Função para exibir o ranking em uma tabela
async function displayRanking(tableId, leagueId1, leagueId2) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const tableBody = document.querySelector(`#${tableId} tbody`);

    loadingIndicator.classList.remove('hidden');
    tableBody.innerHTML = '';

    try {
        const ranking = await calculateRanking(leagueId1, leagueId2);

        if (!ranking.length) {
            console.error('Nenhum dado de ranking disponível para exibir.');
            tableBody.innerHTML = '<tr><td colspan="5">Nenhum dado disponível.</td></tr>';
            return;
        }

        ranking.forEach((user, index) => {
            const row = document.createElement('tr');

            if (index === 0 || index === 1) {
                row.classList.add('top-two');
            } else if (index === ranking.length - 2 || index === ranking.length - 1) {
                row.classList.add('bottom-two');
            }

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><img src="${user.avatar}" alt="${user.displayName}" class="avatar"></td>
                <td>${user.displayName}</td>
                <td>${user.totalPoints}</td>
                <td>${user.totalPF}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao exibir o ranking:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar os dados.</td></tr>';
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// Função para alternar entre as visualizações
function toggleView(view) {
    const tablesContainer = document.getElementById('tables-container');
    const campeoesContainer = document.getElementById('campeoes-container');
    const btnRanking = document.getElementById('btn-ranking');
    const btnCampeoes = document.getElementById('btn-campeoes');

    if (view === 'ranking') {
        tablesContainer.style.display = 'flex';
        campeoesContainer.classList.remove('visible');
        btnRanking.classList.add('active');
        btnCampeoes.classList.remove('active');
    } else if (view === 'campeoes') {
        tablesContainer.style.display = 'none';
        campeoesContainer.classList.add('visible');
        btnRanking.classList.remove('active');
        btnCampeoes.classList.add('active');
    }
}

// Adicionar eventos aos botões
document.getElementById('btn-ranking').addEventListener('click', () => {
    toggleView('ranking');
});

document.getElementById('btn-campeoes').addEventListener('click', () => {
    toggleView('campeoes');
});

// Exibir o ranking por padrão
toggleView('ranking');

// Executar as funções para exibir as tabelas
displayRanking('ranking-table-left', LEAGUE_ID_LEFT_1, LEAGUE_ID_LEFT_2);
displayRanking('ranking-table-right', LEAGUE_ID_RIGHT_1, LEAGUE_ID_RIGHT_2);