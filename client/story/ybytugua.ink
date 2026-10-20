// Ybytuguá, a cidade livre (AGENTS.md §2 e §6, ato 1 e fim). Morre devagar: barcos afundam nos baixios abaixo
// dela, a cheia veio cedo e o Ykuruã acordou. O conselho de guildas oferece o contrato; o contrato exige quem saiba
// ler; Xanduí escolhe Endyru. O trio se forma aqui, na Mesa dos Contratos.
//
// O segredo de Xanduí vive pela forma, nunca pela fala: ela pede que Endyru leia "porque ele lê bonito", segura um
// aviso de cabeça pra baixo uma vez, e repete palavra por palavra o que ouviu (ver castelao, em ymonha.ink).
// Ninguém no jogo percebe.

VAR chegou = false
VAR contrato = false
VAR prova = false
VAR ato3 = false
VAR temperadas = false
VAR virou_aviso = false

// Um `trigger` no cais: a primeira vez que o barco encosta.
=== chegada_ybytugua ===
~ chegou = true
O cais de Ybytuguá está cheio de barcos fora d'água, virados de casco pra cima no barro. Ninguém descarrega nada. Uma família amarra trouxa em cima de trouxa num carrinho de mão.
O mercador paga a escolta ali mesmo, em cima dos sacos de sal, e não espera troco nem despedida.
Jarupã: Escolta de sal até Ybytuguá. Feita. Agora a gente vê se a cidade tem trabalho de verdade.
Xanduí: Na Mesa. Diz que o conselho paga em prata.
Jarupã: A gente se vê lá, estudante. Se o contrato for bom, a gente não se vê.
~ leave_party("jarupa")
~ leave_party("xandui")
Os dois sobem a rua do cais. Endyru já está olhando a mesma rua.
Oryndu: O barco fica aqui. Eu fico com o barco.
-> END

=== mercador ===
Mercador: Um de prata na lua passada. Dois nesta. Na próxima, o castelão cobra o barco inteiro.
Mercador: Ybytuguá está morrendo, rapaz. Eu não vou morrer junto.
-> END

// O conselho de guildas, na Mesa dos Contratos: oferece o contrato, e depois espera.
=== conselheira ===
{
    - ykurua_morto:
        Conselheira: O conselho já tem o seu relatório. Não precisa ler de novo pra mim.
        -> END
    - ato3:
        Conselheira: Os baixios são de vocês. A cheia não espera ninguém.
        -> END
    - ato2 && (prova || clock() >= 8):
        -> chamado
    - ato2:
        -> espera
    - contrato:
        Conselheira: Os baixios ficam a leste, depois do portão. O resto do pagamento sai no relatório.
        -> END
    - else:
        -> oferta
}

= oferta
Uma mulher de mangas arregaçadas e dedos de tinta atende sozinha a mesa comprida do conselho. Atrás dela, cadeiras vazias.
Conselheira: Contrato da cheia. Barco de carga afunda nos baixios abaixo da cidade, um por semana. Na língua dos portos, o Bebe-Cheia. Acordou cedo.
Conselheira: Vinte de prata. Dois na assinatura, o resto no relatório. O conselho quer o relatório escrito: quem assina tem de saber ler.
-> oferta_escolhas

= oferta_escolhas
* [Perguntar o que já tentaram.]
    Conselheira: Um grupo de rio acima, de três espadas. Entraram na água de manhã.
    Endyru: E?
    Conselheira: E o contrato continua no quadro.
    -> oferta_escolhas
* [Dizer que você puxa o bicho da água sozinho.]
    Endyru: Eu sou Página, de atração e repulsão. Eu puxo ele pra areia.
    Conselheira: Um bicho do tamanho de um barco de carga. Sozinho.
    Endyru: Hoje.
    Ela olha pra ele do jeito que se olha pra quem vai entrar no quadro como "o contrato continua".
    -> oferta_escolhas
+ [Aceitar.]
    -> trio

= trio
Antes que Endyru termine de dizer que aceita, Xanduí já está do lado dele.
Xanduí: Ele vai com a gente.
Jarupã: Vai?
Xanduí: O contrato pede quem lê. A minha letra não serve pra conselho.
Jarupã: A minha também não. Nunca serviu pra nada.
Conselheira: Então leiam. Quem assina responde.
Ela empurra o papel pela mesa. Xanduí empurra o papel pra Endyru.
Xanduí: Lê alto, estudante. Você lê bonito.
Endyru: "O conselho de guildas de Ybytuguá contrata a companhia abaixo. O contratado responde pelo bicho dos baixios, e pelo que lhe der causa, até a cheia baixar. Vinte de prata, dois na assinatura, dezoito contra o relatório escrito."
Jarupã: E a parte de quem fica?
Endyru: Isso é costume. Não está no papel.
Jarupã: Então escreve.
Endyru escreve na margem, em letra miúda, a parte de quem fica. Jarupã olha o papel e acena, satisfeito.
O escrivão da Mesa pede o nome da companhia. Jarupã diz um. Xanduí diz outro. Endyru escreve um terceiro, e ninguém reclama.
Escrivão da Mesa: Nível declarado?
Endyru: Página. Atração e repulsão.
Jarupã: Gryskar, segundo grau. Ela é Ipojy, segundo também.
Escrivão da Mesa: Fiança. Três de prata. Contrato largado no meio perde a fiança.
Jarupã conta a prata da escolta em cima da mesa, moeda por moeda, e faz cara de quem foi assaltado de dia.
Endyru assina. A conselheira põe duas moedas de prata em cima da assinatura, ainda molhada.
~ earn("prata", 2)
~ join_party("jarupa")
~ join_party("xandui")
~ contrato = true
~ clock_start("Cheia", 0, 12)
~ clock_cost("rest", 1)
~ clock_cost("fight", 1)
~ grant_xp(30)
Conselheira: A cheia sobe todo dia. Ela não espera contrato.
-> END

= espera
Conselheira: Vocês voltaram dos baixios andando. Já é mais do que o grupo de rio acima.
Endyru: Ele não acordou sozinho. O barqueiro diz que nunca acordou assim, tão cedo.
Conselheira: A guilda dos barqueiros diz muita coisa. Pergunte a ela. E pergunte rápido.
-> END

= chamado
{prova:
    Endyru põe o livro do castelão em cima da mesa comprida, aberto na página do selo.
    A conselheira lê em silêncio. Lê duas vezes. Fecha o livro com a palma da mão.
    Conselheira: O conselho vai ler isto. Depois. Agora, o bicho.
- else:
    Conselheira: A cheia está no alto. Os barcos que ainda flutuam vão sair amanhã, rio acima, de vez.
    Conselheira: Se vocês vão, é agora.
}
~ ato3 = true
-> END

=== escrivao ===
{contrato:
    Escrivão da Mesa: Está no livro. O nome da companhia, o nível, a fiança. Se morrerem, também fica no livro.
- else:
    Escrivão da Mesa: A Mesa não dá contrato, registra. Contrato quem dá é o conselho. A Mesa cobra a taxa dos dois lados.
    Escrivão da Mesa: Quem não sabe ler, eu leio o quadro por uma moeda.
}
-> END

=== quadro ===
O quadro de contratos tem um aviso só, pregado por cima de outros mais velhos e mais amarelos.
{in_party("xandui") && not virou_aviso:
    ~ virou_aviso = true
    Xanduí arranca o aviso do prego pra ver de perto. Segura um tempo, de cabeça pra baixo, e passa pra Endyru.
    Xanduí: Lê aí. Você lê bonito.
}
Endyru: "Contrato da cheia. O conselho de guildas paga vinte de prata a quem livrar os baixios do bicho. Quem assina tem de saber ler."
-> END

=== jarupa_mesa ===
Jarupã: Contrato de bicho paga melhor que escolta de sal. Fala com a mulher do conselho, estudante. A gente está esperando alguém que leia.
Jarupã: Não eu. Eu sei ler o principal.
-> END

=== xandui_mesa ===
Xanduí: A conselheira não fecha com quem não lê. Fala com ela.
-> END

// A guilda dos barqueiros: o que a gente do rio sabe (referencias/bestiario.md §1.4).
=== guilda ===
Um velho remenda uma rede no chão da guilda, com a rede inteira em cima das pernas.
{ykurua_morto:
    Mestre da guilda: O rio baixa. Os barcos voltam pra água semana que vem. Os que sobraram.
    -> END
}
-> perguntas

= perguntas
* [Perguntar do bicho.]
    Mestre da guilda: O Bebe-Cheia. Dorme no lodo dos baixios o ano inteiro e acorda com a cheia. Na água ninguém vence ele. Na areia ele seca e racha.
    Mestre da guilda: Na cheia, ninguém conjura no rio. Barqueiro usa verso pra puxar a rede e mais nada.
    -> perguntas
* [Perguntar como se sabe se ele está embaixo.]
    Mestre da guilda: Bate o remo no casco. Devagar. Ele responde ou não responde.
    Mestre da guilda: Pressa no rio é coisa de forasteiro. Os velhos tiram o barco da água e esperam a cheia passar.
    -> perguntas
* {ato2} [Contar que ele acordou bravo, cedo demais.]
    O velho para a rede no meio do nó.
    Mestre da guilda: Os barqueiros que sobem até a floresta das bacias ouvem leitura na margem, de noite. Leitura alta. Gente que não é do rio.
    Mestre da guilda: Na cheia.
    ~ note("leitura", "Barqueiros ouvem leitura alta na margem, de noite, rio acima, perto da floresta entre as bacias.")
    -> perguntas
+ [Deixar o velho com a rede.]
    -> END

// O ferreiro demônio: a receita é absurda e funciona (biblia §3.4; AGENTS.md §1.2).
=== ferreiro ===
{temperadas:
    Ferreiro: Funcionou? Funciona sempre. Não precisa voltar pra me contar.
    -> END
}
Um demônio de avental de couro, com as orelhas pontudas cheias de fuligem, bate um ferro na bigorna sem olhar quem entrou.
Ferreiro: Placa na porta. Leu?
-> conversa

= conversa
* [Perguntar se ele tempera espada pra couro de bicho de rio.]
    Ferreiro: Tempero. Receita velha. Três escamas de peixe do fundo, lodo dos baixios mexido contra a corrente, e uma unha de quem vai usar a espada.
    Jarupã: A unha?
    Ferreiro: Do pé.
    Jarupã: Do pé de quem?
    Ferreiro: De quem vai usar a espada. Já falei. Dois de prata pelas duas.
    -> conversa
* {money("prata") >= 2 && in_party("jarupa") && in_party("xandui")} [Pagar dois de prata pelas duas espadas.]
    ~ pay("prata", 2)
    Jarupã tira a bota antes de o ferreiro terminar de pedir.
    Xanduí: A minha não.
    Ferreiro: Então a sua espada fica como está.
    Xanduí olha pra própria espada um tempo. Tira a bota.
    O ferreiro mexe o lodo num balde contra o sentido do rio, joga as escamas, joga as unhas, e enfia as duas lâminas no balde com a cara de quem faz isso todo dia. As lâminas saem escuras e com um fio que não estava lá.
    ~ give_item("gear-espada-reta-temperada")
    ~ give_item("gear-espada-pesada-temperada")
    ~ temperadas = true
    Ferreiro: Agora entra em couro de bicho. Em couro de gente também. Não me conta qual.
    -> END
+ [Ir embora.]
    -> END

=== placa_forja ===
Uma tábua pregada na porta da forja, em letra de quem escreve com ferro em brasa.
Endyru: "Ferreiro. Afio o que corta. Não afio conversa."
{in_party("jarupa"):
    Jarupã: O que diz?
    Endyru lê de novo, igual.
}
-> END

=== familia ===
Uma mulher amarra a última trouxa no carrinho de mão. Uma criança senta em cima das trouxas como se fosse um barco.
Mulher da família: O conselho diz que contrata alguém. O conselho diz muita coisa.
Mulher da família: A gente vai rio acima. Pra onde tem senhor, e muro, e ninguém precisa contratar ninguém.
-> END

=== barco_ybytugua ===
{ato2:
    -> subir
}
Oryndu: O barco fica aqui. Agora o trabalho é a pé.
-> END

= subir
Oryndu: Rio acima é contra a corrente. Chega no castelo antes do escuro.
+ [Subir até o castelo de pedágio.]
    ~ travel("ymonha", "barco")
    -> END
+ [Ficar.]
    -> END

// O caminho da floresta, com a cheia no alto.
=== vau_coberto ===
A cheia cobriu o vau da floresta. Da estrada só se vê a água marrom, correndo onde era o caminho.
-> END

// Uma semana depois do bicho (gatilho em frente à Mesa, depois de final_fim em baixios.ink).
=== fim ===
~ clock_stop()
Uma semana depois, a cheia baixou dois palmos. Os primeiros barcos voltam pra água, tortos, cheios de remendo.
A conselheira paga o relatório em cima da mesa comprida. Dezoito moedas de prata, em três pilhas de seis.
~ earn("prata", 6)
Conselheira: O conselho assinou com Ymboripe hoje de manhã.
Endyru: Vocês leram o livro do castelão.
Conselheira: Lemos. E lemos o que a próxima cheia faz com uma cidade sem senhor.
Ela guarda a pena. Não há mais nada no quadro de contratos.
Na guilda dos barqueiros, cada um dos três conta duas moedas em cima da mesa do mestre. Ninguém diz pra quem são.
{pay("prata", 2):
    Mestre da guilda: Eu sei pra quem é.
}
No cais, Jarupã já arranjou outra escolta, rio abaixo, de pano.
Jarupã: Paga mal. Ninguém morre.
Endyru dá a Xanduí uma cópia do relatório, com o nome da companhia e os três nomes embaixo, na letra dele.
Xanduí dobra o papel duas vezes e guarda dentro da camisa.
Xanduí: Vou ler com calma.
Jarupã: Lê pra mim depois.
Xanduí: Leio.
Endyru sobe o rio pra Kuatiarape num barco que não é de Oryndu. O nariz parou de sangrar faz dois dias. As mãos já não tremem.
-> END
