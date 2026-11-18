# Atualização 8.0.0 — redesign mobile

Sem mudança de dados, de regras de classificação ou de cores. Não precisa sincronizar.

## Como aplicar

Com o repositório na 7.1.6, aplique os patches em ordem (ou o `redesign-completo.patch`, que reúne todos):

```bash
git apply --index etapa-1.patch   # e assim por diante até a etapa 8
git commit -m "AMBO 8.0.0 — redesign mobile"
git push
```

O CSS e o JS usam rede primeiro no service worker, e a versão do cache mudou para `ambo-v8.0.0-redesign-mobile`; quem instalou o app recebe o layout novo ao abrir com internet.

## O que mudou no celular (até 820 px)

| Tela | Antes | Depois |
|---|---|---|
| Início | ~5,8 telas | ~2,5 telas |
| Ranking histórico | ~11,4 telas | ~4,8 telas |
| Perfil | ~5,2 telas | ~2,4 telas |

- Barra superior com menu "⋯" e navegação inferior (Início, Temporada, Ranking, Campeões).
- A aba Temporada abre o seletor de ano e competição; o menu lateral continua no desktop.
- Indicadores em duas colunas, linhas compactas no histórico e no perfil, carrosséis no Início.

## Desktop

Mesmo layout. As únicas diferenças são a escala de fontes (textos pequenos ficaram um pouco maiores) e os rótulos mais curtos nos filtros.
