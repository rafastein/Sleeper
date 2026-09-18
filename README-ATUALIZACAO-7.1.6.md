# Atualização 7.1.6 — Campanha somente com números

Na Home e nas classificações, a campanha aparece como `1-0`, sem as siglas V–D. Se houver empate, mantém os três números (por exemplo, `1-0-1`). FPTS e regras de classificação permanecem iguais.

## Instalar sobre a 7.1.5

Preserve suas alterações locais e confirme que não há merge ou rebase em andamento. Copie somente estes arquivos do ZIP para o projeto:

- `index.html`
- `script.js`
- `styles.css`
- `sw.js`
- `package.json`
- `package-lock.json`
- `test/home-cards.test.js`
- `test/keeper-render.test.js`

Opcionalmente, copie `CHANGELOG.md` e este guia. **Não substitua `data/`.** Não é necessário sincronizar dados novamente.

Execute `npm run check`, teste localmente e confira o diff antes de commitar. Após o commit, rode `git pull --rebase origin main`; somente se terminar sem conflitos, rode `git push origin main`. Não use push forçado.

Após publicar, feche e reabra o site no celular se ainda aparecerem as siglas antigas. O ZIP não publica alterações automaticamente.
