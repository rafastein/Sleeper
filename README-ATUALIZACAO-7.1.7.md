# Atualização 7.1.7 — etapa 1 (correções)

Sem mudança de dados e sem nova sincronização.

- Link do Hall de campeões (`?view=champions`) agora abre o Hall, e não o Início. Antes, "Copiar link" e "Compartilhar" nessa tela geravam um link que caía no Início.
- Perfil: "participaçãoões" corrigido para "participações"; a descrição volta a mostrar "Keeper + Séries A + B" com maiúsculas.
- Trajetória do perfil no celular: sem o falso avatar com as iniciais do ano ("2·") e sem a colocação repetida.
- Recordes do Início: singular/plural corrigidos ("1 terceiro", "1 recorte").
- Novo helper `plural()` em `ambo-core.js`, com testes em `test/etapa-bugs.test.js`.
