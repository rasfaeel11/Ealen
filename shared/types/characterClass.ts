import type { Attributes } from "./attributes";

/** As seis ordens (classes) jogáveis de Eälen. */
export type CharacterClass =
  | "luminar"
  | "entropista"
  | "cantor_de_ealen"
  | "guardiao"
  | "sombrilico"
  | "rachador";

export interface ClassInfo {
  role: string;
  /** Atributo(s) que a classe escala primariamente. */
  primaryAttributes: (keyof Attributes)[];
}

export const CLASS_INFO: Record<CharacterClass, ClassInfo> = {
  luminar: { role: "Tank/Suporte", primaryAttributes: ["or", "eir"] },
  entropista: { role: "Debuffer", primaryAttributes: ["eir", "ul"] },
  cantor_de_ealen: { role: "Controle", primaryAttributes: ["len", "eir"] },
  guardiao: { role: "Tank Ofensivo", primaryAttributes: ["or", "dain"] },
  sombrilico: { role: "Anti-Mago", primaryAttributes: ["il", "or"] },
  rachador: { role: "Sniper Físico", primaryAttributes: ["il", "dain"] },
};
