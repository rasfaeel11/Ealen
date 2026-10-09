import { attackEdge, attackTotals } from "./attack";
import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { distance, samePos, tileAt, type Grid, type Pos } from "./grid";
import { findPath } from "./movement";
import { PROPS, fellProp, type Prop, type PropTemplate } from "./props";
import { rollDice, rollDie } from "./rng";
import { STATUSES, type ActiveStatus, type StatusTemplate } from "./statuses";
import {
  SURFACES,
  enterCost,
  spreadTiles,
  surfaceAt,
  surfaceTiles,
  type SurfaceId,
  type SurfaceTemplate,
} from "./surfaces";
import { abilityTargets, affectedProps, affectedUnits } from "./targeting";
import type {
  Ability,
  AbilityCost,
  AttackOutcome,
  AttributeRef,
  Command,
  CommandError,
  CommandResult,
  Cue,
  CueEnding,
  CueWhen,
  Effect,
  Encounter,
  TacticalEvent,
  TeamId,
  Unit,
} from "./types";
import { activeUnit, effectiveAttribute, findUnit, isAlive, isOver, primaryAttribute, unitAt } from "./units";

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
  /** Os destrutíveis da luta, JÁ de pé em `grid` (ver standProp em ./props.ts). */
  props?: Prop[];
  /**
   * O lado pego de surpresa, numa emboscada: cada um dele entra Surpreso —
   * perde o primeiro turno e, até lá, não tem reação (não pune quem passa).
   */
  surprised?: TeamId;
  /**
   * O roteiro da luta: as deixas dela, na ordem em que valem quando duas
   * disparam juntas (ver Cue em ./types.ts). Sem nenhuma, a luta só acaba
   * com um lado inteiro no chão.
   */
  cues?: Cue[];
  seed: number;
}

/**
 * Começa uma luta: rola a iniciativa (d20 + Il) uma vez e abre o primeiro
 * turno. A surpresa não mexe na iniciativa: quem foi surpreendido só perde a
 * vez quando ela chega.
 */
export function startEncounter(setup: EncounterSetup): { encounter: Encounter; events: TacticalEvent[] } {
  const encounter: Encounter = {
    grid: setup.grid,
    units: setup.units,
    order: [],
    turnIndex: -1,
    round: 1,
    props: setup.props ?? [],
    surfaces: [],
    cues: [...(setup.cues ?? [])],
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
    {
      type: "battleStarted",
      order: rolls.map((roll) => ({ unit: roll.unit.id, initiative: roll.initiative })),
      ...(setup.surprised ? { surprised: setup.surprised } : {}),
    },
  ];
  for (const unit of encounter.units) {
    if (unit.team !== setup.surprised || !isAlive(unit)) continue;
    unit.turn.reaction = false;
    addStatus(unit, STATUSES.surprised, 1, events);
  }
  if (!concludeIfDecided(encounter, events)) {
    events.push({ type: "roundStarted", round: 1 });
    advanceTurn(encounter, events);
  }
  return { encounter, events };
}

export function applyCommand(encounter: Encounter, command: Command): CommandResult {
  if (isOver(encounter)) return { ok: false, reason: "battle_over" };

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

/**
 * Passa a vez pro próximo que ainda está de pé, abrindo uma rodada nova
 * quando a ordem dá a volta. Quem começa o turno em cima de uma superfície
 * que fere leva o dano dela — e, se cair ali, a vez passa adiante (ou a luta
 * acaba, se era o último do lado dele). Quem começa o turno com uma condição
 * que o faz perder a vez (`skipsTurn`) recebe o turno e o perde na hora.
 */
function advanceTurn(encounter: Encounter, events: TacticalEvent[]): void {
  for (;;) {
    let next: Unit | undefined;
    do {
      encounter.turnIndex += 1;
      if (encounter.turnIndex >= encounter.order.length) {
        encounter.turnIndex = 0;
        encounter.round += 1;
        events.push({ type: "roundStarted", round: encounter.round });
        tickSurfaces(encounter, events);
        // Uma deixa de rodada pode parar a luta aqui, antes de a vez de alguém começar.
        if (fireCues(encounter, events)) return;
      }
      next = activeUnit(encounter);
    } while (!next || !isAlive(next));

    // Lida antes de contar: a condição que dura "até o próximo turno" cai neste, e é ele que se perde.
    const skip = next.statuses.find((status) => status.skipsTurn);
    tickStatuses(next, events);
    next.turn = { movement: next.speed, action: true, bonus: true, reaction: true };
    events.push({ type: "turnStarted", unit: next.id });

    touchSurface(encounter, next, events);
    if (!isAlive(next)) {
      if (concludeIfDecided(encounter, events)) return;
      continue;
    }
    if (!skip) return;

    next.turn = { movement: 0, action: false, bonus: false, reaction: true };
    events.push({ type: "turnSkipped", unit: next.id, name: skip.name }, { type: "turnEnded", unit: next.id });
  }
}

/**
 * Se a luta acabou, encerra: por uma deixa do roteiro, que fala antes das
 * regras, ou por um dos lados ter caído inteiro. Sem ninguém de pé dos dois
 * lados, o grupo perdeu.
 */
function concludeIfDecided(encounter: Encounter, events: TacticalEvent[]): boolean {
  if (fireCues(encounter, events)) return true;

  const standing = (team: TeamId) => encounter.units.some((unit) => unit.team === team && isAlive(unit));

  const winner: TeamId | undefined = !standing("party") ? "enemy" : !standing("enemy") ? "party" : undefined;
  if (!winner) return false;

  encounter.winner = winner;
  events.push({ type: "battleEnded", winner });
  return true;
}

// --- Roteiro ----------------------------------------------------------------

/** Como a deixa encerra a luta, se encerra. A de `defeat` sempre encerra: é ela no lugar da derrota. */
export function cueEnding(cue: { when: { kind: CueWhen["kind"] }; ends?: CueEnding }): CueEnding | undefined {
  return cue.ends ?? (cue.when.kind === "defeat" ? "stop" : undefined);
}

/** A hora da deixa chegou? Quem (ou o quê) ela espera e não está nesta luta não chega nunca. */
function isDue(encounter: Encounter, when: CueWhen): boolean {
  switch (when.kind) {
    case "round":
      return encounter.round >= when.round;
    case "down": {
      const unit = findUnit(encounter, when.unit);
      return unit !== undefined && !isAlive(unit);
    }
    case "broken":
      return encounter.props.some((prop) => prop.id === when.prop && prop.hp <= 0);
    case "defeat":
      return !encounter.units.some((unit) => unit.team === "party" && isAlive(unit));
  }
}

/**
 * Dispara as deixas cuja hora chegou, na ordem em que foram declaradas, cada
 * uma uma vez só. A primeira que encerra a luta encerra — as que vinham
 * depois dela não disparam. Devolve se a luta acabou.
 */
function fireCues(encounter: Encounter, events: TacticalEvent[]): boolean {
  for (const cue of [...encounter.cues]) {
    if (!isDue(encounter, cue.when)) continue;
    encounter.cues = encounter.cues.filter((other) => other !== cue);
    events.push({ type: "cue", id: cue.id });

    const ends = cueEnding(cue);
    if (!ends) continue;
    if (ends === "win") {
      encounter.winner = "party";
      events.push({ type: "battleEnded", winner: "party" });
    } else {
      encounter.stopped = true;
      events.push({ type: "battleEnded" });
    }
    return true;
  }
  return false;
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

// --- Superfícies ------------------------------------------------------------

/** Põe `surfaceId` em cada um de `tiles`, no lugar do que houvesse lá. */
function laySurface(
  encounter: Encounter,
  surfaceId: SurfaceId,
  tiles: Pos[],
  rounds: number,
  events: TacticalEvent[],
): void {
  if (tiles.length === 0) return;
  encounter.surfaces = encounter.surfaces.filter((surface) => !tiles.some((pos) => samePos(pos, surface.pos)));
  for (const pos of tiles) encounter.surfaces.push({ pos: { ...pos }, id: surfaceId, roundsLeft: rounds });
  events.push({
    type: "surfaceCreated",
    surfaceId,
    name: SURFACES[surfaceId].name,
    tiles: tiles.map((pos) => ({ ...pos })),
    rounds,
  });
}

/** Começo de rodada: cada superfície perde uma rodada, e as que zeram somem. */
function tickSurfaces(encounter: Encounter, events: TacticalEvent[]): void {
  for (const surface of encounter.surfaces) surface.roundsLeft -= 1;

  const gone = encounter.surfaces.filter((surface) => surface.roundsLeft <= 0);
  encounter.surfaces = encounter.surfaces.filter((surface) => surface.roundsLeft > 0);
  for (const surfaceId of new Set(gone.map((surface) => surface.id))) {
    const tiles = gone.filter((surface) => surface.id === surfaceId).map((surface) => surface.pos);
    events.push({ type: "surfaceExpired", surfaceId, name: SURFACES[surfaceId].name, tiles });
  }
}

/** `unit` acabou de entrar no quadrado em que está, ou começou o turno nele: a superfície de lá age. */
function touchSurface(encounter: Encounter, unit: Unit, events: TacticalEvent[]): void {
  const surface = encounter.surfaces.find((candidate) => samePos(candidate.pos, unit.pos));
  const damage = surface && (SURFACES[surface.id] as SurfaceTemplate).damage;
  if (!surface || !damage || !isAlive(unit)) return;

  events.push({ type: "surfaceTriggered", unit: unit.id, surfaceId: surface.id, name: SURFACES[surface.id].name });
  dealDamage(unit, rollDice(encounter, damage), events);
}

// --- Movimento --------------------------------------------------------------

/**
 * Anda até `to` pelo caminho mais barato. A cada passo, todo inimigo com
 * reação sobrando de quem `unit` esteja SAINDO do alcance ganha um ataque
 * de oportunidade — antes do passo, com `unit` ainda no lugar — e a
 * superfície do quadrado em que ele pisa age. Morrer no meio do caminho
 * interrompe o movimento ali.
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

    unit.turn.movement -= enterCost(encounter, step);
    unit.pos = { ...step };
    walked.push({ ...step });

    if (surfaceAt(encounter, step)?.damage) {
      flush();
      touchSurface(encounter, unit, events);
      if (!isAlive(unit)) return undefined;
    }
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

  for (const prop of affectedProps(encounter, ability, targetPos)) {
    for (const effect of ability.effects) {
      if (effect.kind !== "damage" || prop.hp <= 0) continue;
      damageProp(encounter, prop, rollDamage(encounter, actor, effect), events);
    }
  }

  if (ability.surface) {
    laySurface(encounter, ability.surface.id, surfaceTiles(encounter, ability, targetPos), ability.surface.rounds, events);
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

function attributeOf(actor: Unit, ref: AttributeRef | undefined): number {
  return ref === undefined ? 0 : effectiveAttribute(actor, ref === "primary" ? primaryAttribute(actor) : ref);
}

/** O dano de um efeito ANTES de quem o recebe: (atributo + dados) x multiplicador + bônus. */
function rollDamage(encounter: Encounter, actor: Unit, effect: Extract<Effect, { kind: "damage" }>): number {
  const amount = Math.round(
    (attributeOf(actor, effect.attribute) + rollDice(encounter, effect.dice)) * (effect.multiplier ?? 1),
  );
  return effect.bonus ? amount + Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor) : amount;
}

function applyEffect(
  encounter: Encounter,
  actor: Unit,
  target: Unit,
  effect: Effect,
  critical: boolean,
  events: TacticalEvent[],
): void {
  switch (effect.kind) {
    case "damage": {
      let amount = rollDamage(encounter, actor, effect);
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
        attributeOf(actor, effect.attribute) + rollDice(encounter, effect.dice),
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
 * oportunidade, mas a superfície de onde o alvo vai parar age sobre ele.
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
  if (samePos(from, target.pos)) return;
  events.push({ type: "pushed", unit: target.id, from, to: { ...target.pos } });
  touchSurface(encounter, target, events);
}

// --- Destrutíveis -----------------------------------------------------------

/**
 * Fere um destrutível. Zerando, ele sai da grade (o quadrado volta a ser o
 * chão que era) e derrama o que tiver pra derramar.
 */
function damageProp(encounter: Encounter, prop: Prop, amount: number, events: TacticalEvent[]): void {
  const template: PropTemplate = PROPS[prop.kind];
  prop.hp = Math.max(0, prop.hp - amount);
  events.push({
    type: "propDamaged",
    prop: prop.id,
    name: template.name,
    pos: { ...prop.pos },
    amount,
    remainingHp: prop.hp,
  });
  if (prop.hp > 0) return;

  fellProp(encounter.grid, prop);
  events.push({ type: "propDestroyed", prop: prop.id, name: template.name, pos: { ...prop.pos } });

  const { spill } = template;
  if (spill) {
    laySurface(encounter, spill.surface, spreadTiles(encounter.grid, prop.pos, spill.radius), spill.rounds, events);
  }
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
