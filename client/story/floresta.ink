// A floresta entre as bacias, terra de ninguém (AGENTS.md §2 e §6, ato 2). Seguindo a margem, o trio acha a
// resposta: homens do ducado de cima, Ymboripe, andam conjurando grande no rio, de propósito, pra acordar o Ykuruã e
// matar o comércio de Ybytuguá. Cidade sem comércio aceita senhor. É política humana, explicada no próprio ato.

VAR visto_tabuleta = false

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

// Os batedores contratados vencidos (onDefeat): a Tsvirana, paga pelo ducado. Depois, a Cura em Jarupã.
=== contratados_caem ===
O que ainda está de pé larga a espada e levanta as mãos.
Contratada: Batedora. Assinei numa Mesa rio acima. O papel não dizia pra quem.
Endyru: E você não leu?
Contratada: Leram pra mim.
Jarupã: Agora você sabe.
Ela some no mato sem a espada. Jarupã senta numa raiz e olha a canela: um talho comprido, aberto, sangrando na bota.
Jarupã: Raso. Não apareceu osso, é raso.
Xanduí: Tá enchendo a bota.
Endyru se ajoelha e põe a mão em cima do talho. Diz a cura baixo, devagar, a medida do corte em dedos. A carne fecha embaixo da mão dele como barro secando.
Jarupã fica branco. Cai sentado de vez, suando frio, puxa o pão duro da mochila e come metade de uma mordida só.
Jarupã: Magia de estudante é igual imposto. Tira de um buraco e abre outro na barriga.
Endyru: A cura acelera o corpo. Quem paga é o...
Jarupã: Eu sei quem paga. Tô pagando.
-> END

// Uma noite de acampamento antes do vau: o giz e os dados (um `trigger` de uma vez só).
=== acampamento ===
Acampam antes do vau, com o fogo baixo pra não chamar ninguém. Endyru risca um círculo de giz numa pedra chata, pra mostrar.
Endyru: Olha. Se a linha não fecha, a medida não fecha. Fica um buraco aqui, de um dedo, e tudo que eu puser dentro escapa por ele.
Jarupã: Por um dedo.
Endyru: Por um dedo.
Jarupã pega o giz da mão dele, apaga o círculo com a palma e risca quatro tracinhos na pedra.
Jarupã: Placar. Dados. Você é o primeiro tracinho.
{pay("cobre", 3):
    Três rodadas depois, os tracinhos são todos de Jarupã, e três cobres de Endyru estão do lado do fogo, do lado de Jarupã.
    Jarupã: Por um dedo.
- else:
    Endyru não tem com que apostar. Jarupã joga sozinho, contra o próprio placar, e perde.
}
Xanduí, deitada de costas pro fogo, sem abrir os olhos:
Xanduí: Fecha o círculo, estudante. Senão escapa.
-> END

// Uma tabuleta de fronteira caída na trilha. Xanduí a vira; Endyru lê.
=== tabuleta ===
Uma tabuleta de fronteira caída na trilha, ainda presa por um prego ao toco onde estava pregada.
{in_party("xandui") && not visto_tabuleta:
    ~ visto_tabuleta = true
    Xanduí para na frente dela, olha séria, e endireita a tábua no toco. Fica de cabeça pra baixo.
    Xanduí: Madeira boa. Endyru, vê se o nome do duque tá escrito direito aí.
    Endyru torce o pescoço e lê.
}
Endyru: "Passagem fechada por ordem do duque de Ymboripe. Quem passar paga com o que leva."
{in_party("jarupa"):
    Jarupã: A gente não leva nada.
    Xanduí: Então passa.
}
-> END

// Um marco na encruzilhada.
=== marco ===
Uma pedra de marco na encruzilhada, com letras cavadas e um selo de ducado, recente.
Endyru: "Daqui pra cima, Ymboripe."
Jarupã: Daqui pra cima é mato.
Endyru: Por enquanto.
-> END
