/**
 * O texto de abertura do jogo. Objetivo: em menos de um minuto de leitura,
 * o jogador precisa saber onde está, por que a magia funciona assim e o que
 * está em jogo — sem despejar a lore inteira (o resto vive em LORE.md e, em
 * doses, no Códice).
 *
 * Cada página é um beat: origem → como funciona → quem são as Ordens → o
 * que deu errado → você.
 */
export interface ProloguePage {
  /** Marca d'água rúnica ao fundo da página. */
  glyph: string;
  title: string;
  paragraphs: string[];
}

export const PROLOGUE_PAGES: ProloguePage[] = [
  {
    glyph: "◆",
    title: "A Primeira Ruptura",
    paragraphs: [
      "No princípio havia a Singularidade: densidade infinita, todas as leis colapsadas num ponto onde nenhuma delas fazia sentido.",
      "Ela não foi rompida de fora. Ela continha todos os estados possíveis — inclusive o de não ser única — e o simples ato de distinguir um do outro já foi a fratura. A primeira informação do universo foi \"isto não é aquilo\".",
      "Do escape vieram as Primeiras Luzes. E com elas veio uma vibração que nunca mais parou.",
    ],
  },
  {
    glyph: "♪",
    title: "Eälen, o Canto",
    paragraphs: [
      "Essa vibração se chama Eälen. Não é uma deusa, por mais que meio mundo reze para ela: é a frequência original da Ruptura, ainda se propagando.",
      "Antes de existir matéria já existia frequência. Toda matéria é frequência que ficou lenta o bastante para ser tocada — e é por isso que, aqui, magia não é exceção à física. É interpretação dela.",
      "Ninguém em Talys conjura fogo ou água. As pessoas aprendem a manipular um aspecto da realidade: gravidade, decaimento, simetria, ausência, frequência.",
    ],
  },
  {
    glyph: "❖",
    title: "As Ordens",
    paragraphs: [
      "Cada Ordem é a disciplina construída em torno de um desses Princípios — e, junto com ele, uma opinião sobre como o universo deveria existir.",
      "Os Luminares preservam a ordem. Os Entropistas aceleram o fim, porque resistir só prolonga o sofrimento. Os Rachadores quebram padrões, porque perfeição impede evolução. Os Guardiões acham todo o resto uma distração e seguram a realidade no lugar. Os Cantores afinam o mundo. Os Sombrílicos trabalham com o que ninguém está olhando.",
      "Cada golpe em Talys é ao mesmo tempo um golpe e um argumento.",
    ],
  },
  {
    glyph: "◑",
    title: "O que está dando errado",
    paragraphs: [
      "A briga entre Harmonia e Entropia está aumentando. Onde as duas leis já não conseguem coexistir, a matéria não decide se se organiza ou se dispersa, e fica no meio: nem coisa, nem poeira.",
      "E há algo pior, que quase ninguém percebeu. Uma coisa anterior à Primeira Ruptura, sem frequência nenhuma, que não mata nem destrói — apenas desacontece. Onde ela passa, as coisas não morrem: passam a nunca ter vibrado.",
      "Os Cantores foram os primeiros a notar, porque é a única coisa em Talys que eles não conseguem ouvir.",
    ],
  },
  {
    glyph: "✦",
    title: "Você",
    paragraphs: [
      "Você atravessa as Portas de Tirán: duas lajes gravadas com as sete runas, plantadas onde as terras medidas acabam.",
      "Daqui em diante o mapa é um punhado de lugares onde alguma lei se comporta errado, e quase todos têm alguma coisa dentro. Escolha um povo, escolha uma Ordem, e descubra qual das opiniões sobre o universo é a sua.",
      "As Primeiras Luzes ainda estão soando. A pergunta é por quanto tempo.",
    ],
  },
];
