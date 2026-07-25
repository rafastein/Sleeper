# AMBO Sleeper 6.0.2

Correção da sincronização da Keeper por temporada.

A API do Sleeper pode não listar uma liga antiga para o usuário usado na descoberta, por exemplo se ele saiu da liga, utilizou outra conta ou a competição não estiver vinculada ao seu perfil atual. Agora a Keeper é um recorte opcional: se nenhuma liga correspondente for encontrada, a Action registra um aviso e continua sincronizando as demais ligas.

A sincronização ainda falha quando encontra mais de uma candidata para a Keeper, evitando escolher uma liga ambígua automaticamente.
