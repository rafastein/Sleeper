# AMBO • Central Sleeper

Painel estático para consultar o histórico de campeões e os rankings das ligas AMBO usando a API pública do Sleeper.

## Estrutura

- `index.html`: estrutura da interface;
- `styles.css`: identidade visual e responsividade;
- `config.js`: anos, IDs das ligas, nomes das séries e campeões;
- `script.js`: integração com a API, cálculo e renderização.

## Como executar

Como o projeto faz requisições externas, use um servidor local em vez de abrir o HTML diretamente:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Como adicionar uma temporada

Edite apenas `config.js`. Há duas formas.

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
        username: 'USUARIO_DA_SERIE_A',
        previousLeagueIds: ['ID_A_1_DE_2025', 'ID_A_2_DE_2025'],
        expectedLeagues: 2
    },
    serieB: {
        username: 'USUARIO_DA_SERIE_B',
        previousLeagueIds: ['ID_B_1_DE_2025', 'ID_B_2_DE_2025'],
        expectedLeagues: 2
    }
}
```

O painel consulta as ligas do usuário no ano indicado e cruza o campo `previous_league_id` com os IDs da temporada anterior. Em 2025, a Série A usa `Jptavares` e a Série B usa `rafastein` para localizar automaticamente as duas ligas de cada série.

Inclua também os campeões no array `champions` quando os resultados forem oficiais.

## Regra do ranking

A classificação final usa o campo `p` dos brackets do Sleeper. Em cada jogo de colocação, o vencedor recebe a posição `p` e o perdedor recebe `p + 1`.

Quando os playoffs ainda não terminaram ou o bracket está incompleto, as posições faltantes são preenchidas provisoriamente pela campanha da temporada regular, usando:

1. vitórias;
2. empates;
3. FPTS;
4. menor FPTS sofrido.

A pontuação de cada liga é calculada de forma dinâmica: em uma liga com `N` participantes, o 1º recebe `N` pontos, o 2º recebe `N - 1` e assim por diante.
