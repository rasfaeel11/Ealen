// A floresta entre as bacias, terra de ninguém (AGENTS.md §2 e §6, ato 2). Seguindo a margem, o trio acha a
// resposta: homens do ducado de cima, Ymboripe, andam conjurando grande no rio, de propósito, pra acordar o Ykuruã e
// matar o comércio de Ybytuguá. Cidade sem comércio aceita senhor. É política humana, explicada no próprio ato.

// Um `trigger` em quem chega pelo sul, vindo de Ybytuguá: a primeira vez.
=== floresta_chegada ===
Entre uma bacia e outra, a floresta não é de senhor nenhum. A trilha some e volta, e ninguém cuida dela.
Oryndu: Rio eu conheço. Isto aqui é mato.
Jarupã: Mato é bom. No mato ninguém cobra pedágio.
Xanduí: No mato ninguém cobra nada. Cobra antes.
-> END

// Um `trigger` perto da margem, a noroeste: a leitura alta que os barqueiros ouvem de noite.
=== leitura_na_margem ===
Na margem do rio grande, um rapaz de túnica lê alto, virado pra água, com um livro aberto nas duas mãos. Dois homens sem cor nenhuma na roupa vigiam a trilha de costas pra ele.
Não é verso de puxar rede. É uma página inteira de repulsão, lida devagar e certo, pra dentro da cheia.
Oryndu: Na cheia.
Endyru reconhece o texto. Sabe o tamanho do que vai bater na água quando ele terminar.
* [Gritar pra ele parar.]
    Endyru: Para! Rio abaixo tem gente!
    O rapaz não para de ler. Os dois homens se viram, e um deles já tem a espada na mão.
    ~ start_fight("recitador")
    -> END
+ [Ir pra cima antes que ele termine.]
    Xanduí: Eu não começo.
    Jarupã: Eu sei.
    ~ start_fight("recitador")
    -> END

// O recitador e quem o guardava vencidos (onDefeat): o papel.
=== recitador_caiu ===
~ papel_do_recitador = true
No meio das coisas do recitador, enrolado num pano encerado, um papel dobrado com um selo de cera. Endyru lê.
Endyru: "Ler na cheia, nos baixios abaixo de Ybytuguá e na margem rio acima, de três em três noites, até a cidade pedir senhor. Pagamento com o castelão da corrente."
Jarupã: O selo é de quem?
Endyru: De Ymboripe.
Xanduí: O ducado de cima.
Oryndu olha pro rio e não diz nada por um tempo.
Oryndu: O bicho não acordou. Acordaram ele.
~ note("papel", "O papel do recitador, com o selo de Ymboripe: ler na cheia, nos baixios e rio acima, até Ybytuguá pedir senhor. Pagamento com o castelão da corrente.")
-> END

// Os aventureiros contratados vencidos (onDefeat).
=== contratados_caem ===
O que ainda está de pé larga a espada e levanta as mãos.
Contratada: Escolta. Assinei escolta numa Mesa rio acima. O papel não dizia de quê.
Endyru: E você não leu?
Contratada: Leram pra mim.
Jarupã: Escolta de leitor de rio. Agora você sabe.
-> END

// Um marco na encruzilhada.
=== marco ===
Uma pedra de marco na encruzilhada, com letras cavadas e um selo de ducado, recente.
Endyru: "Daqui pra cima, Ymboripe."
Jarupã: Daqui pra cima é mato.
Endyru: Por enquanto.
-> END
