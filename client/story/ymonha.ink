// O Ymonhã, no Castelo da Volta, o castelo de pedágio: a abertura do jogo (AGENTS.md §6) e, no ato 2, o castelo
// visto por terra. Mbyraku, o castelão, luta no ato 2 na ponte do afluente (floresta.ink).
//
// A abertura começa com ação: a corrente sobe na frente do barco e um virote crava no costado. O pedágio subiu de
// novo, e há três saídas — pagar, convencer (Lábia de Endyru) ou lutar. Ensina a luta, o voto de Xanduí (ela não
// abre; Jarupã abre) e a pressa de Endyru (Oryndu o segura: "Não no rio, rapaz.").

VAR pedagio_resolvido = false
VAR castelao_vencido = false

// Um `trigger` em cima do barco, onde o jogo começa: uma vez só.
=== abertura ===
~ earn("cobre", 9)
~ join_party("oryndu")
~ join_party("jarupa")
~ join_party("xandui")
O barco de Oryndu desce o Ymonhã carregado de sacos de sal. Atrás dos sacos, onde a margem não o vê, vai sentado o mercador. Na proa, a escolta: ele amola uma espada pesada; ela confere as correias da bainha. Na popa, um estudante conta nove moedas de cobre pela terceira vez.
Oryndu bate o cabo do remo no casco. Uma batida seca. Espera. Escuta.
Endyru: Furou?
Oryndu: Estou medindo o fundo. A cheia subiu três dedos antes da lua certa.
Xanduí: O que tanto você escreve aí, estudante?
Endyru: A medida da linha entre dois corpos. Quanto um puxa o outro, a quantos passos, e com que...
Jarupã: Ah. Empurrar coisa.
Um sino de ferro bate na margem.
Uma corrente sobe da água na frente do barco, pingando lodo, de uma margem à outra.
Um virote crava no costado, a um palmo da mão de Endyru.
Oryndu: Segura.
O barco bate na corrente e para. Na margem norte, o Castelo da Volta: pedra embaixo, madeira em cima. No cais, um guincho com a corrente enrolada, dois guardas de chuço, um besteiro na sombra do muro e um sargento com uma tábua de preços.
Sargento do pedágio: Pedágio. Dois de prata pelo barco. Três de cobre por cabeça.
De trás dos sacos, sem se levantar:
Mercador: Era um de prata na lua passada.
Sargento do pedágio: Na lua passada não tinha cheia. Rio cheio é rio perigoso. Perigo se paga.
Jarupã: Escuta o Jarupã, que eu já passei por três pedágios desses só neste inverno. Guarda de corrente só sabe contar até cinco.
Xanduí: Então conta você. Eu não começo.
-> escolhas

= escolhas
* {money("cobre") >= 3} [Pagar a sua cabeça. O mercador que pague o barco.]
    Mercador: Dois de prata. Por um rio que era de todo mundo.
    Ele paga, contando devagar, pra o sargento ver que dói.
    ~ pay("cobre", 3)
    Endyru paga a cabeça dele. A da escolta, o mercador paga junto, resmungando que escolta devia vir com a cabeça incluída.
    -> passa
* [Citar o tratado fluvial das cidades livres.]
    Endyru: O tratado das cidades livres do Ymonhã, artigo sétimo. Pedágio de margem não sobe na cheia sem aviso de uma lua inteira, pregado em...
    O sargento cospe na água.
    Sargento do pedágio: Papel de Kuatiarape aqui só serve pra acender cachimbo.
    -> escolhas
* [Ler a tábua do pedágio e discutir. # check: labia 13]
    A tábua está pregada no poste do cais. O preço de cima foi raspado e reescrito a carvão; o selo do senhor da margem está embaixo do preço velho, não do novo.
    {passed():
        Endyru: O selo está no preço de antes. Esse aí do carvão quem escreveu foi o senhor?
        O sargento olha pra tábua. Não sabe ler; sabe que um rapaz que lê alto no cais, na frente de barqueiro, é problema.
        Sargento do pedágio: Um de prata pelo barco. E some daqui.
        O mercador paga antes que alguém mude de ideia.
        -> passa
    - else:
        Endyru: O selo está no preço de antes, e esse aí do carvão...
        Sargento do pedágio: Quem lê aqui é o castelão. Paga ou volta.
        -> escolhas
    }
+ [Recitar o Empurrão na corrente e arrancá-la do poste.]
    Endyru abre o livro na página. A mão de Oryndu fecha em cima da dele, molhada e fria.
    Oryndu: Não no rio, rapaz. Na cheia ninguém grita com a água.
    Endyru: É uma página só.
    Oryndu: É a cheia.
    Ele não solta até Endyru fechar o livro.
    -> escolhas
* [Deixar que Jarupã discuta.]
    Jarupã: Deixa comigo.
    Xanduí põe a mão no punho da espada e não tira a espada.
    Xanduí: Eu não começo.
    Jarupã: Eu sei. Deixa que eu abro.
    Oryndu olha o guincho no cais: um tambor de madeira com a corrente enrolada e uma trava de ferro em cima.
    Oryndu: Solta aquela trava e a corrente desce sozinha. Com a mão, rapaz. Sem verso.
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

// A deixa `used` do guincho: soltou a trava, a corrente desce e o barco escapa rio abaixo, sob virotes.
=== pedagio_guincho ===
~ pedagio_resolvido = true
A trava salta. O tambor gira solto, e a corrente afunda de uma vez, arrastando lodo.
Oryndu: Pro barco. Agora.
Virotes batem no costado enquanto o barco pega a correnteza. Um passa entre Jarupã e o mercador e crava num saco de sal.
Jarupã: Raso. Pegou no sal.
O barco desce a corredeira abaixo do castelo de lado, raspando pedra, e só endireita depois da curva.
~ travel("ybytugua", "cais")
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
Por terra, o Castelo da Volta é outro castelo: um muro de costas pra estrada, um portão aberto pro rio, e a guarda da estrada de olho em quem desce a margem a pé.
{castelao_vencido:
    O guincho está parado, com a corrente frouxa dentro d'água. Lá no alto do muro não tem ninguém.
    Jarupã: Sem dono, a corrente afunda sozinha.
- else:
    Oryndu: Daqui o castelão vê o rio inteiro. O que passa e o que afunda.
}
-> END
