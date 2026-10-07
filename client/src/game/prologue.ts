/**
 * O texto de abertura do jogo. Deliberadamente escasso: cada página é um
 * fragmento, não uma explicação — o jogador deve sair sabendo menos do que
 * gostaria, porque em Talys informação também é algo que se conquista (o
 * resto vive em LORE.md e, aos poucos, no Códice).
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
    title: "A Ruptura",
    paragraphs: [
      "Antes de tudo: um ponto único, denso demais pra ter forma. Distinguir uma coisa de outra já foi a fratura.",
      "Do escape vieram as Primeiras Luzes — e uma vibração que nunca parou de soar.",
    ],
  },
  {
    glyph: "♪",
    title: "Eälen",
    paragraphs: [
      "Chamam essa vibração de Eälen. Não é deusa: é frequência, ainda se propagando.",
      "Ninguém em Talys conjura fogo ou água. Aprende-se a dobrar um Princípio da realidade. O resto é opinião.",
    ],
  },
  {
    glyph: "◑",
    title: "O que está errado",
    paragraphs: [
      "Onde leis divergentes se encontram, a matéria não decide: nem se organiza, nem se dispersa.",
      "E há algo mais antigo que a Ruptura, sem frequência nenhuma. Não mata. Desacontece. Os Cantores foram os primeiros a notar — é a única coisa que não conseguem ouvir.",
    ],
  },
  {
    glyph: "✦",
    title: "Você",
    paragraphs: ["Duas lajes gravadas, plantadas onde o mapa conhecido acaba. Escolha um povo. Escolha uma Ordem. O resto, descubra andando."],
  },
];
