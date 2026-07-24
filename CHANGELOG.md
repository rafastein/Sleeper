# Changelog

## Etapa 1 — confiabilidade dos dados

- regras de classificação extraídas para `ambo-core.js`;
- testes automáticos com o test runner nativo do Node.js;
- validação de posições, rosters, pontos e soma total;
- proteção específica contra duplicação do 1º ao 6º lugar no losers bracket;
- snapshots locais para temporadas encerradas;
- fallback automático para a API quando o snapshot ainda não existe;
- sincronizador de snapshots em `scripts/sync-data.js`;
- validação independente em `scripts/validate-snapshots.js`;
- cadastro canônico de managers em `data/managers.json`;
- persistência de `user_id` em `data/discovery-users.json`;
- GitHub Action para validar cada push;
- GitHub Action manual para baixar, validar e commitar snapshots;
- indicação da origem e da data dos dados na interface.

## 2026-07-24

- adicionada a temporada 2025 ao menu;
- descoberta automática das ligas renovadas pela API do Sleeper;
- Série A localizada a partir do usuário `Jptavares`;
- Série B localizada a partir do usuário `rafastein`;
- correção do deslocamento do losers bracket;
- classificação final calculada pelo campo `p`;
- suporte a qualquer quantidade de participantes;
- FPTS com casas decimais;
- identidade visual renovada;
- menu mobile acessível;
- dados editáveis separados em `config.js`.
