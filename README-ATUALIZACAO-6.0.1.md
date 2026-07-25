# AMBO Sleeper 6.0.1

Esta versão consolida os playoffs, Keeper, ranking histórico e todos os ajustes visuais recentes.

## Correção das GitHub Actions

- `actions/checkout@v5`
- `actions/setup-node@v5`
- Node.js 24
- YAML sem passos ou propriedades duplicadas
- saída do sincronizador preservada no log com `tee`
- `pipefail` mantém o código de erro real do sincronizador

## Atualização recomendada

1. Execute `git pull` no projeto local.
2. Copie os arquivos do pacote seguro para a raiz do repositório.
3. Execute `npm run check`.
4. Publique com:

```bash
git add .
git commit -m "Atualiza projeto e corrige GitHub Actions"
git push
```

Depois, rode novamente a Action **Atualizar snapshots**. Se o sincronizador falhar, o fim do passo **Baixar e validar dados do Sleeper** exibirá a causa real.
