document.addEventListener('DOMContentLoaded', function () {

    // Constantes
    const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';
    const LOADING_ELEMENT_ID = 'loading';
    const ERROR_MESSAGE_ELEMENT_ID = 'error-message';
    const SIDEBAR_BUTTON_SELECTOR = '#sidebar button, #hamburger-menu-content button';
    const CAMPEOES_CONTAINER_ID = 'campeoes-container';
    const TABLES_CONTAINER_ID = 'tables-container';
    const COMBINED_TABLE_CONTAINER_ID = 'combined-table-container';
    const RANKING_CONTAINER_LEFT_ID = 'ranking-container-left';
    const RANKING_CONTAINER_RIGHT_ID = 'ranking-container-right';
    const COMBINED_TABLE_ID = 'combinedTable';
    const HAMBURGER_MENU_ID = 'hamburger-menu';
    const SIDEBAR_ID = 'sidebar';
    const HAMBURGER_MENU_CONTENT_ID = 'hamburger-menu-content';

    // Variáveis globais
    let hamburgerMenu, sidebarMenu, hamburgerMenuContent;

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
            errorElement.classList.remove('hidden'); // Mostra o elemento de erro
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
        if (button) { // Verifica se o botão existe
            button.addEventListener('click', function () {
                setActiveButton(this);
                console.log(`Exibindo liga para o botão ${buttonId}`);
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
            const hamburgerButtonId = `btn${serie.charAt(0).toUpperCase() + serie.slice(1)}${year}Hamburger`;
            setupLeagueButton(hamburgerButtonId, leagueIds[year][serie]);
        }
    }

    // Event listeners para os botões da sidebar e menu hamburger (Campeões)
    const btnCampeoes = document.getElementById('btnCampeoes');
    const btnCampeoesHamburger = document.getElementById('btnCampeoesHamburger');

    if (btnCampeoes) {
        btnCampeoes.addEventListener('click', function () {
            setActiveButton(this);
            showCampeoesTable();
        });
    }

    if (btnCampeoesHamburger) {
        btnCampeoesHamburger.addEventListener('click', function () {
            setActiveButton(this);
            showCampeoesTable();
        });
    }

    // Função para definir o botão ativo
    function setActiveButton(button) {
        const buttons = document.querySelectorAll(SIDEBAR_BUTTON_SELECTOR);
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    // Função para mostrar as tabelas das ligas
    function showLeagueTables() {
        console.log('Exibindo as tabelas das ligas');
        document.getElementById(CAMPEOES_CONTAINER_ID).classList.add('hidden'); // Oculta a tabela de campeões
        document.getElementById(TABLES_CONTAINER_ID).classList.add('active'); // Exibe as tabelas das ligas

        // Exibe as tabelas de ligas
        document.getElementById(COMBINED_TABLE_CONTAINER_ID).classList.remove('hidden');
        document.getElementById(RANKING_CONTAINER_LEFT_ID).classList.remove('hidden');
        document.getElementById(RANKING_CONTAINER_RIGHT_ID).classList.remove('hidden');

        // Fecha o menu hamburger se estiver aberto
        closeHamburgerMenu();
    }

    // Função para mostrar a tabela de campeões
    function showCampeoesTable() {
        console.log("Exibindo a tabela de campeões");
        document.getElementById(TABLES_CONTAINER_ID).classList.remove('active'); // Oculta as tabelas das ligas

        // Oculta as tabelas de ligas individualmente
        document.getElementById(COMBINED_TABLE_CONTAINER_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_LEFT_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_RIGHT_ID).classList.add('hidden');

        document.getElementById(CAMPEOES_CONTAINER_ID).classList.remove('hidden'); // Exibe a tabela de campeões

        // Fecha o menu hamburger se estiver aberto
        closeHamburgerMenu();
    }

    // Função para adicionar classes às linhas da tabela de ranking combinado
    function addRankingClasses() {
        const table = document.getElementById(COMBINED_TABLE_ID);
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) { // Começa em 1 para pular o cabeçalho
            rows[i].classList.remove('first-place', 'second-place', 'third-place', 'bottom-three'); // Remove classes existentes

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
            // Busca dados da liga
            const leagueResponse = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}`);
            if (!leagueResponse.ok) throw new Error("Erro ao buscar dados da liga");
            const leagueData = await leagueResponse.json();

            // Atualiza o nome da liga
            if (leagueNumber === 1) {
                document.getElementById(RANKING_CONTAINER_LEFT_ID).querySelector("h2").textContent = leagueData.name;
            } else if (leagueNumber === 2) {
                document.getElementById(RANKING_CONTAINER_RIGHT_ID).querySelector("h2").textContent = leagueData.name;
            }

            // Busca rosters da liga
            const rostersResponse = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/rosters`);
            if (!rostersResponse.ok) throw new Error("Erro ao buscar rosters da liga");
            const rostersData = await rostersResponse.json();

            // Busca usuários da liga
            const usersResponse = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/users`);
            if (!usersResponse.ok) throw new Error("Erro ao buscar usuários da liga");
            const usersData = await usersResponse.json();

            // Busca dados do winners bracket
            const winnersBracketResponse = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/winners_bracket`);
            if (!winnersBracketResponse.ok) throw new Error("Erro ao buscar winners bracket");
            const winnersBracketData = await winnersBracketResponse.json();

            // Busca dados do losers bracket
            const losersBracketResponse = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/losers_bracket`);
            if (!losersBracketResponse.ok) throw new Error("Erro ao buscar losers bracket");
            const losersBracketData = await losersBracketResponse.json();

            // Calcula os standings (classificações)
            const standings = calculateStandings(winnersBracketData, losersBracketData, rostersData);
            displayStandings(standings, rostersData, usersData, leagueNumber);

            return {
                standings,
                rostersData,
                usersData
            };
        } catch (error) {
            const leagueName = leagueId ? ` (League ID: ${leagueId})` : '';
            displayError(`Erro ao processar dados da liga${leagueName}: ${error.message}`);
            console.error(`Erro ao processar a liga ${leagueId}:`, error);
            return null;
        }
    }

    // Função para carregar os dados das ligas
    function loadLeagueData(leagueIds) {
        leagueData.length = 0; // Limpa os dados anteriores
        showLoading(); // Mostra o indicador de carregamento
        Promise.all(leagueIds.map((leagueId, index) => fetchLeagueData(leagueId, index + 1)))
            .then(data => {
                const validData = data.filter(item => item !== null); // Filtra resultados nulos
                leagueData.push(...validData);
                if (leagueData.length === leagueIds.length) {
                    const combinedStandings = calculateCombinedStandings(leagueData);
                    displayCombinedStandings(combinedStandings);
                    addRankingClasses(); // Adiciona classes de ranking após exibir os dados
                    hideLoading(); // Esconde o indicador de carregamento
                } else {
                    displayError("Nem todos os dados da liga foram carregados corretamente.");
                    hideLoading();
                }
            })
            .catch(error => {
                displayError(`Erro ao carregar dados das ligas: ${error.message}`);
                hideLoading(); // Esconde o indicador de carregamento mesmo em caso de erro
            });
    }

    // Função para calcular os standings com base nos brackets
    function calculateStandings(winnersBracket, losersBracket, rosters) {
        const standings = [];

        // Funções auxiliares para encontrar vencedores e perdedores
        const findWinner = (bracket, matchId) => bracket.find(m => m.m === matchId) ?.w || null;
        const findLoser = (bracket, matchId) => bracket.find(m => m.m === matchId) ?.l || null;

        // Processa os dados do winners bracket
        const week15Matches = winnersBracket.filter(match => match.r === 1);
        const week16Matches = winnersBracket.filter(match => match.r === 2);
        const week17Matches = winnersBracket.filter(match => match.r === 3);

        const week15Winners = week15Matches.map(match => findWinner(winnersBracket, match.m));
        const week15Losers = week15Matches.map(match => findLoser(winnersBracket, match.m));

        const week16Winners = week16Matches.map(match => findWinner(winnersBracket, match.m));
        const week16Losers = week16Matches.map(match => findLoser(winnersBracket, match.m));

        const week17Winners = week17Matches.map(match => findWinner(winnersBracket, match.m));
        const week17Losers = week17Matches.map(match => findLoser(winnersBracket, match.m));

        // Adiciona os primeiros colocados
        standings.push({
                rank: 1,
                rosterId: week17Winners[0]
            }, {
                rank: 2,
                rosterId: week17Losers[0]
            }
        );

        standings.push({
                rank: 3,
                rosterId: week17Winners[1]
            }, {
                rank: 4,
                rosterId: week17Losers[1]
            }
        );

        standings.push({
                rank: 5,
                rosterId: week16Winners[2]
            }, {
                rank: 6,
                rosterId: week16Losers[2]
            }
        );

        // Processa os dados do losers bracket
        const loserWeek15Matches = losersBracket.filter(match => match.r === 1);
        const loserWeek16Matches = losersBracket.filter(match => match.r === 2);
        const loserWeek17Matches = losersBracket.filter(match => match.r === 3);

        const loserWeek15Winners = loserWeek15Matches.map(match => findWinner(losersBracket, match.m));
        const loserWeek15Losers = loserWeek15Matches.map(match => findLoser(losersBracket, match.m));

        const loserWeek16Winners = loserWeek16Matches.map(match => findWinner(losersBracket, match.m));
        const loserWeek16Losers = loserWeek16Matches.map(match => findLoser(losersBracket, match.m));

        const loserWeek17Winners = loserWeek17Matches.map(match => findWinner(losersBracket, match.m));
        const loserWeek17Losers = loserWeek17Matches.map(match => findLoser(losersBracket, match.m));

        // Adiciona os últimos colocados
        standings.push({
                rank: 7,
                rosterId: loserWeek17Winners[0]
            }, {
                rank: 8,
                rosterId: loserWeek17Losers[0]
            }
        );

        standings.push({
                rank: 9,
                rosterId: loserWeek17Winners[1]
            }, {
                rank: 10,
                rosterId: loserWeek17Losers[1]
            }
        );

        standings.push({
                rank: 11,
                rosterId: loserWeek16Winners[2]
            }, {
                rank: 12,
                rosterId: loserWeek16Losers[2]
            }
        );

        // Ordena os standings e adiciona informações dos rosters
        const orderedStandings = standings.map(standing => {
            const roster = rosters.find(r => r.roster_id === standing.rosterId);
            return {
                rank: standing.rank,
                rosterId: standing.rosterId,
                teamName: roster ?.settings.team_name || 'Sem Nome',
                avatar: roster ?.avatar || null,
                points: 13 - standing.rank
            };
        });

        return orderedStandings;
    }

    // Função para exibir os standings nas tabelas
    function displayStandings(standings, rosters, users, leagueNumber) {
        const tableBody = document.querySelector(`#table${leagueNumber} tbody`);
        tableBody.innerHTML = '';

        standings.forEach(standing => {
            const roster = rosters.find(r => r.roster_id === standing.rosterId);
            const user = users.find(u => u.user_id === roster ?.owner_id);

            if (!roster || !user) {
                console.warn(`Roster ou usuário não encontrado para o ID: ${standing.rosterId}`);
                return;
            }

            const row = document.createElement('tr');

            const rankCell = document.createElement('td');
            rankCell.textContent = standing.rank;
            row.appendChild(rankCell);

            const avatarCell = document.createElement('td');
            if (user ?.avatar) {
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

        leagueData.forEach(({
            standings,
            rostersData,
            usersData
        }) => {
            standings.forEach(standing => {
                const roster = rostersData.find(r => r.roster_id === standing.rosterId);
                const user = usersData.find(u => u.user_id === roster ?.owner_id);
                const userId = roster ?.owner_id;

                if (!combinedStandings[userId]) {
                    combinedStandings[userId] = {
                        avatar: user ?.avatar,
                        teamName: user ?.display_name || user ?.username || 'Sem Nome',
                        points: 0,
                        bestRank: standing.rank,
                        fpts: 0 // Inicializa fpts em 0
                    };
                }

                combinedStandings[userId].points += standing.points;
                combinedStandings[userId].bestRank = Math.min(combinedStandings[userId].bestRank, standing.rank);
                combinedStandings[userId].fpts += roster ?.settings.fpts || 0; // Adiciona uma verificação para o caso de fpts ser undefined
            });
        });

        const combinedStandingsArray = Object.values(combinedStandings);
        combinedStandingsArray.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
            return b.fpts - a.fpts;
        });

        return combinedStandingsArray;
    }

    // Função para exibir o ranking combinado
    function displayCombinedStandings(combinedStandings) {
        const table = document.getElementById(COMBINED_TABLE_ID).getElementsByTagName('tbody')[0];
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

    // Função para copiar o conteúdo da sidebar para o menu hamburger
    function copySidebarContent() {
        const sidebar = document.getElementById('sidebar');
        hamburgerMenuContent = document.getElementById('hamburger-menu-content');

        // Limpa o conteúdo existente do menu hamburger
        hamburgerMenuContent.innerHTML = '';

        // Clona os elementos da sidebar e adiciona ao menu hamburger
        const sidebarChildren = sidebar.children;
        for (let i = 0; i < sidebarChildren.length; i++) {
            const clonedElement = sidebarChildren[i].cloneNode(true);
            hamburgerMenuContent.appendChild(clonedElement);
        }

    }

    // Chama a função para copiar o conteúdo inicialmente
    copySidebarContent();

    // Adiciona um MutationObserver para atualizar o menu hamburger sempre que a sidebar for alterada
    const sidebar = document.getElementById('sidebar');
    const observer = new MutationObserver(copySidebarContent);
    observer.observe(sidebar, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });

    // Variáveis globais
    hamburgerMenu = document.getElementById('hamburger-menu');
    sidebarMenu = document.getElementById('sidebar'); // Renomeado para evitar confusão
    hamburgerMenuContent = document.getElementById('hamburger-menu-content');

   if (hamburgerMenu && sidebarMenu && hamburgerMenuContent) {
        hamburgerMenu.addEventListener('click', function () {
            console.log("Hamburger menu clicked!"); // Adicione este log
            sidebarMenu.classList.toggle('active');
            hamburgerMenuContent.classList.toggle('active');
        });
    }

    // Função para abrir e fechar o menu hamburger
    function closeHamburgerMenu() {
        if (window.innerWidth <= 768) {
            sidebarMenu.classList.remove('active');
            hamburgerMenuContent.classList.remove('active');
        }
    }

    // Event listeners para os botões da sidebar e menu hamburger (Campeões)
    if (document.getElementById('btnCampeoes')) {
        document.getElementById('btnCampeoes').addEventListener('click', function () {
            setActiveButton(this);
            showCampeoesTable();
        });
    }
   if (document.getElementById('btnCampeoesHamburger')) {
          document.getElementById('btnCampeoesHamburger').addEventListener('click', function () {
            setActiveButton(this);
           showCampeoesTable();
        });
   }

    // Exibe a tabela de campeões ao carregar a página
    function showCampeoesTable() {
        console.log("Exibindo a tabela de campeões");
        document.getElementById(TABLES_CONTAINER_ID).classList.remove('active'); // Oculta as tabelas das ligas

        // Oculta as tabelas de ligas individualmente
        document.getElementById(COMBINED_TABLE_CONTAINER_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_LEFT_ID).classList.add('hidden');
        document.getElementById(RANKING_CONTAINER_RIGHT_ID).classList.add('hidden');

        document.getElementById(CAMPEOES_CONTAINER_ID).classList.remove('hidden'); // Exibe a tabela de campeões

        // Fecha o menu hamburger se estiver aberto
        closeHamburgerMenu();
    }
    showCampeoesTable();

    // Configuração dos botões da sidebar
    for (const year in leagueIds) {
        for (const serie in leagueIds[year]) {
            const buttonId = `btn${serie.charAt(0).toUpperCase() + serie.slice(1)}${year}`;
            setupLeagueButton(buttonId, leagueIds[year][serie]);
           const hamburgerButtonId = `btn${serie.charAt(0).toUpperCase() + serie.slice(1)}${year}Hamburger`;
            setupLeagueButton(hamburgerButtonId, leagueIds[year][serie]);
        }
    }

    // Certifique-se de que os elementos hamburgerMenu, sidebarMenu e hamburgerMenuContent existem
    if (hamburgerMenu && sidebarMenu && hamburgerMenuContent) {
        // Adicione um ouvinte de evento ao botão do menu hamburger
        hamburgerMenu.addEventListener('click', function () {
            console.log("Hamburger menu clicked!");
            sidebarMenu.classList.toggle('active');
            hamburgerMenuContent.classList.toggle('active');
        });
    } else {
        console.warn("Um ou mais elementos do menu hamburger não foram encontrados.");
    }
});