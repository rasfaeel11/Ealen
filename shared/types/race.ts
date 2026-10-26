import type { Attributes } from "./attributes";

/**
 * Os povos de quem está no jogo.
 * - Humano: o povo do trio (ver a ficha `humanos` no repositório da história).
 * - Bicho: as criaturas do bestiário do mundo, que não são povo nenhum.
 *
 * Demônios, elfos, dragões e meio-elfos (`biblia` §3.4) entram quando uma
 * cena pedir uma ficha deles: o ferreiro demônio, hoje, é só um `npc` de mapa.
 */
export type Race = "humano" | "bicho";

/**
 * Modificadores de atributo por raça (+1/-1), aplicados sobre os
 * atributos-base de um personagem na criação.
 */
export const RACE_MODIFIERS: Record<Race, Partial<Attributes>> = {
  humano: {},
  bicho: {},
};

export interface RaceInfo {
  name: string;
  /** Onde o povo vive. */
  homeland?: string;
}

export const RACE_INFO: Record<Race, RaceInfo> = {
  humano: { name: "Humano", homeland: "Yrandupe" },
  bicho: { name: "Bicho" },
};
