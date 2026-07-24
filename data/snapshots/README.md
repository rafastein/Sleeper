# Snapshots oficiais

Os arquivos desta pasta são gerados pelo comando `npm run sync` ou pela ação
**Atualizar snapshots** do GitHub Actions.

Cada arquivo contém uma temporada e uma série completas, por exemplo:

```text
data/snapshots/2025/serieA.json
data/snapshots/2025/serieB.json
```

O site tenta usar o snapshot primeiro. Se ele ainda não existir, usa a API do
Sleeper como fallback. Nunca edite os snapshots manualmente.
