import { distance, hasLineOfSight, posOfIndex, tileAt, type Pos } from "./grid";
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

/** Todo quadrado que `unit` pode mirar com `ability` de onde está. */
export function abilityTargets(encounter: Encounter, unit: Unit, ability: Ability): Pos[] {
  if (ability.targets === "self") return [{ ...unit.pos }];

  if (ability.targets === "tile") {
    return encounter.grid.tiles
      .map((_, index) => posOfIndex(encounter.grid, index))
      .filter((pos) => canAimAt(encounter, unit, ability, pos));
  }

  const wantsAlly = ability.targets === "ally";
  return encounter.units
    .filter((other) => isAlive(other) && (other.team === unit.team) === wantsAlly)
    .filter((other) => canTarget(encounter, unit, ability, other.pos))
    .map((other) => ({ ...other.pos }));
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
