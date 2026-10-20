// O Ymonhã, no castelo de pedágio: a abertura do jogo (AGENTS.md §6) e, no ato 2, o castelão por terra.
//
// A abertura começa com ação: a corrente sobe na frente do barco e um virote crava no costado. O pedágio subiu de
// novo, e há três saídas — pagar, convencer (Lábia de Endyru) ou lutar. Ensina a luta, o voto de Xanduí (ela não
// abre; Jarupã abre) e a pressa de Endyru (Oryndu o segura: "Não no rio, rapaz.").

VAR pedagio_resolvido = false
VAR papel_do_recitador = false
VAR castelao_vencido = false

// Um `trigger` em cima do barco, onde o jogo começa: uma vez só.
=== abertura ===
~ earn("cobre", 9)
~ join_party("oryndu")
~ join_party("jarupa")
~ join_party("xandui")
O barco de Oryndu desce o Ymonhã carregado de sacos de sal, com um mercador sentado em cima deles, dois espadachins de escolta na proa e um estudante na popa, contando nove moedas de cobre pela terceira vez.
Uma corrente sobe da água na frente do barco, pingando lodo, de uma margem à outra.
Um virote crava no costado, a um palmo da mão de Endyru.
Oryndu: Segura.
O barco bate na corrente e para. Na margem norte, um castelo de pedra; no cais dele, dois guardas de chuço e um besteiro na sombra do muro.
Guarda do pedágio: Pedágio. Dois de prata pelo barco. Três de cobre por cabeça.
Mercador: Era um de prata na lua passada.
Guarda do pedágio: Era.
Jarupã: Eu acho que dá pra discutir isso com eles.
Xanduí: Discute você. Eu não começo.
-> escolhas

= escolhas
* {money("cobre") >= 3} [Pagar a sua cabeça. O mercador que pague o barco.]
    Mercador: Dois de prata. Por um rio que era de todo mundo.
    Ele paga, contando devagar, pra o guarda ver que dói.
    ~ pay("cobre", 3)
    Endyru paga a cabeça dele. A da escolta, o mercador paga junto, resmungando que escolta devia vir com a cabeça incluída.
    -> passa
* [Ler a tábua do pedágio e discutir. # check: labia 13]
    A tábua está pregada no poste do cais. O preço de cima foi raspado e reescrito a carvão; o selo do senhor da margem está embaixo do preço velho, não do novo.
    {passed():
        Endyru: O selo está no preço de antes. Esse aí do carvão quem escreveu foi o senhor?
        O guarda olha pra tábua. Não sabe ler; sabe que um rapaz que lê alto no cais, na frente de barqueiro, é problema.
        Guarda do pedágio: Um de prata pelo barco. E some daqui.
        O mercador paga antes que alguém mude de ideia.
        -> passa
    - else:
        Endyru: O selo está no preço de antes, e esse aí do carvão...
        Guarda do pedágio: Quem lê aqui é o castelão. Paga ou volta.
        -> escolhas
    }
+ [Recitar o Empurrão na corrente e arrancá-la do poste.]
    Endyru abre o livro na página. A mão de Oryndu fecha em cima da dele, molhada e fria.
    Oryndu: Não no rio, rapaz.
    Endyru: É uma página só.
    Oryndu: É a cheia.
    Ele não solta até Endyru fechar o livro.
    -> escolhas
* [Deixar que Jarupã discuta.]
    Jarupã: Deixa comigo.
    Xanduí põe a mão no punho da espada e não tira a espada.
    Xanduí: Eu não começo.
    Jarupã: Eu sei. Por isso eu começo.
    ~ start_fight("pedagio")
    -> END

= passa
~ pedagio_resolvido = true
A corrente desce pra dentro da água, devagar, com um guincho de roldana.
Lá no alto do muro, um homem de cota de escamas olha o barco passar e não desce.
-> END

// A deixa `burst` da luta do pedágio: alguém gastou mana demais de uma vez.
=== pedagio_pressa ===
Oryndu: Não no rio, rapaz!
-> END

// O grupo do pedágio vencido (onDefeat).
=== pedagio_vencido ===
~ pedagio_resolvido = true
O último guarda larga o chuço e levanta as mãos. Lá no alto do muro, um homem de cota de escamas olha o cais, olha o barco, e manda baixar a corrente sem dizer nada.
Mercador: Ninguém vai cobrar a gente rio abaixo por isso?
Jarupã: Cobrar o quê? Eles cobraram primeiro.
-> END

=== barco_ymonha ===
{not pedagio_resolvido:
    Oryndu: Com a corrente na frente, o barco não vai a lugar nenhum.
    -> END
}
Oryndu: Ybytuguá é rio abaixo. Meio dia, com a corrente a favor.
+ [Descer até Ybytuguá.]
    ~ travel("ybytugua", "cais")
    -> END
+ [Ficar mais um pouco.]
    -> END

// O portão do castelo, no ato 1: a gente do barco não entra.
=== guarda_portao ===
Guarda do portão: O castelão não recebe barqueiro. Pagou, desce. Não pagou, volta.
-> END

// O homem no alto do muro, no ato 1. Ninguém sabe ainda de que lado ele está.
=== castelao_muralha ===
Um homem de cota de escamas, no alto do muro, com as mãos para trás. Ele olha o barco como quem conta sacos.
Jarupã: Esse aí é o dono da corrente.
Xanduí: Dono da corrente não desce pra cobrar.
-> END

// Ato 2: o castelo pela estrada da margem, vindo da floresta.
=== castelo_por_terra ===
Por terra, o castelo de pedágio é outro castelo: um muro de costas pra estrada, um portão aberto pro rio, e a guarda da estrada de olho em quem desce a margem a pé.
{papel_do_recitador:
    Endyru: O pagamento sai daqui.
    Jarupã: Então a gente entra.
- else:
    Oryndu: Daqui o castelão vê o rio inteiro. O que passa e o que afunda.
}
-> END

// O castelão, no pátio, no ato 2 (inimigo passivo: só a história começa a luta).
=== castelao ===
O castelão não se levanta da mesa do pátio. Tem um livro aberto na frente, de contas, e a pena ainda molhada.
Castelão: O barqueiro, o estudante e a escolta do sal. Vocês pagaram o pedágio.
-> perguntas

= perguntas
* [Mostrar o papel do recitador.]
    Endyru põe o papel em cima do livro de contas. O selo de Ymboripe fica virado pra cima.
    Castelão: Ymboripe paga melhor que barco de sal. Paga até pelo barco que não passa.
    Endyru: Eles afundam os barcos de Ybytuguá. Você cobra a corrente e eles cobram o rio.
    Castelão: E quando a cidade assinar, quem cobra a corrente sou eu, com o selo deles. Vocês acham que é segredo o que um senhor de margem faz com a margem?
    -> perguntas
* [Dizer pra que foram contratados.]
    Castelão: Contrato de Ybytuguá não fala de castelo nenhum.
    Xanduí: "O contratado responde pelo bicho dos baixios, e pelo que lhe der causa, até a cheia baixar."
    Ela diz as palavras uma por uma, sem pressa, olhando pro castelão.
    Endyru: É isso mesmo que está escrito.
    Castelão: Então vocês vieram buscar a causa.
    -> perguntas
+ [Pedir o livro de contas.]
    Castelão: Venham buscar.
    Ele fecha o livro e se levanta, e a espada sai da bainha antes de ele terminar de levantar.
    ~ start_fight("castelo")
    -> END

// O castelão vencido (onDefeat).
=== castelao_caiu ===
~ castelao_vencido = true
~ prova = true
O castelão está sentado no chão do próprio pátio, com a mão no flanco e os olhos no livro de contas, que ficou aberto em cima da mesa.
Endyru lê em voz alta, porque Xanduí pede.
Endyru: "De Ymboripe, pela corrente fechada aos barcos de sal, de pano e de grão, rumo a Ybytuguá. De Ymboripe, pelos leitores na margem. De Ymboripe, pelo silêncio."
Xanduí: Lê de novo a última.
Endyru: "Pelo silêncio."
~ note("livro_da_corrente", "O livro de contas do castelão: pagamentos de Ymboripe pela corrente fechada aos barcos de Ybytuguá, pelos leitores na margem e pelo silêncio.")
Jarupã fecha o livro, enfia debaixo do braço e olha pro castelão.
Jarupã: Pelo silêncio, você vai ficar quieto aí.
~ grant_xp(50)
-> END
