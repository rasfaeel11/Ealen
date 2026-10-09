import { distance, tileAt, tilesBetween, type Pos } from "./grid";
import { STYLE_TO_HIT, styleMatchup } from "./styles";
import type { Ability, Encounter, Unit } from "./types";
import { effectiveAttribute, isAlive, primaryAttribute } from "./units";

/**
 * O que a POSIÇÃO faz a um ataque — cobertura, flanco e altura — e o que o
 * CONFRONTO DE ESTILOS faz (ver ./styles.ts). É uma conta
 * só pro motor (que rola o dado), pra IA (que trabalha com a média) e pra
 * interface (que mostra a chance antes do clique).
 *
 * - COBERTURA: o alvo está colado num quadrado de `cover` (pedra, mureta) e
 *   a reta de quem ataca passa por ele. Soma na defesa do alvo. Só existe a
 *   dois quadrados ou mais: de perto não há o que se esconder atrás.
 * - FLANCO: golpe corpo a corpo com um aliado de pé do outro lado do alvo
 *   (qualquer um dos três quadrados opostos a quem bate). Soma no ataque.
 * - ALTURA: quem ataca de um chão mais alto soma no ataque; de um mais
 *   baixo, perde o mesmo tanto.
 *
 * - ESTILO: quem ataca um estilo que o dele vence soma no ataque; quem ataca
 *   o estilo que vence o dele perde o mesmo tanto. Só entre lados opostos.
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

export interface AttackEdge {
  cover: boolean;
  flanked: boolean;
  /** 1 = quem ataca está acima do alvo; -1 = abaixo; 0 = no mesmo nível. */
  height: -1 | 0 | 1;
  /** 1 = o estilo de quem ataca vence o do alvo; -1 = perde pra ele; 0 = neutro. */
  style: -1 | 0 | 1;
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
  const cover = actor !== target && hasCover(encounter, area ? aim : actor.pos, target.pos);
  const flanked = !area && actor.team !== target.team && isFlanked(encounter, actor, target);
  const rise = (tileAt(encounter.grid, actor.pos)?.elevation ?? 0) - (tileAt(encounter.grid, target.pos)?.elevation ?? 0);
  const height = Math.sign(rise) as -1 | 0 | 1;
  const style = actor.team !== target.team ? styleMatchup(actor.style, target.style) : 0;

  return {
    cover,
    flanked,
    height,
    style,
    toHit: (flanked ? FLANK_TO_HIT : 0) + height * HEIGHT_TO_HIT + style * STYLE_TO_HIT,
    defense: cover ? COVER_DEFENSE : 0,
  };
}

/** O total que `actor` soma ao d20 e a defesa que ele precisa alcançar em `target`. */
export function attackTotals(actor: Unit, ability: Ability, target: Unit, edge: AttackEdge): { bonus: number; defense: number } {
  // O que as condições de quem ataca somam ou tiram da mão dele (um braço ferido).
  const condition = actor.statuses.reduce((sum, status) => sum + (status.toHit ?? 0), 0);
  return {
    bonus: effectiveAttribute(actor, primaryAttribute(actor)) + (ability.attack?.toHit ?? 0) + edge.toHit + condition,
    defense: 10 + effectiveAttribute(target, "or") + edge.defense,
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
