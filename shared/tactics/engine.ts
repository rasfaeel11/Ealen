import { foresee } from "./ai";
import { attackEdge, attackTotals } from "./attack";
import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { HUNGER, healCap, healToll } from "../breath";
import { CONCEPTS } from "../mana";
import { distance, samePos, tileAt, type Grid, type Pos } from "./grid";
import { findPath } from "./movement";
import { PROPS, fellProp, type Prop, type PropTemplate } from "./props";
import { rollDice, rollDie } from "./rng";
import { STATUSES, isHarmful, type ActiveStatus, type StatusId, type StatusTemplate } from "./statuses";
import { STYLES, counters, isSworn, punishFactor, styleReduction, waveBonus } from "./styles";
import {
  SURFACES,
  enterCost,
  spreadTiles,
  surfaceAt,
  surfaceTiles,
  type SurfaceId,
  type SurfaceTemplate,
} from "./surfaces";
import { SUPPORTS, type SupportId, type SupportTemplate } from "./supports";
import {
  abilityTargets,
  affectedProps,
  affectedUnits,
  interactTargets,
  isBlow,
  supportTargets,
  vowForbids,
} from "./targeting";
import type {
  Ability,
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
import {
  activeUnit,
  damageTakenOf,
  effectiveAttribute,
  findUnit,
  isAlive,
  isOver,
  isRecited,
  movementOf,
  primaryAttribute,
  readiness,
  unitAt,
} from "./units";

/**
 * O motor de combate tático.
 *
 * Uma luta anda de comando em comando: `applyCommand` recebe UMA coisa que
 * o combatente da vez quer fazer (andar, usar uma habilidade, usar um item,
 * mexer num objeto, passar a vez), valida, muta a luta e devolve a lista ORDENADA do que
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
  /** Quem acompanha o grupo do jogador sem lutar, e o apoio que cada um oferece (ver ./supports.ts). */
  supporters?: { id: string; name: string; support: SupportId }[];
  /**
   * Condições com que alguém JÁ CHEGA na luta e que não passam com os turnos
   * (um braço ferido que a história deixou), pelo id da unidade. Duram a luta
   * inteira; quem as tira é quem as pôs.
   */
  lasting?: Record<string, readonly StatusId[]>;
  /** O golpe que ABRE a luta, dado de fora dela por quem a começou (ver Opening). */
  opening?: Opening;
  /** A cheia da luta: de quantas em quantas rodadas a água sobe, e quantas vezes no máximo (ver Flood em ./types.ts). */
  flood?: { every: number; rises: number };
  seed: number;
}

/**
 * O golpe que abre a luta: alguém usou uma habilidade ANTES de a luta
 * existir, e é ela que a começa. Acontece na abertura, antes da primeira
 * rodada e fora da ordem dos turnos — não gasta a ação nem o movimento do
 * primeiro turno de quem o deu. Com `from`, ele antes corre até esse quadrado
 * (a investida de quem luta de perto), com o movimento de um turno.
 *
 * Um golpe de abertura que não vale (habilidade que ele não tem ou não pode
 * pagar, alvo fora de alcance, quadrado aonde não chega) simplesmente não acontece: a luta começa
 * sem ele. Quem é da Ipojy nunca dá um: é o voto (ver ./styles.ts). Magia
 * recitada também não: leva tempo. A gravada, sim — é a emboscada do mago, o
 * círculo preparado antes no chão.
 */
export interface Opening {
  unitId: string;
  abilityId: string;
  target: Pos;
  from?: Pos;
}

/**
 * Começa uma luta: rola a iniciativa (d20 + Olho) uma vez e abre o primeiro
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
    supporters: (setup.supporters ?? []).map((supporter) => ({ ...supporter, ready: true })),
    rngState: setup.seed >>> 0,
    ...(setup.flood ? { flood: { ...setup.flood, risen: 0 } } : {}),
  };

  const rolls = encounter.units.map((unit, index) => ({
    unit,
    index,
    initiative: rollDie(encounter, 20) + effectiveAttribute(unit, "olho"),
  }));
  // Empate: quem tem mais Olho; persistindo, quem foi declarado primeiro.
  rolls.sort((a, b) => b.initiative - a.initiative || b.unit.attributes.olho - a.unit.attributes.olho || a.index - b.index);
  encounter.order = rolls.map((roll) => roll.unit.id);

  const events: TacticalEvent[] = [
    {
      type: "battleStarted",
      order: rolls.map((roll) => ({ unit: roll.unit.id, initiative: roll.initiative })),
      ...(setup.surprised ? { surprised: setup.surprised } : {}),
    },
  ];
  for (const unit of encounter.units) {
    if (!isAlive(unit)) continue;
    for (const statusId of setup.lasting?.[unit.id] ?? []) addStatus(unit, STATUSES[statusId], Infinity, events);
  }
  for (const unit of encounter.units) soak(encounter, unit, events);
  for (const unit of encounter.units) {
    if (unit.team !== setup.surprised || !isAlive(unit)) continue;
    unit.turn.reaction = false;
    addStatus(unit, STATUSES.surprised, 1, events);
  }
  if (setup.opening) strikeFirst(encounter, setup.opening, events);
  if (!concludeIfDecided(encounter, events)) {
    events.push({ type: "roundStarted", round: 1 });
    advanceTurn(encounter, events);
  }
  return { encounter, events };
}

/** Resolve o golpe de abertura (ver Opening). Inválido, não faz nada. */
function strikeFirst(encounter: Encounter, opening: Opening, events: TacticalEvent[]): void {
  const unit = findUnit(encounter, opening.unitId);
  const ability = unit?.abilities.find((candidate) => candidate.id === opening.abilityId);
  if (!unit || !ability || !isAlive(unit) || readiness(unit, ability, true) !== "ready") return;
  if (isSworn(unit.style) || isRecited(ability)) return;

  if (opening.from && !samePos(opening.from, unit.pos)) {
    // A investida anda com o movimento de um turno, e não o tira do primeiro turno de verdade.
    unit.turn.movement = movementOf(unit);
    const stuck = move(encounter, unit, opening.from, events);
    unit.turn.movement = 0;
    if (stuck || !isAlive(unit)) return;
  }
  if (!abilityTargets(encounter, unit, ability).some((pos) => samePos(pos, opening.target))) return;

  charge(encounter, unit, ability, false, events);
  resolveAbility(encounter, unit, ability, opening.target, affectedUnits(encounter, ability, opening.target), false, events);
  if (ability.backlash && isAlive(unit)) addStatus(unit, STATUSES[ability.backlash.statusId], ability.backlash.turns, events);
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
    case "interact":
      return interact(encounter, unit, command.target, events);
    case "support":
      return support(encounter, unit, command.supporterId, command.target, events);
    case "endTurn":
      closeTurn(unit);
      events.push({ type: "turnEnded", unit: unit.id });
      return undefined;
  }
}

// --- Turnos -----------------------------------------------------------------

/**
 * Passa a vez pro próximo que ainda está de pé, abrindo uma rodada nova
 * quando a ordem dá a volta. Se há turno a mais na fila (`bonusTurns`), ele
 * vem antes, fora da ordem (`interlude`), e depois a ordem segue de onde
 * estava. Quem começa o turno em cima de uma superfície
 * que fere leva o dano dela — e, se cair ali, a vez passa adiante (ou a luta
 * acaba, se era o último do lado dele). Quem vinha recitando solta a magia
 * agora (ver `release`), antes de fazer qualquer outra coisa. Quem começa o
 * turno com uma condição que o faz perder a vez (`skipsTurn`) recebe o turno
 * e o perde na hora — e a recitação dele se perde junto.
 */
function advanceTurn(encounter: Encounter, events: TacticalEvent[]): void {
  for (;;) {
    // O turno a mais que acabou (ou se perdeu) não é da ordem: ela segue de onde estava.
    delete encounter.interlude;
    let next: Unit | undefined = takeBonusTurn(encounter);
    if (next) encounter.interlude = next.id;
    else do {
      encounter.turnIndex += 1;
      if (encounter.turnIndex >= encounter.order.length) {
        encounter.turnIndex = 0;
        encounter.round += 1;
        events.push({ type: "roundStarted", round: encounter.round });
        // Rodada nova: quem apoia pode ser chamado de novo.
        for (const supporter of encounter.supporters) supporter.ready = true;
        tickSurfaces(encounter, events);
        const { flood } = encounter;
        if (flood && flood.risen < flood.rises && (encounter.round - 1) % flood.every === 0) riseWater(encounter, events);
        // Uma deixa de rodada pode parar a luta aqui, antes de a vez de alguém começar.
        if (fireCues(encounter, events)) return;
      }
      next = activeUnit(encounter);
    } while (!next || !isAlive(next));

    // Lidas antes de contar: a condição que dura "até o próximo turno" cai neste, e é nele que ela ainda vale —
    // o turno que se perde, o passo que fica preso, o que ela fere.
    const skip = next.statuses.find((status) => status.skipsTurn);
    const movement = movementOf(next);
    const harms = next.statuses.filter((status) => status.harm);
    const regens = next.statuses.filter((status) => status.regen);
    tickStatuses(next, events);
    next.turn = { movement, action: true, bonus: true, reaction: true };
    // O limite de mana é por turno: a conta do corpo recomeça quando a vez dele começa.
    if (next.manaSpent !== undefined) delete next.manaSpent;
    events.push({ type: "turnStarted", unit: next.id });
    dry(next, events);

    for (const status of harms) {
      if (!isAlive(next) || next.invulnerable) break;
      events.push({ type: "statusTriggered", unit: next.id, statusId: status.id, name: status.name });
      dealDamage(encounter, next, rollDice(encounter, status.harm!), events);
    }
    for (const status of regens) {
      if (!isAlive(next) || next.currentHp >= next.maxHp) break;
      events.push({ type: "statusTriggered", unit: next.id, statusId: status.id, name: status.name });
      restore(next, status.regen!, events);
    }
    touchSurface(encounter, next, events);
    if (!isAlive(next)) {
      if (concludeIfDecided(encounter, events)) return;
      continue;
    }
    if (next.reciting) {
      if (skip) breakRecitation(next, "skipped", events);
      else {
        release(encounter, next, events);
        if (concludeIfDecided(encounter, events)) return;
        if (!isAlive(next)) continue;
      }
    }
    if (!skip) return;

    next.turn = { movement: 0, action: false, bonus: false, reaction: true };
    closeTurn(next);
    events.push({ type: "turnSkipped", unit: next.id, name: skip.name }, { type: "turnEnded", unit: next.id });
  }
}

/** O próximo turno a mais da fila de quem ainda está de pé, tirando-o da fila. Undefined se não há. */
function takeBonusTurn(encounter: Encounter): Unit | undefined {
  while (encounter.bonusTurns?.length) {
    const unit = findUnit(encounter, encounter.bonusTurns.shift()!);
    if (encounter.bonusTurns.length === 0) delete encounter.bonusTurns;
    if (unit && isAlive(unit)) return unit;
  }
  return undefined;
}

/**
 * O turno de `unit` acabou (ou foi perdido): fecha o que ele vem fazendo e
 * conta um turno nas recargas. Quem ia atrás de uma presa (`prey`) já foi.
 */
function closeTurn(unit: Unit): void {
  closeHabit(unit);
  delete unit.prey;
  if (!unit.cooldowns) return;
  const left = Object.entries(unit.cooldowns).filter(([, turns]) => turns > 1);
  if (left.length > 0) unit.cooldowns = Object.fromEntries(left.map(([id, turns]) => [id, turns - 1]));
  else delete unit.cooldowns;
}

/**
 * Fecha o turno de `unit` no que ele vem fazendo (ver `habit` em Unit): se a
 * ação deste turno repetiu a do anterior, e há quantos turnos seguidos ela é
 * um golpe. Turno sem ação (só andou, perdeu a vez) não repete nada.
 */
function closeHabit(unit: Unit): void {
  const { now, last, attackTurns = 0 } = unit.habit ?? {};
  const struck = now !== undefined && unit.abilities.some((ability) => ability.id === now && dealsDamage(ability));
  unit.habit = { last: now, repeated: now !== undefined && now === last, attackTurns: struck ? attackTurns + 1 : 0 };
}

function dealsDamage(ability: Ability): boolean {
  return ability.effects.some((effect) => effect.kind === "damage");
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
    case "used":
      return when.props.every((id) => encounter.props.some((prop) => prop.id === id && prop.used));
    case "defeat":
      return !encounter.units.some((unit) => unit.team === "party" && isAlive(unit));
    case "burst":
      return (encounter.bursts ?? 0) > 0;
  }
}

/**
 * Dispara as deixas cuja hora chegou, na ordem em que foram declaradas, cada
 * uma uma vez só. A que traz uma condição a aplica ali. A primeira que encerra a luta encerra — as que vinham
 * depois dela não disparam. Devolve se a luta acabou.
 */
function fireCues(encounter: Encounter, events: TacticalEvent[]): boolean {
  for (const cue of [...encounter.cues]) {
    if (!isDue(encounter, cue.when)) continue;
    encounter.cues = encounter.cues.filter((other) => other !== cue);
    events.push({ type: "cue", id: cue.id });
    if (cue.apply) {
      for (const id of cue.apply.units) {
        const unit = findUnit(encounter, id);
        if (unit && isAlive(unit)) addStatus(unit, STATUSES[cue.apply.statusId], cue.apply.turns, events);
      }
    }
    if (cue.burst) {
      // A pressa do roteiro: tudo de uma vez. Gasto fora do limite que ele tinha, e o corpo e o bicho respondem igual.
      const unit = findUnit(encounter, cue.burst);
      if (unit && isAlive(unit) && (unit.mana ?? 0) > 0) spendMana(encounter, unit, unit.mana!, events, true);
    }
    if (cue.rise) riseWater(encounter, events);
    if (cue.dismiss && encounter.supporters.some((supporter) => supporter.id === cue.dismiss)) {
      encounter.supporters = encounter.supporters.filter((supporter) => supporter.id !== cue.dismiss);
      events.push({ type: "supporterLost", id: cue.dismiss });
    }

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
  if (status.breaksGuard) removeStatuses(unit, (active) => active.guard === true, events);
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
  if (!surface || !damage || !isAlive(unit) || unit.invulnerable) return;

  events.push({ type: "surfaceTriggered", unit: unit.id, surfaceId: surface.id, name: SURFACES[surface.id].name });
  dealDamage(encounter, unit, rollDice(encounter, damage), events);
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
      charge(encounter, threat.attacker, threat.ability, false, events);
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
  soak(encounter, unit, events);
  return undefined;
}

function opportunityThreats(encounter: Encounter, mover: Unit, next: Pos): { attacker: Unit; ability: Ability }[] {
  const threats: { attacker: Unit; ability: Ability }[] = [];
  for (const attacker of encounter.units) {
    if (attacker.team === mover.team || !isAlive(attacker) || !attacker.turn.reaction) continue;
    // Quem é da Ipojy não pune ninguém antes de a luta abrir: seria dar o primeiro golpe.
    if (vowForbids(encounter, attacker)) continue;

    // A reação paga como qualquer uso: sem Fôlego, ou em recarga, o golpe não sai.
    const ability = attacker.abilities.find(
      (candidate) => candidate.opportunity && readiness(attacker, candidate, true) === "ready",
    );
    if (!ability) continue;
    if (distance(attacker.pos, mover.pos) <= ability.range && distance(attacker.pos, next) > ability.range) {
      threats.push({ attacker, ability });
    }
  }
  return threats;
}

// --- Habilidades ------------------------------------------------------------

/**
 * Cobra de `unit` o que `ability` custa além da ação do turno: um uso do
 * `limit`, o Fôlego (evento `breathSpent`), a mana (ver `spendMana`) e a
 * recarga. `inTurn` diz se ela saiu no turno dele: aí o fim deste turno não
 * conta na recarga.
 */
function charge(encounter: Encounter, unit: Unit, ability: Ability, inTurn: boolean, events: TacticalEvent[]): void {
  if (ability.limit !== undefined) unit.used = { ...unit.used, [ability.id]: (unit.used?.[ability.id] ?? 0) + 1 };
  if (ability.breath) {
    unit.breath -= ability.breath;
    events.push({ type: "breathSpent", unit: unit.id, amount: ability.breath, remaining: unit.breath });
  }
  if (ability.mana) spendMana(encounter, unit, ability.mana, events);
  if (ability.cooldown) unit.cooldowns = { ...unit.cooldowns, [ability.id]: ability.cooldown + (inTurn ? 1 : 0) };
}

/**
 * `unit` paga `amount` de mana (evento `manaSpent`) e soma no que já gastou
 * desde que a vez dele começou. Se essa soma acaba de passar do limite dele,
 * o corpo cobra: evento `manaBurst` e a marca do conceito, pra durar a luta
 * (e, anotada em `marks`, pra sair dela com ele). E quem sente mana gasta de
 * uma vez (`drawnToMana`, do outro lado) vem atrás dele: ganha um turno a mais,
 * na fila (`bonusTurns`), com ele de presa (`prey`). Fora do turno dele (o
 * golpe de abertura, uma reação), conta pro turno que vem. `forced` é o gasto
 * que uma deixa impõe (`burst` em Cue): cobra do corpo mesmo dentro do limite.
 */
function spendMana(encounter: Encounter, unit: Unit, amount: number, events: TacticalEvent[], forced = false): void {
  unit.mana = (unit.mana ?? 0) - amount;
  events.push({ type: "manaSpent", unit: unit.id, amount, remaining: unit.mana });

  const before = unit.manaSpent ?? 0;
  unit.manaSpent = before + amount;
  const limit = unit.manaLimit ?? 0;
  // O gasto que o roteiro força (`burst` numa deixa) cobra sempre, mesmo que caiba no limite: é o encantamento grande.
  if (!forced && (before > limit || unit.manaSpent <= limit)) return;
  events.push({ type: "manaBurst", unit: unit.id, spent: unit.manaSpent, limit });
  encounter.bursts = (encounter.bursts ?? 0) + 1;
  for (const hunter of encounter.units) {
    if (!hunter.drawnToMana || hunter.team === unit.team || !isAlive(hunter)) continue;
    hunter.prey = unit.id;
    events.push({ type: "manaDrawn", unit: hunter.id, caster: unit.id });
    if (!encounter.bonusTurns?.includes(hunter.id)) encounter.bonusTurns = [...(encounter.bonusTurns ?? []), hunter.id];
  }
  if (unit.concept) leaveMark(unit, STATUSES[CONCEPTS[unit.concept].mark], events);
}

/**
 * Põe em `unit` uma marca que sai da luta com ele (`untilRest`: a da mana, a
 * fome da cura), pra durar a luta toda, e a anota em `marks` — cair apaga as
 * condições, não o que ele leva pra fora. A que ele já tem não se renova.
 */
function leaveMark(unit: Unit, mark: StatusTemplate, events: TacticalEvent[]): void {
  if (unit.statuses.some((status) => status.id === mark.id)) return;
  addStatus(unit, mark, Infinity, events);
  const id = mark.id as StatusId;
  if (!unit.marks?.includes(id)) unit.marks = [...(unit.marks ?? []), id];
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
  const state = readiness(unit, ability);
  if (state === "breath") return "no_breath";
  if (state === "mana") return "no_mana";
  if (state === "reciting") return "reciting";
  if (state === "recharging") return "recharging";
  if (state !== "ready") return "resource_spent";
  if (!abilityTargets(encounter, unit, ability).some((pos) => samePos(pos, target))) return "invalid_target";

  if (ability.cost === "action") unit.turn.action = false;
  else unit.turn.bonus = false;
  // O que ele fez com a ação deste turno: é o que a Rachadura e as manias da IA leem depois.
  if (ability.cost === "action") unit.habit = { repeated: false, attackTurns: 0, ...unit.habit, now: ability.id };
  if (isRecited(ability)) {
    // Recitar é só começar a ler: o preço e o efeito ficam pra quando a magia sair (ver `release`).
    const aimed = ability.targets === "enemy" || ability.targets === "ally" ? unitAt(encounter, target) : undefined;
    unit.reciting = { abilityId: ability.id, target: { ...target }, ...(aimed ? { unit: aimed.id } : {}) };
    events.push({ type: "recitationStarted", unit: unit.id, abilityId: ability.id, name: ability.name, target: { ...target } });
    return undefined;
  }
  charge(encounter, unit, ability, true, events);
  resolveAbility(encounter, unit, ability, target, affectedUnits(encounter, ability, target), false, events);
  // A magia cobra de quem a fez, se ele ainda está de pé pra pagar.
  if (ability.backlash && isAlive(unit)) addStatus(unit, STATUSES[ability.backlash.statusId], ability.backlash.turns, events);
  return undefined;
}

// --- Recitação --------------------------------------------------------------

/** O teste de quem apanha recitando: d20 + Saber contra isto mais metade do golpe. Provisório, como os kits. */
const RECITE_FOCUS = 10;

/**
 * Solta a magia que `unit` vinha recitando, no começo do turno dele: pagando
 * agora o que ela custa (é aqui que a mana pesa no limite do turno) e saindo
 * de onde ele está, no alvo que ele mirou — se mirou alguém, onde esse alguém
 * estiver. Alvo que caiu, saiu do alcance ou da vista: a recitação se perde.
 */
function release(encounter: Encounter, unit: Unit, events: TacticalEvent[]): void {
  const { abilityId, target, unit: aimedId } = unit.reciting!;
  delete unit.reciting;
  const ability = unit.abilities.find((candidate) => candidate.id === abilityId);
  if (!ability) return;
  const aimed = aimedId === undefined ? undefined : findUnit(encounter, aimedId);
  const pos = ability.targets === "self" || ability.targets === "foes" ? unit.pos : (aimed?.pos ?? target);
  const reaches = (aimed === undefined || isAlive(aimed)) && abilityTargets(encounter, unit, ability).some((spot) => samePos(spot, pos));
  if (!reaches) {
    events.push({ type: "recitationBroken", unit: unit.id, abilityId, name: ability.name, reason: "lost" });
    return;
  }
  if (readiness(unit, ability, true) !== "ready") {
    events.push({ type: "recitationBroken", unit: unit.id, abilityId, name: ability.name, reason: "spent" });
    return;
  }

  charge(encounter, unit, ability, true, events);
  resolveAbility(encounter, unit, ability, pos, affectedUnits(encounter, ability, pos), false, events);
  if (ability.backlash && isAlive(unit)) addStatus(unit, STATUSES[ability.backlash.statusId], ability.backlash.turns, events);
}

/** A recitação de `unit` acabou sem sair. */
function breakRecitation(unit: Unit, reason: "hit" | "lost" | "skipped" | "spent", events: TacticalEvent[]): void {
  const { abilityId } = unit.reciting!;
  delete unit.reciting;
  const name = unit.abilities.find((candidate) => candidate.id === abilityId)?.name ?? abilityId;
  events.push({ type: "recitationBroken", unit: unit.id, abilityId, name, reason });
}

/**
 * Executa `ability` de `actor` sobre `targets`, já validada e paga. Cada
 * alvo tem a própria rolagem de ataque; quem é errado não sofre efeito
 * nenhum, e quem morre não sofre os efeitos seguintes. Um golpe de um alvo
 * só num inimigo conta pra Onda (`streak`): pegando, soma; errando, zera.
 * Um golpe (`isBlow`), acerte ou erre, abre a luta (`Encounter.opened`).
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
  if (isBlow(ability)) encounter.opened = true;

  // Quem é da Ipojy e foi atacado em vão devolve o golpe — depois que este acabar de acontecer.
  const countering: Unit[] = [];
  for (const target of targets) {
    const strike = ability.radius === undefined && dealsDamage(ability) && target.team !== actor.team;
    let critical = false;
    if (ability.attack) {
      const outcome = rollAttack(encounter, actor, target, ability, targetPos, events);
      if (outcome === "miss" || outcome === "fumble") {
        if (strike) delete actor.streak;
        if (target.team !== actor.team && counters(target)) countering.push(target);
        continue;
      }
      critical = outcome === "crit";
    }

    for (const effect of ability.effects) {
      if (!isAlive(target)) break;
      applyEffect(encounter, actor, target, ability, effect, critical, events);
    }
    if (strike) {
      actor.streak = { target: target.id, hits: actor.streak?.target === target.id ? actor.streak.hits + 1 : 1 };
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

  for (const defender of countering) counterStrike(encounter, defender, actor, events);
}

/**
 * O CONTRAGOLPE da Ipojy (ver ./styles.ts): `defender` acabou de ser atacado
 * por `attacker` e o golpe errou. Se ele ainda tem a reação do turno e um
 * golpe que pune (`opportunity`) que alcance quem errou, devolve com ele,
 * pago como um ataque de oportunidade. Sem reação, sem golpe pronto ou longe
 * demais, nada acontece.
 */
function counterStrike(encounter: Encounter, defender: Unit, attacker: Unit, events: TacticalEvent[]): void {
  if (!isAlive(defender) || !isAlive(attacker) || !defender.turn.reaction) return;
  const ability = defender.abilities.find(
    (candidate) =>
      candidate.opportunity &&
      readiness(defender, candidate, true) === "ready" &&
      abilityTargets(encounter, defender, candidate).some((pos) => samePos(pos, attacker.pos)),
  );
  if (!ability) return;

  defender.turn.reaction = false;
  const style = STYLES[defender.style!];
  events.push({ type: "styleTrait", unit: defender.id, target: attacker.id, trait: "counter", name: style.trait });
  charge(encounter, defender, ability, false, events);
  resolveAbility(encounter, defender, ability, attacker.pos, [attacker], true, events);
}

/**
 * d20 + atributo primário + modificador contra 10 + Couro do alvo, com o que a
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
    style: edge.style,
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
  ability: Ability,
  effect: Effect,
  critical: boolean,
  events: TacticalEvent[],
): void {
  switch (effect.kind) {
    case "damage": {
      if (target.invulnerable) {
        events.push({ type: "immune", target: target.id });
        return;
      }
      // O traço do estilo de quem bate (ver ./styles.ts): a Onda soma antes do crítico, a Rachadura multiplica depois.
      const wave = waveBonus(actor, ability, target);
      const crack = punishFactor(actor, target);
      const trait = actor.style ? STYLES[actor.style].trait : "";
      if (wave > 0) events.push({ type: "styleTrait", unit: actor.id, target: target.id, trait: "wave", name: trait, hits: actor.streak!.hits });
      if (crack !== 1) events.push({ type: "styleTrait", unit: actor.id, target: target.id, trait: "crack", name: trait });

      let amount = rollDamage(encounter, actor, effect) + wave;
      if (critical) amount *= 2;
      amount = Math.round(amount * crack);

      // O que as condições de quem apanha somam ou tiram do golpe (Trincado, Ancorado), e depois a armadura —
      // que um golpe `piercing` não encontra.
      const targetOr = effectiveAttribute(target, "couro");
      amount = Math.max(1, amount + damageTakenOf(target) - (effect.piercing ? 0 : Math.floor(targetOr / 2)));
      // A Muralha de quem apanha: um tanto fixo a menos, depois da armadura.
      amount = Math.max(1, amount - styleReduction(target));

      if (target.statuses.some((status) => status.guard)) {
        const blocked = Math.min(amount, targetOr + rollDie(encounter, 6));
        amount -= blocked;
        events.push({ type: "blocked", unit: target.id, amount: blocked });
      }
      if (amount <= 0) return;
      const taken = Math.min(amount, target.currentHp);
      dealDamage(encounter, target, amount, events);
      // O golpe que devolve: parte do que entrou volta como vida pra quem bateu.
      if (effect.leech && isAlive(actor)) restore(actor, Math.floor(taken * effect.leech), events);
      return;
    }
    case "heal": {
      const denied = target.statuses.find((status) => status.noHeal);
      if (denied) {
        events.push({ type: "healDenied", target: target.id, name: denied.name });
        return;
      }
      // A cura acelera o que o corpo faria sozinho, e quem paga é o corpo de quem a recebe (ver HEAL_PER_BREATH em
      // ../breath.ts): Fôlego (o dobro, com fome), e a fome que fica até o descanso. Sem Fôlego, nada se acelera.
      const rolled = attributeOf(actor, effect.attribute) + rollDice(encounter, effect.dice);
      const missing = target.maxHp - target.currentHp;
      const hungry = target.statuses.some((status) => status.hunger);
      if (missing > 0 && healCap(target.breath, hungry) <= 0) {
        events.push({ type: "healDenied", target: target.id, name: "Sem fôlego" });
        return;
      }
      const amount = Math.min(missing, rolled, healCap(target.breath, hungry));
      const toll = healToll(amount, hungry);
      if (toll > 0) {
        target.breath -= toll;
        events.push({ type: "breathDrained", unit: target.id, amount: toll, remaining: target.breath });
      }
      target.currentHp += amount;
      events.push({ type: "heal", target: target.id, amount, remainingHp: target.currentHp });
      if (amount > 0) leaveMark(target, STATUSES[HUNGER], events);
      return;
    }
    case "status":
      addStatus(target, STATUSES[effect.statusId], effect.turns, events);
      return;
    case "breath": {
      if (effect.amount < 0) {
        const drained = Math.min(target.breath, -effect.amount);
        if (drained <= 0) return;
        target.breath -= drained;
        events.push({ type: "breathDrained", unit: target.id, amount: drained, remaining: target.breath });
        return;
      }
      const amount = Math.min(target.maxBreath - target.breath, effect.amount);
      if (amount <= 0) return;
      target.breath += amount;
      events.push({ type: "breathRecovered", unit: target.id, amount, remaining: target.breath });
      return;
    }
    case "push":
      push(encounter, actor, target, effect.distance, events);
      return;
  }
}

/** Devolve até `amount` de vida a `unit`, se alguma cura pega nele (ver `noHeal`) e se falta alguma. */
function restore(unit: Unit, amount: number, events: TacticalEvent[]): void {
  if (unit.statuses.some((status) => status.noHeal)) return;
  const healed = Math.min(unit.maxHp - unit.currentHp, amount);
  if (healed <= 0) return;
  unit.currentHp += healed;
  events.push({ type: "heal", target: unit.id, amount: healed, remainingHp: unit.currentHp });
}

/**
 * Tira `amount` de vida de `target`. Quem cai perde as condições (e o que
 * recitava). Quem apanha recitando e fica de pé testa se o texto aguenta: d20
 * + Saber contra RECITE_FOCUS mais metade do golpe; falhando, ele se perde.
 */
function dealDamage(encounter: Encounter, target: Unit, amount: number, events: TacticalEvent[]): void {
  target.currentHp = Math.max(0, target.currentHp - amount);
  events.push({ type: "damage", target: target.id, amount, remainingHp: target.currentHp });
  if (target.currentHp > 0) {
    if (target.reciting && rollDie(encounter, 20) + effectiveAttribute(target, "saber") < RECITE_FOCUS + Math.floor(amount / 2)) {
      breakRecitation(target, "hit", events);
    }
    return;
  }

  target.statuses = [];
  delete target.reciting;
  events.push({ type: "death", unit: target.id });
}

/**
 * Desloca `target` em linha reta pra longe de `actor` (ou pra perto, com
 * distância negativa), um quadrado por vez, até acabar a distância ou
 * bater em parede, borda ou corpo. Movimento forçado não provoca ataque de
 * oportunidade, mas a superfície de onde o alvo vai parar age sobre ele, e
 * a água também (`soak`). Quem carrega uma condição `immovable` não sai do
 * lugar; quem é pesado (`heft`) sai esse tanto a menos.
 */
function push(encounter: Encounter, actor: Unit, target: Unit, pushDistance: number, events: TacticalEvent[]): void {
  if (target.statuses.some((status) => status.immovable)) return;
  const direction = Math.sign(pushDistance);
  const dx = Math.sign(target.pos.x - actor.pos.x) * direction;
  const dy = Math.sign(target.pos.y - actor.pos.y) * direction;
  if (dx === 0 && dy === 0) return;

  const from = { ...target.pos };
  const steps = Math.abs(pushDistance) - (target.heft ?? 0);
  for (let step = 0; step < steps; step++) {
    const next = { x: target.pos.x + dx, y: target.pos.y + dy };
    if (tileAt(encounter.grid, next)?.blocksMove ?? true) break;
    if (unitAt(encounter, next)) break;
    target.pos = next;
  }
  if (samePos(from, target.pos)) return;
  events.push({ type: "pushed", unit: target.id, from, to: { ...target.pos } });
  touchSurface(encounter, target, events);
  soak(encounter, target, events);
}

/**
 * O bicho de rio (`river`) e o chão em que ele está: na água fica Submerso
 * (rápido, a Muralha alta, e se refaz a cada turno); fora dela, Em seco (lento,
 * sem a Muralha da água). As duas duram enquanto ele não mudar de chão: quem as
 * põe e tira é isto, chamado na abertura e sempre que ele muda de quadrado
 * (andando, empurrado, ou com a água subindo embaixo dele). Voltar pra água
 * desfaz o couro rachado (ver `dry`). Tirá-lo da água é o jeito de vencê-lo.
 */
function soak(encounter: Encounter, unit: Unit, events: TacticalEvent[]): void {
  if (!unit.river || !isAlive(unit)) return;
  const wet = tileAt(encounter.grid, unit.pos)?.water === true;
  const [now, gone] = wet ? [STATUSES.submerged, STATUSES.beached] : [STATUSES.beached, STATUSES.submerged];
  removeStatuses(unit, (status) => status.id === gone.id || (wet && status.id === STATUSES.cracked_hide.id), events);
  if (wet) delete unit.dryTurns;
  if (!unit.statuses.some((status) => status.id === now.id)) addStatus(unit, now, Infinity, events);
}

/** Quantos turnos do bicho de rio em seco até o couro rachar: o tempo de o vento secar o lodo. */
export const CRACK_TURNS = 2;

/**
 * Começo do turno do bicho de rio: em seco, o couro seca mais um pouco, e no
 * CRACK_TURNS-ésimo turno fora d'água ele racha (Couro rachado) e fica rachado
 * até voltar pra água. Esperar é o que abre o couro pras espadas.
 */
function dry(unit: Unit, events: TacticalEvent[]): void {
  if (!unit.river || !unit.statuses.some((status) => status.id === STATUSES.beached.id)) return;
  unit.dryTurns = (unit.dryTurns ?? 0) + 1;
  if (unit.dryTurns >= CRACK_TURNS && !unit.statuses.some((status) => status.id === STATUSES.cracked_hide.id)) {
    addStatus(unit, STATUSES.cracked_hide, Infinity, events);
  }
}

/**
 * A água sobe um anel: todo quadrado seco que não barra o passo e encosta
 * (de lado, não na diagonal) em água vira água, e custa o passo de água (2).
 * Destrutível de pé barra o passo: o chão dele fica seco. Na primeira vez, a
 * luta passa a ter a própria grade (`ownGrid`), pra cheia não alagar o mapa
 * da área. O bicho de rio que estava ali volta a ficar Submerso.
 */
function riseWater(encounter: Encounter, events: TacticalEvent[]): void {
  if (encounter.flood) encounter.flood.risen += 1;
  const { grid } = encounter;
  const wet = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.width && y < grid.height && grid.tiles[y * grid.width + x].water === true;
  const tiles: Pos[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y * grid.width + x];
      if (tile.water || tile.blocksMove) continue;
      if (wet(x - 1, y) || wet(x + 1, y) || wet(x, y - 1) || wet(x, y + 1)) tiles.push({ x, y });
    }
  }
  if (tiles.length === 0) return;
  if (!encounter.ownGrid) {
    encounter.grid = { ...grid, tiles: [...grid.tiles] };
    encounter.ownGrid = true;
  }
  for (const pos of tiles) {
    const index = pos.y * grid.width + pos.x;
    const tile = encounter.grid.tiles[index];
    encounter.grid.tiles[index] = { ...tile, water: true, moveCost: Math.max(tile.moveCost, 2) };
  }
  events.push({ type: "waterRose", tiles });
  for (const unit of encounter.units) {
    if (tiles.some((pos) => samePos(pos, unit.pos))) soak(encounter, unit, events);
  }
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

/**
 * Mexe no objeto em `target`: quem está colado nele gasta a ação e o objeto
 * fica usado. Só isso — o que mexer nele SIGNIFICA é de uma deixa `used`.
 */
function interact(encounter: Encounter, unit: Unit, target: Pos, events: TacticalEvent[]): CommandError | undefined {
  const prop = interactTargets(encounter, unit).find((candidate) => samePos(candidate.pos, target));
  if (!prop) return "invalid_target";
  if (!unit.turn.action) return "resource_spent";

  unit.turn.action = false;
  prop.used = true;
  const template: PropTemplate = PROPS[prop.kind];
  events.push({
    type: "propUsed",
    unit: unit.id,
    prop: prop.id,
    name: template.name,
    verb: template.interact!,
    pos: { ...prop.pos },
  });
  return undefined;
}

// --- Apoios -----------------------------------------------------------------

/**
 * Chama o apoio de quem acompanha o grupo sem lutar. Não gasta nada de quem
 * chama: o que se gasta é o apoio, que só volta na rodada seguinte.
 */
function support(
  encounter: Encounter,
  unit: Unit,
  supporterId: string,
  target: Pos,
  events: TacticalEvent[],
): CommandError | undefined {
  const supporter = encounter.supporters.find((candidate) => candidate.id === supporterId);
  if (!supporter) return "unknown_ability";
  if (!supporter.ready) return "resource_spent";
  const aimed = supportTargets(encounter, unit, supporter).find((candidate) => samePos(candidate.pos, target));
  if (!aimed) return "invalid_target";

  supporter.ready = false;
  const template: SupportTemplate = SUPPORTS[supporter.support];
  events.push({
    type: "supportUsed",
    supporter: supporter.id,
    supporterName: supporter.name,
    support: supporter.support,
    name: template.name,
    unit: unit.id,
  });

  switch (template.kind) {
    case "reveal":
      events.push(revealIntent(encounter, aimed));
      return undefined;
  }
}

/** O que `unit` pretende fazer na vez dele, como evento (ver foresee em ./ai.ts). Quem vai perder a vez não pretende nada. */
function revealIntent(encounter: Encounter, unit: Unit): TacticalEvent {
  if (unit.statuses.some((status) => status.skipsTurn)) {
    return { type: "intentRevealed", unit: unit.id, tile: { ...unit.pos }, abilities: [], skips: true };
  }
  const plan = foresee(encounter, unit.id);
  return {
    type: "intentRevealed",
    unit: unit.id,
    tile: { ...plan.tile },
    // O item e a habilidade bônus disputam a mesma ação bônus: com item, a bônus não sai.
    abilities: [plan.action, plan.item ? undefined : plan.bonus].flatMap((choice) =>
      choice ? [{ abilityId: choice.ability.id, name: choice.ability.name, target: { ...choice.target } }] : [],
    ),
    ...(plan.item ? { item: plan.item.item.name } : {}),
  };
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
      // Purificar tira do corpo toda condição que esteja atrapalhando — antes de curar: a que trava a cura sai junto.
      const cured: TacticalEvent[] = [];
      if (effect.kind === "cure_status") removeStatuses(unit, isHarmful, cured);
      const denied = unit.statuses.find((status) => status.noHeal);
      if (denied) {
        // O item se gasta do mesmo jeito: a condição avisa na cara de quem a carrega.
        announce("Nada se restaura.");
        events.push({ type: "healDenied", target: unit.id, name: denied.name });
        return undefined;
      }
      const { healed, description } = applyImmediateHeal(unit, effect);
      announce(description);
      if (healed > 0) events.push({ type: "heal", target: unit.id, amount: healed, remainingHp: unit.currentHp });
      events.push(...cured);
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
