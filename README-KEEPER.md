# Inclusão da liga Keeper — versão 5.3.0

A liga Keeper passa a aparecer em cada temporada configurada entre 2020 e 2025.

## Como a descoberta funciona

1. o sincronizador reutiliza primeiro o `user_id` já salvo para `rafastein` em `data/discovery-users.json`;
2. se o ID ainda não existir, resolve o username `rafastein` uma única vez;
3. lista as ligas NFL do usuário no ano solicitado;
4. seleciona a liga cujo nome contém `keeper`;
5. valida a classificação e grava `data/snapshots/ANO/keeper.json`.

## Gerar todos os snapshots Keeper

No GitHub, abra **Actions → Atualizar snapshots → Run workflow** e use:

- Ano: deixe vazio;
- Série: `keeper`.

A Action gera os anos disponíveis no Sleeper, cria o commit e aciona a Vercel automaticamente.

## Instalação segura

Use o pacote de atualização segura, que não contém a pasta `data/`. Depois:

```bash
npm run check
git add .
git commit -m "Adiciona liga Keeper ao histórico"
git push
```

As temporadas Keeper anteriores ao uso do Sleeper continuam dependentes de cadastro manual ou dos rankings antigos da NFL Fantasy.
