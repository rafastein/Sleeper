# Atualização segura — Liga Keeper 5.3.0

Este pacote não contém a pasta `data/`, portanto preserva snapshots, manifesto, managers e `user_id`s.

## Instalação

```bash
git pull
npm run check
git add .
git commit -m "Adiciona liga Keeper ao histórico"
git push
```

Depois do deployment, execute a Action **Atualizar snapshots** com o campo **Série** preenchido como `keeper` e o ano vazio para gerar todas as temporadas disponíveis.
