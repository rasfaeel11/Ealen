/**
 * Os sete atributos do sistema Tirán, nomeados a partir das runas do
 * alfabeto sagrado de Eälen. Ver tabela de referência em AGENTS.md.
 */
export interface Attributes {
  /** Dain — Força. Governa dano corpo-a-corpo. */
  dain: number;
  /** Eir — Ressonância/Espírito. Governa dano/cura mágica. */
  eir: number;
  /** Nath — Vitalidade. Governa HP máximo. */
  nath: number;
  /** Il — Percepção. Governa precisão / chance de crítico. */
  il: number;
  /** Or — Densidade. Governa defesa/armadura. */
  or: number;
  /** Len — Som/Voz. Carisma — checks de diálogo/persuasão. */
  len: number;
  /** Ul — Mistério. Sabedoria/Intelecto — checks de lore/enigma. */
  ul: number;
}

export const ATTRIBUTE_KEYS: (keyof Attributes)[] = ["dain", "eir", "nath", "il", "or", "len", "ul"];
