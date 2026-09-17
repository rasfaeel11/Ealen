import type { Attributes } from "./attributes";

/** As seis Ordens (classes) jogáveis de Talys. */
export type CharacterClass =
  | "luminar"
  | "entropista"
  | "cantor_de_ealen"
  | "guardiao"
  | "sombrilico"
  | "rachador";

export interface ClassInfo {
  /** Nome completo da Ordem, como o mundo a chama. */
  name: string;
  /** Epíteto curto — o que um membro da Ordem é, em três palavras. */
  title: string;
  /** Papel mecânico no combate. */
  role: string;
  /** A frase que resume a posição filosófica da Ordem. */
  creed: string;
  /** Atributo(s) que a classe escala primariamente. */
  primaryAttributes: (keyof Attributes)[];
}

/**
 * Cada Ordem manipula um Princípio Fundamental da realidade (ver
 * shared/types/principle.ts e LORE.md §4) — não um elemento. Isso importa
 * mecanicamente: quem não manipula um Princípio capaz de restaurar um
 * sistema ao estado anterior simplesmente não tem cura.
 */
export const CLASS_INFO: Record<CharacterClass, ClassInfo> = {
  luminar: {
    name: "Luminar",
    title: "Cavaleiro da Ordem Perfeita",
    role: "Tank/Suporte",
    creed: "O universo tem estrutura. Preservá-la é a única obrigação séria.",
    primaryAttributes: ["or", "eir"],
  },
  entropista: {
    name: "Entropista",
    title: "Acelerador do Inevitável",
    role: "Debuffer",
    creed: "Tudo se degrada. Segurar o fim é crueldade disfarçada de virtude.",
    primaryAttributes: ["eir", "ul"],
  },
  cantor_de_ealen: {
    name: "Cantor de Eälen",
    title: "Afinador do Mundo",
    role: "Controle",
    creed: "Não se reza para o Canto. Afina-se com ele.",
    primaryAttributes: ["len", "eir"],
  },
  guardiao: {
    name: "Guardião da Singularidade",
    title: "Sentinela da Origem",
    role: "Tank Ofensivo",
    creed: "Enquanto vocês discutem qual lei é mais bonita, a cicatriz aumenta.",
    primaryAttributes: ["or", "dain"],
  },
  sombrilico: {
    name: "Sombrílico",
    title: "Aquele que Não É Notado",
    role: "Anti-Mago",
    creed: "Uma magia precisa ser percebida para funcionar. Eu não.",
    primaryAttributes: ["il", "or"],
  },
  rachador: {
    name: "Rachador da Harmonia",
    title: "Quebrador de Padrões",
    role: "Sniper Físico",
    creed: "Perfeição impede evolução. Toda ordem tem um lugar onde fecha mal.",
    primaryAttributes: ["il", "dain"],
  },
};
