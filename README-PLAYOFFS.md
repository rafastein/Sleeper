# Atualização: chaveamento dos playoffs

Esta versão adiciona a visualização completa dos playoffs da AMBO.

## Recursos

- Keeper com um único chaveamento;
- Série A e Série B com seletor Liga 1/Liga 2;
- chave principal e chave de consolação;
- bracket horizontal no desktop;
- navegação por rodada no celular;
- placares, vencedor, campeão, BYE e partidas ainda indefinidas;
- prioridade para pontuações corrigidas pelo comissário;
- rota compartilhável e exportação CSV.

## Instalação segura

O pacote de atualização segura não contém a pasta `data/` e, portanto, preserva snapshots, usuários canônicos e IDs já descobertos.

```bash
git pull
npm run check
git add .
git commit -m "Adiciona chaveamento visual dos playoffs"
git push
```

## Atualizar os placares

Após o deploy, execute no GitHub:

1. **Actions**;
2. **Atualizar snapshots**;
3. **Run workflow**;
4. deixe ano e série vazios para atualizar todas as temporadas, ou informe apenas o ano desejado.

A Action consulta os matchups das semanas dos playoffs, atualiza `data/snapshots/` e cria um commit. O push dispara automaticamente um novo deploy na Vercel.

## URL de exemplo

```text
?view=playoffs&year=2025&series=keeper&league=1&bracket=winners
```
