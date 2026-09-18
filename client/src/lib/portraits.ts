import type { CharacterClass } from "@ealen/shared";

/**
 * Retratos em pixel art de cada Ordem (gerados a partir dos prompts em
 * LORE.md §9.1). Vivem em /public/portraits e são servidos como estáticos —
 * não passam pelo bundler porque são grandes demais pra virar asset do Vite.
 */
export const CLASS_PORTRAIT: Record<CharacterClass, string> = {
  luminar: "/portraits/luminar.jpg",
  entropista: "/portraits/entropista.jpg",
  cantor_de_ealen: "/portraits/cantor_de_ealen.jpg",
  guardiao: "/portraits/guardiao.jpg",
  sombrilico: "/portraits/sombrilico.jpg",
  rachador: "/portraits/rachador.jpg",
};
