// A floresta entre as bacias, terra de ninguém (AGENTS.md §2 e §6, ato 2; jogo.md cenas 2.1 e 2.2). Seguindo a
// margem, o trio acha a resposta: Jurendy, mago da corte de Ymboripe, lê grande no afluente que desce pros baixios,
// de propósito, pra manter o Ykuruã acordado e matar o comércio de Ybytuguá, e Mbyraku, o castelão da corrente,
// guarda a ponte dele. Cidade sem comércio aceita senhor. É política humana, explicada no próprio ato.

VAR visto_tabuleta = false

// Um `trigger` em quem chega pelo sul, vindo de Ybytuguá: a primeira vez.
=== floresta_chegada ===
Entre uma bacia e outra, a floresta não é de senhor nenhum. A trilha some e volta, e ninguém cuida dela.
Oryndu: Rio eu conheço. Isto aqui é mato.
Jarupã: Mato é bom. No mato ninguém cobra pedágio.
Xanduí: No mato ninguém cobra nada. Cobra antes.
-> END

// Um `trigger` ao sul do afluente, a noroeste: a ponte de pedra, Jurendy lendo do barranco e Mbyraku segurando a
// ponte. A conta de Ymboripe é dita por quem a faz, sem vilania: é política humana (AGENTS.md §6, ato 2).
=== leitura_na_margem ===
Um afluente desce ali direto pros baixios, estreito e fundo, com uma ponte de pedra no meio. Do outro lado, um barranco alto.
Em cima do barranco, um rapaz de capa boa lê alto, virado pra água, com um livro aberto nas duas mãos. Na ponte, um homem de cota de escamas e dois escudeiros com a cor de Ymboripe na manga.
Não é verso de puxar rede. É uma página inteira de repulsão, lida pra dentro do rio que desce pros baixios.
Oryndu: Na cheia.
Jarupã: O da cota é o dono da corrente. Desceu do muro.
O rapaz do barranco para no meio do verso e fecha o livro com o dedo marcando a página.
Jurendy: Endyru. Da bancada de fundamentos.
Endyru: Jurendy.
Jurendy: Você largou Kuatiarape por duas moedas de prata. Eu lembro. O teu nome ficou riscado no mural das taxas a lua inteira.
Ele olha a bota de Endyru, a capa de estrada, os dois espadachins.
Jurendy: E agora é escolta de barqueiro.
Endyru: Contratado do conselho de Ybytuguá. O bicho dos baixios.
Jurendy: Então você trabalha pra nós também. Só que mais devagar.
-> conversa

= conversa
* [Perguntar por que ele lê no rio.]
    Jurendy: Porque sai barato. Faz a conta, Endyru. Guerra com Ybytuguá custa soldado e queima barcaça. Um bicho de rio fechando o porto por uma lua não custa nada ao duque. Uma leitura a cada duas noites, e um castelão que cobra a corrente e fecha a boca.
    Mbyraku não diz nada. Cospe no rio.
    Jurendy: Daqui a duas semanas eles mesmos abrem o portão e ainda pagam o jantar do duque. Você está sujando a bota por uma cidade que já comprou a tinta pra se vender.
    Endyru: Rio abaixo tem gente.
    Jurendy: Rio abaixo sempre tem gente.
    -> conversa
* [Dizer que ele lê errado.]
    Endyru: Você está lendo a medida do afluente como se fosse o Ymonhã. Metade disso cai no lodo.
    Jurendy: Metade basta. O bicho não é exigente. Você é que sempre foi.
    -> conversa
* [Dizer pra que vocês foram contratados.]
    Mbyraku: Contrato de Ybytuguá não fala de ponte nenhuma.
    Xanduí: "O contratado responde pelo bicho dos baixios, e pelo que lhe der causa, até a cheia baixar."
    Ela diz as palavras uma por uma, sem pressa, olhando pro castelão.
    Endyru: É isso mesmo que está escrito.
    Jurendy: Então vocês vieram buscar a causa.
    -> conversa
+ [Atravessar a ponte.]
    Mbyraku: Ponte de duque paga pedágio.
    Jarupã: Eu pago. Deixa que eu abro.
    Xanduí: Puxa o leitor do barranco, estudante. Lá de cima ele não para de ler.
    ~ start_fight("ponte")
    -> END

// Mbyraku, Jurendy e os escudeiros vencidos (onDefeat): Jurendy foge, e o castelão tem uma carta no bolso.
=== ponte_caiu ===
~ castelao_vencido = true
~ prova = true
Jurendy está no pé do barranco, com o livro aberto na lama, as duas mãos pra cima.
Jurendy: Rendição. Eu me rendo. Isso tem nome no tratado.
Xanduí: Legítima defesa. Também tem nome. Eu ouvi um juiz dizer, em Kuatiarape, com essas mesmas palavras.
Jarupã: E quem ganhou?
Xanduí: Um dos dois. Mas a palavra era essa.
Quando Jarupã se vira pra amarrar o castelão, Jurendy já está subindo a trilha, sem o livro, sem olhar pra trás. Ninguém corre atrás dele.
Jarupã limpa a espada na manga e fica olhando a lâmina, do jeito que se conta um troco que veio a mais.
Jarupã: Hoje ela pesou menos.
Xanduí: Hoje você bateu menos.
Ela passa o polegar no fio da dela e põe de volta na bainha sem olhar.
~ aura_rise("jarupa", 3)
~ aura_rise("xandui", 3)
Mbyraku está sentado na ponte, com a mão no flanco. Endyru tira do gibão dele uma carta aberta, com a dobra gasta de quem já leu muitas vezes.
Endyru: "Ao senhor de Ymboripe, dos conselheiros de Ybytuguá que assinam abaixo. Se o rio continuar fechado até a lua cheia, levamos ao conselho os termos do duque, e o porto entra no ducado com as guildas como estão."
Jarupã: Quem assina?
Endyru: Três nomes. Gente do conselho.
Oryndu olha pro afluente, que desce pros baixios.
Oryndu: O bicho não acordou. Acordaram ele.
Xanduí: Então a gente mata o bicho antes da lua cheia, recebe a prata antes de eles venderem a cadeira e vai embora. Simples.
~ note("carta", "No gibão de Mbyraku, o castelão: uma carta de três conselheiros de Ybytuguá ao senhor de Ymboripe. Se o rio continuar fechado até a lua cheia, levam os termos do duque ao conselho.")
~ note("jurendy", "Jurendy, mago da corte de Ymboripe, lia de duas em duas noites na beira do afluente que desce pros baixios.")
~ grant_xp(80)
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
