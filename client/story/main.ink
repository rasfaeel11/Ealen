// A história do jogo. Tudo que se conversa em Talys é um trecho (knot) desta
// história única: cada arquivo incluído aqui traz os trechos de um lugar, e
// um `npc` no mapa aponta pro trecho dele pela propriedade `dialog`.
//
// Uma história só porque o estado dela é o save: as variáveis (VAR) são as
// flags do jogo, e o Ink ainda lembra sozinho quantas vezes cada trecho foi
// lido e que escolhas de uma vez só (*) já foram gastas.
//
// O que o texto pode perguntar e pedir ao jogo (ver shared/story/runner.ts):

EXTERNAL attr(name)         // attr("len"): o atributo do personagem
EXTERNAL order()            // a Ordem de Halmira: "luminar", "entropista", "cantor_de_ealen", "guardiao", "sombrilico", "rachador"
EXTERNAL people()           // "althirim", "miraven", "taharim", "kelbar"
EXTERNAL level()
EXTERNAL has_item(id)
EXTERNAL defeated(group)    // defeated("clareira:fiapo"): aquele grupo de inimigos já foi vencido?
EXTERNAL check(name, difficulty)   // rola um teste agora, no meio do texto: {check("ul", 13): ... | ...}
EXTERNAL passed()           // passou o teste da escolha? (escolha marcada com # check: len 13)
EXTERNAL give_item(id)
EXTERNAL take_item(id)      // tira um da mochila; devolve se havia: {take_item("x"): ... | ...}
EXTERNAL grant_xp(amount)
EXTERNAL start_fight(group) // start_fight("fiapo"): acabada a conversa, luta com esse grupo DESTA área
EXTERNAL travel(area, spawn) // travel("ruinas", "from_clareira"): acabada a conversa, o personagem vai pra lá
EXTERNAL join_party(who)    // join_party("lish"): entra no grupo. As chaves estão em shared/party.ts
EXTERNAL leave_party(who)   // sai do grupo; a ficha dele fica guardada pra quando voltar
EXTERNAL in_party(who)      // está no grupo agora?
EXTERNAL unlock_order(id)   // destrava uma Ordem pra Halmira nos próximos jogos novos (fica no perfil, não no save)
EXTERNAL note(id, text)     // note("rede", "A Companhia paga por rede vazia."): anota uma pista no diário (J abre)
EXTERNAL noted(id)          // a pista está no diário, e legível?
EXTERNAL forget(count)      // forget(3): apaga as 3 anotações mais recentes; ficam em branco no lugar delas
EXTERNAL recall(id)         // devolve uma anotação apagada
EXTERNAL recall_all()       // devolve todas
EXTERNAL clock_start(label, value, limit)   // clock_start("Vazante", 0, 12): põe um relógio no alto da tela
EXTERNAL clock_tick(amount) // faz o tempo andar (negativo volta); para em 0 e no limite
EXTERNAL clock()            // quanto já passou (0 sem relógio)
EXTERNAL clock_left()       // quanto falta
EXTERNAL clock_cost(what, amount)   // clock_cost("rest", 2): quanto descansar ("rest") ou lutar ("fight") gasta sozinho
EXTERNAL clock_stop()       // tira o relógio da tela

// Convenções:
//   Nome: fala        vira uma fala com o nome em cima. O resto é narração.
//   + [Escolha]       fica disponível sempre.   * [Escolha]  some depois de usada.
//   # check: len 13   na escolha: mostra a chance, rola ao escolher; o texto lê com passed().
//   Dificuldade: 10 fácil, 13 pra quem tem o atributo, 16 difícil, 19 quase só na sorte.
//   Toda conversa termina em -> END.
//
// O mapa também lê as variáveis daqui: um npc, inimigo, gatilho ou saída com a
// propriedade `if` (ou `unless`) só existe enquanto a variável de mesmo nome
// for verdadeira (ou falsa). Pôr alguém no mapa, tirar, armar um gatilho ou
// abrir uma saída é mudar um VAR. A condição `party:lish` pergunta pelo grupo
// em vez de por um VAR: vale enquanto Lish anda com Halmira.
//
// E o relógio: `clock:8` num `if`/`unless` vale quando ele já chegou em 8. É
// como o tempo fecha uma porta — acabar o tempo não mata ninguém, tira opções.
//
// O diário guarda FATOS, na ordem em que foram anotados. A conclusão é de
// quem lê: nenhum texto de anotação diz o que o jogador devia ter entendido.
//
// Um trecho não precisa de npc: um `trigger` no mapa abre o dele quando se
// pisa ali, e um inimigo com `onDefeat` abre o dele quando o grupo cai.
//
// E uma luta pode ter roteiro: uma deixa (`cue`) no mapa abre o trecho dela NO
// MEIO da luta — numa rodada, quando alguém cai, quando algo quebra, quando
// alguém mexe em alguma coisa, ou no lugar da derrota — e pode encerrá-la ali.
// A mesma deixa pode pôr uma condição em quem luta (`apply` no mapa): o texto
// conta o que aconteceu, o mapa diz o que isso muda nas regras. O trecho de uma deixa que NÃO
// encerra a luta só fala e mexe em variáveis: se a luta for perdida depois, a
// história volta ao que era antes dela, e o que ele tivesse dado, não.

INCLUDE clareira.ink
INCLUDE ruinas.ink
