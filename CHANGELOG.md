## 2026-07-24

- adicionada a temporada 2025 ao menu;
- descoberta automática das ligas renovadas pela API do Sleeper;
- Série A localizada a partir do usuário `Jptavares`;
- Série B localizada a partir do usuário `rafastein`;
- cache e mensagens de erro para a resolução automática dos IDs.

# Alterações desta versão

## Lógica

- classificação final calculada pelo campo oficial `p` dos brackets do Sleeper;
- suporte a qualquer quantidade de participantes;
- fallback pela temporada regular quando os playoffs estão incompletos;
- FPTS agora inclui `fpts_decimal`;
- ranking combinado não agrupa mais rosters sem proprietário em `undefined`;
- desempate por pontos, melhor posição, FPTS e nome;
- requisições paralelas com timeout e tratamento de erros;
- navegação gerada automaticamente a partir do arquivo de configuração;
- fim dos IDs duplicados e dos listeners repetidos no menu mobile.

## Interface

- identidade visual completamente renovada;
- ranking combinado em destaque e ligas individuais abaixo;
- cards de resumo para campeões e temporadas;
- avatares com fallback por iniciais;
- tabelas responsivas com rolagem horizontal;
- menu mobile acessível, com backdrop e fechamento por `Esc`;
- estados de carregamento, erro e classificação provisória;
- melhorias de contraste, foco por teclado e movimento reduzido.

## Manutenção

- dados separados em `config.js`;
- documentação de uso e atualização em `README.md`;
- sem dependências de framework ou etapa de compilação.
