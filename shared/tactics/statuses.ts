import type { Attributes } from "../types/attributes";
import type { Dice } from "./rng";

/**
 * Condições que um combatente carrega por alguns turnos. Uma condição é só
 * dados: o motor não conhece "Em guarda" pelo nome, ele olha as marcas
 * (`guard`, `evasion`, `harm`, `attributeBonus`...) de quem está no alvo.
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
  /** Esquiva: somado à DEFESA do portador — o número que a rolagem de quem o ataca precisa alcançar. Não tira dano de golpe que pega. */
  evasion?: number;
  /** Somado a cada golpe que o portador RECEBE, antes da armadura (negativo = cada golpe fere menos). */
  damageTaken?: number;
  /** Fere o portador no começo de cada turno dele em que está ativa, sem ataque, armadura nem guarda. */
  harm?: Dice;
  /** Somado aos quadrados de movimento do portador em cada turno (negativo = passo preso; o movimento nunca fica abaixo de zero). */
  speed?: number;
  /** Nada desloca o portador: empurrão e puxão não o tiram do lugar. */
  immovable?: boolean;
  /** Cura nenhuma pega no portador — nem de habilidade, nem de item. */
  noHeal?: boolean;
}

/**
 * Uma condição ativa sobre alguém. `turnsLeft` conta INÍCIOS de turno do
 * portador: com 1, ela cai quando o portador for agir de novo — é o "até o
 * seu próximo turno" de D&D.
 */
export interface ActiveStatus extends StatusTemplate {
  turnsLeft: number;
}

const D4: Dice = { count: 1, sides: 4 };

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

  // --- O que os kits das Ordens põem (ver KITS em ./abilities.ts) -------------
  /** Sombrílico: não está onde se olha. Quem o ataca precisa de muito mais pra acertar. */
  unseen: { id: "unseen", name: "Despercebido", evasion: 5 },
  /** Rachador (e quem luta de viés): torto de propósito. */
  oblique: { id: "oblique", name: "Torto", evasion: 4 },
  /** Luminar: um plano reto fixado na frente de um aliado. É uma guarda que outro pôs. */
  warded: { id: "warded", name: "Atrás da Muralha", guard: true },
  /** Guardião: preso às constantes do lugar. Nada o desloca, e cada golpe chega mais leve. */
  anchored: { id: "anchored", name: "Ancorado", immovable: true, damageTaken: -3 },
  /** Guardião: a gravidade dobrada sob os pés. */
  heavy: { id: "heavy", name: "Pesado", speed: -3 },
  /** Entropista: a guarda enferruja antes de quem a segura. */
  rusted: { id: "rusted", name: "Enferrujado", attributeBonus: { or: -2 }, breaksGuard: true },
  /** Entropista: o relógio adiantado. Fere a cada turno. */
  decaying: { id: "decaying", name: "Decaindo", harm: D4 },
  /** Entropista: o selo do fim. A armadura envelhece sozinha. */
  decay_mark: { id: "decay_mark", name: "Marca de Decaimento", attributeBonus: { or: -4 } },
  /** Entropista: travado no estado em que está. Nada nele se restaura. */
  irreversible: { id: "irreversible", name: "Irreversível", noHeal: true },
  /** Cantor: a onda invertida por cima da voz dele. O que ele tentar sai fraco. */
  muffled: { id: "muffled", name: "Abafado", toHit: -3 },
  /** Cantor: a própria frequência multiplicada até soar como muitos. */
  chorus: { id: "chorus", name: "Em coro", attributeBonus: { len: 4, eir: 4 } },
  /** Rachador: uma fissura mínima. Dói no próximo golpe. */
  cracked: { id: "cracked", name: "Trincado", damageTaken: 3 },
  /** Rachador: o padrão quebrado de vez. Todo golpe acha uma abertura nova. */
  broken_symmetry: { id: "broken_symmetry", name: "Simetria quebrada", damageTaken: 4, attributeBonus: { or: -1 } },
  /** Halmira: a rede de coleta nas pernas de alguém. */
  netted: { id: "netted", name: "Enredado", speed: -4 },
} satisfies Record<string, StatusTemplate>;

export type StatusId = keyof typeof STATUSES;

export function isStatusId(id: unknown): id is StatusId {
  return typeof id === "string" && id in STATUSES;
}

/**
 * Uma condição que atrapalha quem a carrega — é o que um item de purificar
 * tira do corpo. As que a história pôs e que duram entre lutas (`turnsLeft`
 * infinito) não contam: quem as tira é quem as pôs.
 */
export function isHarmful(status: ActiveStatus): boolean {
  if (!Number.isFinite(status.turnsLeft)) return false;
  return (
    Object.values(status.attributeBonus ?? {}).some((bonus) => bonus < 0) ||
    (status.toHit ?? 0) < 0 ||
    (status.damageTaken ?? 0) > 0 ||
    (status.speed ?? 0) < 0 ||
    status.harm !== undefined ||
    status.noHeal === true
  );
}
