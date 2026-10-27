// Ybytuguá, a cidade livre (AGENTS.md §2 e §6, ato 1 e fim). Morre devagar: barcos afundam nos baixios abaixo
// dela, a cheia veio cedo e o Ykuruã acordou. O conselho de guildas oferece o contrato; o contrato exige quem saiba
// ler; Xanduí escolhe Endyru. O trio se forma aqui, na Mesa dos Contratos.
//
// O segredo de Xanduí vive pela forma, nunca pela fala: ela pede que Endyru leia "porque ele lê bonito", segura um
// aviso de cabeça pra baixo uma vez, e repete palavra por palavra o que ouviu (ver a ponte, em floresta.ink).
// Ninguém no jogo percebe.

VAR chegou = false
VAR contrato = false
VAR prova = false
VAR ato3 = false
VAR temperadas = false
VAR leu_edital = false

// Um `trigger` no cais: a primeira vez que o barco encosta.
=== chegada_ybytugua ===
~ chegou = true
O cais de Ybytuguá está cheio de barcos fora d'água, virados de casco pra cima no barro. Ninguém descarrega nada. Uma família amarra trouxa em cima de trouxa num carrinho de mão.
O mercador desce do barco primeiro, abre um saco com a faca e enfia a mão. O sal sai em pedra, empapado de rio.
Mercador: Molhou. Metade da carga é pedra agora. Metade da escolta, então.
Ele põe três moedas de cobre na mão de Jarupã e já está subindo a rua do cais com os sacos que ainda servem antes de Jarupã fechar a mão.
Jarupã: Metade de quê? Era prata.
Xanduí: Era.
Jarupã: Três de cobre. Não paga a cerveja de hoje.
Xanduí: Então hoje não tem cerveja. Diz que o conselho paga em prata. Na Mesa.
Jarupã: A gente se vê lá, estudante. Se o contrato for bom, a gente não se vê.
~ leave_party("jarupa")
~ leave_party("xandui")
Os dois sobem a rua do cais. Endyru já está olhando a mesma rua.
Oryndu: O barco fica aqui. Eu fico com o barco.
-> END

=== mercador ===
Mercador: Um de prata na lua passada. Dois nesta. E o rio ainda molha o sal de graça.
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
    - leu_edital:
        -> oferta
    - else:
        Conselheira: O contrato está no quadro. Quem lê, lê. Quem não lê, paga o escrivão.
        -> END
}

= oferta
Uma mulher de mangas arregaçadas e dedos de tinta atende sozinha a mesa comprida do conselho. Atrás dela, cadeiras vazias. Jarupã e Xanduí chegam junto, um de cada lado de Endyru, como quem já é companhia.
Conselheira: O contrato da cheia. Leram?
Xanduí: Ele leu.
-> oferta_escolhas

= oferta_escolhas
* [Perguntar o que já tentaram.]
    Conselheira: Um grupo de rio acima, de três espadas. Entraram na água de manhã.
    Endyru: E?
    Conselheira: E o contrato continua no quadro.
    -> oferta_escolhas
* [Dizer que você puxa o bicho da água sozinho.]
    Endyru: Eu sou Página, de atração e repulsão. Do raso até a areia são uns vinte passos. Eu puxo ele.
    Conselheira: Um bicho do tamanho de um barco de carga. Sozinho.
    Endyru: Hoje.
    Ela olha pra ele do jeito que se olha pra quem vai entrar no quadro como "o contrato continua".
    -> oferta_escolhas
+ [Aceitar.]
    -> trio

= trio
Conselheira: Então assinem. Quem assina responde.
Ela empurra o livro de registro pela mesa. Xanduí empurra o livro pra Endyru, sem olhar pra página.
Jarupã: E a parte de quem fica?
Endyru: Isso é costume. Não está no papel.
Jarupã: Então escreve.
Endyru escreve na margem, em letra miúda, a parte de quem fica. Jarupã olha o papel de cabeça erguida e acena, satisfeito.
O escrivão da Mesa pede o nome da companhia. Jarupã diz um. Xanduí diz outro. Endyru escreve um terceiro, e ninguém reclama.
Escrivão da Mesa: Nível declarado?
Endyru: Página. Atração e repulsão.
Jarupã: Gryskar, Fio. Ela é Ipojy, Fio também. Dá Corpo, somando.
Escrivão da Mesa: Não soma.
Conselheira: Soma hoje. Fiança dispensada. O conselho tem pressa.
Endyru assina pelo próprio punho. A conselheira põe duas moedas de prata em cima da assinatura, ainda molhada.
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
{estaca:
    Endyru põe a estaca em cima da mesa comprida, com o ferro virado pra ela.
    Endyru: Ele não acordou sozinho. Estava no lodo, a vinte passos do canal.
    Conselheira: Ferro de Ymboripe tem em todo cais do Ymonhã. O conselho precisa de mais que um pau.
- else:
    Endyru: Ele não acordou sozinho. O barqueiro diz que nunca acordou assim, tão cedo.
}
Conselheira: A guilda dos barqueiros sabe o que sobe e desce o rio. Pergunte a ela. E pergunte rápido.
-> END

= chamado
{prova:
    Endyru põe a carta do castelão em cima da mesa comprida.
    A conselheira lê em silêncio. Chega nas assinaturas e para. Dobra o papel em quatro e põe a palma da mão em cima.
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
{
    - contrato:
        O edital da cheia continua pregado, com o lacre do conselho e o nome da companhia escrito embaixo, na letra de Endyru.
        -> END
    - leu_edital:
        Endyru: "Contrato de Corpo. Matar ou expulsar o Ykuruã dos baixios do sul."
        -> END
    - not chegou:
        Um quadro de contratos cheio de papel amarelo, e um edital grande por cima de todos, com lacre de cera.
        -> END
}
No quadro, por cima de papéis pequenos e amarelos, um edital grande com lacre de cera do Conselho das Guildas. Embaixo dele, o escrivão da Mesa espera, com a mão aberta.
Escrivão da Mesa: Uma moeda e eu leio.
Jarupã já está com a mão na bolsa. Xanduí segura o pulso dele.
Ela olha o edital de longe, com a cabeça inclinada, como quem avalia se um bicho morde. Depois aponta Endyru com o queixo.
Xanduí: Pra que dar moeda pra escrivão se o menino lê bonito? Lê aí pra gente, estudante.
Endyru: "Contrato de Corpo. O Conselho das Guildas de Ybytuguá paga vinte de prata a quem matar ou expulsar o Ykuruã dos baixios do sul. Dois na assinatura, dezoito contra o relatório. O contratado responde pelo bicho dos baixios, e pelo que lhe der causa, até a cheia baixar. Fiança dispensada por urgência."
Endyru: "A companhia contratada terá ao menos um letrado, que assine o livro da Mesa pelo próprio punho e entregue ao conselho relatório escrito do estado dos baixios, como exigem as guildas de seguro."
Jarupã: Assina lá, Xanduí.
Xanduí cruza os braços. Não pisca.
Xanduí: Minha letra é grande, Jarupã. Não cabe nessas linhazinhas de conselho. E escrivão de cidade livre implica com letra de mulher da estrada.
Xanduí: Chama o estudante. Três divide melhor que dois.
Endyru faz a conta. Sozinho, um Página não passa na Mesa por um contrato de Corpo. Os dois, sem quem assine, não passam da porta.
Endyru: A conselheira é ali.
~ leu_edital = true
-> END

=== jarupa_mesa ===
{leu_edital:
    Jarupã: Vai lá, estudante. Assina bonito.
- else:
    Jarupã: Contrato de bicho paga melhor que escolta de sal. Tem um edital no quadro do tamanho de uma porta.
    Jarupã: Eu não leio. Nunca precisei. O que importa alguém sempre fala alto.
}
-> END

=== xandui_mesa ===
Xanduí confere a fivela da bainha. Não levanta os olhos.
{leu_edital:
    Xanduí: A conselheira. Ali.
- else:
    Xanduí: O quadro, estudante.
}
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
* [Perguntar quem guia até os baixios.]
    Mestre da guilda: Ninguém desta guilda. Os barcos estão no seco, e ficam no seco.
    Mestre da guilda: Quem espera a cheia baixar vive até a seca.
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

// O ferreiro demônio: a receita é absurda e funciona (biblia §3.4; jogo.md §6.2). É um Verso de entropia cantado no
// compasso da bigorna; ninguém diz isso, Endyru só conta as batidas.
=== ferreiro ===
{temperadas:
    Thrykar: Funcionou? Funciona sempre. Não precisa voltar pra me contar.
    -> END
}
Um demônio de avental de couro, com as orelhas pontudas cheias de fuligem, bate um ferro na bigorna sem olhar quem entrou.
Thrykar: Placa na porta. Leu?
-> conversa

= conversa
* [Perguntar se ele tempera espada pra couro de bicho de rio.]
    Thrykar: Tempero. Banha de bagre cego. Três pregos de barco que afundou com carga paga. Trinta marretadas, cantando pra sogra morrer.
    Jarupã: Sogra de quem?
    Thrykar: Não importa de quem. Importa que morra. Dois de prata pelas duas.
    -> conversa
* {money("prata") >= 2 && in_party("jarupa") && in_party("xandui")} [Pagar dois de prata pelas duas espadas.]
    ~ pay("prata", 2)
    O demônio unta as duas lâminas com uma banha amarela que cheira a rio parado e põe três pregos verdes de ferrugem na brasa.
    Thrykar: Banha de bagre cego.
    Bate.
    Thrykar: Três pregos de barco que afundou com carga paga.
    Bate.
    Thrykar: Se a carga era roubada, o ferro entorta.
    Endyru: Como o senhor sabe se o bagre era cego?
    Thrykar: Ele não desviou da rede. Puxa o fole e cala a boca, que a conta é de trinta e você me fez falar no doze.
    Endyru puxa o fole. O demônio canta baixo, na língua dele, uma batida por sílaba. Endyru conta sem querer, como conta qualquer coisa. Dezoito. Dezenove. Para de contar no vinte e não diz nada.
    Jarupã: A gente tem que cantar junto?
    Thrykar: Vocês pagaram. Quem paga não canta.
    As lâminas saem escuras e com um fio que não estava lá.
    ~ give_item("gear-espada-reta-temperada")
    ~ give_item("gear-espada-pesada-temperada")
    ~ temperadas = true
    Thrykar: Agora entra em couro de bicho. Em couro de gente também. Não me conta qual.
    -> END
+ [Ir embora.]
    -> END

=== placa_forja ===
Duas tábuas na porta da forja. A de baixo, na letra dos portos; a de cima, em runas cavadas a ferro quente.
Endyru: Embaixo: "Ferro e couro."
Endyru: Em cima: "Thrykar. Conserta o que você estragou. Não faço fiado."
{in_party("jarupa"):
    Jarupã: E o que você estragou?
    Endyru: Nada. É o que diz.
    Jarupã: Então a gente não entra.
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
{contrato && not ato2:
    Oryndu passa a mão no leme. Tem uma rachadura do tamanho de um palmo, da corrente do pedágio.
    Oryndu: Conserto de leme custa o que eu não tenho. Levo vocês até os baixios pela parte do contrato que fica comigo.
    Oryndu: No rio, ninguém conjura alto. Essa é a parte que fica com vocês.
    -> END
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
Endyru: Vocês leram a carta.
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
