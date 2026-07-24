# Ajuste do ranking histórico — versão 5.1.0

Este pacote corrige a fonte e a ordenação dos títulos históricos.

## Regra aplicada

1. maior número de títulos;
2. maior número de vice-campeonatos;
3. maior número de terceiros lugares;
4. maior pontuação histórica;
5. melhor média de colocação;
6. maior FPTS acumulado;
7. nome em ordem alfabética.

Os títulos vêm do Hall oficial definido em `config.js`. Se uma temporada nova ainda não estiver cadastrada no Hall, o sistema usa o campeão do snapshot validado. O mesmo ano e série nunca são contados duas vezes.

Vice-campeonatos e terceiros lugares são calculados a partir dos snapshots oficiais disponíveis.

## Instalação segura

Este pacote não substitui a pasta `data/`. Antes de copiar os arquivos:

```bash
git pull
```

Depois de copiar e substituir os arquivos:

```bash
npm run check
git add .
git commit -m "Corrige ranking histórico por títulos"
git push
```

Após o deployment da Vercel, faça uma atualização forçada com `Ctrl + F5`. O cache do PWA foi incrementado para a versão 5.1.
