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
EXTERNAL order()            // "luminar", "entropista", "cantor_de_ealen", "guardiao", "sombrilico", "rachador"
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
// abrir uma saída é mudar um VAR.
//
// Um trecho não precisa de npc: um `trigger` no mapa abre o dele quando se
// pisa ali, e um inimigo com `onDefeat` abre o dele quando o grupo cai.

INCLUDE clareira.ink
INCLUDE ruinas.ink
