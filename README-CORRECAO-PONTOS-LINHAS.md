# Correção — pontos residuais no ranking histórico

Esta atualização remove a célula de pontos acumulados que ainda aparecia nas linhas do ranking histórico, causando o deslocamento das colunas.

Também altera o Service Worker para buscar JavaScript e CSS na rede antes de usar o cache, evitando que uma versão antiga do `script.js` reapareça após novos deployments.

## Publicação

```bash
git pull
npm run check
git add .
git commit -m "Remove pontos residuais do ranking histórico"
git push
```
