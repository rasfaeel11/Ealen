import type { Attributes } from "./attributes";

/**
 * O que cada um É numa luta (`magia` §3 e §5 no repositório da história):
 * quem conjura, pelo conceito que conjura — `atracao_repulsao`, o de Endyru —,
 * e quem luta de espada (`espadachim`), cuja escola vem do elenco (ver
 * ../tactics/styles.ts). Bicho do bestiário tira o golpe de corpo de uma
 * delas: não tem classe própria.
 */
export type CharacterClass = "atracao_repulsao" | "espadachim";

export interface ClassInfo {
  /** Nome completo, como o mundo o chama. */
  name: string;
  /** Papel mecânico no combate. */
  role: string;
  /** Atributo(s) que a classe escala primariamente. O primeiro é o do dano (`attribute: "primary"`). */
  primaryAttributes: (keyof Attributes)[];
}

export const CLASS_INFO: Record<CharacterClass, ClassInfo> = {
  atracao_repulsao: {
    name: "Mago de atração e repulsão",
    role: "Controle",
    primaryAttributes: ["fator", "saber"],
  },
  espadachim: {
    name: "Espadachim",
    role: "Linha de frente",
    primaryAttributes: ["forca", "olho"],
  },
};
