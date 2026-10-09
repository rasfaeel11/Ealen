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
  /** Ao cair sobre alguém, derruba a guarda que ele tivesse (as condições com `guard`). */
  breaksGuard?: boolean;
  /** Somado à rolagem de ataque do portador (negativo = penalidade). */
  toHit?: number;
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
  /** A guarda aberta à força: a que estava de pé cai, e a armadura vale menos. */
  exposed: { id: "exposed", name: "Sem guarda", attributeBonus: { or: -3 }, breaksGuard: true },
  focused: { id: "focused", name: "Foco", guaranteedCrit: true },
  /** O preço de uma magia: o próximo turno de quem a fez. */
  winded: { id: "winded", name: "Sem fôlego", skipsTurn: true },
  /** Um braço que não fecha mais direito. Das que a história põe e que duram entre lutas (ver afflict em ../story/runner.ts). */
  wounded_arm: { id: "wounded_arm", name: "Braço ferido", toHit: -2 },
  /** Quem foi pego de surpresa (ver `surprised` em EncounterSetup): perde o primeiro turno. */
  surprised: { id: "surprised", name: "Surpreso", skipsTurn: true },
} satisfies Record<string, StatusTemplate>;

export type StatusId = keyof typeof STATUSES;

export function isStatusId(id: unknown): id is StatusId {
  return typeof id === "string" && id in STATUSES;
}
