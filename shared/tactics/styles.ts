import type { Ability, Unit } from "./types";

/**
 * Estilos: o JEITO de lutar de alguém, por cima da Ordem dele. A Ordem diz o
 * que ele sabe fazer (as habilidades); o estilo diz contra quem isso rende e
 * dá um traço que vale em todo golpe.
 *
 * - O TRIÂNGULO: um estilo leva vantagem sobre outro (`beats`). Quem ataca
 *   com vantagem soma STYLE_TO_HIT na rolagem; quem ataca o estilo que o
 *   vence perde o mesmo tanto. Viés vence Baluarte e Maré vence Viés;
 *   Baluarte e Maré são neutros entre si, e estilo igual empata. A conta
 *   entra em `attackEdge` (./attack.ts), como cobertura, flanco e altura.
 * - O TRAÇO, um por estilo, todo em dados:
 *     Maré — ONDA (`momentum`): cada golpe que pega no MESMO alvo, em
 *       seguida, soma no dano do próximo. Errar, ou trocar de alvo, zera.
 *     Viés — RACHADURA (`punishRepeat`): multiplica o dano em quem acabou de
 *       repetir a ação do turno anterior (ver `habit` em Unit).
 *     Baluarte — MURALHA (`damageReduction`): tira um tanto fixo de cada
 *       golpe que recebe, depois da armadura.
 *
 * O GRAU (I, II, III...) é o quanto alguém domina o estilo. Hoje é só o que
 * a interface mostra: a força de cada um ainda vem do nível e dos atributos.
 *
 * Os números são provisórios, como os kits.
 */
export interface StyleTemplate {
  id: string;
  name: string;
  /** O estilo sobre o qual este leva vantagem. */
  beats?: string;
  /** O nome do traço, pra interface. */
  trait: string;
  momentum?: number;
  punishRepeat?: number;
  damageReduction?: number;
}

export const STYLES = {
  mare: { id: "mare", name: "Maré", beats: "vies", trait: "Onda", momentum: 1 },
  vies: { id: "vies", name: "Viés", beats: "baluarte", trait: "Rachadura", punishRepeat: 2 },
  baluarte: { id: "baluarte", name: "Baluarte", trait: "Muralha", damageReduction: 2 },
} satisfies Record<string, StyleTemplate>;

export type StyleId = keyof typeof STYLES;

export function isStyleId(id: unknown): id is StyleId {
  return typeof id === "string" && id in STYLES;
}

/** Quanto a vantagem de estilo soma na rolagem de ataque (e a desvantagem tira). */
export const STYLE_TO_HIT = 2;
/** Até quantos golpes seguidos a Onda acumula. */
export const MOMENTUM_CAP = 4;

function template(style: StyleId | undefined): StyleTemplate | undefined {
  return style === undefined ? undefined : STYLES[style];
}

/** 1 = `attacker` leva vantagem sobre `defender`; -1 = desvantagem; 0 = neutro, igual, ou alguém sem estilo. */
export function styleMatchup(attacker: StyleId | undefined, defender: StyleId | undefined): -1 | 0 | 1 {
  if (attacker === undefined || defender === undefined) return 0;
  if (template(attacker)?.beats === defender) return 1;
  if (template(defender)?.beats === attacker) return -1;
  return 0;
}

const NUMERALS = ["", "I", "II", "III", "IV", "V"];

/** "Maré III", pra interface. Vazio em quem não tem estilo. */
export function styleLabel(unit: Pick<Unit, "style" | "grade">): string {
  const style = template(unit.style);
  if (!style) return "";
  const grade = NUMERALS[unit.grade ?? 0] ?? String(unit.grade);
  return grade ? `${style.name} ${grade}` : style.name;
}

/**
 * ONDA: o que `actor` soma ao dano deste golpe em `target` por já vir batendo
 * nele em seguida. Só em golpe de um alvo só — uma área não é insistência.
 */
export function waveBonus(actor: Unit, ability: Ability, target: Unit): number {
  const momentum = template(actor.style)?.momentum;
  if (!momentum || ability.radius !== undefined || actor.streak?.target !== target.id) return 0;
  return momentum * Math.min(actor.streak.hits, MOMENTUM_CAP);
}

/** RACHADURA: por quanto o dano de `actor` em `target` é multiplicado. 1 = não é. */
export function punishFactor(actor: Unit, target: Unit): number {
  const factor = template(actor.style)?.punishRepeat;
  return factor && target.habit?.repeated ? factor : 1;
}

/** MURALHA: quanto `target` tira de cada golpe que recebe, depois da armadura. */
export function styleReduction(target: Unit): number {
  return template(target.style)?.damageReduction ?? 0;
}
