# Atualização segura para a Etapa 4

Este pacote não contém a pasta `data/`, portanto preserva snapshots e `user_id`s.

## Instalação

```bash
git pull
```

Copie os arquivos deste ZIP para a raiz do repositório, permitindo substituir os existentes. Depois:

```bash
npm run check
git add .
git commit -m "Adiciona infraestrutura, cache e PWA"
git push
```

A Vercel fará o novo deployment automaticamente.

## Depois do deploy

1. Abra **Vercel → projeto Sleeper → Analytics** e habilite Web Analytics.
2. Abra **Speed Insights** e habilite o recurso.
3. Teste `/api/health`.
4. Abra o site no celular e confira a opção **Instalar app** quando o navegador disponibilizá-la.
5. Em GitHub → Actions, confira se `Atualizar snapshots` exibe também a agenda semanal.

## Observação

No Live Server, o site usa a API pública diretamente. No deployment da Vercel, tenta primeiro o proxy com cache e recorre à API direta se o proxy estiver indisponível.
