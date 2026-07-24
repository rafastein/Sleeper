# AMBO • Central Sleeper

Painel estático para consultar o histórico de campeões e os rankings das ligas AMBO usando a API pública do Sleeper.

## Estrutura

- `index.html`: interface;
- `styles.css`: identidade visual e responsividade;
- `config.js`: anos, ligas, séries e campeões;
- `ambo-core.js`: regras puras de classificação, validação e identidade;
- `script.js`: carregamento dos dados e renderização;
- `data/`: cadastro canônico, `user_id`s persistentes e snapshots;
- `scripts/`: sincronização e validação dos dados;
- `test/`: testes automáticos;
- `.github/workflows/`: validação contínua e atualização automática dos snapshots.

## Como executar

Use um servidor local em vez de abrir o HTML diretamente:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

Também é possível usar a extensão **Live Server** do VS Code.

## Etapa 1: camada de confiabilidade

### 1. Testes automáticos

O projeto usa o test runner nativo do Node.js, sem dependências externas.

```bash
npm test
```

Os testes verificam, entre outros pontos:

- posições únicas e contínuas;
- distribuição de 12 a 1 ponto em ligas de 12 participantes;
- total obrigatório de 78 pontos por liga;
- deslocamento correto do losers bracket;
- fallback para temporada incompleta;
- FPTS com casas decimais;
- consolidação de contas antigas e novas do mesmo manager.

Para executar todos os controles:

```bash
npm run check
```

### 2. Snapshots das temporadas encerradas

O site procura primeiro um arquivo local validado:

```text
data/snapshots/2025/serieA.json
data/snapshots/2025/serieB.json
```

Se o snapshot ainda não existir, o site consulta a API do Sleeper normalmente.

Para gerar todos os snapshots configurados:

```bash
npm run sync
```

Para gerar somente 2025:

```bash
npm run sync:2025
```

Ou uma única série:

```bash
npm run sync -- --year 2025 --series serieA
```

O sincronizador interrompe o processo quando encontra:

- posição repetida;
- roster duplicado;
- sequência diferente de 1 até o total de participantes;
- pontuação incompatível com a posição;
- soma total incorreta;
- classificação provisória em uma temporada encerrada.

### 3. Atualização pelo GitHub Actions

Após enviar os arquivos ao GitHub:

1. abra a aba **Actions**;
2. selecione **Atualizar snapshots**;
3. clique em **Run workflow**;
4. informe `2025` para atualizar somente esse ano ou deixe vazio para todos;
5. aguarde o commit automático dos arquivos em `data/`.

O novo commit dispara uma nova publicação no Vercel.

### 4. Cadastro canônico dos managers

O arquivo `data/managers.json` representa cada pessoa por um `canonicalId` estável.

```json
{
  "canonicalId": "rafastein",
  "displayName": "rafastein",
  "sleeperUserIds": ["ID_ATUAL", "ID_ANTIGO"],
  "aliases": ["Rafa", "rafastein"]
}
```

O comando de sincronização adiciona automaticamente os `user_id`s e aliases encontrados. Quando duas contas pertencem à mesma pessoa, mova os dois IDs para o mesmo registro canônico e apague o registro duplicado.

### 5. `user_id` persistente

As contas usadas para descobrir ligas renovadas ficam em:

```text
data/discovery-users.json
```

Na primeira sincronização, o script resolve `Jptavares` e `rafastein` pelo username e salva seus IDs permanentes. Nas próximas execuções, a busca usa diretamente o `user_id`.

## Como adicionar uma temporada

Edite `config.js`.

### IDs informados diretamente

```js
2026: {
    serieA: ['ID_DA_LIGA_1', 'ID_DA_LIGA_2'],
    serieB: ['ID_DA_LIGA_1', 'ID_DA_LIGA_2']
}
```

### Descoberta automática de ligas renovadas

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

Inclua o novo ano em `data.snapshotYears` quando a temporada terminar e rode a sincronização.

## Regra do ranking

A classificação final usa o campo `p` dos brackets do Sleeper. Em cada jogo de colocação, o vencedor recebe a posição `p` e o perdedor recebe `p + 1`.

No losers bracket, quando a numeração reinicia em 1, o sistema soma a quantidade de times dos playoffs para transformar as posições em 7º a 12º.

Quando o bracket está incompleto, as posições restantes são preenchidas provisoriamente pela temporada regular, usando:

1. vitórias;
2. empates;
3. FPTS;
4. menor FPTS sofrido.

Em uma liga com `N` participantes, o 1º recebe `N` pontos, o 2º recebe `N - 1` e assim por diante.
