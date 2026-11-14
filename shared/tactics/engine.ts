import { foresee } from "./ai";
import { COST_BAND, attackEdge, attackTotals, canBeImprobable, isShot } from "./attack";
import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { HUNGER, healCap, healToll } from "../breath";
import { CONCEPTS } from "../mana";
import { distance, hasLineOfSight, samePos, tileAt, type Grid, type Pos } from "./grid";
import { FALL_PER_STEP, findPath, forcedPath } from "./movement";
import { PROPS, fellProp, propTemplate, type Prop, type PropTemplate } from "./props";
import { rollDice, rollDie } from "./rng";
import { STATUSES, isHarmful, type ActiveStatus, type StatusId, type StatusTemplate } from "./statuses";
import { PARRY_BREATH, PARRY_MIN, SPENT_DAMAGE, STYLES, counters, feints, isSworn, punishesRepeat, parries, strikesFirst, styleReduction, waveBonus } from "./styles";
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
  anchorTargets,
  interactTargets,
  itemTargets,
  isBlow,
  supportTargets,
  vowForbids,
  LIFT_SHARE,
  REVEAL_RANGE,
  liftable,
  readyable,
  seenByFoe,
} from "./targeting";
import type {
  AiOrder,
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
  FightClock,
  TacticalEvent,
  TeamId,
  Unit,
} from "./types";
import {
  activeUnit,
  chainStep,
  chainable,
  damageTakenOf,
  resistOf,
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
   * O lado que entrou na luta à vista, de propósito: a INVESTIDA (chutar a
   * porta). Ele age antes de todo mundo na primeira rodada e rola d20 + a
   * maior Força dele contra CHARGE_DC; passando, o outro lado entra Abalado
   * até o fim do primeiro turno. Não vem junto com a surpresa.
   */
  charge?: TeamId;
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
  /** O relógio da história, se há um correndo (ver FightClock em ./types.ts). */
  clock?: FightClock;
  seed: number;
}

/**
 * O golpe que abre a luta: alguém usou uma habilidade ANTES de a luta
 * existir, e é ela que a começa. Acontece na abertura, antes da primeira
 * rodada e fora da ordem dos turnos. À vista, não gasta a ação nem o
 * movimento do primeiro turno de quem o deu; numa emboscada (o outro lado
 * Surpreso), gasta a ação dele: o golpe e a surpresa não vêm os dois de graça. Com `from`, ele antes corre até esse quadrado
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
    ...(setup.clock ? { clock: { ...setup.clock } } : {}),
  };

  const rolls = encounter.units.map((unit, index) => ({
    unit,
    index,
    initiative: rollDie(encounter, 20) + effectiveAttribute(unit, "olho"),
  }));
  // Empate: quem tem mais Olho; persistindo, quem foi declarado primeiro.
  rolls.sort((a, b) => b.initiative - a.initiative || b.unit.attributes.olho - a.unit.attributes.olho || a.index - b.index);
  // Na investida, quem a deu vem antes de todo mundo, na ordem que rolou entre os seus.
  const charge = setup.surprised ? undefined : setup.charge;
  // O Gryskar aceita o custo pra agir antes de todos (`combate` §4.2): paga Fôlego e abre a ordem, entre os do lado
  // dele numa investida. Quem foi pego de surpresa não abre nada, e quem levou a investida também não: o outro lado
  // já vem antes de todos, e ele pagaria por nada.
  const first = new Set(
    rolls
      .filter(
        ({ unit }) =>
          strikesFirst(unit) && isAlive(unit) && unit.team !== setup.surprised && (!charge || unit.team === charge) && unit.breath >= FIRST_BREATH,
      )
      .map(({ unit }) => unit.id),
  );
  rolls.sort((a, b) => Number(first.has(b.unit.id)) - Number(first.has(a.unit.id)));
  if (charge) rolls.sort((a, b) => Number(b.unit.team === charge) - Number(a.unit.team === charge));
  encounter.order = rolls.map((roll) => roll.unit.id);
  const charged = charge ? chargeRoll(encounter, charge) : undefined;

  const events: TacticalEvent[] = [
    {
      type: "battleStarted",
      order: rolls.map((roll) => ({ unit: roll.unit.id, initiative: roll.initiative })),
      ...(setup.surprised ? { surprised: setup.surprised } : {}),
      ...(charged ? { charge: charged } : {}),
    },
  ];
  for (const unit of encounter.units) {
    if (!first.has(unit.id)) continue;
    unit.breath -= FIRST_BREATH;
    events.push({ type: "costPaid", unit: unit.id, kind: "breath", amount: FIRST_BREATH, first: true });
    events.push({ type: "breathSpent", unit: unit.id, amount: FIRST_BREATH, remaining: unit.breath });
  }
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
  for (const unit of encounter.units) {
    if (!charged?.shaken || unit.team === charged.team || !isAlive(unit)) continue;
    // Dois inícios de turno: cai quando ele for agir pela SEGUNDA vez, e o primeiro turno inteiro é Abalado.
    addStatus(unit, STATUSES.shaken, 2, events);
  }
  if (setup.opening) {
    strikeFirst(encounter, setup.opening, events);
    // Escondido, o golpe de abertura já é a ação do primeiro turno de quem o deu: a surpresa é o que ele ganhou.
    const opener = findUnit(encounter, setup.opening.unitId);
    if (opener && setup.surprised !== undefined && setup.surprised !== opener.team) opener.spentOpening = true;
  }
  if (!concludeIfDecided(encounter, events)) {
    events.push({ type: "roundStarted", round: 1 });
    advanceTurn(encounter, events);
  }
  return { encounter, events };
}

/** O Fôlego que o Gryskar paga pra abrir a ordem da luta. */
export const FIRST_BREATH = 1;

/** Quanto a investida precisa tirar (d20 + a maior Força de quem a deu) pra abalar o outro lado. */
export const CHARGE_DC = 18;

/** A rolagem da investida de `team` (ver EncounterSetup.charge). */
function chargeRoll(encounter: Encounter, team: TeamId): { team: TeamId; roll: number; needed: number; shaken: boolean } {
  const strongest = Math.max(0, ...encounter.units.filter((unit) => unit.team === team && isAlive(unit)).map((unit) => effectiveAttribute(unit, "forca")));
  const roll = rollDie(encounter, 20) + strongest;
  return { team, roll, needed: CHARGE_DC, shaken: roll >= CHARGE_DC };
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
      return useItem(encounter, unit, command.itemId, command.target, events);
    case "interact":
      return interact(encounter, unit, command.target, events);
    case "support":
      return support(encounter, unit, command.supporterId, command.target, events);
    case "lift":
      return lift(encounter, unit, command.targetId, events);
    case "order":
      return giveOrder(encounter, unit, command.targetId, command.order, events);
    case "ready":
      return ready(encounter, unit, command.abilityId, events);
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
    const prone = next.statuses.some((status) => status.prone);
    const movement = prone ? Math.floor(movementOf(next) / 2) : movementOf(next);
    const harms = next.statuses.filter((status) => status.harm);
    const regens = next.statuses.filter((status) => status.regen);
    tickStatuses(next, events);
    next.turn = { movement, action: !next.spentOpening, bonus: true, reaction: true };
    delete next.spentOpening;
    // O limite de mana é por turno: a conta do corpo recomeça quando a vez dele começa.
    if (next.manaSpent !== undefined) delete next.manaSpent;
    events.push({ type: "turnStarted", unit: next.id });
    if (prone && isAlive(next)) {
      // Caído: levantar come metade do passo, e o chão fica pra trás.
      removeStatuses(next, (status) => status.prone === true, events);
      events.push({ type: "stoodUp", unit: next.id });
    }
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
  delete unit.turn.chain;
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
  // `now` pode ser uma cadeia ("agarrar+attack"): bateu se algum verbo dela feriu.
  const verbs = now?.split("+") ?? [];
  const struck = unit.abilities.some((ability) => verbs.includes(ability.id) && dealsDamage(ability));
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

/** Quanto o relógio da história marca agora, nesta luta: o de quando ela abriu mais o que cada rodada virada gastou. Undefined sem relógio. */
export function clockNow(encounter: Pick<Encounter, "clock" | "round">): number | undefined {
  const { clock } = encounter;
  if (!clock) return undefined;
  return Math.min(clock.limit, clock.value + clock.perRound * Math.max(0, encounter.round - 1));
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
    case "hurt": {
      const unit = findUnit(encounter, when.unit);
      return unit !== undefined && unit.currentHp * 100 <= unit.maxHp * when.share;
    }
    case "broken":
      return encounter.props.some((prop) => prop.id === when.prop && prop.hp <= 0);
    case "used":
      return when.props.every((id) => encounter.props.some((prop) => prop.id === id && prop.used));
    case "defeat":
      return !encounter.units.some((unit) => unit.team === "party" && isAlive(unit));
    case "burst":
      return (encounter.bursts ?? 0) > 0;
    case "clock":
      return (clockNow(encounter) ?? -1) >= when.value;
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
    if (cue.rain && cue.rain > 0) {
      encounter.sight = cue.rain;
      events.push({ type: "sightCut", range: cue.rain });
    }
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
 * de oportunidade — antes do passo, com `unit` ainda no lugar —, todo
 * inimigo de vigia em cujo alcance ele ENTRA bate nele — depois do passo —, e a
 * superfície do quadrado em que ele pisa age. Morrer no meio do caminho
 * interrompe o movimento ali.
 */
function move(encounter: Encounter, unit: Unit, to: Pos, events: TacticalEvent[]): CommandError | undefined {
  const route = findPath(encounter, unit, to);
  if (!route || route.path.length === 0) return "unreachable";
  // Quem anda solta o que segurava: a cadeia acaba.
  delete unit.turn.chain;

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

    const before = { ...unit.pos };
    unit.turn.movement -= enterCost(encounter, step, before);
    unit.pos = { ...step };
    walked.push({ ...step });

    for (const watch of watchThreats(encounter, unit, before)) {
      flush();
      watch.watcher.turn.reaction = false;
      delete watch.watcher.readied;
      removeStatuses(watch.watcher, (status) => status.watch === true, events);
      events.push({ type: "watchTriggered", unit: watch.watcher.id, target: unit.id });
      charge(encounter, watch.watcher, watch.ability, false, events);
      resolveAbility(encounter, watch.watcher, watch.ability, unit.pos, [unit], true, events);
      if (!isAlive(unit)) return undefined;
    }

    if (surfaceAt(encounter, step)?.damage) {
      flush();
      touchSurface(encounter, unit, events);
      if (!isAlive(unit)) return undefined;
    }
  }
  flush();
  soak(encounter, unit, events);
  uncover(encounter, unit, events);
  return undefined;
}

/**
 * Depois de `mover` andar: se ele estava Escondido e terminou à vista de um
 * inimigo perto (REVEAL_RANGE), foi visto; e todo Escondido do outro lado que
 * ele agora vê de perto, também.
 */
function uncover(encounter: Encounter, mover: Unit, events: TacticalEvent[]): void {
  const hidden = (unit: Unit) => isAlive(unit) && unit.statuses.some((status) => status.concealed);
  if (hidden(mover) && seenByFoe(encounter, mover, REVEAL_RANGE)) reveal(mover, events);
  for (const other of encounter.units) {
    if (other.team === mover.team || !hidden(other) || !isAlive(mover)) continue;
    if (distance(other.pos, mover.pos) <= REVEAL_RANGE && hasLineOfSight(encounter.grid, mover.pos, other.pos)) reveal(other, events);
  }
}

function reveal(unit: Unit, events: TacticalEvent[]): void {
  removeStatuses(unit, (status) => status.concealed === true, events);
  events.push({ type: "revealed", unit: unit.id });
}

/**
 * Quem está de vigia (`watch`) e vê `mover` ENTRAR no alcance do golpe dele,
 * vindo de `from` (onde não alcançava, ou não via): o golpe é o que ele
 * preparou (`readied`) ou, no Vigiar, o da arma (`<classe>.attack`), pago como reação. Quem é da Ipojy, antes de a luta abrir,
 * não vigia ninguém.
 */
export function watchThreats(encounter: Encounter, mover: Unit, from: Pos): { watcher: Unit; ability: Ability }[] {
  const threats: { watcher: Unit; ability: Ability }[] = [];
  for (const watcher of encounter.units) {
    if (watcher.team === mover.team || !isAlive(watcher) || !watcher.turn.reaction) continue;
    if (!watcher.statuses.some((status) => status.watch) || vowForbids(encounter, watcher)) continue;
    // O que ele preparou (Preparar), ou o golpe da arma (Vigiar).
    const wanted = watcher.readied ?? `${watcher.characterClass}.attack`;
    const ability = watcher.abilities.find((candidate) => candidate.id === wanted);
    if (!ability || readiness(watcher, ability, true) !== "ready") continue;
    const sees = (pos: Pos) => distance(watcher.pos, pos) <= ability.range && hasLineOfSight(encounter.grid, watcher.pos, pos);
    if (!sees(from) && sees(mover.pos)) threats.push({ watcher, ability });
  }
  return threats;
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
  // A segurada (Desviar) paga a mana quando a última linha sai, não quando se começa a ler.
  if (ability.mana && !ability.held) spendMana(encounter, unit, ability.mana, events);
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
  const limit = Math.max(0, (unit.manaLimit ?? 0) + unit.statuses.reduce((sum, status) => sum + (status.manaLimit ?? 0), 0));
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
  if (state === "silenced") return "silenced";
  if (state === "disarmed") return "disarmed";
  if (state !== "ready") return "resource_spent";
  if (!abilityTargets(encounter, unit, ability).some((pos) => samePos(pos, target))) return "invalid_target";

  // O próximo verbo da cadeia aberta (`combate` §3.1): sai pago em Fôlego, no lugar da ação que já foi.
  const step = chainStep(unit, ability);
  const chain = step !== undefined ? unit.turn.chain : undefined;
  const feint = chain !== undefined && feints(unit) && ability.id !== chain.last;
  if (ability.cost === "action") unit.turn.action = false;
  else unit.turn.bonus = false;
  if (ability.cost === "action") delete unit.readied;
  // O que ele fez com a ação deste turno — a cadeia inteira, verbo a verbo: é o que a Rachadura e as manias da IA leem depois.
  if (ability.cost === "action") {
    const now = chain && unit.habit?.now ? `${unit.habit.now}+${ability.id}` : ability.id;
    unit.habit = { repeated: false, attackTurns: 0, ...unit.habit, now };
  }
  if (chain && step !== undefined) {
    if (step > 0) {
      unit.breath -= step;
      events.push({ type: "breathSpent", unit: unit.id, amount: step, remaining: unit.breath });
    }
    events.push({ type: "chained", unit: unit.id, verbs: chain.verbs + 1, breath: step, ...(feint ? { feint: true } : {}) });
  }
  if (isRecited(ability)) {
    // Recitar é só começar a ler: o preço e o efeito ficam pra quando a magia sair (ver `release`).
    const aimed = ability.targets === "enemy" || ability.targets === "ally" ? unitAt(encounter, target) : undefined;
    unit.reciting = { abilityId: ability.id, target: { ...target }, ...(aimed ? { unit: aimed.id } : {}) };
    events.push({ type: "recitationStarted", unit: unit.id, abilityId: ability.id, name: ability.name, target: { ...target } });
    return undefined;
  }
  charge(encounter, unit, ability, true, events);
  const affected = affectedUnits(encounter, ability, target);
  // O Gryskar pôs a aura toda no primeiro golpe da cadeia: o segundo sai fraco.
  const spent = chain !== undefined && chain.struck && strikesFirst(unit) && dealsDamage(ability);
  const outcome = resolveAbility(encounter, unit, ability, target, affected, false, events, { feint, spent });
  // A magia cobra de quem a fez, se ele ainda está de pé pra pagar.
  if (ability.backlash && isAlive(unit)) addStatus(unit, STATUSES[ability.backlash.statusId], ability.backlash.turns, events);

  // A cadeia: o verbo que pegou e deixou o alvo de pé a abre (ou a estende); o que falhou a fecha.
  const aimed = affected[0];
  if (chainable(ability) && aimed && aimed.team !== unit.team && isAlive(unit)) {
    if (outcome && outcome !== "miss" && outcome !== "fumble" && isAlive(aimed)) {
      unit.turn.chain = {
        target: aimed.id,
        verbs: (chain?.verbs ?? 0) + 1,
        last: ability.id,
        struck: (chain?.struck ?? false) || dealsDamage(ability),
      };
    } else delete unit.turn.chain;
  } else if (ability.cost === "action") delete unit.turn.chain;
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
/**
 * Como um golpe sai, além do de sempre: `feint` é a troca de verbo da Tsvirana
 * (não se apara, não se esquiva, não se devolve), `spent` o segundo golpe da
 * cadeia do Gryskar (sai fraco), `sure` o Contragolpe da Ipojy (sucesso pleno,
 * sem rolar).
 */
interface Strike {
  feint?: boolean;
  spent?: boolean;
  sure?: boolean;
}

function resolveAbility(
  encounter: Encounter,
  actor: Unit,
  ability: Ability,
  targetPos: Pos,
  targets: Unit[],
  reaction: boolean,
  events: TacticalEvent[],
  strike: Strike = {},
): AttackOutcome | undefined {
  events.push({
    type: "abilityUsed",
    unit: actor.id,
    abilityId: ability.id,
    name: ability.name,
    target: { ...targetPos },
    reaction,
  });
  if (isBlow(ability)) {
    encounter.opened = true;
    actor.swung = true;
  }

  // Quem é da Ipojy e foi atacado em vão devolve o golpe — depois que este acabar de acontecer.
  const countering: Unit[] = [];
  // O custo se paga uma vez por golpe, mesmo numa área: é o corpo de quem bateu.
  let costly = false;
  let first: AttackOutcome | undefined;
  for (const aimed of targets) {
    const target = interceptor(encounter, actor, ability, aimed) ?? aimed;
    if (target !== aimed) {
      target.turn.reaction = false;
      events.push({ type: "intercepted", unit: target.id, ally: aimed.id, attacker: actor.id });
    }
    const blow = ability.radius === undefined && dealsDamage(ability) && target.team !== actor.team;
    const deflector = isShot(ability) && target.team !== actor.team ? deflecting(encounter, target) : undefined;
    if (deflector) {
      // DESVIAR PROJÉTIL (`combate` §3.4): a última linha sai, o virote encontra a força que empurra e passa ao lado.
      deflector.turn.reaction = false;
      removeStatuses(deflector, (status) => status.deflect === true, events);
      events.push({ type: "deflected", unit: deflector.id, target: target.id, attacker: actor.id });
      spendMana(encounter, deflector, DEFLECT_MANA, events);
      if (blow) delete actor.streak;
      first ??= "miss";
      continue;
    }
    let critical = false;
    let outcome: AttackOutcome = "hit";
    if (ability.attack && !strike.sure) {
      const rolled = rollAttack(encounter, actor, target, ability, targetPos, events);
      outcome = rolled.outcome;
      if (outcome === "cost" && !strike.feint && dodges(encounter, actor, ability, target)) {
        // ESQUIVAR (`combate` §3.2): o golpe que pegaria por pouco não pega, e quem bateu não errou — não fica Exposto.
        target.turn.reaction = false;
        target.breath -= DODGE_BREATH;
        events.push({ type: "breathSpent", unit: target.id, amount: DODGE_BREATH, remaining: target.breath });
        events.push({ type: "dodged", unit: target.id, attacker: actor.id });
        if (blow) delete actor.streak;
        first ??= "miss";
        continue;
      }
      if (outcome === "miss" || outcome === "fumble") {
        if (blow) delete actor.streak;
        // A falha não é "nada acontece" (`combate` §2.3): quem errou fica Exposto até a vez seguinte dele.
        if (target.team !== actor.team && isAlive(actor)) addStatus(actor, STATUSES.exposto, 1, events);
        if (target.team !== actor.team && counters(target) && !strike.feint) countering.push(target);
        first ??= outcome;
        continue;
      }
      critical = outcome === "crit";
      if (outcome === "cost" || rolled.costly) costly = true;
    }
    first ??= outcome;

    for (const effect of ability.effects) {
      if (!isAlive(target)) break;
      applyEffect(encounter, actor, target, ability, effect, critical, events, strike);
    }
    if (blow) {
      actor.streak = { target: target.id, hits: actor.streak?.target === target.id ? actor.streak.hits + 1 : 1 };
    }
  }
  if (costly) payCost(encounter, actor, ability, events);

  for (const prop of affectedProps(encounter, ability, targetPos)) {
    for (const effect of ability.effects) {
      if (effect.kind !== "damage" || prop.hp <= 0) continue;
      damageProp(encounter, prop, rollDamage(encounter, actor, effect), events);
    }
  }
  if (actor.river && dealsDamage(ability)) strikeFloor(encounter, targetPos, events);

  if (ability.surface) {
    laySurface(encounter, ability.surface.id, surfaceTiles(encounter, ability, targetPos), ability.surface.rounds, events);
  }

  if (ability.anchor && isAlive(actor)) pullSelf(encounter, actor, targetPos, events);

  // O golpe que sai do esconderijo o descobre.
  if (isBlow(ability) && actor.statuses.some((status) => status.concealed)) reveal(actor, events);

  for (const defender of countering) counterStrike(encounter, defender, actor, events);
  return first;
}

/** A mana que a última linha do Desviar cobra quando sai (ver `held` em Ability). */
export const DEFLECT_MANA = 2;
/** De quão longe quem está Desviando cobre um aliado: colado nele. */
export const DEFLECT_REACH = 1;

/**
 * Quem desvia o tiro que vai em `target`: alguém do lado dele, Desviando (ver
 * `deflect` em ./statuses.ts), com a reação e a mana da última linha, e colado
 * nele (ou ele mesmo). Calado ou Agarrado não diz linha nenhuma.
 */
function deflecting(encounter: Encounter, target: Unit): Unit | undefined {
  return encounter.units.find(
    (other) =>
      other.team === target.team &&
      isAlive(other) &&
      other.turn.reaction &&
      other.statuses.some((status) => status.deflect) &&
      !other.statuses.some((status) => status.silenced) &&
      (other.mana ?? 0) >= DEFLECT_MANA &&
      distance(other.pos, target.pos) <= DEFLECT_REACH,
  );
}

/** O Fôlego que Esquivar custa. */
export const DODGE_BREATH = 2;
/** O Fôlego que o sucesso com custo cobra, quando o custo sai do Fôlego. */
export const COST_BREATH = 1;

/**
 * ESQUIVAR (`combate` §3.2): `target` sai da frente do golpe que pegaria por
 * pouco (o sucesso com custo de quem bate), gastando a reação e DODGE_BREATH.
 * Quem é de escola de espada apara em vez de esquivar; área não se esquiva; e
 * quem está no chão, preso ou perdendo a vez não sai de lugar nenhum.
 */
function dodges(encounter: Encounter, actor: Unit, ability: Ability, target: Unit): boolean {
  if (actor.team === target.team || ability.radius !== undefined || !target.turn.reaction || target.breath < DODGE_BREATH) return false;
  if (parries(target) || !isAlive(target)) return false;
  return !target.statuses.some((status) => status.skipsTurn || status.prone || (status.speed ?? 0) <= -99);
}

/**
 * O CUSTO de um sucesso com custo, ou do improvável que não chegava ao pleno
 * (`combate` §2.2). Sai do que faz sentido pra quem bateu: quem conjurou paga
 * mais 1 de mana (a marca, se aquilo passar do limite dele — e o bicho escuta);
 * quem tem Fôlego paga COST_BREATH; quem não tem, a ferida própria (1d4, sem
 * cair por ela).
 */
function payCost(encounter: Encounter, unit: Unit, ability: Ability, events: TacticalEvent[]): void {
  if (!isAlive(unit)) return;
  if (ability.mana && (unit.mana ?? 0) >= 1) {
    events.push({ type: "costPaid", unit: unit.id, kind: "mark", amount: 1 });
    spendMana(encounter, unit, 1, events);
    return;
  }
  if (unit.maxBreath > 0 && unit.breath >= COST_BREATH) {
    unit.breath -= COST_BREATH;
    events.push({ type: "costPaid", unit: unit.id, kind: "breath", amount: COST_BREATH });
    events.push({ type: "breathSpent", unit: unit.id, amount: COST_BREATH, remaining: unit.breath });
    return;
  }
  if (unit.invulnerable) return;
  const wound = Math.min(rollDie(encounter, 4), unit.currentHp - 1);
  if (wound <= 0) return;
  unit.currentHp -= wound;
  events.push({ type: "costPaid", unit: unit.id, kind: "wound", amount: wound });
  events.push({ type: "damage", target: unit.id, amount: wound, remainingHp: unit.currentHp });
}

/**
 * INTERCEPTAR: quem está em guarda, colado no aliado que `actor` acabou de
 * mirar com um golpe de arma de um alvo só, entra na frente e leva o golpe no
 * lugar dele (com a guarda dele), pago com a reação. Precisa estar ao alcance
 * e à vista de quem bate. Magia não se intercepta: quem recita não mira o corpo.
 */
function interceptor(encounter: Encounter, actor: Unit, ability: Ability, aimed: Unit): Unit | undefined {
  if (aimed.team === actor.team || ability.radius !== undefined || ability.targets !== "enemy" || ability.mana || !dealsDamage(ability)) return undefined;
  return encounter.units.find(
    (other) =>
      other !== aimed &&
      other !== actor &&
      other.team === aimed.team &&
      isAlive(other) &&
      other.turn.reaction &&
      other.statuses.some((status) => status.guard) &&
      distance(other.pos, aimed.pos) === 1 &&
      distance(other.pos, actor.pos) <= ability.range &&
      hasLineOfSight(encounter.grid, actor.pos, other.pos),
  );
}

/**
 * PREPARAR: `unit` gasta a ação deixando `abilityId` pronta, e até a vez
 * seguinte o primeiro inimigo que entrar no alcance dela leva ela, na reação
 * (ver watchThreats). Vale o que mira um inimigo e não se recita (quem recita
 * não segura a palavra no meio); o preço sai quando ela sair.
 */
function ready(encounter: Encounter, unit: Unit, abilityId: string, events: TacticalEvent[]): CommandError | undefined {
  const ability = unit.abilities.find((candidate) => candidate.id === abilityId);
  if (!ability) return "unknown_ability";
  if (!readyable(ability)) return "invalid_target";
  if (!unit.turn.action) return "resource_spent";
  const state = readiness(unit, ability, true);
  if (state === "breath") return "no_breath";
  if (state === "recharging") return "recharging";
  if (state !== "ready") return "resource_spent";
  if (vowForbids(encounter, unit)) return "invalid_target";

  unit.turn.action = false;
  unit.habit = { repeated: false, attackTurns: 0, ...unit.habit, now: "ready" };
  unit.readied = ability.id;
  events.push({ type: "readied", unit: unit.id, abilityId: ability.id, name: ability.name });
  addStatus(unit, STATUSES.watching, 1, events);
  return undefined;
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
  // A falha do outro vira o acerto dela (`combate` §4.1): o Contragolpe sai como sucesso pleno, sem rolar.
  resolveAbility(encounter, defender, ability, attacker.pos, [attacker], true, events, { sure: true });
}

/**
 * d20 + atributo primário + modificador contra 10 + Couro do alvo, com o que
 * a chance soma de cada lado (ver ./attack.ts), e o resultado numa das três
 * faixas (`combate` §2.1): COST_BAND acima da defesa, pleno; na defesa, com
 * custo; abaixo, falha. O 1 natural falha sempre. O 20 natural (ou o Foco) é
 * o improvável: pega e dobra, e cobra (`costly`) quando a rolagem não chegava
 * ao pleno — o Foco não cobra. De IMPROBABLE_GAP níveis abaixo, o 20 não é
 * improvável nenhum: é só mais um número.
 */
function rollAttack(
  encounter: Encounter,
  actor: Unit,
  target: Unit,
  ability: Ability,
  aim: Pos,
  events: TacticalEvent[],
): { outcome: AttackOutcome; costly: boolean } {
  const edge = attackEdge(encounter, actor, ability, target, aim);
  const { bonus, defense } = attackTotals(actor, ability, target, edge);
  const natural = rollDie(encounter, 20);
  const total = natural + bonus;
  const guaranteed = actor.statuses.some((status) => status.guaranteedCrit);
  const band: AttackOutcome = total >= defense + COST_BAND ? "hit" : total >= defense ? "cost" : "miss";

  let outcome: AttackOutcome;
  if (guaranteed || (natural === 20 && canBeImprobable(actor, target))) outcome = "crit";
  else if (natural === 1) outcome = "fumble";
  else outcome = band;
  const costly = outcome === "crit" && !guaranteed && band !== "hit";

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
    far: edge.far,
    crowded: edge.crowded,
    style: edge.style,
    ...(edge.styleToHit !== 0 ? { styleToHit: edge.styleToHit } : {}),
    ...(edge.exposed ? { exposed: true } : {}),
    ...(edge.levelToHit !== 0 ? { levelToHit: edge.levelToHit } : {}),
  });

  if (guaranteed) removeStatuses(actor, (status) => status.guaranteedCrit === true, events);
  return { outcome, costly };
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
  strike: Strike = {},
): void {
  switch (effect.kind) {
    case "damage": {
      if (target.invulnerable) {
        events.push({ type: "immune", target: target.id });
        return;
      }
      // O traço do estilo de quem bate (ver ./styles.ts): a Onda soma antes do crítico. A Rachadura já entrou na
      // chance (o alvo que se repetiu estava Exposto pra ela).
      const wave = waveBonus(actor, ability, target);
      const trait = actor.style ? STYLES[actor.style].trait : "";
      if (wave > 0) events.push({ type: "styleTrait", unit: actor.id, target: target.id, trait: "wave", name: trait, hits: actor.streak!.hits });
      if (actor.team !== target.team && ability.radius === undefined && punishesRepeat(actor) && target.habit?.repeated) {
        events.push({ type: "styleTrait", unit: actor.id, target: target.id, trait: "crack", name: trait });
      }

      let amount = rollDamage(encounter, actor, effect) + wave;
      if (critical) amount *= 2;
      // O segundo golpe da cadeia do Gryskar: a aura foi toda no primeiro.
      if (strike.spent) amount *= SPENT_DAMAGE;
      amount = Math.round(amount * resistOf(target, effect.type));

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
      } else if (!strike.feint && canParry(actor, ability, target, amount)) {
        // APARAR: a lâmina no caminho da outra, pago com a reação e com Fôlego.
        const parried = Math.min(amount - 1, rollDie(encounter, 4) + (target.grade ?? 0));
        target.turn.reaction = false;
        target.breath -= PARRY_BREATH;
        events.push({ type: "breathSpent", unit: target.id, amount: PARRY_BREATH, remaining: target.breath });
        events.push({ type: "parried", unit: target.id, amount: parried });
        amount -= parried;
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
    case "status": {
      const status: StatusTemplate = STATUSES[effect.statusId];
      addStatus(target, status, effect.turns, events);
      // Agarrado (ou Calado) no meio do texto: a boca e as mãos ocupadas, a recitação se perde.
      if (status.silenced && target.reciting) breakRecitation(target, "hit", events);
      if (status.silenced) removeStatuses(target, (active) => active.deflect === true, events);
      return;
    }
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
      push(encounter, actor.pos, target, effect.distance, events, effect.pin);
      return;
    case "stride": {
      const amount = movementOf(target);
      if (amount <= 0) return;
      target.turn.movement += amount;
      events.push({ type: "strode", unit: target.id, amount });
      return;
    }
  }
}

/**
 * Se `target` apara o golpe de arma de perto que `actor` acabou de acertar:
 * ele é de escola de espada e luta de perto (`parries`), tem a reação e o
 * Fôlego, e o golpe tira ao menos PARRY_MIN. Magia, tiro e área não se aparam.
 */
function canParry(actor: Unit, ability: Ability, target: Unit, amount: number): boolean {
  if (actor.team === target.team || ability.mana || ability.radius !== undefined || ability.range > 2) return false;
  if (!target.turn.reaction || target.breath < PARRY_BREATH || amount < PARRY_MIN || !parries(target)) return false;
  return !target.statuses.some((status) => status.skipsTurn);
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
    const focus = target.statuses.reduce((sum, status) => sum + (status.focus ?? 0), 0);
    if (target.reciting && rollDie(encounter, 20) + effectiveAttribute(target, "saber") + focus < RECITE_FOCUS + Math.floor(amount / 2)) {
      breakRecitation(target, "hit", events);
    }
    // O texto do Desviar, segurado na boca, quebra do mesmo jeito.
    const holds = target.statuses.some((status) => status.deflect);
    if (holds && rollDie(encounter, 20) + effectiveAttribute(target, "saber") + focus < RECITE_FOCUS + Math.floor(amount / 2)) {
      removeStatuses(target, (status) => status.deflect === true, events);
    }
    return;
  }

  target.statuses = [];
  delete target.reciting;
  events.push({ type: "death", unit: target.id });
}

/** Quanto dói cada quadrado de empurrão que sobrou quando o alvo bate em parede, caixote ou corpo. */
export const SLAM_PER_TILE = 2;

/**
 * Desloca `target` em linha reta pra longe de `actor` (ou pra perto, com
 * distância negativa), um quadrado por vez, até acabar a distância ou
 * bater em parede, borda ou corpo. Movimento forçado não provoca ataque de
 * oportunidade, mas a superfície de onde o alvo vai parar age sobre ele, e
 * a água também (`soak`). Quem carrega uma condição `immovable` não sai do
 * lugar; quem é pesado (`heft`) sai esse tanto a menos.
 *
 * O chão mais alto barra como parede (barranco não se sobe empurrado), e quem
 * desce degrau no caminho cai: FALL_PER_STEP por degrau, puxado ou empurrado
 * (ver forcedPath em ./movement.ts).
 *
 * Empurrado (não puxado) contra o que barra o passo, o alvo bate: leva
 * SLAM_PER_TILE por quadrado que faltou andar, sem armadura no meio, e o
 * destrutível em que bateu leva o mesmo (o barril de óleo quebra e derrama).
 * Puxão não bate: quem puxa é o próprio corpo no caminho.
 */
function push(encounter: Encounter, origin: Pos, target: Unit, pushDistance: number, events: TacticalEvent[], pin = false): void {
  if (target.statuses.some((status) => status.immovable)) return;
  const path = forcedPath(encounter, origin, target, pushDistance);
  if (!path) return;
  // PRENSAR (`combate` §3.2): contra o que barra, Prensado; sem nada atrás, Caído. O bicho na água não cai.
  const pinned: StatusTemplate | undefined = pin && pushDistance > 0 ? (path.stop ? STATUSES.prensado : STATUSES.caido) : undefined;

  const from = { ...target.pos };
  target.pos = { ...path.to };
  if (!samePos(from, target.pos)) {
    events.push({ type: "pushed", unit: target.id, from, to: { ...target.pos } });
    if (path.fall > 0) fall(encounter, target, path.fall, events);
    if (isAlive(target)) touchSurface(encounter, target, events);
    soak(encounter, target, events);
  }
  if (pushDistance > 0 && path.stop && isAlive(target)) slam(encounter, target, path.stop, path.left * SLAM_PER_TILE, events);
  if (pinned && isAlive(target) && !(pinned.prone && target.statuses.some((status) => status.id === "submerged"))) {
    addStatus(target, pinned, 1, events);
  }
}

/**
 * PUXAR-SE ATÉ UM PONTO (`combate` §3.4): `unit` se puxa em linha reta até
 * `to`, colado no corpo, na parede ou no destrutível do outro lado (ver
 * anchorTargets em ./targeting.ts). É movimento forçado: não provoca ataque de
 * oportunidade nem vigia, e não gasta o passo. Sobe barranco (quem puxa é ele) e
 * desce sem cair. A superfície de onde ele chega age, e a água também. Se o
 * ponto já não está lá (o corpo saiu do lugar), não acontece nada.
 */
function pullSelf(encounter: Encounter, unit: Unit, to: Pos, events: TacticalEvent[]): void {
  const spot = anchorTargets(encounter, unit, Infinity).find((candidate) => samePos(candidate.to, to));
  if (!spot) return;
  const from = { ...unit.pos };
  unit.pos = { ...spot.to };
  // Quem se puxou soltou o que segurava: a cadeia acaba.
  delete unit.turn.chain;
  events.push({ type: "pushed", unit: unit.id, from, to: { ...unit.pos }, self: true });
  touchSurface(encounter, unit, events);
  soak(encounter, unit, events);
  uncover(encounter, unit, events);
}

/** `target` caiu `steps` degraus, tirado do lugar: FALL_PER_STEP por degrau, sem armadura no meio. */
function fall(encounter: Encounter, target: Unit, steps: number, events: TacticalEvent[]): void {
  events.push({ type: "fell", unit: target.id, steps });
  if (target.invulnerable) events.push({ type: "immune", target: target.id });
  else dealDamage(encounter, target, steps * FALL_PER_STEP, events);
}

/** `target` bateu no que está em `into` com a força de `amount` (ver push). */
function slam(encounter: Encounter, target: Unit, into: Pos, amount: number, events: TacticalEvent[]): void {
  const prop = encounter.props.find((candidate) => candidate.hp > 0 && samePos(candidate.pos, into));
  const body = unitAt(encounter, into);
  events.push({
    type: "slammed",
    unit: target.id,
    into: prop ? "prop" : body ? "unit" : "wall",
    name: prop ? propTemplate(prop).name : body?.name,
    pos: { ...into },
  });
  if (target.invulnerable) events.push({ type: "immune", target: target.id });
  else dealDamage(encounter, target, amount, events);
  if (prop) damageProp(encounter, prop, amount, events);
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
 * Barranco a água não sobe: o chão mais alto que a água do lado fica seco.
 * Destrutível de pé barra o passo: o chão dele fica seco — menos o que a água
 * apaga (`washes`, o círculo gravado), que some antes e alaga junto. Na primeira vez, a
 * luta passa a ter a própria grade (`ownGrid`), pra cheia não alagar o mapa
 * da área. O bicho de rio que estava ali volta a ficar Submerso.
 */
function riseWater(encounter: Encounter, events: TacticalEvent[]): void {
  if (encounter.flood) encounter.flood.risen += 1;
  if (!encounter.ownGrid) {
    encounter.grid = { ...encounter.grid, tiles: [...encounter.grid.tiles] };
    encounter.ownGrid = true;
  }
  const { grid } = encounter;
  const wetAt = (pos: Pos) => tileAt(grid, pos)?.water === true;
  // O círculo que a água alcança se apaga antes de ela subir: o chão dele alaga junto com o resto.
  for (const prop of encounter.props) {
    if (prop.hp <= 0 || !propTemplate(prop).washes) continue;
    const { x, y } = prop.pos;
    if (![{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }].some(wetAt)) continue;
    prop.hp = 0;
    fellProp(grid, prop);
    events.push({ type: "propDestroyed", prop: prop.id, name: propTemplate(prop).name, pos: { ...prop.pos } });
  }
  // A água não sobe barranco: só alaga o chão que não é mais alto que ela.
  const wet = (x: number, y: number, level: number) =>
    x >= 0 && y >= 0 && x < grid.width && y < grid.height && grid.tiles[y * grid.width + x].water === true && grid.tiles[y * grid.width + x].elevation >= level;
  const tiles: Pos[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y * grid.width + x];
      if (tile.water || tile.blocksMove) continue;
      const level = tile.elevation;
      if (wet(x - 1, y, level) || wet(x + 1, y, level) || wet(x, y - 1, level) || wet(x, y + 1, level)) tiles.push({ x, y });
    }
  }
  if (tiles.length === 0) return;
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
 * O bote do bicho de rio parte o chão posto em cima da água onde ele mordeu (a passarela, `floor`): a tábua some, a
 * água volta, e quem estava em cima fica com o pé no rio (cena 1.3 do roteiro: "avança como uma onda, partindo a
 * passarela de madeira"). Erre ou acerte: é o corpo dele que bate na tábua.
 */
function strikeFloor(encounter: Encounter, pos: Pos, events: TacticalEvent[]): void {
  const plank = encounter.props.find((prop) => prop.hp > 0 && propTemplate(prop).floor === true && samePos(prop.pos, pos));
  if (!plank) return;
  damageProp(encounter, plank, plank.hp, events);
  const standing = unitAt(encounter, pos);
  if (standing) soak(encounter, standing, events);
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
  if (template.pull) {
    // O círculo gravado: puxa quem está do outro lado, o bicho de rio primeiro.
    const { distance: pull, reach } = template.pull;
    const [target] = encounter.units
      .filter((other) => other.team !== unit.team && isAlive(other) && distance(other.pos, prop.pos) <= reach)
      .sort((a, b) => Number(b.river === true) - Number(a.river === true) || distance(a.pos, prop.pos) - distance(b.pos, prop.pos));
    if (target) push(encounter, prop.pos, target, -pull, events);
  }
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
/** Levanta um aliado caído, colado em quem levanta. Volta sem as condições que tinha, e na vez dele na ordem. */
function lift(encounter: Encounter, unit: Unit, targetId: string, events: TacticalEvent[]): CommandError | undefined {
  if (!unit.turn.action) return "resource_spent";
  const target = liftable(encounter, unit).find((other) => other.id === targetId);
  if (!target) return "invalid_target";
  unit.turn.action = false;
  target.currentHp = Math.max(1, Math.ceil(target.maxHp * LIFT_SHARE));
  target.statuses = [];
  delete target.reciting;
  events.push({ type: "lifted", unit: unit.id, target: target.id, hp: target.currentHp });
  return undefined;
}

/** A ordem a um companheiro: só a quem é do mesmo lado e está de pé, e proteger só quem também é. Não gasta nada do turno. */
function giveOrder(encounter: Encounter, unit: Unit, targetId: string, order: AiOrder, events: TacticalEvent[]): CommandError | undefined {
  const target = findUnit(encounter, targetId);
  if (!target || target === unit || target.team !== unit.team || !isAlive(target)) return "invalid_target";
  if (order.kind === "guard") {
    const ward = findUnit(encounter, order.unit);
    if (!ward || ward === target || ward.team !== unit.team) return "invalid_target";
  }
  if (order.kind === "focus") {
    const mark = findUnit(encounter, order.unit);
    if (!mark || mark.team === unit.team || !isAlive(mark)) return "invalid_target";
  }
  if (order.kind === "advance") delete target.order;
  else target.order = { ...order };
  events.push({ type: "ordered", unit: unit.id, target: target.id, order: { ...order } });
  return undefined;
}

function useItem(encounter: Encounter, user: Unit, itemId: string, at: Pos | undefined, events: TacticalEvent[]): CommandError | undefined {
  const slot = findInventorySlot(user, itemId);
  if (!slot || slot.quantity <= 0 || slot.item.data.effect.kind === "none") return "item_unavailable";
  if (!user.turn.bonus) return "resource_spent";
  // Sem alvo, em si; com alvo, num aliado ao alcance do braço, ou no inimigo, se o item se joga (ver itemTargets).
  const unit = at ? unitAt(encounter, at) : user;
  if (slot.item.data.effect.kind === "throw" && !at) return "invalid_target";
  if (!unit || !itemTargets(encounter, user, slot.item).some((pos) => samePos(pos, unit.pos))) return "invalid_target";

  user.turn.bonus = false;
  const { id, name, data } = slot.item;
  const { effect } = data;
  consumeInventoryCharge(user, slot);

  const announce = (description: string) =>
    events.push({ type: "itemUsed", unit: user.id, itemId: id, itemName: name, description, ...(unit !== user ? { target: unit.id } : {}) });

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
    case "throw": {
      // Quebra onde cai: sem rolagem, e a armadura não segura o que quebra em cima (a Muralha, sim).
      announce("Quebra em cima.");
      if (unit.invulnerable) events.push({ type: "immune", target: unit.id });
      else {
        const amount = Math.max(1, Math.round(rollDice(encounter, effect.dice) * resistOf(unit, effect.type)) - styleReduction(unit));
        dealDamage(encounter, unit, amount, events);
      }
      if (effect.surface) {
        const dry = spreadTiles(encounter.grid, unit.pos, effect.surface.radius).filter((pos) => !tileAt(encounter.grid, pos)?.water);
        laySurface(encounter, effect.surface.id, dry, effect.surface.rounds, events);
      }
      return undefined;
    }
    case "focus_charge":
      announce("Garante um acerto crítico no próximo golpe.");
      // Dura até ser gasto num ataque; os turnos são só um teto pra não ficar guardado a luta toda.
      addStatus(unit, STATUSES.focused, 3, events);
      return undefined;
    case "none":
      return "item_unavailable";
  }
}
