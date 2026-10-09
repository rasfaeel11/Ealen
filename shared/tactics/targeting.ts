import { distance, hasLineOfSight, posOfIndex, tileAt, type Pos } from "./grid";
import { isBreakable, propAt, propTemplate, type Prop } from "./props";
import type { Supporter } from "./supports";
import type { Ability, Encounter, Unit } from "./types";
import { isAlive, unitAt } from "./units";

/**
 * Quem (ou onde) uma habilidade pode mirar, e quem ela acerta. A interface
 * usa isto pra acender os alvos; o motor usa pra validar o comando; a IA
 * usa pra listar as jogadas possíveis. Uma regra só pros três.
 */

function canTarget(encounter: Encounter, unit: Unit, ability: Ability, pos: Pos): boolean {
  return distance(unit.pos, pos) <= ability.range && hasLineOfSight(encounter.grid, unit.pos, pos);
}

/** Se `unit` pode mirar o quadrado `pos` com uma habilidade de `targets: "tile"`, de onde está. */
export function canAimAt(encounter: Encounter, unit: Unit, ability: Ability, pos: Pos): boolean {
  const tile = tileAt(encounter.grid, pos);
  return tile !== undefined && !tile.blocksSight && canTarget(encounter, unit, ability, pos);
}

function dealsDamage(ability: Ability): boolean {
  return ability.effects.some((effect) => effect.kind === "damage");
}

/** Todo quadrado que `unit` pode mirar com `ability` de onde está. Golpe que fere também mira um destrutível. */
export function abilityTargets(encounter: Encounter, unit: Unit, ability: Ability): Pos[] {
  if (ability.targets === "self") return [{ ...unit.pos }];

  if (ability.targets === "tile") {
    return encounter.grid.tiles
      .map((_, index) => posOfIndex(encounter.grid, index))
      .filter((pos) => canAimAt(encounter, unit, ability, pos));
  }

  const wantsAlly = ability.targets === "ally";
  const targets = encounter.units
    .filter((other) => isAlive(other) && (other.team === unit.team) === wantsAlly)
    .filter((other) => canTarget(encounter, unit, ability, other.pos))
    .map((other) => ({ ...other.pos }));
  if (wantsAlly || !dealsDamage(ability)) return targets;

  const props = encounter.props
    .filter((prop) => isBreakable(prop) && canTarget(encounter, unit, ability, prop.pos))
    .map((prop) => ({ ...prop.pos }));
  return [...targets, ...props];
}

/**
 * Quem é atingido se `ability` for mirada em `target`. Numa área, todo
 * mundo no raio que o ponto de impacto "enxerga" — uma parede no meio
 * protege, um aliado no meio não.
 */
export function affectedUnits(encounter: Encounter, ability: Ability, target: Pos): Unit[] {
  if (ability.radius === undefined) {
    const unit = unitAt(encounter, target);
    return unit ? [unit] : [];
  }

  const radius = ability.radius;
  return encounter.units.filter(
    (unit) =>
      isAlive(unit) && distance(unit.pos, target) <= radius && hasLineOfSight(encounter.grid, target, unit.pos),
  );
}

/**
 * Os destrutíveis que `ability` danifica se for mirada em `target`: o do
 * quadrado mirado ou, numa área, todos os do raio. Só golpe que fere quebra
 * alguma coisa.
 */
export function affectedProps(encounter: Encounter, ability: Ability, target: Pos): Prop[] {
  if (!dealsDamage(ability)) return [];
  if (ability.radius === undefined) {
    const prop = propAt(encounter, target);
    return prop && isBreakable(prop) ? [prop] : [];
  }

  const radius = ability.radius;
  return encounter.props.filter(
    (prop) => isBreakable(prop) && distance(prop.pos, target) <= radius && hasLineOfSight(encounter.grid, target, prop.pos),
  );
}

/** A quantos quadrados se mexe num objeto: colado nele, diagonal inclusive. */
export const INTERACT_RANGE = 1;

/**
 * Os objetos em que `unit` pode mexer de onde está (comando `interact`): os
 * que têm `interact`, estão de pé, ainda não foram usados e estão colados
 * nele. Só o grupo do jogador mexe em alguma coisa — objetivo é coisa dele.
 */
export function interactTargets(encounter: Encounter, unit: Unit): Prop[] {
  if (unit.team !== "party") return [];
  return encounter.props.filter(
    (prop) =>
      prop.hp > 0 &&
      !prop.used &&
      propTemplate(prop).interact !== undefined &&
      distance(unit.pos, prop.pos) <= INTERACT_RANGE,
  );
}

/**
 * Quem o apoio de `supporter` pode mirar agora, chamado por `unit` (comando
 * `support`): qualquer inimigo de pé — quem apoia olha a luta de fora, não
 * precisa de alcance nem de linha de visão. Ninguém, se o apoio já foi dado
 * nesta rodada ou se quem chama não é do grupo do jogador.
 */
export function supportTargets(encounter: Encounter, unit: Unit, supporter: Supporter): Unit[] {
  if (unit.team !== "party" || !supporter.ready) return [];
  return encounter.units.filter((other) => other.team !== unit.team && isAlive(other));
}
