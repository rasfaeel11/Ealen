import type { Attributes } from "./attributes";

/**
 * Os povos de quem está no jogo.
 * - Humano: o povo do trio (ver a ficha `humanos` no repositório da história).
 * - Bicho: as criaturas do bestiário do mundo, que não são povo nenhum.
 * - Os quatro do Eälen (Althirim, Miraven, Taharim, Kelbar) ficam só nas
 *   criaturas provisórias, até o bestiário do mundo entrar no lugar delas.
 */
export type Race = "humano" | "bicho" | "althirim" | "miraven" | "taharim" | "kelbar";

/**
 * Modificadores de atributo por raça (+1/-1), aplicados sobre os
 * atributos-base de um personagem na criação.
 */
export const RACE_MODIFIERS: Record<Race, Partial<Attributes>> = {
  humano: {},
  bicho: {},
  althirim: { saber: 1, forca: -1 },
  miraven: { fator: 1, forca: -1 },
  taharim: { forca: 1, fator: -1 },
  kelbar: { labia: 1, couro: -1 },
};
