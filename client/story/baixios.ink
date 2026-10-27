// Os baixios, abaixo de Ybytuguá, onde dorme o Ykuruã (referencias/bestiario.md §1; AGENTS.md §5 e §6).
//
// Ato 1: a primeira ida não se vence. Na água, nada que se faz ao bicho pega (encounter-ykurua-desperto); a luta
// acaba por uma deixa, quando Oryndu tira o grupo da água — ou antes, se alguém conjurar grande.
// Ato 2: na margem, Endyru aprende a fazer as coisas devagar, e chega ao Círculo (mage_rise).
// Ato 3: a cheia no alto. No meio da luta, Endyru perde a paciência e solta o encantamento grande (a deixa `burst`,
// que não é escolha de quem joga). O bicho vem atrás da mana e vira o barco de Oryndu, que segurava a margem pro
// grupo (a deixa `dismiss`). Oryndu morre afogado. O resto da luta só se vence do jeito lento.

VAR ato2 = false
VAR circulo = false
VAR ykurua_morto = false
VAR estaca = false

// Um `trigger` em quem chega pela estrada de Ybytuguá: a primeira vez.
=== baixios_chegada ===
Abaixo da cidade, o Ymonhã se abre num raso largo, de água parada e marrom, com bancos de areia e pedra. No meio do raso, o casco de um barco de carga, com o fundo virado pro céu.
Oryndu tira o barco da água e vira de casco pra cima no lodo, como os velhos fazem na cheia.
Oryndu: Daqui pra frente, ninguém conjura.
-> END

// A margem, antes do contrato: ninguém paga pra entrar ali.
=== sem_contrato ===
Oryndu: Sem contrato, ninguém aqui te paga pra morrer.
-> END

// A primeira ida, no ato 1: o grupo chega na margem com o contrato assinado.
=== primeira_ida ===
Oryndu pega o remo e bate no casco do barco virado. Uma vez. Espera. Outra. Espera.
Endyru: A cheia sobe e você bate num barco.
Oryndu: Bato.
* [Esperar Oryndu terminar.]
    Ele bate a terceira vez. Lá no meio do raso, a água responde com um redemoinho lento, do tamanho de uma casa.
    Oryndu: Está embaixo. Acordado.
    Endyru: Então é agora.
    Oryndu: Não é.
    -> entra
+ [Entrar na água agora.]
    Oryndu: Pressa no rio é coisa de forasteiro.
    -> entra

= entra
Endyru já está com o pé na água. Jarupã passa por ele com a espada pesada na mão.
Jarupã: Bicho é bicho. Bate na cabeça, cai.
Xanduí: Vai lá. Bate na água. Quando a água cansar, você me avisa.
Oryndu: Se ele vier, todo mundo pra areia. Na água ele bebe o golpe.
~ start_fight("primeira")
-> END

// As deixas da primeira luta: a rodada 3 e o lugar da derrota. Oryndu tira o grupo da água.
=== primeira_oryndu ===
Oryndu entra no raso com a vara do barco, até a cintura, e puxa Endyru pela gola pra trás.
Oryndu: Pra trás! Na água ele bebe o golpe! Saiam pro junco alto!
Jarupã sai de costas, com a espada na frente. Xanduí sai por último, sem dar as costas pro redemoinho.
-> fora

= fora
~ ato2 = true
Na areia, ninguém fala por um tempo. A água do raso volta a ficar parada, como se nada tivesse passado por ali.
Oryndu: Na água, ninguém vence ele. Ninguém.
Oryndu: E ele não acordava assim. Não tão cedo. Não tão bravo.
~ note("baixios", "Nos baixios, na água, nada que se faz ao Ykuruã pega. Oryndu diz que ele não acordava assim, tão cedo.")
Na volta, pela beira, Oryndu para, enfia a mão no lodo até o cotovelo e puxa um pedaço de estaca, comprido como um braço.
Na cabeça da estaca, um ferro batido com letras cavadas. Em volta, na madeira, um círculo de atração riscado a faca, torto.
Endyru: "Ymboripe." Está no ferro.
Endyru: E o círculo está errado. Não fecha.
Oryndu: Não precisava fechar. Só precisava gritar.
~ estaca = true
~ note("estaca", "Uma estaca no lodo dos baixios, com ferro de Ymboripe e um círculo de atração riscado às pressas, aberto.")
~ grant_xp(50)
-> END

// A deixa `burst` da primeira luta: Endyru gastou mana demais de uma vez, e o bicho veio atrás.
=== primeira_pressa ===
A água inteira do raso se levanta na direção de Endyru, como se tivesse sido chamada pelo nome.
Oryndu agarra Endyru pela gola e arranca ele pra trás, pra areia, no tempo de o bicho fechar a boca onde ele estava.
Oryndu: Não no rio, rapaz!
Endyru tem sangue no lábio. Não sabe se é do nariz ou da queda.
-> primeira_oryndu.fora

// Ato 2, na margem: o jeito lento. Endyru chega ao Círculo.
=== margem ===
Oryndu senta na areia, ao lado do barco virado, e não faz nada a tarde inteira. Só olha a água.
Endyru tenta ficar parado. Dura pouco. Pega um galho e começa a riscar um círculo na areia molhada, com o texto em volta, letra por letra, do jeito que se ensina na universidade e que ninguém tem paciência de fazer.
A água apaga a primeira volta. Ele começa de novo, mais acima.
Jarupã: Quanto tempo isso leva?
Oryndu: O que levar.
O sol já está baixo quando o círculo fecha sem um erro. Endyru fica olhando pra ele, com o galho na mão, e não começa outro.
~ mage_rise(4)
~ circulo = true
Oryndu: Faz os teus círculos antes. Na hora, só acende.
~ grant_xp(50)
-> END

// Ato 3: a cheia no alto, e a luta que não tem volta.
=== a_cheia ===
A cheia cobriu os bancos de areia. O raso ficou fundo onde era raso, e o redemoinho já está no meio dele, esperando.
Oryndu desvira o barco e põe ele na água, na beira, com a vara cravada no lodo.
Oryndu: Eu seguro a margem com o barco. Vocês puxam. Devagar.
Endyru: Devagar.
Jarupã: O bicho começa?
Xanduí: O bicho começa.
* [Ainda não. Descansar antes, e preparar os círculos.]
    Oryndu: A cheia espera um pouco. Pouco.
    -> END
+ [Entrar na água.]
    ~ start_fight("final")
    -> END

// A deixa da rodada 3 da luta final: a pressa de Endyru (burst) e o barco de Oryndu (dismiss).
// A luta continua depois daqui: o trecho só fala.
=== final_pressa ===
Três rodadas puxando um bicho do tamanho de um barco, um verso de cada vez, e ele ainda tem metade do corpo na água.
Endyru abre o livro na página inteira e lê alto, de uma vez, tudo, rápido, pra acabar com isso.
O Ykuruã para de puxar contra o raso. Vira, devagar, na direção da voz.
Entre ele e Endyru está o barco de Oryndu, segurando a margem.
O barco sobe de lado e vira.
A vara fica cravada no lodo, sozinha.
Endyru sente o sangue descer do nariz e não consegue parar a mão.
-> END

// O Ykuruã vencido (onDefeat do grupo final).
=== final_fim ===
O Ykuruã morre na areia, com o couro rachado como lodo seco, e a água do raso escorre de dentro da boca dele por muito tempo.
Jarupã entra no raso atrás do barco virado. Xanduí segura a corda na margem. Endyru fica na areia, com sangue no queixo e as mãos tremendo.
Acham Oryndu de manhã, rio abaixo, preso no remo.
Ninguém diz nada a Endyru. Ele escreve o relatório na margem mesmo, com a mão que treme, antes que a água leve as letras da areia.
~ leave_party("oryndu")
~ ykurua_morto = true
~ travel("ybytugua", "depois")
-> END

=== barco_baixios ===
{ykurua_morto:
    O barco de Oryndu está de casco pra cima no lodo, onde os barqueiros da guilda deixaram.
    -> END
}
O barco de Oryndu, puxado pra fora d'água, de casco pra cima.
Oryndu: Na cheia, barco fica em terra.
-> END

=== naufragio ===
Uma barcaça de grãos com o fundo aberto de baixo pra cima, como uma casca. O grão inchou na água e escorre pelas tábuas. Ninguém tirou a carga. Ninguém vai tirar.
-> END

// Um rochedo na margem: alguém conjurou ali antes do grupo.
=== rochedo ===
Num rochedo da margem, um arco de cinza branca, e em volta dele a pedra queimada, rachada em lascas finas, como pedra que esquentou rápido demais.
Endyru passa o dedo na cinza.
Endyru: Giz. De riscar círculo.
Oryndu: Barqueiro não risca nada na pedra.
~ note("giz", "Num rochedo dos baixios, cinza de giz em arco e a pedra queimada em volta.")
-> END
