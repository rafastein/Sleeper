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

    // Event listeners para os botões da sidebar e menu hamburger (Campeões)
    const btnCampeoes = document.getElementById('btnCampeoes');
    if (btnCampeoes) {
        btnCampeoes.addEventListener('click', function () {
            setActiveButton(this);
            showCampeoesTable();
        });
    }

    // Variáveis globais
    hamburgerMenu = document.getElementById('hamburger-menu');
    sidebarMenu = document.getElementById('sidebar'); // Renomeado para evitar confusão
    hamburgerMenuContent = document.getElementById('hamburger-menu-content');
   if (hamburgerMenu) {
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

    for (const year in leagueIds) {
        for (const serie in leagueIds[year]) {
            const buttonId = `btn${serie.charAt(0).toUpperCase() + serie.slice(1)}${year}`;
            setupLeagueButton(buttonId, leagueIds[year][serie]);
            const hamburgerButtonId = `${buttonId}Hamburger`;
            setupLeagueButton(hamburgerButtonId, leagueIds[year][serie]);
        }
    }

});