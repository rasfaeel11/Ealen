import { attackEdge, attackTotals } from "./attack";
import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { distance, samePos, tileAt, type Grid, type Pos } from "./grid";
import { findPath } from "./movement";
import { rollDice, rollDie } from "./rng";
import { STATUSES, type ActiveStatus, type StatusTemplate } from "./statuses";
import { abilityTargets, affectedUnits } from "./targeting";
import type {
  Ability,
  AbilityCost,
  AttackOutcome,
  AttributeRef,
  Command,
  CommandError,
  CommandResult,
  Effect,
  Encounter,
  TacticalEvent,
  TeamId,
  Unit,
} from "./types";
import { activeUnit, effectiveAttribute, isAlive, primaryAttribute, unitAt } from "./units";

/**
 * O motor de combate tático.
 *
 * Uma luta anda de comando em comando: `applyCommand` recebe UMA coisa que
 * o combatente da vez quer fazer (andar, usar uma habilidade, usar um item,
 * passar a vez), valida, muta a luta e devolve a lista ORDENADA do que
 * aconteceu. Não anima nada, não espera nada, não sabe se quem pediu foi um
 * clique ou a IA.
 *
 * Um comando recusado não muda nada — nem a posição de ninguém, nem o dado.
 */

export interface EncounterSetup {
  grid: Grid;
  /** Já posicionados (ver unitFromCharacter em ./units.ts). A luta passa a ser dona destes objetos. */
  units: Unit[];
  seed: number;
}

/** Começa uma luta: rola a iniciativa (d20 + Il) uma vez e abre o primeiro turno. */
export function startEncounter(setup: EncounterSetup): { encounter: Encounter; events: TacticalEvent[] } {
  const encounter: Encounter = {
    grid: setup.grid,
    units: setup.units,
    order: [],
    turnIndex: -1,
    round: 1,
    rngState: setup.seed >>> 0,
  };

  const rolls = encounter.units.map((unit, index) => ({
    unit,
    index,
    initiative: rollDie(encounter, 20) + effectiveAttribute(unit, "il"),
  }));
  // Empate: quem tem mais Il; persistindo, quem foi declarado primeiro.
  rolls.sort((a, b) => b.initiative - a.initiative || b.unit.attributes.il - a.unit.attributes.il || a.index - b.index);
  encounter.order = rolls.map((roll) => roll.unit.id);

  const events: TacticalEvent[] = [
    { type: "battleStarted", order: rolls.map((roll) => ({ unit: roll.unit.id, initiative: roll.initiative })) },
  ];
  if (!concludeIfDecided(encounter, events)) {
    events.push({ type: "roundStarted", round: 1 });
    advanceTurn(encounter, events);
  }
  return { encounter, events };
}

export function applyCommand(encounter: Encounter, command: Command): CommandResult {
  if (encounter.winner) return { ok: false, reason: "battle_over" };

  const unit = activeUnit(encounter);
  if (!unit || unit.id !== command.unitId) return { ok: false, reason: "not_your_turn" };

  const events: TacticalEvent[] = [];
  const error = execute(encounter, unit, command, events);
  if (error) return { ok: false, reason: error };

  if (!concludeIfDecided(encounter, events)) {
    // Quem morre no próprio turno (num ataque de oportunidade) perde o resto dele.
    if (command.type === "endTurn" || !isAlive(unit)) advanceTurn(encounter, events);
  }
  return { ok: true, events };
}

function execute(encounter: Encounter, unit: Unit, command: Command, events: TacticalEvent[]): CommandError | undefined {
  switch (command.type) {
    case "move":
      return move(encounter, unit, command.to, events);
    case "ability":
      return useAbility(encounter, unit, command.abilityId, command.target, events);
    case "useItem":
      return useItem(unit, command.itemId, events);
    case "endTurn":
      events.push({ type: "turnEnded", unit: unit.id });
      return undefined;
  }
}

// --- Turnos -----------------------------------------------------------------

/** Passa a vez pro próximo que ainda está de pé, abrindo uma rodada nova quando a ordem dá a volta. */
function advanceTurn(encounter: Encounter, events: TacticalEvent[]): void {
  let next: Unit | undefined;
  do {
    encounter.turnIndex += 1;
    if (encounter.turnIndex >= encounter.order.length) {
      encounter.turnIndex = 0;
      encounter.round += 1;
      events.push({ type: "roundStarted", round: encounter.round });
    }
    next = activeUnit(encounter);
  } while (!next || !isAlive(next));

  tickStatuses(next, events);
  next.turn = { movement: next.speed, action: true, bonus: true, reaction: true };
  events.push({ type: "turnStarted", unit: next.id });
}

/** Se um dos lados acabou, encerra a luta. Sem ninguém de pé dos dois lados, o grupo perdeu. */
function concludeIfDecided(encounter: Encounter, events: TacticalEvent[]): boolean {
  const standing = (team: TeamId) => encounter.units.some((unit) => unit.team === team && isAlive(unit));

  const winner: TeamId | undefined = !standing("party") ? "enemy" : !standing("enemy") ? "party" : undefined;
  if (!winner) return false;

  encounter.winner = winner;
  events.push({ type: "battleEnded", winner });
  return true;
}

// --- Condições --------------------------------------------------------------

/** Aplica uma condição. Reaplicar a mesma renova a duração em vez de empilhar. */
function addStatus(unit: Unit, status: StatusTemplate, turns: number, events: TacticalEvent[]): void {
  unit.statuses = unit.statuses.filter((active) => active.id !== status.id);
  unit.statuses.push({ ...status, turnsLeft: turns });
  events.push({ type: "statusApplied", target: unit.id, statusId: status.id, name: status.name, turns });
}

function removeStatuses(unit: Unit, shouldRemove: (status: ActiveStatus) => boolean, events: TacticalEvent[]): void {
  for (const status of unit.statuses.filter(shouldRemove)) {
    events.push({ type: "statusExpired", target: unit.id, statusId: status.id, name: status.name });
  }
  unit.statuses = unit.statuses.filter((status) => !shouldRemove(status));
}

/** Início do turno de `unit`: cada condição dela perde um turno, e as que zeram caem. */
function tickStatuses(unit: Unit, events: TacticalEvent[]): void {
  for (const status of unit.statuses) status.turnsLeft -= 1;
  removeStatuses(unit, (status) => status.turnsLeft <= 0, events);
}

// --- Movimento --------------------------------------------------------------

/**
 * Anda até `to` pelo caminho mais barato. A cada passo, todo inimigo com
 * reação sobrando de quem `unit` esteja SAINDO do alcance ganha um ataque
 * de oportunidade — antes do passo, com `unit` ainda no lugar. Morrer no
 * meio do caminho interrompe o movimento ali.
 */
function move(encounter: Encounter, unit: Unit, to: Pos, events: TacticalEvent[]): CommandError | undefined {
  const route = findPath(encounter, unit, to);
  if (!route || route.path.length === 0) return "unreachable";

  let from = { ...unit.pos };
  let walked: Pos[] = [];
  const flush = () => {
    if (walked.length === 0) return;
    events.push({ type: "moved", unit: unit.id, from, path: walked });
    from = { ...unit.pos };
    walked = [];
  };

  for (const step of route.path) {
    for (const threat of opportunityThreats(encounter, unit, step)) {
      flush();
      threat.attacker.turn.reaction = false;
      resolveAbility(encounter, threat.attacker, threat.ability, unit.pos, [unit], true, events);
      if (!isAlive(unit)) return undefined;
    }

    unit.turn.movement -= tileAt(encounter.grid, step)!.moveCost;
    unit.pos = { ...step };
    walked.push({ ...step });
  }
  flush();
  return undefined;
}

function opportunityThreats(encounter: Encounter, mover: Unit, next: Pos): { attacker: Unit; ability: Ability }[] {
  const threats: { attacker: Unit; ability: Ability }[] = [];
  for (const attacker of encounter.units) {
    if (attacker.team === mover.team || !isAlive(attacker) || !attacker.turn.reaction) continue;

    const ability = attacker.abilities.find((candidate) => candidate.opportunity);
    if (!ability) continue;
    if (distance(attacker.pos, mover.pos) <= ability.range && distance(attacker.pos, next) > ability.range) {
      threats.push({ attacker, ability });
    }
  }
  return threats;
}

// --- Habilidades ------------------------------------------------------------

function hasResource(unit: Unit, cost: AbilityCost): boolean {
  return cost === "action" ? unit.turn.action : unit.turn.bonus;
}

function spendResource(unit: Unit, cost: AbilityCost): void {
  if (cost === "action") unit.turn.action = false;
  else unit.turn.bonus = false;
}

function useAbility(
  encounter: Encounter,
  unit: Unit,
  abilityId: string,
  target: Pos,
  events: TacticalEvent[],
): CommandError | undefined {
  const ability = unit.abilities.find((candidate) => candidate.id === abilityId);
  if (!ability) return "unknown_ability";
  if (!hasResource(unit, ability.cost)) return "resource_spent";
  if (!abilityTargets(encounter, unit, ability).some((pos) => samePos(pos, target))) return "invalid_target";

  spendResource(unit, ability.cost);
  resolveAbility(encounter, unit, ability, target, affectedUnits(encounter, ability, target), false, events);
  return undefined;
}

/**
 * Executa `ability` de `actor` sobre `targets`, já validada e paga. Cada
 * alvo tem a própria rolagem de ataque; quem é errado não sofre efeito
 * nenhum, e quem morre não sofre os efeitos seguintes.
 */
function resolveAbility(
  encounter: Encounter,
  actor: Unit,
  ability: Ability,
  targetPos: Pos,
  targets: Unit[],
  reaction: boolean,
  events: TacticalEvent[],
): void {
  events.push({
    type: "abilityUsed",
    unit: actor.id,
    abilityId: ability.id,
    name: ability.name,
    target: { ...targetPos },
    reaction,
  });

  for (const target of targets) {
    let critical = false;
    if (ability.attack) {
      const outcome = rollAttack(encounter, actor, target, ability, targetPos, events);
      if (outcome === "miss" || outcome === "fumble") continue;
      critical = outcome === "crit";
    }

    for (const effect of ability.effects) {
      if (!isAlive(target)) break;
      applyEffect(encounter, actor, target, effect, critical, events);
    }
  }
}

/**
 * d20 + atributo primário + modificador contra 10 + Or do alvo, com o que a
 * posição soma de cada lado (cobertura, flanco, altura — ver ./attack.ts).
 * 20 natural (ou Foco) é crítico e sempre acerta; 1 natural sempre erra e
 * deixa quem atacou Desequilibrado até o próprio próximo turno.
 */
function rollAttack(
  encounter: Encounter,
  actor: Unit,
  target: Unit,
  ability: Ability,
  aim: Pos,
  events: TacticalEvent[],
): AttackOutcome {
  const edge = attackEdge(encounter, actor, ability, target, aim);
  const { bonus, defense } = attackTotals(actor, ability, target, edge);
  const natural = rollDie(encounter, 20);
  const total = natural + bonus;
  const guaranteed = actor.statuses.some((status) => status.guaranteedCrit);

  let outcome: AttackOutcome;
  if (guaranteed || natural === 20) outcome = "crit";
  else if (natural === 1) outcome = "fumble";
  else outcome = total >= defense ? "hit" : "miss";

  events.push({
    type: "attackRoll",
    actor: actor.id,
    target: target.id,
    natural,
    total,
    defense,
    outcome,
    cover: edge.cover,
    flanked: edge.flanked,
    height: edge.height,
  });

  if (guaranteed) removeStatuses(actor, (status) => status.guaranteedCrit === true, events);
  if (outcome === "fumble") addStatus(actor, STATUSES.off_balance, 1, events);
  return outcome;
}

function applyEffect(
  encounter: Encounter,
  actor: Unit,
  target: Unit,
  effect: Effect,
  critical: boolean,
  events: TacticalEvent[],
): void {
  const attributeOf = (ref: AttributeRef | undefined) =>
    ref === undefined ? 0 : effectiveAttribute(actor, ref === "primary" ? primaryAttribute(actor) : ref);

  switch (effect.kind) {
    case "damage": {
      let amount = Math.round((attributeOf(effect.attribute) + rollDice(encounter, effect.dice)) * (effect.multiplier ?? 1));
      if (effect.bonus) amount += Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor);
      if (critical) amount *= 2;

      const targetOr = effectiveAttribute(target, "or");
      amount = Math.max(1, amount - Math.floor(targetOr / 2));

      if (target.statuses.some((status) => status.guard)) {
        const blocked = Math.min(amount, targetOr + rollDie(encounter, 6));
        amount -= blocked;
        events.push({ type: "blocked", unit: target.id, amount: blocked });
      }
      if (amount > 0) dealDamage(target, amount, events);
      return;
    }
    case "heal": {
      const amount = Math.min(
        target.maxHp - target.currentHp,
        attributeOf(effect.attribute) + rollDice(encounter, effect.dice),
      );
      target.currentHp += amount;
      events.push({ type: "heal", target: target.id, amount, remainingHp: target.currentHp });
      return;
    }
    case "status":
      addStatus(target, STATUSES[effect.statusId], effect.turns, events);
      return;
    case "push":
      push(encounter, actor, target, effect.distance, events);
      return;
  }
}

function dealDamage(target: Unit, amount: number, events: TacticalEvent[]): void {
  target.currentHp = Math.max(0, target.currentHp - amount);
  events.push({ type: "damage", target: target.id, amount, remainingHp: target.currentHp });
  if (target.currentHp > 0) return;

  target.statuses = [];
  events.push({ type: "death", unit: target.id });
}

/**
 * Desloca `target` em linha reta pra longe de `actor` (ou pra perto, com
 * distância negativa), um quadrado por vez, até acabar a distância ou
 * bater em parede, borda ou corpo. Movimento forçado não provoca ataque de
 * oportunidade.
 */
function push(encounter: Encounter, actor: Unit, target: Unit, pushDistance: number, events: TacticalEvent[]): void {
  const direction = Math.sign(pushDistance);
  const dx = Math.sign(target.pos.x - actor.pos.x) * direction;
  const dy = Math.sign(target.pos.y - actor.pos.y) * direction;
  if (dx === 0 && dy === 0) return;

  const from = { ...target.pos };
  for (let step = 0; step < Math.abs(pushDistance); step++) {
    const next = { x: target.pos.x + dx, y: target.pos.y + dy };
    if (tileAt(encounter.grid, next)?.blocksMove ?? true) break;
    if (unitAt(encounter, next)) break;
    target.pos = next;
  }
  if (!samePos(from, target.pos)) events.push({ type: "pushed", unit: target.id, from, to: { ...target.pos } });
}

// --- Itens ------------------------------------------------------------------

/**
 * Usa um consumível da própria mochila. Custa a ação bônus: beber uma
 * poção não deveria custar o ataque do turno.
 */
function useItem(unit: Unit, itemId: string, events: TacticalEvent[]): CommandError | undefined {
  const slot = findInventorySlot(unit, itemId);
  if (!slot || slot.quantity <= 0) return "item_unavailable";
  if (!unit.turn.bonus) return "resource_spent";

  unit.turn.bonus = false;
  const { id, name, data } = slot.item;
  const { effect } = data;
  consumeInventoryCharge(unit, slot);

  const announce = (description: string) =>
    events.push({ type: "itemUsed", unit: unit.id, itemId: id, itemName: name, description });

  switch (effect.kind) {
    case "heal_hp":
    case "cure_status": {
      const { healed, description } = applyImmediateHeal(unit, effect);
      announce(description);
      if (healed > 0) events.push({ type: "heal", target: unit.id, amount: healed, remainingHp: unit.currentHp });
      // Purificar tira do corpo toda condição que esteja atrapalhando.
      if (effect.kind === "cure_status") {
        removeStatuses(unit, (status) => Object.values(status.attributeBonus ?? {}).some((bonus) => bonus < 0), events);
      }
      return undefined;
    }
    case "buff_stat": {
      const label = `+${effect.bonus} ${effect.stat.toUpperCase()}`;
      announce(`${label} por ${effect.durationTurns} turnos.`);
      addStatus(
        unit,
        { id: `buff_${effect.stat}`, name: label, attributeBonus: { [effect.stat]: effect.bonus } },
        effect.durationTurns,
        events,
      );
      return undefined;
    }
    case "focus_charge":
      announce("Garante um acerto crítico no próximo golpe.");
      // Dura até ser gasto num ataque; os turnos são só um teto pra não ficar guardado a luta toda.
      addStatus(unit, STATUSES.focused, 3, events);
      return undefined;
  }
}
