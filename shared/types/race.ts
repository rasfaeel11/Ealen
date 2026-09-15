import type { Attributes } from "./attributes";

/**
 * Os quatro povos de Eälen.
 * - Althirim: povo da contemplação e da sabedoria.
 * - Miraven: povo da memória e da lua.
 * - Taharim: povo do trabalho e do sol.
 * - Kelbar: povo da sombra e da compaixão.
 */
export type Race = "althirim" | "miraven" | "taharim" | "kelbar";

/**
 * Modificadores de atributo por raça (+1/-1), aplicados sobre os
 * atributos-base de um personagem na criação.
 */
export const RACE_MODIFIERS: Record<Race, Partial<Attributes>> = {
  althirim: { ul: 1, dain: -1 },
  miraven: { eir: 1, dain: -1 },
  taharim: { dain: 1, eir: -1 },
  kelbar: { len: 1, or: -1 },
};
