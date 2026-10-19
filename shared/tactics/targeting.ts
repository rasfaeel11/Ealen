import { distance, hasLineOfSight, posOfIndex, tileAt, type Pos } from "./grid";
import { isBreakable, propAt, propTemplate, type Prop } from "./props";
import { isSworn } from "./styles";
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

/** Um golpe: o que se mira no outro lado (um inimigo, um quadrado, todos eles). Usar um abre a luta (`Encounter.opened`). */
export function isBlow(ability: Ability): boolean {
  return ability.targets !== "self" && ability.targets !== "ally";
}

/**
 * O VOTO da Ipojy proíbe `unit` de levantar a mão AGORA, seja qual for o
 * alvo: ele é da Espera e ninguém deu o primeiro golpe da luta ainda. Vale
 * pros golpes e pro ataque de oportunidade; o Contragolpe já vem depois de um
 * golpe. É o que a interface diz quando o botão apaga por causa do voto.
 */
export function vowForbids(encounter: Encounter, unit: Unit): boolean {
  return isSworn(unit.style) && !encounter.opened;
}

/**
 * O voto deixa `unit` usar `ability` mirada em `pos`? Quem não é da Ipojy, ou
 * o que não é golpe, sempre. Da Espera: só depois do primeiro golpe da luta,
 * e nunca pegando quem ainda está Surpreso — emboscar é bater em quem não
 * esperava.
 */
export function vowAllows(encounter: Encounter, unit: Unit, ability: Ability, pos: Pos): boolean {
  if (!isSworn(unit.style) || !isBlow(ability)) return true;
  if (!encounter.opened) return false;
  return !affectedUnits(encounter, ability, ability.targets === "foes" ? unit.pos : pos).some(
    (other) => other.team !== unit.team && other.statuses.some((status) => status.id === "surprised"),
  );
}

/** Todo quadrado que `unit` pode mirar com `ability` de onde está. Golpe que fere também mira um destrutível. */
export function abilityTargets(encounter: Encounter, unit: Unit, ability: Ability): Pos[] {
  if (vowForbids(encounter, unit) && isBlow(ability)) return [];
  return reachTargets(encounter, unit, ability).filter((pos) => vowAllows(encounter, unit, ability, pos));
}

function reachTargets(encounter: Encounter, unit: Unit, ability: Ability): Pos[] {
  if (ability.targets === "self") return [{ ...unit.pos }];
  // Sai de quem usa e pega todo inimigo de pé: só existe o que mirar se houver algum.
  if (ability.targets === "foes") {
    return encounter.units.some((other) => other.team !== unit.team && isAlive(other)) ? [{ ...unit.pos }] : [];
  }

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
  if (ability.targets === "foes") {
    const caster = unitAt(encounter, target);
    return caster ? encounter.units.filter((unit) => unit.team !== caster.team && isAlive(unit)) : [];
  }
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
