import type { Ability, Unit } from "./types";

/**
 * As escolas de espada (`magia` §5.5 e `combate` §4 no repositório da
 * história): o JEITO de lutar de um espadachim. O kit diz o que ele sabe
 * fazer (as habilidades e os verbos); a escola diz como ele os ENCADEIA.
 *
 * O TRIÂNGULO, fechado: Ipojy (a Espera) vence Gryskar (o Bate-Primeiro),
 * Gryskar vence Tsvirana (a Correnteza), Tsvirana vence Ipojy. Ele não soma
 * nada na rolagem (`combate` §4): sai do traço de cada uma.
 *
 *   Gryskar — toda a aura no primeiro golpe. Aceita o custo pra agir antes de
 *     todos (`first`: abre a ordem da luta pagando Fôlego, ver startEncounter),
 *     e o segundo golpe da mesma cadeia sai fraco (`spent`). A ONDA
 *     (`momentum`): cada golpe que pega no MESMO alvo, em seguida, soma no dano
 *     do próximo. Errar, ou trocar de alvo, zera.
 *   Tsvirana — troca de verbo no meio da ação (`feints`): o verbo diferente do
 *     anterior, na mesma cadeia, sai sem Fôlego e não se apara nem se devolve.
 *     A RACHADURA (`punishRepeat`): quem repete a mesma ação do turno anterior
 *     fica Exposto pra ela (ver EXPOSED_TO_HIT em ./attack.ts).
 *   Ipojy — o CONTRAGOLPE (`counter`): quem a ataca e falha leva o golpe de
 *     volta, na reação dela, e o golpe sai como sucesso pleno, sem rolar: a
 *     falha do outro vira o acerto dela (ver `counterStrike`).
 *
 * O VOTO da Ipojy (`vow`): quem é da Espera nunca dá o primeiro golpe. Não
 * abre a luta (nada hostil sai dele antes de alguém, de qualquer lado, dar o
 * primeiro golpe — `Encounter.opened`), não embosca (não mira quem ainda está
 * Surpreso) e não dá golpe de abertura. A regra mora em ./targeting.ts
 * (`vowAllows`), que é a mesma pro motor, pra IA e pra interface. O voto do
 * Gryskar (não recuar o primeiro passo) não tem peça: o motor não tem Recuar.
 *
 * Fora do triângulo há o BALUARTE, que não é escola: é o couro de criatura
 * grande, com a MURALHA (`damageReduction`), um tanto fixo a menos em cada
 * golpe que recebe, depois da armadura.
 *
 * A PROFICIÊNCIA (o `grade` da unidade, 1 a 7) é o quanto alguém domina a
 * escola. Nunca passa do nível de aura dele (`proficiency`). Entra na chance
 * (`gradeToHit`: 1 por grau acima do 2, `combate` §5.1) e na Onda, que
 * acumula até o grau mais 1 golpes (`momentumCap`). O grau não sobe na árvore:
 * quem o corta é a aura (`aura_rise`). O golpe-selo de cada escola, que vem a
 * partir do grau 4 e só por iniciação, não existe no jogo: o trio não chega lá.
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
  /** Gryskar: abre a ordem da luta pagando o custo, e o segundo golpe da cadeia sai fraco. */
  first?: boolean;
  /** Tsvirana: a troca de verbo no meio da cadeia sai sem Fôlego e não se apara nem se devolve. */
  feints?: boolean;
  /** Tsvirana: quem repete a ação do turno anterior fica Exposto pra ela. */
  punishRepeat?: boolean;
  /** Devolve o golpe a quem o ataca e erra (ver `counterStrike`). */
  counter?: boolean;
  /** O voto de nunca dar o primeiro golpe (ver `isSworn`). */
  vow?: boolean;
  damageReduction?: number;
}

export const STYLES = {
  ipojy: { id: "ipojy", name: "Ipojy", alias: "a Espera", school: true, beats: "gryskar", trait: "Contragolpe", counter: true, vow: true },
  gryskar: { id: "gryskar", name: "Gryskar", alias: "o Bate-Primeiro", school: true, beats: "tsvirana", trait: "Onda", momentum: 1, first: true },
  tsvirana: { id: "tsvirana", name: "Tsvirana", alias: "a Correnteza", school: true, beats: "ipojy", trait: "Rachadura", punishRepeat: true, feints: true },
  baluarte: { id: "baluarte", name: "Baluarte", trait: "Muralha", damageReduction: 2 },
} satisfies Record<string, StyleTemplate>;

export type StyleId = keyof typeof STYLES;

export function isStyleId(id: unknown): id is StyleId {
  return typeof id === "string" && id in STYLES;
}

/** Até quantos golpes seguidos a Onda acumula, no grau 3 (ver momentumCap). */
export const MOMENTUM_CAP = 4;

/** Até quantos golpes seguidos a Onda de quem tem grau `grade` acumula: o grau mais 1. Sem grau, o teto do grau 3. */
export function momentumCap(grade: number | undefined): number {
  return grade === undefined ? MOMENTUM_CAP : Math.max(1, grade + 1);
}

/** O que o grau soma na chance de quem é de escola (`combate` §5.1): 1 por grau acima do 2. O Baluarte não tem grau. */
export function gradeToHit(unit: Pick<Unit, "style" | "grade">): number {
  return template(unit.style)?.school ? Math.max(0, (unit.grade ?? 2) - 2) : 0;
}

/** Quanto do dano sai no segundo golpe da mesma cadeia de quem é do Gryskar: a aura foi toda no primeiro. */
export const SPENT_DAMAGE = 0.5;
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
  return momentum * Math.min(actor.streak.hits, momentumCap(actor.grade));
}

/** RACHADURA: `actor` deixa Exposto quem repete a ação do turno anterior? (ver EXPOSED_TO_HIT em ./attack.ts) */
export function punishesRepeat(actor: Pick<Unit, "style">): boolean {
  return template(actor.style)?.punishRepeat === true;
}

/** GRYSKAR: `unit` paga pra abrir a ordem da luta, e o segundo golpe da cadeia dele sai fraco. */
export function strikesFirst(unit: Pick<Unit, "style">): boolean {
  return template(unit.style)?.first === true;
}

/** TSVIRANA: `unit` troca de verbo no meio da cadeia sem Fôlego, e o golpe trocado não se apara nem se devolve. */
export function feints(unit: Pick<Unit, "style">): boolean {
  return template(unit.style)?.feints === true;
}

/** VOTO: quem luta na escola `style` jurou nunca dar o primeiro golpe? Vale pra unidade e pra ficha do elenco. */

/**
 * Quem apara: quem é de uma escola de espada (o triângulo, não o Baluarte de
 * bicho) e bate de perto. Com besta na mão não se apara nada.
 */
export function parries(unit: Pick<Unit, "style" | "abilities" | "characterClass">): boolean {
  if (unit.style === undefined || unit.style === "baluarte") return false;
  const weapon = unit.abilities.find((ability) => ability.id === `${unit.characterClass}.attack`);
  return weapon !== undefined && weapon.range <= 2;
}

/** O nível de aura a partir do qual o empurrão do corpo vai mais longe (ver auraShove): o Corpo. */
export const AURA_SHOVE_FROM = 3;

/**
 * A AURA NOS VERBOS (`combate` §3.5: "Empurrar de Corpo derruba quem a força do
 * braço não derrubaria"): o nível de aura não dá verbo novo, muda o alcance dos
 * que existem. Do Corpo pra cima, o empurrão do corpo (Empurrar, a Ombrada) leva
 * um quadrado a mais, o que também vence um quadrado do peso de quem é empurrado.
 */
export function auraShove(unit: Pick<Unit, "aura">, ability: Pick<Ability, "verb" | "id">): number {
  const bodily = ability.verb === "empurrar" || ability.id === "gift.shoulder";
  return bodily && (unit.aura ?? 0) >= AURA_SHOVE_FROM ? 1 : 0;
}

export function isSworn(style: StyleId | undefined): boolean {
  return template(style)?.vow === true;
}

/** CONTRAGOLPE: `unit` devolve o golpe de quem o ataca e erra? */
export function counters(unit: Pick<Unit, "style">): boolean {
  return template(unit.style)?.counter === true;
}

/**
 * MURALHA: quanto `target` tira de cada golpe que recebe, depois da armadura —
 * a do Baluarte mais o que as condições dele somam (`wall`: alta na água, baixa
 * em seco, no bicho de rio). Nunca abaixo de zero.
 */
export function styleReduction(target: Unit): number {
  const walls = target.statuses.reduce((sum, status) => sum + (status.wall ?? 0), 0);
  return Math.max(0, (template(target.style)?.damageReduction ?? 0) + walls);
}
