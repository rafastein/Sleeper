# Ajuste — remoção da coluna Pontos

Esta atualização remove a coluna **Pontos** somente da visualização do ranking histórico, tanto na tabela desktop quanto nos cards para celular.

Os pontos continuam existindo internamente para cálculos, perfis, exportação CSV e critérios secundários já utilizados pelo sistema.

## Aplicação

1. Execute `git pull`.
2. Copie o conteúdo desta pasta para a raiz do projeto, substituindo os arquivos existentes.
3. Execute `npm run check`.
4. Publique com:

```bash
git add .
git commit -m "Remove coluna de pontos do ranking histórico"
git push
```

O cache do PWA foi incrementado para `ambo-v5-4`, garantindo a atualização dos arquivos no navegador.
