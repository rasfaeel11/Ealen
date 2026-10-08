import type { Attributes } from "../types/attributes";

/**
 * Condições que um combatente carrega por alguns turnos. Uma condição é só
 * dados: o motor não conhece "Em guarda" pelo nome, ele olha as marcas
 * (`guard`, `guaranteedCrit`, `attributeBonus`) de quem está no alvo.
 * Condição nova que só combine essas marcas não precisa de código novo.
 */
export interface StatusTemplate {
  id: string;
  name: string;
  /** Somado aos atributos do portador enquanto durar (negativo = penalidade). */
  attributeBonus?: Partial<Attributes>;
  /** Bloqueia dano recebido: Or + 1d6 a menos em cada golpe. */
  guard?: boolean;
  /** O próximo ataque do portador é crítico; a condição se gasta nele. */
  guaranteedCrit?: boolean;
  /** O portador perde o turno em que ela está ativa: a vez começa, a condição conta e a vez passa. */
  skipsTurn?: boolean;
}

/**
 * Uma condição ativa sobre alguém. `turnsLeft` conta INÍCIOS de turno do
 * portador: com 1, ela cai quando o portador for agir de novo — é o "até o
 * seu próximo turno" de D&D.
 */
export interface ActiveStatus extends StatusTemplate {
  turnsLeft: number;
}

export const STATUSES = {
  guarding: { id: "guarding", name: "Em guarda", guard: true },
  off_balance: { id: "off_balance", name: "Desequilibrado", attributeBonus: { or: -3 } },
  focused: { id: "focused", name: "Foco", guaranteedCrit: true },
  /** Quem foi pego de surpresa (ver `surprised` em EncounterSetup): perde o primeiro turno. */
  surprised: { id: "surprised", name: "Surpreso", skipsTurn: true },
} satisfies Record<string, StatusTemplate>;

export type StatusId = keyof typeof STATUSES;
