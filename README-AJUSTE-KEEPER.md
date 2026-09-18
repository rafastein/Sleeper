# Keeper por grupos — versão 7.1.4

A Keeper continua sendo uma liga, com três grupos: AMBO Norte, AMBO Central e AMBO Sul. O pacote recupera os grupos de 2021 a 2026 a partir da liga correspondente a cada ano no Sleeper.

## O que muda

- Temporada regular: uma classificação por grupo, com posições de 1 a 4, campanha e FPTS. Os critérios de ordenação existentes são preservados: vitórias, empates, FPTS, pontos contra e roster ID como último desempate determinístico.
- Temporadas concluídas: um painel adicional mostra a classificação final da liga após os playoffs, sem reordená-la por grupo.
- Celular: posição, avatar, manager, campanha e FPTS em linhas compactas.
- CSV: inclui grupo, posição no grupo e, quando disponível, posição final após playoffs.
- Sincronizações futuras: preservam nomes, quantidade de grupos e o grupo de cada roster.
- Dados ausentes: mostra aviso e a classificação geral, sem inventar a composição dos grupos. Para 2020 e anteriores, os grupos não estão disponíveis neste projeto.

Campanhas, FPTS, campeões, resultados de playoffs, cadastro de managers e Séries A/B foram preservados na recuperação dos dados deste pacote. O ranking histórico continua usando resultados finais, não posições nos grupos.

## Atualizar seu repositório sem substituir dados recentes

1. Execute `git status`. Se houver um rebase ou merge em andamento, conclua-o antes de copiar esta atualização.
2. Faça uma cópia de segurança. Atualize `ambo-core.js`, `script.js`, `index.html`, `styles.css`, `sw.js`, `package.json`, `package-lock.json`, `scripts/sync-data.js`, `test/divisions.test.js` e `test/keeper-render.test.js` usando os arquivos deste ZIP. Atualize também a documentação, se desejar.
3. **Não substitua a pasta `data/` do seu repositório pelo ZIP.** Ela pode conter dados mais recentes da sincronização automática.
4. Na raiz do seu projeto, execute:

```powershell
npm run sync:keeper:groups
npm run check
```

O primeiro comando consulta cada ano e altera somente os campos de grupo nos snapshots Keeper existentes. Não altera campanhas, placares, usuários, resultados finais, `data/managers.json`, `data/discovery-users.json` nem `data/snapshots/manifest.json`. Todos os anos são consultados e validados antes de começar a gravação; em caso de falha na consulta, corrija a conexão e tente novamente.

Para conferir a consulta sem gravar, use `npm run sync:keeper:groups -- --dry-run`. Para limitar a um ano, acrescente `-- --year 2025`.

## Testar localmente

```powershell
py -m http.server 8000
```

- Atual: http://localhost:8000/?view=season&year=2026&series=keeper
- Histórico: http://localhost:8000/?view=season&year=2025&series=keeper

Confirme os três grupos e quatro participantes em cada um. Em 2025, confira também a tabela final após os grupos e a aba Playoffs. A versão 2026 continua atualizando pelo Sleeper ao abrir e a cada cinco minutos. Se o navegador mantiver o código antigo, recarregue a página sem cache.

Quem extrair o ZIP em uma pasta nova pode testar diretamente: os seis snapshots Keeper já contêm os grupos. Este pacote não publica alterações no GitHub/Vercel automaticamente.
