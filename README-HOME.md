# Página inicial — versão 7.0.0

A página inicial usa `data/snapshots/manifest.json`, os snapshots locais, `data/managers.json` e o Hall de `config.js`.

## Comportamento

- `/` abre a Home.
- `?view=champions` abre o Hall.
- `?view=history` abre o ranking histórico.
- o ano mais recente é detectado pelos snapshots disponíveis;
- campeões sem registro manual são obtidos do snapshot oficial;
- os cards de temporada levam à classificação ou aos playoffs;
- nomes clicáveis abrem o perfil histórico;
- a Action de snapshots atualiza a Home automaticamente após o deploy da Vercel.

## Publicação

```bash
npm run check
git add .
git commit -m "Adiciona página inicial da AMBO"
git push
```
