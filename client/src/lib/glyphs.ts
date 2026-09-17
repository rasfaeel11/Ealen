import type { CharacterClass, Principle } from "@ealen/shared";

/**
 * O jogo não tem arte — então cada combatente aparece como um símbolo
 * dentro de um quadro. Os símbolos não são decorativos: cada um representa o
 * Princípio que a Ordem manipula (um disco denso pro Guardião, uma nota pro
 * Cantor, meia-lua pro Sombrílico), de modo que dá pra ler a natureza de
 * quem está na sua frente antes mesmo de ler o nome.
 */
export const CLASS_GLYPH: Record<CharacterClass, string> = {
  luminar: "☀",
  entropista: "⌛",
  cantor_de_ealen: "♪",
  guardiao: "◆",
  sombrilico: "◑",
  rachador: "✦",
};

export const PRINCIPLE_GLYPH: Record<Principle, string> = {
  singularidade: "◆",
  harmonia: "❖",
  entropia: "⌛",
  fratura: "✶",
  ealen: "♪",
  ausencia: "◑",
};
