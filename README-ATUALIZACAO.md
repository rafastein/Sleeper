# Atualização segura para a Etapa 2

## Antes de copiar os arquivos

No terminal do VS Code, dentro do repositório:

```bash
git pull
```

Isso baixa eventuais commits criados pela Action de snapshots.

## Pacote de atualização segura

O ZIP de atualização não contém a pasta `data/`. Portanto, ele não substitui:

- `data/managers.json`;
- `data/discovery-users.json`;
- `data/snapshots/manifest.json`;
- snapshots já gerados.

Copie os arquivos do ZIP para a raiz do projeto e permita a substituição dos arquivos com o mesmo nome.

Depois execute:

```bash
npm run check
git add .
git commit -m "Adiciona ranking histórico e perfis"
git push
```

## Preencher o ranking histórico

No GitHub:

1. abra **Actions**;
2. escolha **Atualizar snapshots**;
3. clique em **Run workflow**;
4. deixe o campo do ano vazio;
5. execute.

A Action sincronizará todos os anos configurados. Quando ela criar o commit em `data/`, o Vercel publicará a nova base automaticamente.

## Pacote completo

Use o ZIP completo somente quando o projeto ainda não recebeu a Etapa 1 ou quando você deseja reinstalar toda a estrutura. Se já houver snapshots gerados, faça backup da pasta `data/` antes de substituir o projeto completo.
