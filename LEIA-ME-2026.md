# AMBO 7.1 — Atualização para 2026

## Como publicar

1. Extraia este ZIP.
2. Copie o conteúdo de `Sleeper-main` para a raiz do repositório existente, substituindo os arquivos correspondentes. Inclua a pasta `.github` e o novo arquivo `season-data.js`.
3. Execute `npm run check` e envie as mudanças à branch `main`.
4. Aguarde o deploy da Vercel. Atualize a página se houver uma versão antiga aberta.

O pacote inclui as cinco ligas e os resultados de 2026 consultados em 15/09/2026. Todos os snapshots anteriores foram preservados.

## Páginas

- `?view=season&year=2026&series=keeper`
- `?view=season&year=2026&series=serieA`
- `?view=season&year=2026&series=serieB`

## Atualizações

A classificação consulta o Sleeper ao abrir, a cada cinco minutos com a aba visível e pelo botão **Atualizar**. Usa os resultados acumulados publicados pelo Sleeper, sem antecipar os resultados dos jogos em andamento. O cache da consulta pode durar até 60 segundos.

Em uma falha, a página mostra a última classificação válida com aviso e data. A Action **Atualizar snapshots** roda diariamente e mantém a cópia salva para esse caso e para os destaques da Home. Também pode ser executada manualmente com o ano 2026. A Action exige permissão de escrita no repositório, como nas versões anteriores.

As regras de pontuação e desempate permanecem iguais. Keeper continua com uma liga; Séries A e B combinam duas ligas cada. A classificação de 2026 é parcial e não concede títulos nem entra no ranking histórico oficial enquanto os resultados não estiverem finalizados.

Esta entrega contém os arquivos para publicação; não faz o deploy no GitHub/Vercel.
