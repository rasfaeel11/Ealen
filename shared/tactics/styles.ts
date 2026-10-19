import type { Ability, Unit } from "./types";

/**
 * As escolas de espada (`magia` §5.5 no repositório da história): o JEITO de
 * lutar de um espadachim. O kit diz o que ele sabe fazer (as habilidades); a
 * escola diz contra quem isso rende e dá um traço que vale em todo golpe.
 *
 * - O TRIÂNGULO, fechado: Ipojy (a Espera) vence Gryskar (o Bate-Primeiro),
 *   Gryskar vence Tsvirana (a Correnteza), Tsvirana vence Ipojy. Quem ataca
 *   com vantagem soma STYLE_TO_HIT na rolagem; quem ataca a escola que vence
 *   a sua perde o mesmo tanto; escola igual empata. A conta entra em
 *   `attackEdge` (./attack.ts), como cobertura, flanco e altura.
 * - O TRAÇO, um por escola, todo em dados:
 *     Gryskar — ONDA (`momentum`): toda a aura no ataque. Cada golpe que pega
 *       no MESMO alvo, em seguida, soma no dano do próximo. Errar, ou trocar
 *       de alvo, zera.
 *     Tsvirana — RACHADURA (`punishRepeat`): a aura que nunca para lê quem se
 *       repete. Multiplica o dano em quem acabou de repetir a ação do turno
 *       anterior (ver `habit` em Unit).
 *     Ipojy — CONTRAGOLPE (`counter`): a aura guardada parada até o golpe do
 *       outro. Quem ataca um da Espera e erra leva o golpe de volta, na
 *       reação dele (ver `counterStrike`).
 *
 * Fora do triângulo há o BALUARTE, que não é escola: é o couro de criatura
 * grande, com a MURALHA (`damageReduction`), um tanto fixo a menos em cada
 * golpe que recebe, depois da armadura.
 *
 * A PROFICIÊNCIA (o `grade` da unidade, 1 a 7) é o quanto alguém domina a
 * escola. Nunca passa do nível de aura dele (`proficiency`). Hoje é só o que
 * a interface mostra: a força de cada um ainda vem do nível e dos atributos.
 * O golpe-selo de cada escola, que vem a partir do grau 4 e só por iniciação,
 * não existe no jogo: o trio não chega lá.
 *
 * Os números são provisórios, como os kits.
 */
export interface StyleTemplate {
  id: string;
  name: string;
  /** O nome na língua dos portos ("a Espera"), pra interface. */
  alias?: string;
  /** É escola de espada: tem proficiência, limitada pela aura. O Baluarte não é. */
  school?: boolean;
  /** A escola sobre a qual esta leva vantagem. */
  beats?: string;
  /** O nome do traço, pra interface. */
  trait: string;
  momentum?: number;
  punishRepeat?: number;
  /** Devolve o golpe a quem o ataca e erra (ver `counterStrike`). */
  counter?: boolean;
  damageReduction?: number;
}

export const STYLES = {
  ipojy: { id: "ipojy", name: "Ipojy", alias: "a Espera", school: true, beats: "gryskar", trait: "Contragolpe", counter: true },
  gryskar: { id: "gryskar", name: "Gryskar", alias: "o Bate-Primeiro", school: true, beats: "tsvirana", trait: "Onda", momentum: 1 },
  tsvirana: { id: "tsvirana", name: "Tsvirana", alias: "a Correnteza", school: true, beats: "ipojy", trait: "Rachadura", punishRepeat: 2 },
  baluarte: { id: "baluarte", name: "Baluarte", trait: "Muralha", damageReduction: 2 },
} satisfies Record<string, StyleTemplate>;

export type StyleId = keyof typeof STYLES;

export function isStyleId(id: unknown): id is StyleId {
  return typeof id === "string" && id in STYLES;
}

/** Quanto a vantagem de escola soma na rolagem de ataque (e a desvantagem tira). */
export const STYLE_TO_HIT = 2;
/** Até quantos golpes seguidos a Onda acumula. */
export const MOMENTUM_CAP = 4;
/** A maior proficiência numa escola, e o maior nível de aura. */
export const PROFICIENCY_MAX = 7;

/** Os níveis de aura do espadachim, do 1 ao 7 (`magia` §7.2). */
export const AURA_LEVELS = ["Punho", "Fio", "Corpo", "Sombra", "Campo", "Horizonte", "Divindade"] as const;

/** O nome do nível de aura `aura` ("Fio"). Vazio fora de 1 a 7. */
export function auraName(aura: number | undefined): string {
  return aura === undefined ? "" : (AURA_LEVELS[aura - 1] ?? "");
}

/**
 * A proficiência de verdade de quem diz ter `grade` numa escola, com aura
 * `aura`: de 1 a 7, e nunca acima do nível de aura. Sem aura dita, só o teto.
 */
export function proficiency(grade: number, aura: number = PROFICIENCY_MAX): number {
  return Math.max(1, Math.min(Math.floor(grade), PROFICIENCY_MAX, Math.floor(aura)));
}

function template(style: StyleId | undefined): StyleTemplate | undefined {
  return style === undefined ? undefined : STYLES[style];
}

/** 1 = `attacker` leva vantagem sobre `defender`; -1 = desvantagem; 0 = neutro, igual, ou alguém sem escola. */
export function styleMatchup(attacker: StyleId | undefined, defender: StyleId | undefined): -1 | 0 | 1 {
  if (attacker === undefined || defender === undefined) return 0;
  if (template(attacker)?.beats === defender) return 1;
  if (template(defender)?.beats === attacker) return -1;
  return 0;
}

const NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

/** "Gryskar II", pra interface; o Baluarte, que não tem grau, só pelo nome. Vazio em quem não tem estilo. */
export function styleLabel(unit: Pick<Unit, "style" | "grade">): string {
  const style = template(unit.style);
  if (!style) return "";
  const grade = style.school && unit.grade ? (NUMERALS[unit.grade] ?? String(unit.grade)) : "";
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

/** CONTRAGOLPE: `unit` devolve o golpe de quem o ataca e erra? */
export function counters(unit: Pick<Unit, "style">): boolean {
  return template(unit.style)?.counter === true;
}

/** MURALHA: quanto `target` tira de cada golpe que recebe, depois da armadura. */
export function styleReduction(target: Unit): number {
  return template(target.style)?.damageReduction ?? 0;
}
