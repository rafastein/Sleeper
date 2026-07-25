# Correção GitHub Actions — Node.js 24

Substitua a pasta `.github/workflows` do projeto pelos arquivos deste pacote.

A alteração:
- troca `actions/checkout@v4` por `actions/checkout@v5`;
- troca `actions/setup-node@v4` por `actions/setup-node@v5`;
- usa Node.js 24 no workflow;
- imprime as versões de Node e npm;
- preserva a mensagem completa do sincronizador no log.

Depois execute novamente a Action **Atualizar snapshots**.
