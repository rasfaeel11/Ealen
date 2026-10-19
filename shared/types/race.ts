import type { Attributes } from "./attributes";

/**
 * Os povos de quem está no jogo.
 * - Humano: o povo do trio (ver a ficha `humanos` no repositório da história).
 * - Os quatro do Eälen (Althirim, Miraven, Taharim, Kelbar) ficam só nas
 *   criaturas provisórias, até o bestiário do mundo entrar no lugar delas.
 */
export type Race = "humano" | "althirim" | "miraven" | "taharim" | "kelbar";

/**
 * Modificadores de atributo por raça (+1/-1), aplicados sobre os
 * atributos-base de um personagem na criação.
 */
export const RACE_MODIFIERS: Record<Race, Partial<Attributes>> = {
  humano: {},
  althirim: { ul: 1, dain: -1 },
  miraven: { eir: 1, dain: -1 },
  taharim: { dain: 1, eir: -1 },
  kelbar: { len: 1, or: -1 },
};
