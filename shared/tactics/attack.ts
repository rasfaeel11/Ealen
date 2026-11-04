import { distance, tileAt, tilesBetween, type Pos } from "./grid";
import { STYLE_TO_HIT, styleEdgeBonus, styleMatchup } from "./styles";
import type { Ability, Encounter, Unit } from "./types";
import { defenseBonus, effectiveAttribute, isAlive, primaryAttribute } from "./units";

/**
 * O que a POSIÇÃO faz a um ataque — cobertura, flanco e altura — e o que o
 * CONFRONTO DE ESTILOS faz (ver ./styles.ts). É uma conta
 * só pro motor (que rola o dado), pra IA (que trabalha com a média) e pra
 * interface (que mostra a chance antes do clique).
 *
 * - COBERTURA: o alvo está colado num quadrado de `cover` (pedra, mureta) e
 *   a reta de quem ataca passa por ele. Soma na defesa do alvo. Só existe a
 *   dois quadrados ou mais: de perto não há o que se esconder atrás. E quem
 *   ataca de um chão mais alto mira por cima dela.
 * - FLANCO: golpe corpo a corpo com um aliado de pé do outro lado do alvo
 *   (qualquer um dos três quadrados opostos a quem bate). Soma no ataque.
 * - ALTURA: quem ataca de um chão mais alto soma no ataque; de um mais
 *   baixo, perde o mesmo tanto.
 *
 * - ESTILO: quem ataca um estilo que o dele vence soma no ataque; quem ataca
 *   o estilo que vence o dele perde o mesmo tanto. Só entre lados opostos.
 *
 * - TIRO (golpe de arma com alcance de 3 ou mais, ver `isShot`): na segunda
 *   metade do alcance perde acerto; com um inimigo colado, também. De um chão
 *   mais alto, alcança um quadrado a mais (ver canTarget em ./targeting.ts).
 *
 * Numa área, a cobertura é medida a partir do ponto de impacto, não de quem
 * a lançou, e não existe flanco.
 */

/** Quanto a cobertura soma na defesa do alvo. */
export const COVER_DEFENSE = 2;
/** Quanto flanquear soma no ataque. */
export const FLANK_TO_HIT = 2;
/** Quanto atacar de cima soma no ataque (e atacar de baixo tira). */
export const HEIGHT_TO_HIT = 2;
/** Quanto o tiro perde na segunda metade do alcance. */
export const LONG_SHOT_TO_HIT = 2;
/** Quanto o tiro perde com um inimigo colado em quem atira. */
export const POINT_BLANK_TO_HIT = 2;
/** O alcance a partir do qual um golpe de arma é um tiro. */
const SHOT_RANGE = 3;

/** Um tiro: golpe de arma que vai longe. Magia não é tiro: quem recita não mira, lê. */
export function isShot(ability: Ability): boolean {
  return ability.attack !== undefined && ability.range >= SHOT_RANGE && !ability.mana && ability.radius === undefined;
}

export interface AttackEdge {
  cover: boolean;
  flanked: boolean;
  /** 1 = quem ataca está acima do alvo; -1 = abaixo; 0 = no mesmo nível. */
  height: -1 | 0 | 1;
  /** 1 = o estilo de quem ataca vence o do alvo; -1 = perde pra ele; 0 = neutro. */
  style: -1 | 0 | 1;
  /** O que a escola soma (ou tira) na rolagem: STYLE_TO_HIT, e o grau de quem ataca na vantagem. */
  styleToHit: number;
  /** Tiro na segunda metade do alcance. */
  far: boolean;
  /** Tiro com um inimigo colado em quem atira. */
  crowded: boolean;
  /** O que tudo isso soma na rolagem de ataque. */
  toHit: number;
  /** O que tudo isso soma na defesa do alvo. */
  defense: number;
}

function hasCover(encounter: Encounter, origin: Pos, target: Pos): boolean {
  if (distance(origin, target) < 2) return false;
  return tilesBetween(encounter.grid, origin, target).some(
    (pos) => distance(pos, target) === 1 && tileAt(encounter.grid, pos)?.cover === true,
  );
}

function isFlanked(encounter: Encounter, actor: Unit, target: Unit): boolean {
  if (distance(actor.pos, target.pos) !== 1) return false;
  const dx = actor.pos.x - target.pos.x;
  const dy = actor.pos.y - target.pos.y;
  return encounter.units.some(
    (ally) =>
      ally !== actor &&
      ally !== target &&
      ally.team === actor.team &&
      isAlive(ally) &&
      distance(ally.pos, target.pos) === 1 &&
      (ally.pos.x - target.pos.x) * dx + (ally.pos.y - target.pos.y) * dy < 0,
  );
}

/** A vantagem (ou desvantagem) de posição de `actor` usando `ability` em `target`, mirada em `aim`. */
export function attackEdge(
  encounter: Encounter,
  actor: Unit,
  ability: Ability,
  target: Unit,
  aim: Pos = target.pos,
): AttackEdge {
  const area = ability.radius !== undefined;
  const rise = (tileAt(encounter.grid, actor.pos)?.elevation ?? 0) - (tileAt(encounter.grid, target.pos)?.elevation ?? 0);
  const height = Math.sign(rise) as -1 | 0 | 1;
  const cover = actor !== target && !(height > 0 && !area) && hasCover(encounter, area ? aim : actor.pos, target.pos);
  const flanked = !area && actor.team !== target.team && isFlanked(encounter, actor, target);
  const style = actor.team !== target.team ? styleMatchup(actor.style, target.style) : 0;
  const styleToHit = style * STYLE_TO_HIT + (style > 0 ? styleEdgeBonus(actor.grade) : 0);
  const shot = isShot(ability);
  const far = shot && distance(actor.pos, aim) > Math.ceil(ability.range / 2);
  const crowded = shot && encounter.units.some((other) => other.team !== actor.team && isAlive(other) && distance(other.pos, actor.pos) === 1);

  return {
    cover,
    flanked,
    height,
    style,
    styleToHit,
    far,
    crowded,
    toHit: (flanked ? FLANK_TO_HIT : 0) + height * HEIGHT_TO_HIT + styleToHit - (far ? LONG_SHOT_TO_HIT : 0) - (crowded ? POINT_BLANK_TO_HIT : 0),
    defense: cover ? COVER_DEFENSE : 0,
  };
}

/** O total que `actor` soma ao d20 e a defesa que ele precisa alcançar em `target`. */
export function attackTotals(actor: Unit, ability: Ability, target: Unit, edge: AttackEdge): { bonus: number; defense: number } {
  // O que as condições de quem ataca somam ou tiram da mão dele (um braço ferido).
  const condition = actor.statuses.reduce((sum, status) => sum + (status.toHit ?? 0), 0);
  return {
    bonus: effectiveAttribute(actor, primaryAttribute(actor)) + (ability.attack?.toHit ?? 0) + edge.toHit + condition,
    // A armadura e a esquiva só dificultam o acerto; quem tira dano do golpe que pega é o Couro.
    defense: 10 + effectiveAttribute(target, "couro") + defenseBonus(target) + edge.defense,
  };
}

export interface AttackOdds {
  /** Chance de acertar SEM ser crítico. */
  hit: number;
  crit: number;
  edge: AttackEdge;
}

/**
 * As chances do ataque, sem rolar nada. Espelha rollAttack em ./engine.ts:
 * dos 20 lados, o 20 é crítico, o 1 erra sempre, e de 2 a 19 acerta quem
 * alcança a defesa. Habilidade sem rolagem de ataque sempre pega.
 */
export function attackOdds(encounter: Encounter, actor: Unit, ability: Ability, target: Unit, aim?: Pos): AttackOdds {
  const edge = attackEdge(encounter, actor, ability, target, aim);
  if (!ability.attack) return { hit: 1, crit: 0, edge };
  if (actor.statuses.some((status) => status.guaranteedCrit)) return { hit: 0, crit: 1, edge };

  const { bonus, defense } = attackTotals(actor, ability, target, edge);
  return { hit: Math.min(18, Math.max(0, 20 - Math.max(2, defense - bonus))) / 20, crit: 1 / 20, edge };
}
