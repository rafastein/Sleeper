document.addEventListener('DOMContentLoaded', function () {

    // Constantes
    const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';
    const LOADING_ELEMENT_ID = 'loading';
    const ERROR_MESSAGE_ELEMENT_ID = 'error-message';
    const SIDEBAR_BUTTON_SELECTOR = '#sidebar button';
    const MOBILE_MENU_BUTTON_SELECTOR = '.mobile-menu button';
    const CAMPEOES_CONTAINER_ID = 'campeoes-container';
    const TABLES_CONTAINER_ID = 'tables-container';
    const COMBINED_TABLE_CONTAINER_ID = 'combined-table-container';
    const RANKING_CONTAINER_LEFT_ID = 'ranking-container-left';
    const RANKING_CONTAINER_RIGHT_ID = 'ranking-container-right';
    const COMBINED_TABLE_ID = 'combinedTable';
    const MOBILE_MENU_BUTTON_ID = 'mobile-menu-button';
    const MOBILE_MENU_ID = 'mobile-menu';

// Funções para mostrar e ocultar o indicador de carregamento

 function showLoading() {
    console.log("showLoading chamado");
    document.getElementById(LOADING_ELEMENT_ID).classList.remove('hidden');
       document.getElementById(LOADING_ELEMENT_ID).style.display = 'flex';
}

function hideLoading() {
    console.log("hideLoading chamado");
    document.getElementById(LOADING_ELEMENT_ID).classList.add('hidden');
       document.getElementById(LOADING_ELEMENT_ID).style.display = 'none';
}

// Função para exibir mensagens de erro
function displayError(message) {
    console.error(message);
    const errorElement = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('active'); // Mostra o elemento de erro

           setTimeout(() => {
               errorElement.classList.add('active');
           }, 5000);
    }
}

// Após o carregamento da página, esconde a mensagem de erro
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById(ERROR_MESSAGE_ELEMENT_ID).classList.add('active');
});

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

    //*** FUNÇÕES DE DISPLAY ***//
    // Função para mostrar as tabelas das ligas
    function showLeagueTables() {
        console.log('showLeagueTables chamado');
        document.getElementById(CAMPEOES_CONTAINER_ID).classList.remove('active');
        document.getElementById(TABLES_CONTAINER_ID).classList.add('active');
    }

    // Função para mostrar a tabela de campeões
    function showCampeoesTable() {
        console.log("showCampeoesTable chamado");
        document.getElementById(TABLES_CONTAINER_ID).classList.remove('active');
        document.getElementById(CAMPEOES_CONTAINER_ID).classList.add('active');
    }

    // Função para definir o botão ativo
    function setActiveButton(button) {
        console.log("setActiveButton chamado com:", button);
        const buttons = document.querySelectorAll(SIDEBAR_BUTTON_SELECTOR + ', ' + MOBILE_MENU_BUTTON_SELECTOR);
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    //*** FUNÇÕES DE API ***//
    // Função para buscar dados da liga na API do Sleeper
    async function fetchLeagueData(leagueId, leagueNumber) {
        try {
            console.log(`Buscando dados da liga ${leagueId} (Liga ${leagueNumber})`);
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

            console.log(`Dados da liga ${leagueId} carregados com sucesso`); // Adicionado

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
        console.clear(); // Limpa o console
        showLoading(); // Mostra o indicador de carregamento
        Promise.all(leagueIds.map((leagueId, index) => fetchLeagueData(leagueId, index + 1)))
            .then(data => {
                console.log("Dados retornados da Promise.all:", data);
                const validData = data.filter(item => item !== null); // Filtra resultados nulos
                leagueData.push(...validData);
                console.log("Dados válidos:", validData);
                if (leagueData.length === leagueIds.length) {
                    console.log("Todos os dados da liga foram carregados corretamente.");
                    const combinedStandings = calculateCombinedStandings(leagueData);
                    displayCombinedStandings(combinedStandings);
                    hideLoading(); // Esconde o indicador de carregamento

                    // Adiciona classes de ranking após exibir os dados
                    addRankingClasses();

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

    //*** FUNÇÕES DE CÁLCULO ***//
    // Função para calcular os standings com base nos brackets
    function calculateStandings(winnersBracket, losersBracket, rosters) {
        const standings = [];

        // Funções auxiliares para encontrar vencedores e perdedores
        const findWinner = (bracket, matchId) => bracket.find(m => m.m === matchId)?.w || null;
        const findLoser = (bracket, matchId) => bracket.find(m => m.m === matchId)?.l || null;

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
                teamName: roster?.settings.team_name || 'Sem Nome',
                avatar: roster?.avatar || null,
                points: 13 - standing.rank
            };
        });

        return orderedStandings;
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
                const user = usersData.find(u => u.user_id === roster?.owner_id);
                const userId = roster?.owner_id;

                if (!combinedStandings[userId]) {
                    combinedStandings[userId] = {
                        avatar: user?.avatar,
                        teamName: user?.display_name || user?.username || 'Sem Nome',
                        points: 0,
                        bestRank: standing.rank,
                        fpts: 0 // Inicializa fpts em 0
                    };
                }

                combinedStandings[userId].points += standing.points;
                combinedStandings[userId].bestRank = Math.min(combinedStandings[userId].bestRank, standing.rank);
                combinedStandings[userId].fpts += roster?.settings.fpts || 0; // Adiciona uma verificação para o caso de fpts ser undefined
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

    //*** FUNÇÕES DE EXIBIÇÃO ***//
    // Função para exibir os standings nas tabelas
    function displayStandings(standings, rosters, users, leagueNumber) {
        console.log(`displayStandings chamado para Liga ${leagueNumber}`);
        const tableBody = document.querySelector(`#table${leagueNumber} tbody`);

        console.log(`tableBody (Liga ${leagueNumber}):`, tableBody);

        if (!tableBody) {
            console.warn(`Elemento <tbody> não encontrado para a tabela ${leagueNumber}`);
            return; // Aborta a função se o tbody não for encontrado
        }

        tableBody.innerHTML = '';

        standings.forEach(standing => {
            const roster = rosters.find(r => r.roster_id === standing.rosterId);
            const user = users.find(u => u.user_id === roster?.owner_id);

            if (!roster || !user) {
                console.warn(`Roster ou usuário não encontrado para o ID: ${standing.rosterId}`);
                return;
            }

            // Cria os elementos HTML como strings
            let rowHTML = `<tr>
                <td>${standing.rank}</td>
                <td>`;
            if (user?.avatar) {
                rowHTML += `<img src="https://sleepercdn.com/avatars/${user.avatar}" alt="${standing.teamName}" class="avatar">`;
            }
            rowHTML += `</td>
                <td>${user.display_name || user.username || 'Sem Nome'}</td>
                <td>${roster.settings.wins}-${roster.settings.losses}</td>
                <td>${standing.points}</td>
            </tr>`;

            // Adiciona a linha à tabela
            tableBody.innerHTML += rowHTML;
        });
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

      //*** FUNÇÕES DE ESTILO ***//
    function setActiveButton(button) {
        console.log("setActiveButton chamado com:", button);
        const buttons = document.querySelectorAll(SIDEBAR_BUTTON_SELECTOR + ', ' + MOBILE_MENU_BUTTON_SELECTOR);
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
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

    //*** MENU MOBILE ***//
    // Função para copiar o conteúdo da sidebar para o menu mobile
    function populateMobileMenu() {
        console.log("populateMobileMenu chamado");
        const sidebar = document.getElementById('sidebar');
        const mobileMenu = document.getElementById('mobile-menu');

        // Limpa o conteúdo existente do menu mobile
        mobileMenu.innerHTML = '';

        // Clona os elementos da sidebar e adiciona ao menu mobile
        const sidebarChildren = sidebar.children;
        for (let i = 0; i < sidebarChildren.length; i++) {
            const clonedElement = sidebarChildren[i].cloneNode(true);
            mobileMenu.appendChild(clonedElement);
        }
    }

    // Adiciona event listeners aos botões da sidebar e do menu mobile
    function addEventListenersToButtons() {
      console.log("addEventListenersToButtons chamado");
      const buttons = document.querySelectorAll(SIDEBAR_BUTTON_SELECTOR + ', ' + MOBILE_MENU_BUTTON_SELECTOR);
      buttons.forEach(button => {
          button.addEventListener('click', function (event) {
              event.preventDefault(); // Evita o comportamento padrão do botão

              console.log(`Botão clicado: ${this.id}`);
              setActiveButton(this);

              const buttonId = this.id;
              let year, serie, serieKey;

              if (buttonId === 'btnCampeoes') {
                  showCampeoesTable();
              } else {
                  showLeagueTables();
                   // Extrai o ano e a série do ID do botão
                  const year = buttonId.slice(-4);
                  const serie = buttonId.slice(3, -4);
                  const serieKey = serie.charAt(0).toLowerCase() + serie.slice(1);

                  // Verifica se os IDs da liga existem para o ano e a série
                  if (leagueIds[year] && leagueIds[year][serieKey]) {
                      // Carrega os dados da liga
                      loadLeagueData(leagueIds[year][serieKey]);
                  } else {
                      console.warn(`IDs da liga não encontrados para o botão ${buttonId}`);
                  }
              }

              // Fecha o menu mobile se estiver aberto
              const mobileMenu = document.getElementById(MOBILE_MENU_ID);
              if (mobileMenu && mobileMenu.classList.contains('active')) {
                  mobileMenu.classList.remove('active');
              }
          });
      });
    }

    // Obtém uma referência ao botão do menu mobile e ao menu mobile
    const mobileMenuButton = document.getElementById(MOBILE_MENU_BUTTON_ID);
    const mobileMenu = document.getElementById(MOBILE_MENU_ID);

    // Adiciona um ouvinte de evento de clique ao botão do menu mobile
    mobileMenuButton.addEventListener('click', function () {
        console.log("Botão do menu mobile clicado");
        mobileMenu.classList.toggle('active');
        populateMobileMenu();
        addEventListenersToButtons();

    });

   // Configuração inicial: exibir a tabela de campeões e definir o botão "Campeões" como ativo
    showCampeoesTable();

    // Adiciona event listeners aos botões da sidebar e do menu mobile
    addEventListenersToButtons();

    // Chama a função para popular o menu mobile
    populateMobileMenu();

     //Define o botão "Campeões" como ativo
    setActiveButton(document.getElementById('btnCampeoes'));
});