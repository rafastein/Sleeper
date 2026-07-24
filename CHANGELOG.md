# Changelog

## 5.1.0 — Ranking histórico por títulos

- ranking histórico ordenado por títulos por padrão;
- desempate por vice-campeonatos e, em seguida, terceiros lugares;
- títulos consolidados pelo Hall oficial da AMBO, com fallback para snapshots recentes;
- correção do título de 2019 do SCPATRIOTS, antes ausente porque os snapshots começam em 2020;
- prevenção contra contagem duplicada quando Hall e snapshot cobrem o mesmo ano e série;
- colunas específicas para vices e terceiros lugares;
- perfis e exportação CSV atualizados;
- cache do PWA incrementado para publicar a correção imediatamente;
- três testes novos, totalizando 28.

## Etapa 3 — experiência e compartilhamento

- URLs permanentes para campeões, histórico, perfis e temporadas;
- restauração de estado pelos botões voltar e avançar do navegador;
- botões para copiar link e compartilhar a tela atual;
- exportação CSV contextual com compatibilidade para Excel;
- busca por manager no histórico e nas temporadas;
- ordenação do ranking anual por pontos, FPTS, melhor posição ou nome;
- filtros gravados na URL;
- cards mobile para campeões, ranking histórico, perfis, combinado e ligas;
- contador de resultados filtrados;
- seis testes novos para rotas, busca, ordenação e CSV;
- correção preventiva da renderização do ranking combinado.

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


## 5.0.0 — Etapa 4

- proxy Vercel com cache e fallback;
- PWA instalável e modo offline;
- Web Analytics e Speed Insights;
- sincronização semanal automática;
- cabeçalhos de segurança e cache;
- endpoint de saúde;
- seis testes de infraestrutura.
