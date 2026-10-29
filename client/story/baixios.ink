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
VAR preparo = false

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
    Oryndu: Você está olhando a água de cima, rapaz. Olha o junco da beira: o caranguejo subiu três palmos na haste desde ontem.
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

// Ato 3: a cheia no alto, e a luta que não tem volta. Antes, o preparo na margem (jogo.md cena 3.1): os círculos
// gravados na margem seca e os barris de Jarupã, que o mapa põe de pé com `preparo`. Dá pra ir sem.
=== a_cheia ===
A cheia cobriu os bancos de areia. Sobrou uma língua de terra firme e pedra rachada onde a água ainda não chega. O redemoinho já está no meio do raso, esperando.
Oryndu desvira o barco e põe ele na água, na beira, com a vara cravada no lodo.
Oryndu: Eu seguro a margem com o barco. Vocês puxam. Devagar.
-> preparo_escolhas

= preparo_escolhas
* {not preparo} [Riscar os círculos na margem seca, antes de chamar o bicho.]
    Endyru risca três círculos de atração na pedra da margem, um embaixo do outro, com o texto em volta, letra por letra. Mede a corda até o canal duas vezes, com a corda.
    Jarupã: Da pedra até o canal é um estirão.
    Endyru: Dezoito passos. Se forem vinte, o Verso cai na água e eu sangro pelo nariz à toa.
    Jarupã rola dois barris de óleo do barco até a beira e crava as estacas do lado.
    Jarupã: Se ele subir na pedra, a gente acende o óleo. Bicho de rio não gosta de fogo.
    Xanduí: Ninguém gosta de fogo.
    Oryndu olha o céu escuro de chuva e combina o sinal: duas batidas de remo no casco, ele afasta o barco; três, ele chega.
    ~ preparo = true
    Oryndu: O bicho vai vir devagar, Endyru. Puxa um palmo, deixa a moça segurar o bote, puxa outro palmo. Se você despejar tudo de uma vez pra puxar inteiro, ele não sobe na pedra. Ele vira pro lado onde a palavra grande bateu. E no lado da água estou eu.
    Endyru: Eu sei a medida, Oryndu. Eu faço essa conta desde os quatorze anos.
    -> preparo_escolhas
* [Ainda não. Descansar antes.]
    Oryndu: A cheia espera um pouco. Pouco.
    -> END
+ [Entrar na água.]
    Jarupã: O bicho começa?
    Xanduí: O bicho começa.
    {preparo:
        Oryndu: Um círculo de cada vez. Encostado nele. A água vai subir e apagar os de baixo primeiro.
    - else:
        Oryndu: Sem círculo, é Verso pequeno, um palmo por vez. E esperar o couro secar na pedra.
    }
    ~ start_fight("final")
    -> END

// A deixa da luta final quando o Ykuruã chega à metade da vida (`hurt`): a chuva aperta e a água sobe (`rise`), e
// Endyru, recém-chegado ao Círculo, acha que aguenta a página inteira. A pressa (burst) e o barco de Oryndu
// (dismiss) são do roteiro, não escolha de quem joga. A luta continua depois daqui: o trecho só fala.
=== final_pressa ===
O bicho está com meio corpo na pedra quando a chuva aperta. A água sobe um degrau de uma vez, e ele começa a escorregar de volta pro canal.
Jarupã está com o braço aberto até o cotovelo, segurando a espada com a outra mão.
{prova:
    A lua da carta é amanhã.
}
Endyru conta: com Verso pequeno, um palmo por vez, são mais três fôlegos. Três fôlegos ele não tem.
Ele larga a medida. Abre o livro na página inteira e grita o verbo de uma vez, tudo, pra arrancar o bicho da água num puxão só.
O sangue desce do nariz na hora. As duas mãos começam a tremer.
O puxão arranca metade do Ykuruã do lodo. E o estouro bate na água inteira, como um sino tocado debaixo do rio.
O bicho para de puxar contra a pedra. Gira o corpo no raso, cego, na direção de onde a mana gritou.
Entre ele e Endyru está o barco de Oryndu, segurando a margem.
A cauda acerta o barco de lado. O bote vem atrás. O barco parte ao meio.
Oryndu cai na correnteza, embaixo das tábuas.
Endyru começa a recitar pra puxá-lo da água. A mão treme. O sangue entra na boca. O texto quebra na segunda linha, e texto quebrado não volta do meio.
Jarupã corre até a beira e mete o braço bom na água. Puxa o remo, partido.
Oryndu não sobe mais.
Jarupã: Estudante...
Endyru: Deixa. Verso pequeno. A gente tem...
Ele não termina. Limpa o sangue da boca com as costas da mão e abre o livro na primeira linha.
-> END

// O Ykuruã vencido (onDefeat do grupo final): o silêncio na margem (jogo.md cena 4.1). Ninguém comemora, ninguém
// dá sermão. Nasce ali o hábito de Endyru: ter a frase pronta sobre o que a pressa custa e guardá-la.
=== final_fim ===
O Ykuruã está morto na pedra, enorme, com o couro rachado como lodo seco. Cheira a lodo e a ferro.
Ninguém comemora.
Jarupã entra no raso até a cintura, atrás das tábuas do barco, e volta com o remo partido de Oryndu. Amarra o remo nas costas com a correia da bainha. Não faz piada.
Xanduí limpa a espada reta num tufo de capim. Olha as mãos de Endyru, que ainda tremem, e o nariz sujo de sangue seco. Não diz nada. Aperta o ombro dele uma vez, curto, como quem confere se uma corda ainda aguenta, e sobe o barranco.
Endyru olha a água barrenta levando as tábuas rio abaixo. Abre a boca.
Fecha.
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
