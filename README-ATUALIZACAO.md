# Atualização segura para a Etapa 3

## Antes de copiar os arquivos

No terminal do VS Code, dentro do repositório:

```bash
git pull
```

Isso baixa eventuais commits criados pela Action de snapshots.

## Pacote de atualização segura

O ZIP de atualização não contém a pasta `data/`. Portanto, ele preserva:

- `data/managers.json`;
- `data/discovery-users.json`;
- `data/snapshots/manifest.json`;
- todos os snapshots já gerados.

Copie os arquivos para a raiz do projeto e permita a substituição dos arquivos com o mesmo nome. Depois execute:

```bash
npm run check
git add .
git commit -m "Adiciona URLs compartilháveis, filtros e exportação"
git push
```

A Vercel publicará a nova versão automaticamente após o push na branch `main`.

## Conferência rápida

Depois do deploy:

1. abra uma temporada e copie o link;
2. cole o link em uma nova aba e confirme que a mesma temporada abre;
3. teste a busca e a ordenação;
4. exporte um CSV;
5. confira os cards em uma tela de celular.

## Pacote completo

Use o ZIP completo somente para reinstalar toda a estrutura. Se já houver snapshots reais, faça backup da pasta `data/` antes de substituir o projeto completo.
