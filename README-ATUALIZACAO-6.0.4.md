# AMBO Sleeper 6.0.4

Esta atualização adiciona suporte real a co-owners nos rosters do Sleeper.

## Ajuste aplicado

Quando um roster possui `owner_id` e `co_owners`, o site compara o nome da equipe com o username e o display name dos co-owners. Se houver correspondência exata, o co-owner correspondente é usado como manager principal.

Isso corrige a Série B de 2023: o roster com nome `Jptavares`, cujo owner técnico era dedebenjor e cujo co-owner era Jptavares, passa a exibir Jptavares.

## Após publicar

Rode novamente a Action para 2023 / Série B, pois snapshots antigos não armazenavam `co_owners`.
