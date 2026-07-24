# Changelog

## Etapa 2 — central histórica

- novo **Ranking histórico** no menu principal;
- consolidação automática dos snapshots disponíveis;
- filtros para Série A, Série B ou ambas;
- ordenação por pontos, títulos, pódios e média;
- títulos e pódios calculados pelo ranking combinado anual;
- snapshots provisórios excluídos das estatísticas oficiais;
- perfis individuais dos managers;
- trajetória anual clicável por ano e série;
- pontos, títulos, pódios, participações, melhor resultado, média e FPTS acumulado;
- indicadores de cobertura dos snapshots;
- cinco testes novos para a camada histórica;
- comando `npm run sync:history`.

## Etapa 1 — confiabilidade dos dados

- regras extraídas para `ambo-core.js`;
- testes automáticos com o test runner nativo do Node.js;
- validação de posições, rosters, pontos e soma total;
- proteção contra duplicação do 1º ao 6º lugar no losers bracket;
- snapshots locais para temporadas encerradas;
- fallback para a API quando o snapshot ainda não existe;
- sincronizador e validador de snapshots;
- cadastro canônico de managers;
- persistência de `user_id`;
- GitHub Actions para validação e sincronização.

## Modernização inicial

- temporada 2025;
- descoberta automática das ligas renovadas;
- Série A localizada por `Jptavares`;
- Série B localizada por `rafastein`;
- FPTS com casas decimais;
- identidade visual renovada;
- menu mobile acessível;
- configuração central em `config.js`.
