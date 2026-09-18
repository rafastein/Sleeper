# AMBO • Central Sleeper

Portal estático, compartilhável e responsivo para consultar a temporada mais recente, campeões, playoffs, rankings anuais e o desempenho histórico das ligas AMBO.

## Versão 7.1.4 — Keeper por grupos

A Keeper mostra os grupos da temporada regular de cada ano, com classificação reiniciando em 1 em cada grupo, campanha e FPTS. Nos anos concluídos, a classificação final após os playoffs aparece em um painel separado. Grupos não concedem títulos nem alteram o ranking histórico.

O pacote inclui grupos verificados para 2021–2026. Não há dados de grupos de 2020 ou anteriores no projeto. A recuperação usa o ID de cada liga/temporada, não a composição de 2026.

Para atualizar um repositório que já possui dados mais recentes, preserve sua pasta `data/`, atualize o código e execute `npm run sync:keeper:groups`. Esse comando recupera somente os campos de grupo dos snapshots Keeper existentes. Veja **README-AJUSTE-KEEPER.md** para instalação e teste.


## Versão 7.1 — temporada 2026

Keeper, Série A e Série B de 2026 usam o mesmo layout das temporadas anteriores. A classificação consulta o Sleeper ao abrir a página e a cada cinco minutos enquanto a aba estiver visível e conectada. O botão **Atualizar** permite uma nova consulta manual.

A campanha e os FPTS são os resultados acumulados disponibilizados pelo Sleeper, não uma projeção dos jogos em andamento. As posições e os pontos do ranking combinado são recalculados a cada consulta, seguindo as regras já usadas pela AMBO. Não há seletor para reconstruir classificações de rodadas anteriores.

- Temporada em andamento: dados consultados primeiro no Sleeper; classificação parcial.
- Falha na consulta: conserva a última classificação válida, com aviso e data da consulta anterior.
- Temporadas encerradas anteriores: continuam usando os snapshots oficiais.
- Classificações parciais não geram títulos ou estatísticas no ranking histórico oficial.
- A página inicial abre 2026. Seus destaques usam os snapshots da sincronização diária; a classificação consulta a API.
- O proxy mantém cache de até 60 segundos.

A Action **Atualizar snapshots** agora roda diariamente às 09:17 UTC (06:17 em Brasília), criando a cópia de segurança de 2026. A atualização das classificações abertas não depende dessa Action. A execução manual aceita 2026 em andamento; anos anteriores continuam exigindo classificação final, exceto com `--allow-fallback` explícito.

```bash
npm run sync:current
npm run check
```

Ao encerrar a temporada, sincronize novamente os resultados. Para abrir outra temporada ao vivo, cadastre as ligas e atualize `liveSeasonYear` em `config.js`.

## Versão 7 — página inicial

A raiz do site agora abre uma Home alimentada pelos snapshots e pelo Hall oficial. Ela reúne:

- resumo geral de temporadas, managers, títulos e recortes validados;
- pódio da temporada mais recente em Keeper, Série A e Série B;
- atalhos diretos para classificação e playoffs;
- recordes históricos calculados dinamicamente;
- campeões das três temporadas mais recentes;
- navegação **Início** no topo do menu.

A Home não possui exportação CSV. As demais telas continuam usando as rotas existentes, enquanto `/` representa a página inicial.

## Estrutura

- `index.html`: interface;
- `styles.css`: identidade visual e responsividade;
- `config.js`: anos, ligas, séries e campeões;
- `ambo-core.js`: classificação, identidade, histórico e validações;
- `script.js`: carregamento e renderização;
- `data/`: cadastro canônico, `user_id`s persistentes e snapshots;
- `scripts/`: sincronização e validação;
- `test/`: testes automáticos;
- `.github/workflows/`: controles de qualidade e atualização dos snapshots.

## Como executar

Use um servidor local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`. A extensão **Live Server** do VS Code também funciona.

## Verificação técnica

```bash
npm run check
```

Esse comando executa os testes e valida os snapshots locais.

## Etapa 1 — confiabilidade

O projeto possui:

- posições únicas e contínuas;
- distribuição dinâmica de pontos;
- total obrigatório de 78 pontos em ligas com 12 participantes;
- correção do deslocamento do losers bracket;
- snapshots locais validados;
- cadastro canônico dos managers;
- persistência de `user_id`;
- sincronização automática pelo GitHub Actions.

Para gerar somente 2025:

```bash
npm run sync:2025
```

Para gerar todo o histórico configurado:

```bash
npm run sync:history
```

Também é possível selecionar o recorte:

```bash
npm run sync -- --year 2025 --series serieA
```

## Etapa 2 — central histórica

### Ranking de todos os tempos

O menu **Ranking histórico** consolida o Hall oficial de campeões com os snapshots validados disponíveis. É possível filtrar por:

- Keeper, Série A e Série B combinadas;
- somente Keeper;
- somente Série A;
- somente Série B.

A tabela pode ser ordenada por:

- pontos históricos;
- títulos oficiais;
- vice-campeonatos;
- terceiros lugares;
- melhor média de colocação.

### Regra das estatísticas históricas

Cada snapshot de ano e categoria gera um ranking final daquele recorte. Série A e Série B combinam duas ligas; a Keeper usa sua liga única.

- **Pontos históricos:** soma dos pontos combinados em todos os recortes;
- **Título:** 1º lugar no ranking combinado anual da série;
- **Pódio:** posição entre 1º e 3º no ranking combinado anual;
- **Participação:** presença em um recorte de ano + série;
- **Melhor resultado:** menor colocação final alcançada;
- **Média:** média das colocações finais;
- **FPTS acumulado:** soma dos FPTS das ligas disputadas.

Snapshots marcados como provisórios não entram no ranking histórico oficial.


### Liga Keeper

A Keeper aparece junto da Série A e da Série B em todas as temporadas configuradas de 2020 a 2025. O sincronizador reutiliza o `user_id` já salvo para `rafastein` e seleciona a liga pelo nome. Para gerar apenas os snapshots da Keeper:

```bash
npm run sync -- --series keeper
```

### Perfis individuais

Clique no nome de qualquer manager no ranking histórico para abrir o perfil. O perfil apresenta:

- títulos, vice-campeonatos, terceiros lugares e pontos;
- melhor resultado e média;
- FPTS acumulado;
- trajetória por ano e série.

O ano de cada linha é clicável e abre diretamente a classificação correspondente.

### Cobertura do histórico

A interface lê `data/snapshots/manifest.json` e carrega apenas os arquivos realmente disponíveis. Para preencher 2020–2025, execute a Action **Atualizar snapshots** com o campo de ano vazio ou rode:

```bash
npm run sync:history
```


## Etapa 3 — experiência e compartilhamento

### Links permanentes

Cada tela grava seu estado na URL, incluindo:

- temporada e série abertas;
- ranking histórico e seu recorte;
- perfil individual;
- busca e ordenação ativas.

Exemplos:

```text
?view=season&year=2025&series=serieA
?view=history&series=serieB&sort=titles
?view=profile&manager=rafastein
```

Os botões **Copiar link** e **Compartilhar** usam exatamente esse endereço, e os botões voltar e avançar do navegador restauram a tela anterior.

### Busca e ordenação

O ranking histórico abre ordenado por títulos. Os empates são resolvidos por vice-campeonatos, terceiros lugares e, depois, pontos históricos. Também é possível escolher outras ordenações. O ranking da temporada permite buscar e ordenar por pontos, FPTS, melhor posição ou nome. A posição oficial continua visível mesmo quando outra ordenação é escolhida.

### Exportação CSV

O botão **Exportar CSV** gera o conteúdo correspondente à tela atual:

- hall de campeões;
- ranking histórico filtrado;
- trajetória de um perfil;
- ranking combinado da temporada filtrado.

O arquivo usa ponto e vírgula e inclui BOM UTF-8 para abrir corretamente em versões brasileiras do Excel.

### Experiência mobile

Em telas pequenas, as tabelas principais viram cards nativos, sem rolagem horizontal. Os cards preservam posição, avatar, pontuação e métricas essenciais.

## Atualização pelo GitHub Actions

1. abra **Actions** no GitHub;
2. selecione **Atualizar snapshots**;
3. clique em **Run workflow**;
4. deixe o ano vazio para sincronizar todas as temporadas;
5. aguarde o commit automático em `data/`.

O push criado pela Action dispara a nova publicação no Vercel quando o projeto está conectado à branch `main`.

## Cadastro canônico dos managers

O arquivo `data/managers.json` representa cada pessoa por um `canonicalId` estável:

```json
{
  "canonicalId": "rafastein",
  "displayName": "rafastein",
  "sleeperUserIds": ["ID_ATUAL", "ID_ANTIGO"],
  "aliases": ["Rafa", "rafastein"]
}
```

Quando duas contas pertencem à mesma pessoa, mantenha os IDs no mesmo registro canônico.

## Como adicionar uma temporada

Edite `config.js`.

### IDs diretos

```js
2026: {
    serieA: ['ID_DA_LIGA_1', 'ID_DA_LIGA_2'],
    serieB: ['ID_DA_LIGA_1', 'ID_DA_LIGA_2']
}
```

### Descoberta de ligas renovadas

```js
2026: {
    serieA: {
        discoveryKey: 'serieASeed',
        username: 'USUARIO_DA_SERIE_A',
        previousLeagueIds: ['ID_A_1_DE_2025', 'ID_A_2_DE_2025'],
        expectedLeagues: 2
    }
}
```

Inclua o ano em `data.snapshotYears` quando quiser armazenar snapshots dele.

## Regra da classificação anual

A classificação usa o campo `p` dos brackets. O vencedor recebe a posição `p` e o perdedor recebe `p + 1`.

Quando o losers bracket reinicia em 1, o sistema soma a quantidade de times dos playoffs para produzir as posições seguintes. Se o bracket estiver incompleto, as vagas restantes são preenchidas provisoriamente por:

1. vitórias;
2. empates;
3. FPTS;
4. menor FPTS sofrido.


## Etapa 4 — infraestrutura e produção

A versão 5 adiciona:

- proxy Vercel em `api/sleeper.js`, com allowlist e cache no CDN;
- fallback automático para a API pública do Sleeper;
- PWA instalável com service worker e modo offline para o shell e snapshots;
- Web Analytics e Speed Insights da Vercel;
- sincronização semanal automática do ano mais recente;
- cabeçalhos de segurança e políticas de cache em `vercel.json`;
- endpoint de saúde em `/api/health`;
- testes de infraestrutura.

### Ativar os painéis da Vercel

Após o deploy, abra o projeto na Vercel e habilite **Web Analytics** e **Speed Insights**. Os scripts já estão no `index.html`.

### Sincronização automática

A Action `Atualizar snapshots` continua aceitando execução manual e também roda diariamente às 09:17 UTC. Na execução programada, sincroniza apenas o ano mais recente configurado e permite snapshot provisório. Recortes provisórios continuam fora do ranking histórico oficial.

### Testar

```bash
npm run check
```

### Endpoints

- `/api/health`: confirma versão e disponibilidade do deployment;
- `/api/sleeper?path=/league/ID`: proxy interno com cache.
