/**
 * Os sete atributos de uma ficha, com nomes simples, em português (a tabela
 * da §4 do AGENTS.md: o jogo não usa as runas Tirán do Eälen). Os números
 * de nível 1 ficam entre 1 e 9 (ver ../characterCreation.ts).
 */
export interface Attributes {
  /** Força: o dano de perto. */
  forca: number;
  /** Fator: o que o sangue dá pra magia (`magia` §1.1) — o dano e a cura de quem conjura, e a mana. */
  fator: number;
  /** Vigor: a vida e o Fôlego. */
  vigor: number;
  /** Olho: o acerto, o crítico e quem age primeiro. */
  olho: number;
  /** Couro: o que tira dano do golpe que pega. */
  couro: number;
  /** Lábia: convencer, negociar, mentir — os testes de conversa. */
  labia: number;
  /** Saber: o que se estudou — os testes de leitura e de conhecimento, e segurar a recitação quando se apanha. */
  saber: number;
}

export const ATTRIBUTE_KEYS: (keyof Attributes)[] = ["forca", "fator", "vigor", "olho", "couro", "labia", "saber"];
