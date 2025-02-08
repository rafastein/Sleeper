document.addEventListener('DOMContentLoaded', function () {
    // Constantes
    const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';
    const LOADING_ELEMENT_ID = 'loading';
    const ERROR_MESSAGE_ELEMENT_ID = 'error-message';
    const SIDEBAR_BUTTON_SELECTOR = '#sidebar button'; // Removido hamburger
    const CAMPEOES_CONTAINER_ID = 'campeoes-container';
    const TABLES_CONTAINER_ID = 'tables-container';
    const COMBINED_TABLE_CONTAINER_ID = 'combined-table-container';
    const RANKING_CONTAINER_LEFT_ID = 'ranking-container-left';
    const RANKING_CONTAINER_RIGHT_ID = 'ranking-container-right';
    const COMBINED_TABLE_ID = 'combinedTable';
    // Removidos hamburger
    const SIDEBAR_ID = 'sidebar';

    // Variáveis globais
    // Removidos hamburger
    

    // Funções para mostrar e ocultar o indicador de carregamento
    function showLoading() {
        document.getElementById(LOADING_ELEMENT_ID).classList.remove('hidden');
    }

    function hideLoading() {
        document.getElementById(LOADING_ELEMENT_ID).classList.add('hidden');
    }

    // Função para exibir mensagens de erro
    function displayError(message) {
        console.error(message);
        const errorElement = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    // IDs das ligas organizados por ano e liga
    const leagueIds = {
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
    };

    const leagueData = []; // Armazena os dados das ligas

    // Função genérica para configurar os botões das ligas
    function setupLeagueButton(buttonId, leagueIds) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', function () {
                setActiveButton(this);
                showLeagueTables();
                loadLeagueData(leagueIds);
            });
        } else {
            console.warn(`Botão com ID "${buttonId}" não encontrado.`);
        }
    }

    // Configuração dos botões da sidebar
    for (const year in leagueIds) {
        for (const serie in leagueIds[year]) {
            const buttonId = `btn${serie.charAt(0).toUpperCase() + serie.slice(1)}${year}`;
            setupLeagueButton(buttonId, leagueIds[year][serie]);
        }
    }

    // Função para definir o botão ativo
    function setActiveButton(button) {
        const buttons = document.querySelectorAll(SIDEBAR_BUTTON_SELECTOR);
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    // Função para mostrar as tabelas das ligas
    function showLeagueTables() {
        document.getElementById(CAMPEOES_CONTAINER_ID).classList.add('hidden');
        document.getElementById(TABLES_CONTAINER_ID).classList.add('active');
        document.getElementById(COMBINED_TABLE_CONTAINER_ID).classList.remove('hidden');
        document.getElementById(RANKING_CONTAINER_LEFT_ID).classList.remove('hidden');
        document.getElementById(RANKING_CONTAINER_RIGHT_ID).classList.remove('hidden');
    }

    // Função para mostrar a tabela de campeões
    function showCampeoesTable() {
        document.getElementById(TABLES_CONTAINER_ID).classList.remove('active');
        document.getElementById(COMBINED_TABLE_CONTAINER_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_LEFT_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_RIGHT_ID).classList.add('hidden');
        document.getElementById(CAMPEOES_CONTAINER_ID).classList.remove('hidden');
    }

    // Função para adicionar classes às linhas da tabela de ranking combinado
    function addRankingClasses() {
        const table = document.getElementById(COMBINED_TABLE_ID);
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            rows[i].classList.remove('first-place', 'second-place', 'third-place', 'bottom-three');

            if (i === 1) {
                rows[i].classList.add('first-place');
            } else if (i === 2) {
                rows[i].classList.add('second-place');
            } else if (i === 3) {
                rows[i].classList.add('third-place');
            } else if (i >= 10 && i <= 12) {
                rows[i].classList.add('bottom-three');
            }
        }
    }

    // Função para buscar dados da liga na API do Sleeper
    async function fetchLeagueData(leagueId, leagueNumber) {
        try {
            console.log(`Fetching league data for league ID: ${leagueId}, league number: ${leagueNumber}`);

            const cacheKey = `leagueData-${leagueId}`;
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData) {
                console.log(`Using cached data for league ID: ${leagueId}`);
                const data = JSON.parse(cachedData);
                console.log(`Cached data:`, data);
                const leagueName = data.leagueName;
                console.log(`League name from cache: ${leagueName}`);
                setTimeout(() => {
                    if (leagueNumber === 1) {
                        const leftHeading = document.getElementById(RANKING_CONTAINER_LEFT_ID).querySelector("h2");
                        console.log(`Left heading element:`, leftHeading);
                        leftHeading.textContent = leagueName;
                    } else if (leagueNumber === 2) {
                        const rightHeading = document.getElementById(RANKING_CONTAINER_RIGHT_ID).querySelector("h2");
                        console.log(`Right heading element:`, rightHeading);
                        rightHeading.textContent = leagueName;
                    }
                }, 100);
                return data;
            }

            const [leagueResponse, rostersResponse, usersResponse, winnersBracketResponse, losersBracketResponse] = await Promise.all([
                fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}`),
                fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/rosters`),
                fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/users`),
                fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/winners_bracket`),
                fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/losers_bracket`)
            ]);

            if (!leagueResponse.ok || !rostersResponse.ok || !usersResponse.ok || !winnersBracketResponse.ok || !losersBracketResponse.ok) {
                throw new Error("Erro ao buscar dados da liga");
            }

            const [leagueData, rostersData, usersData, winnersBracketData, losersBracketData] = await Promise.all([
                leagueResponse.json(),
                rostersResponse.json(),
                usersResponse.json(),
                winnersBracketResponse.json(),
                losersBracketResponse.json()
            ]);

            console.log(`League data received:`, leagueData);

            // Atualiza o nome da liga
            const leagueName = leagueData.name;
            console.log(`League name: ${leagueName}`);
            setTimeout(() => {
                if (leagueNumber === 1) {
                    const leftHeading = document.getElementById(RANKING_CONTAINER_LEFT_ID).querySelector("h2");
                    console.log(`Left heading element:`, leftHeading);
                    leftHeading.textContent = leagueName;
                } else if (leagueNumber === 2) {
                    const rightHeading = document.getElementById(RANKING_CONTAINER_RIGHT_ID).querySelector("h2");
                    console.log(`Right heading element:`, rightHeading);
                    rightHeading.textContent = leagueName;
                }
            }, 100);


            const standings = calculateStandings(winnersBracketData, losersBracketData, rostersData);
            displayStandings(standings, rostersData, usersData, leagueNumber);

            const data = {
                standings,
                rostersData,
                usersData,
                leagueName  // Adicionado: salvar leagueName no objeto data
            };

            localStorage.setItem(cacheKey, JSON.stringify(data));
            return data;
        } catch (error) {
            displayError(`Erro ao processar dados da liga (League ID: ${leagueId}): ${error.message}`);
            return null;
        }
    }

    // Função para carregar os dados das ligas
    async function loadLeagueData(leagueIds) {
        leagueData.length = 0;
        showLoading();

        try {
            const data = await Promise.all(leagueIds.map((leagueId, index) => fetchLeagueData(leagueId, index + 1)));
            const validData = data.filter(item => item !== null);

            if (validData.length === leagueIds.length) {
                leagueData.push(...validData);
                const combinedStandings = calculateCombinedStandings(leagueData);
                displayCombinedStandings(combinedStandings);
                addRankingClasses();
            } else {
                displayError("Nem todos os dados da liga foram carregados corretamente.");
            }
        } catch (error) {
            displayError(`Erro ao carregar dados das ligas: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    // Função para calcular os standings com base nos brackets
    function calculateStandings(winnersBracket, losersBracket, rosters) {
        const standings = [];

        const processBracket = (bracket, round) => {
            return bracket.filter(match => match.r === round).map(match => ({
                winner: bracket.find(m => m.m === match.m)?.w || null,
                loser: bracket.find(m => m.m === match.m)?.l || null
            }));
        };

        const winnersRounds = [1, 2, 3].map(round => processBracket(winnersBracket, round));
        const losersRounds = [1, 2, 3].map(round => processBracket(losersBracket, round));

        standings.push(
            { rank: 1, rosterId: winnersRounds[2][0].winner },
            { rank: 2, rosterId: winnersRounds[2][0].loser },
            { rank: 3, rosterId: winnersRounds[2][1].winner },
            { rank: 4, rosterId: winnersRounds[2][1].loser },
            { rank: 5, rosterId: winnersRounds[1][2].winner },
            { rank: 6, rosterId: winnersRounds[1][2].loser },
            { rank: 7, rosterId: losersRounds[2][0].winner },
            { rank: 8, rosterId: losersRounds[2][0].loser },
            { rank: 9, rosterId: losersRounds[2][1].winner },
            { rank: 10, rosterId: losersRounds[2][1].loser },
            { rank: 11, rosterId: losersRounds[1][2].winner },
            { rank: 12, rosterId: losersRounds[1][2].loser }
        );

        return standings.map(standing => {
            const roster = rosters.find(r => r.roster_id === standing.rosterId);
            return {
                rank: standing.rank,
                rosterId: standing.rosterId,
                teamName: roster?.settings.team_name || 'Sem Nome',
                avatar: roster?.avatar || null,
                points: 13 - standing.rank
            };
        });
    }

    // Função para exibir os standings nas tabelas
    function displayStandings(standings, rosters, users, leagueNumber) {
        const tableBody = document.querySelector(`#table${leagueNumber} tbody`);
        if (!tableBody) {
            console.error(`Elemento table${leagueNumber} tbody não encontrado.`);
            return;
        }

        tableBody.innerHTML = '';

        standings.forEach(standing => {
            const roster = rosters.find(r => r.roster_id === standing.rosterId);
            const user = users.find(u => u.user_id === roster?.owner_id);

            if (!roster || !user) {
                console.warn(`Roster ou usuário não encontrado para o ID: ${standing.rosterId}`);
                return;
            }

            const row = document.createElement('tr');

            const rankCell = document.createElement('td');
            rankCell.textContent = standing.rank;
            row.appendChild(rankCell);

            const avatarCell = document.createElement('td');
            if (user?.avatar) {
                const avatarImg = document.createElement('img');
                avatarImg.src = `https://sleepercdn.com/avatars/${user.avatar}`;
                avatarImg.alt = user.display_name || user.username || 'Sem Nome';
                avatarImg.classList.add('avatar');
                avatarCell.appendChild(avatarImg);
            }
            row.appendChild(avatarCell);

            const teamNameCell = document.createElement('td');
            teamNameCell.textContent = user.display_name || user.username || 'Sem Nome';
            row.appendChild(teamNameCell);

            const standingsCell = document.createElement('td');
            standingsCell.textContent = `${roster.settings.wins}-${roster.settings.losses}`;
            row.appendChild(standingsCell);

            const pointsCell = document.createElement('td');
            pointsCell.textContent = standing.points;
            row.appendChild(pointsCell);

            tableBody.appendChild(row);
        });
    }

    // Função para calcular o ranking combinado
    function calculateCombinedStandings(leagueData) {
        const combinedStandings = {};

        leagueData.forEach(({ standings, rostersData, usersData }) => {
            standings.forEach(standing => {
                const roster = rostersData.find(r => r.roster_id === standing.rosterId);
                const user = usersData.find(u => u.user_id === roster?.owner_id);
                const userId = roster?.owner_id;

                if (!combinedStandings[userId]) {
                    combinedStandings[userId] = {
                        avatar: user?.avatar,
                        teamName: user?.display_name || user?.username || 'Sem Nome',
                        points: 0,
                        bestRank: standing.rank,
                        fpts: 0
                    };
                }

                combinedStandings[userId].points += standing.points;
                combinedStandings[userId].bestRank = Math.min(combinedStandings[userId].bestRank, standing.rank);
                combinedStandings[userId].fpts += roster?.settings.fpts || 0;
            });
        });

        return Object.values(combinedStandings).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
            return b.fpts - a.fpts;
        });
    }

    // Função para exibir o ranking combinado
    function displayCombinedStandings(combinedStandings) {
        const table = document.getElementById(COMBINED_TABLE_ID)?.getElementsByTagName('tbody')[0];
        if (!table) {
            console.error('Elemento combinedTable tbody não encontrado.');
            return;
        }

        table.innerHTML = '';

        combinedStandings.forEach((standing, index) => {
            const row = table.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().innerHTML = standing.avatar ?
                `<img src="https://sleepercdn.com/avatars/${standing.avatar}" alt="${standing.teamName}" class="avatar">` :
                '';
            row.insertCell().textContent = standing.teamName;
            row.insertCell().textContent = standing.points;
            row.insertCell().textContent = standing.bestRank;
            row.insertCell().textContent = standing.fpts;
        });
    }

    // Event listeners para os botões da sidebar (Campeões)
    const btnCampeoes = document.getElementById('btnCampeoes');

    if (btnCampeoes) {
        btnCampeoes.addEventListener('click', function () {
            setActiveButton(this);
            showCampeoesTable();
        });
    }

    // Função para lidar com o menu mobile (select)
    document.getElementById('mobile-nav').addEventListener('change', function () {
        const selectedOption = this.options[this.selectedIndex];
        const action = selectedOption.dataset.action;

        console.log("Opção selecionada:", selectedOption);
        console.log("Ação:", action);

        if (action === 'showCampeoesTable') {
            console.log("Mostrar tabela de campeões");
            showCampeoesTable();
        } else if (action === 'loadLeagueData') {
            const leagueIdsString = selectedOption.dataset.leagueIds;
            const leagueIds = leagueIdsString.split(',');
            console.log("IDs das ligas:", leagueIds);
            loadLeagueData(leagueIds);
        }
    });

    // Exibe a tabela de campeões ao carregar a página
    showCampeoesTable();

    //remove observer
    const sidebar = document.getElementById(SIDEBAR_ID);
});