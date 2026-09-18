# Atualização 7.1.5 — Home e classificações

## Alterações solicitadas

1. “Última temporada” passa a ser “Temporada atual”.
2. O texto do bloco histórico termina em “Keeper, Série A e Série B.”, sem “reunidos em uma central viva.”.
3. “Temporada mais recente” e o botão correspondente passam a usar “Temporada atual”.
4. O card Keeper da Home mostra um líder por grupo, com nome do grupo, campanha e FPTS; não mostra pontos de ranking nem um pódio geral. Os nomes são calculados pelos dados de cada grupo, não fixados no código.
5. As ligas individuais usam o mesmo formato compacto do ranking combinado no celular. Exibem manager, equipe se diferente, campanha V–D e FPTS. Havendo empates, usam V–D–E. Os pontos de ranking ficam apenas nas Séries A/B.
6. O bloco da temporada atual fica no início da Home, abaixo de “Acompanhe a temporada atual e revisite campeões, rankings, playoffs e trajetórias históricas.”.

A classificação final da Keeper também deixa de mostrar pontos de ranking. Suas posições finais, resultados dos playoffs, títulos e histórico não são alterados. Dados ausentes não são substituídos por líderes presumidos.

## Instalar sobre a 7.1.4

Rode `git status` antes de começar. Se houver um merge ou rebase em andamento, conclua-o antes de copiar os arquivos. Faça uma cópia de segurança e preserve alterações locais próprias.

Substitua somente estes arquivos do projeto pelos correspondentes do ZIP:

- `index.html`
- `script.js`
- `styles.css`
- `sw.js`
- `package.json`
- `package-lock.json`
- `test/home.test.js`
- `test/keeper-render.test.js`

Adicione o novo arquivo `test/home-cards.test.js`. Opcionalmente, atualize `README.md`, `CHANGELOG.md` e este guia.

**Não substitua a pasta `data/`.** Esta versão não altera snapshots, cadastro de managers nem resultados e não exige rodar a sincronização novamente. Os líderes da Home continuam usando os snapshots salvos pela sincronização; a página de classificação da temporada em andamento continua consultando o Sleeper.

Na raiz do projeto, execute:

```powershell
npm run check
py -m http.server 8000
```

Confira a Home, as Séries A e B e a Keeper em uma largura de celular. Verifique especialmente:

- os destaques da temporada aparecem antes do bloco “A história da AMBO”;
- há três líderes na Keeper, cada um identificado pelo seu grupo, sem pontos nem pódio geral;
- cada liga individual mostra linhas compactas com a campanha;
- pontos combinados e campeões históricos permanecem iguais;
- classificações e playoffs continuam abrindo pelos botões.

No celular, feche e reabra o site após a publicação caso ainda veja a versão anterior. No computador, recarregue sem cache.

## Publicar

Somente após os testes passarem, confira `git status` e o conteúdo de `git diff`. Se as alterações listadas forem apenas as que você quer publicar:

```powershell
git add .
git commit -m "Atualiza Home e classificacoes compactas da AMBO"
git pull --rebase origin main
```

Se o pull terminar sem conflitos, execute `git push origin main`. Se surgir conflito, resolva-o antes de continuar; não use push forçado. A publicação na Vercel depende da integração já configurada no seu repositório.

O ZIP é um pacote de arquivos: não publica mudanças automaticamente no GitHub ou na Vercel.
