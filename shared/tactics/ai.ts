import { distance, hasLineOfSight, posOfIndex, samePos, stepNeighbors, tileIndex, type Pos } from "./grid";
import { attackOdds } from "./attack";
import { reachableTiles } from "./movement";
import { PROPS, type PropTemplate } from "./props";
import { STATUSES, type StatusId, type StatusTemplate } from "./statuses";
import { SURFACES, enterCost, spreadTiles, surfaceHarm, surfaceTiles, type SurfaceTemplate } from "./surfaces";
import { abilityTargets, affectedProps, affectedUnits, canAimAt } from "./targeting";
import type { Attributes } from "../types/attributes";
import type { ConsumableItem } from "../types/inventory";
import type { Ability, AiProfile, AttributeRef, Command, Encounter, Unit } from "./types";
import { activeUnit, effectiveAttribute, isAlive, primaryAttribute, unitAt } from "./units";

/**
 * A IA de inimigo, por utilidade.
 *
 * Em vez de uma árvore de "se isso, faça aquilo", ela dá NOTA a tudo que
 * quem está no turno poderia fazer e fica com a maior. Uma jogada é um
 * quadrado onde parar mais o que fazer de lá com a ação e com a ação bônus;
 * a nota soma:
 *
 *   - o que as habilidades rendem EM MÉDIA dali: chance de acerto x dano,
 *     chance de derrubar o alvo, cura, guarda — e desconta quem do próprio
 *     lado for pego numa área. A chance de acerto já vem com cobertura,
 *     flanco e altura: é por isso que ela cerca, sobe e se esconde;
 *   - o que um item da mochila rende, disputando a ação bônus com as
 *     habilidades: consumível não volta, então só sai quando não é
 *     desperdício;
 *   - o que a posição custa: o dano a que fica exposto, o ataque de
 *     oportunidade de quem ele largar pra chegar lá, as superfícies que
 *     atravessa e a em que para e, enquanto não tiver ninguém ao alcance, a
 *     distância ANDANDO até o inimigo mais próximo (por isso contorna parede
 *     e procura a ponte).
 *
 * Cada parcela é multiplicada por um peso do combatente (`Unit.ai`, ver
 * AiProfile): é aí que uma criatura vira covarde, bruta ou carniceira sem
 * código novo.
 *
 * A IA não rola dado nem simula o futuro: trabalha com médias, não mexe na
 * luta e, pra mesma luta, devolve sempre o mesmo comando. Ela só propõe o
 * que `abilityTargets` e `reachableTiles` oferecem — o que o motor aceita.
 */

export const DEFAULT_AI_PROFILE: AiProfile = { aggression: 1, finisher: 1, support: 1, caution: 0.5 };

/** Quanto vale derrubar alguém, na mesma moeda das outras parcelas: pontos de vida. */
const KILL_VALUE = 12;
/** Quanto pesa acertar o próprio lado, perto de quanto vale acertar o outro. */
const FRIENDLY_FIRE = 1.5;
/** Dano que PODE vir no turno dos outros vale menos que dano certo agora. */
const THREAT_DISCOUNT = 0.5;
/** Quanto custa cada quadrado de caminhada que ainda separa de um inimigo, enquanto não há em quem bater. */
const APPROACH_VALUE = 2;
/** Quanto vale, por turno, cada ponto de atributo que uma condição dá ou tira. */
const ATTRIBUTE_POINT_VALUE = 0.5;
/** Quanto vale garantir um crítico. */
const GUARANTEED_CRIT_VALUE = 4;
/** Quanto vale cada quadrado de empurrão. Quase nada: só desempata. */
const PUSH_VALUE = 0.25;
/** Quanto vale pôr sob os pés de alguém uma superfície que atrapalha o passo. */
const SLOW_VALUE = 1;
/** Desempate: entre jogadas iguais, a que anda menos. */
const STEP_COST = 0.01;
/** Abaixo disto uma habilidade não vale o gesto. */
const MIN_VALUE = 0.01;
/** Abaixo disto um item não vale ser gasto: ele não volta. */
const MIN_ITEM_VALUE = 3;
/** Uma cura de item só sai se pelo menos esta fração dela for aproveitada. */
const MIN_HEAL_USE = 0.8;

/** Uma habilidade mirada num ponto, com a nota que isso recebeu. */
export interface AiChoice {
  ability: Ability;
  target: Pos;
  value: number;
}

/** Um item da mochila, com a nota que usá-lo recebeu. */
export interface AiItemChoice {
  item: ConsumableItem;
  value: number;
}

/** O turno que a IA escolheu: onde parar e o que fazer de lá. */
export interface AiPlan {
  /** Onde terminar o movimento — o próprio quadrado, se o melhor é não andar. */
  tile: Pos;
  action?: AiChoice;
  /** A habilidade da ação bônus. Nunca vem junto com `item`: os dois gastam a mesma ação bônus. */
  bonus?: AiChoice;
  item?: AiItemChoice;
  score: number;
}

/**
 * O próximo comando de quem está no turno. Chame de novo depois de cada
 * comando aplicado: o plano é refeito sobre o que de fato aconteceu (o golpe
 * errou, o alvo caiu), até a IA devolver `endTurn`.
 */
export function chooseCommand(encounter: Encounter): Command {
  const unit = activeUnit(encounter);
  if (!unit) throw new Error("A luta acabou: não há quem comandar.");
  const plan = planTurn(encounter);

  if (!samePos(plan.tile, unit.pos)) return { type: "move", unitId: unit.id, to: plan.tile };
  // O item vem antes do golpe: um Foco bebido depois do ataque não serve pra nada.
  if (plan.item) return { type: "useItem", unitId: unit.id, itemId: plan.item.item.id };

  const choice = [plan.action, plan.bonus]
    .filter((candidate) => candidate !== undefined)
    .sort((a, b) => b.value - a.value)[0];
  if (choice) return { type: "ability", unitId: unit.id, abilityId: choice.ability.id, target: choice.target };

  return { type: "endTurn", unitId: unit.id };
}

/**
 * O que `unitId` faria se a vez dele começasse AGORA: o plano da IA pra ele,
 * numa cópia da luta em que é ele quem age, com o turno inteiro pra gastar.
 * Não muda `encounter` nem rola dado. É uma intenção: até a vez dele chegar,
 * a luta muda e o plano pode mudar junto.
 */
export function foresee(encounter: Encounter, unitId: string): AiPlan {
  const sim = structuredClone(encounter);
  const unit = sim.units.find((candidate) => candidate.id === unitId);
  const turnIndex = sim.order.indexOf(unitId);
  if (!unit || turnIndex < 0 || !isAlive(unit)) throw new Error(`"${unitId}" não está de pé nesta luta.`);

  sim.turnIndex = turnIndex;
  unit.turn = { movement: unit.speed, action: true, bonus: true, reaction: unit.turn.reaction };
  return planTurn(sim);
}

/** A jogada de maior nota pra quem está no turno. Não muda `encounter`. */
export function planTurn(encounter: Encounter): AiPlan {
  const actor = activeUnit(encounter);
  if (!actor) throw new Error("A luta acabou: não há quem comandar.");

  // Uma cópia rasa onde dá pra mudar quem age de lugar e perguntar "e daqui?".
  const sim: Encounter = { ...encounter, units: encounter.units.map((unit) => ({ ...unit, pos: { ...unit.pos } })) };
  const me = sim.units.find((unit) => unit.id === actor.id)!;
  const profile: AiProfile = { ...DEFAULT_AI_PROFILE, ...me.ai };
  // Ferido, o mesmo golpe assusta mais: a cautela chega ao dobro perto da morte.
  profile.caution *= 2 - me.currentHp / me.maxHp;

  const foes = sim.units.filter((unit) => unit.team !== me.team && isAlive(unit));
  const toFoe = walkingDistances(sim, foes.map((foe) => foe.pos));
  const origin = { ...actor.pos };

  const stops = [{ pos: origin, cost: 0, hazard: 0 }, ...reachableTiles(encounter, actor)];
  let best: AiPlan | undefined;

  for (const stop of stops) {
    me.pos = { ...stop.pos };

    let action: AiChoice | undefined;
    let bonus: AiChoice | undefined;
    let canStrike = false;
    for (const ability of me.abilities) {
      const offensive = isOffensive(ability);
      for (const target of aimPoints(sim, me, ability, foes)) {
        if (offensive && affectedUnits(sim, ability, target).some((unit) => unit.team !== me.team)) canStrike = true;

        const value = abilityValue(sim, me, profile, ability, target);
        if (value < MIN_VALUE) continue;
        if (ability.cost === "action") {
          if (me.turn.action && value > (action?.value ?? 0)) action = { ability, target, value };
        } else if (me.turn.bonus && value > (bonus?.value ?? 0)) {
          bonus = { ability, target, value };
        }
      }
    }

    const exposure = threatAt(sim, me, false);
    let item: AiItemChoice | undefined;
    if (me.turn.bonus) {
      const fight = { engaged: canStrike || exposure > 0, striking: canStrike && action !== undefined };
      item = bestItem(me, profile, fight);
      if (item && item.value > (bonus?.value ?? 0)) bonus = undefined;
      else item = undefined;
    }

    let score = (action?.value ?? 0) + (bonus?.value ?? item?.value ?? 0) - STEP_COST * stop.cost;
    if (action && bonus) score -= overkill(sim, me, profile, action, bonus);
    score -= profile.caution * THREAT_DISCOUNT * exposure;
    score -= profile.caution * opportunityDamage(sim, me, origin, me.pos);
    // Dano certo, na mesma moeda do que se causa: o do caminho, e o de amanhecer o próximo turno ali.
    score -= stop.hazard + Math.min(surfaceHarm(sim, me.pos), me.currentHp);

    const gap = toFoe[tileIndex(sim.grid, me.pos)];
    if (!canStrike && Number.isFinite(gap)) score -= profile.aggression * APPROACH_VALUE * gap;

    if (!best || score > best.score) best = { tile: { ...stop.pos }, action, bonus, item, score };
  }
  return best!;
}

// --- Quanto vale uma habilidade ---------------------------------------------

function isOffensive(ability: Ability): boolean {
  return ability.targets !== "self" && ability.targets !== "ally" && ability.effects.some((e) => e.kind === "damage");
}

/**
 * Onde vale a pena mirar `ability` de onde `unit` está. Igual a
 * `abilityTargets`, menos numa área: lá só interessam os pontos que pegam
 * algum inimigo, não a grade inteira.
 */
function aimPoints(encounter: Encounter, unit: Unit, ability: Ability, foes: Unit[]): Pos[] {
  if (ability.targets !== "tile") return abilityTargets(encounter, unit, ability);

  const radius = ability.radius ?? 0;
  const seen = new Set<number>();
  const points: Pos[] = [];
  for (const foe of foes) {
    for (let y = foe.pos.y - radius; y <= foe.pos.y + radius; y++) {
      for (let x = foe.pos.x - radius; x <= foe.pos.x + radius; x++) {
        const pos = { x, y };
        if (!canAimAt(encounter, unit, ability, pos)) continue;
        const index = tileIndex(encounter.grid, pos);
        if (!seen.has(index)) points.push(pos);
        seen.add(index);
      }
    }
  }
  return points;
}

/** A nota de usar `ability` de `actor` mirando `target`: o que rende em média, pesado pelo perfil. */
function abilityValue(encounter: Encounter, actor: Unit, profile: AiProfile, ability: Ability, target: Pos): number {
  let value = 0;

  for (const victim of affectedUnits(encounter, ability, target)) {
    const ally = victim.team === actor.team;
    const outlook = forecast(encounter, actor, ability, victim, isGuarding(victim), target);
    // O que é bom pro alvo: bom se ele é do nosso lado, ruim se não é.
    let favor = 0;

    for (const effect of ability.effects) {
      switch (effect.kind) {
        case "damage":
          break; // já está em `outlook`, somado abaixo
        case "heal": {
          const missing = victim.maxHp - victim.currentHp;
          const amount = Math.min(missing, attributeOf(actor, effect.attribute) + meanRoll(effect.dice));
          // Curar quem está por um fio vale o dobro de curar um arranhão.
          favor += outlook.lands * amount * (1 + missing / victim.maxHp);
          break;
        }
        case "status":
          favor += outlook.lands * statusFavor(encounter, victim, effect.statusId, effect.turns, profile);
          break;
        case "push":
          favor -= outlook.lands * PUSH_VALUE * Math.abs(effect.distance);
          break;
      }
    }

    const harm = Math.min(outlook.damage, victim.currentHp);
    if (ally) {
      value += profile.support * favor - FRIENDLY_FIRE * (harm + KILL_VALUE * outlook.kill);
    } else {
      value += profile.aggression * (harm - favor) + profile.finisher * KILL_VALUE * outlook.kill;
    }
  }
  if (ability.surface) {
    value += spreadValue(encounter, actor, profile, SURFACES[ability.surface.id], surfaceTiles(encounter, ability, target));
  }
  return value + propValue(encounter, actor, profile, ability, target);
}

/**
 * O que rende quebrar os destrutíveis que o golpe pega. Só conta o que eles
 * derramam, e só quando o golpe deve bastar pra quebrá-los: é o barril ao
 * lado do inimigo. Caixote não vale o golpe.
 */
function propValue(encounter: Encounter, actor: Unit, profile: AiProfile, ability: Ability, target: Pos): number {
  let value = 0;
  for (const prop of affectedProps(encounter, ability, target)) {
    const { spill }: PropTemplate = PROPS[prop.kind];
    if (!spill) continue;

    let damage = 0;
    for (const effect of ability.effects) {
      if (effect.kind !== "damage") continue;
      damage += (attributeOf(actor, effect.attribute) + meanRoll(effect.dice)) * (effect.multiplier ?? 1);
      if (effect.bonus) damage += Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor);
    }
    if (damage < prop.hp) continue;

    value += spreadValue(encounter, actor, profile, SURFACES[spill.surface], spreadTiles(encounter.grid, prop.pos, spill.radius));
  }
  return value;
}

/**
 * O que rende pôr a superfície `template` em `tiles`: o dano que quem está
 * em cima vai levar ao começar o turno, e o passo que ela atrapalha. Sobre
 * quem já está numa superfície igual, nada — seria só renovar.
 */
function spreadValue(
  encounter: Encounter,
  actor: Unit,
  profile: AiProfile,
  template: SurfaceTemplate,
  tiles: Pos[],
): number {
  const mean = template.damage ? meanRoll(template.damage) : 0;

  let value = 0;
  for (const pos of tiles) {
    const occupant = unitAt(encounter, pos);
    if (!occupant) continue;
    if (encounter.surfaces.some((surface) => surface.id === template.id && samePos(surface.pos, pos))) continue;

    const worth = Math.min(mean, occupant.currentHp) + (template.moveCost ? SLOW_VALUE : 0);
    value += occupant.team === actor.team ? -FRIENDLY_FIRE * worth : profile.aggression * worth;
  }
  return value;
}

/**
 * O que sobra na soma de dois golpes no mesmo alvo: não dá pra tirar mais
 * vida do que ele tem, nem derrubá-lo duas vezes.
 */
function overkill(encounter: Encounter, actor: Unit, profile: AiProfile, first: AiChoice, second: AiChoice): number {
  const alsoHit = affectedUnits(encounter, second.ability, second.target);
  let excess = 0;

  for (const victim of affectedUnits(encounter, first.ability, first.target)) {
    if (victim.team === actor.team || !alsoHit.includes(victim)) continue;

    const guarded = isGuarding(victim);
    const a = forecast(encounter, actor, first.ability, victim, guarded, first.target);
    const b = forecast(encounter, actor, second.ability, victim, guarded, second.target);
    const harm = Math.min(a.damage, victim.currentHp) + Math.min(b.damage, victim.currentHp);
    excess += profile.aggression * Math.max(0, harm - victim.currentHp);
    excess += profile.finisher * KILL_VALUE * a.kill * b.kill;
  }
  return excess;
}

/** Quanto uma condição ajuda quem a recebe (negativo = atrapalha). */
function statusFavor(
  encounter: Encounter,
  victim: Unit,
  statusId: StatusId,
  turns: number,
  profile: AiProfile,
): number {
  // Reaplicar só renova a duração: quase nunca vale o gesto.
  if (victim.statuses.some((status) => status.id === statusId)) return 0;

  const status: StatusTemplate = STATUSES[statusId];

  let favor = 0;
  if (status.guard) {
    // A guarda vale o dano que ela deve segurar — nada, se ninguém alcança.
    const spared = threatAt(encounter, victim, false) - threatAt(encounter, victim, true);
    favor += profile.caution * THREAT_DISCOUNT * spared;
  }
  if (status.guaranteedCrit) favor += GUARANTEED_CRIT_VALUE;
  for (const points of Object.values(status.attributeBonus ?? {})) favor += ATTRIBUTE_POINT_VALUE * points * turns;
  return favor;
}

// --- Quanto vale um item ----------------------------------------------------

/** Em que pé está a luta pra quem pensa em gastar um item. */
interface FightState {
  /** Já tem inimigo ao alcance, dele ou meu: reforço bebido antes disso passa andando. */
  engaged: boolean;
  /** Vai atacar neste turno, deste quadrado. */
  striking: boolean;
}

/** O item da mochila que mais vale usar agora, se algum vale. */
function bestItem(unit: Unit, profile: AiProfile, fight: FightState): AiItemChoice | undefined {
  let best: AiItemChoice | undefined;
  for (const slot of unit.inventory?.slots ?? []) {
    if (slot.quantity <= 0) continue;
    const value = itemValue(unit, profile, slot.item, fight);
    if (value >= MIN_ITEM_VALUE && value > (best?.value ?? 0)) best = { item: slot.item, value };
  }
  return best;
}

/** A nota de `unit` usar `item` em si mesmo (ver useItem em ./engine.ts). */
function itemValue(unit: Unit, profile: AiProfile, item: ConsumableItem, fight: FightState): number {
  const { effect } = item.data;
  const missing = unit.maxHp - unit.currentHp;
  const healWorth = (amount: number) => Math.min(missing, amount) * (1 + missing / unit.maxHp);

  switch (effect.kind) {
    case "heal_hp":
      return missing >= effect.amount * MIN_HEAL_USE ? profile.support * healWorth(effect.amount) : 0;
    case "cure_status": {
      // Vale pelo que tira do corpo: cada ponto de atributo que as condições ruins ainda iam custar.
      let burden = 0;
      for (const status of unit.statuses) {
        for (const points of Object.values(status.attributeBonus ?? {})) {
          if (points < 0) burden -= ATTRIBUTE_POINT_VALUE * points * status.turnsLeft;
        }
      }
      return burden > 0 ? profile.support * (burden + healWorth(5)) : 0;
    }
    case "buff_stat": {
      if (!fight.engaged || !reliesOn(unit, effect.stat)) return 0;
      if (unit.statuses.some((status) => status.id === `buff_${effect.stat}`)) return 0;
      return profile.support * ATTRIBUTE_POINT_VALUE * effect.bonus * effect.durationTurns;
    }
    case "focus_charge":
      if (!fight.striking || unit.statuses.some((status) => status.guaranteedCrit)) return 0;
      return profile.aggression * GUARANTEED_CRIT_VALUE;
  }
}

/** Se `stat` muda alguma coisa na luta de `unit`: é com o que ele ataca, se defende ou soma num efeito. */
function reliesOn(unit: Unit, stat: keyof Attributes): boolean {
  if (stat === "or" || stat === primaryAttribute(unit)) return true;
  return unit.abilities.some((ability) =>
    ability.effects.some(
      (effect) =>
        ((effect.kind === "damage" || effect.kind === "heal") && effect.attribute === stat) ||
        (effect.kind === "damage" && effect.bonus?.attribute === stat),
    ),
  );
}

// --- Médias: o que um golpe deve fazer ---------------------------------------

interface Forecast {
  /** Dano médio, já contando a chance de errar. */
  damage: number;
  /** Chance de o golpe derrubar o alvo. */
  kill: number;
  /** Chance de o golpe pegar (1 pra quem não rola ataque). */
  lands: number;
}

function isGuarding(unit: Unit): boolean {
  return unit.statuses.some((status) => status.guard);
}

function meanRoll(dice: { count: number; sides: number }): number {
  return (dice.count * (dice.sides + 1)) / 2;
}

function attributeOf(actor: Unit, ref: AttributeRef | undefined): number {
  return ref === undefined ? 0 : effectiveAttribute(actor, ref === "primary" ? primaryAttribute(actor) : ref);
}

/**
 * O que `ability` de `actor` deve fazer a `target`, em média, de onde cada
 * um está em `encounter`. A chance de acerto vem de attackOdds (./attack.ts);
 * a conta de dano espelha o efeito "damage" de ./engine.ts — se a regra de
 * lá mudar, esta muda junto.
 */
function forecast(
  encounter: Encounter,
  actor: Unit,
  ability: Ability,
  target: Unit,
  guarded: boolean,
  aim?: Pos,
): Forecast {
  const { hit, crit } = attackOdds(encounter, actor, ability, target, aim);

  const targetOr = effectiveAttribute(target, "or");
  const damageOn = (critical: boolean) => {
    // Quem não tem vida pra perder não sofre dano nenhum.
    if (target.invulnerable) return 0;
    let total = 0;
    for (const effect of ability.effects) {
      if (effect.kind !== "damage") continue;
      let amount = (attributeOf(actor, effect.attribute) + meanRoll(effect.dice)) * (effect.multiplier ?? 1);
      if (effect.bonus) amount += Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor);
      if (critical) amount *= 2;
      amount = Math.max(1, amount - Math.floor(targetOr / 2));
      if (guarded) amount -= Math.min(amount, targetOr + 3.5);
      total += amount;
    }
    return total;
  };

  const normal = damageOn(false);
  const critical = damageOn(true);
  return {
    damage: hit * normal + crit * critical,
    kill: (normal >= target.currentHp ? hit : 0) + (critical >= target.currentHp ? crit : 0),
    lands: hit + crit,
  };
}

// --- Quanto custa uma posição -----------------------------------------------

/**
 * O dano médio a que `victim` fica exposto onde está: o melhor golpe de cada
 * inimigo que já o alcança DE ONDE ESTÁ. Quem ainda precisa andar não conta
 * — é o que deixa sair da linha de tiro (ou pra trás de uma pedra) valer
 * alguma coisa.
 */
function threatAt(encounter: Encounter, victim: Unit, guarded: boolean): number {
  const { pos } = victim;
  let total = 0;
  for (const foe of encounter.units) {
    if (foe.team === victim.team || !isAlive(foe)) continue;

    let worst = 0;
    for (const ability of foe.abilities) {
      if (!isOffensive(ability)) continue;
      if (distance(foe.pos, pos) > ability.range + (ability.radius ?? 0)) continue;
      if (!hasLineOfSight(encounter.grid, foe.pos, pos)) continue;
      worst = Math.max(worst, forecast(encounter, foe, ability, victim, guarded).damage);
    }
    total += Math.min(worst, victim.currentHp);
  }
  return total;
}

/** O dano médio dos ataques de oportunidade que `mover` leva indo de `from` a `to` (ver move em ./engine.ts). */
function opportunityDamage(encounter: Encounter, mover: Unit, from: Pos, to: Pos): number {
  // O golpe pega quem sai ainda no lugar de onde saiu: é de lá que flanco e altura contam.
  const stop = mover.pos;
  mover.pos = from;
  let total = 0;
  for (const foe of encounter.units) {
    if (foe.team === mover.team || !isAlive(foe) || !foe.turn.reaction) continue;

    const ability = foe.abilities.find((candidate) => candidate.opportunity);
    if (!ability) continue;
    if (distance(foe.pos, from) <= ability.range && distance(foe.pos, to) > ability.range) {
      total += forecast(encounter, foe, ability, mover, isGuarding(mover)).damage;
    }
  }
  mover.pos = stop;
  return total;
}

/**
 * Quantos pontos de movimento separam cada quadrado do mais próximo de
 * `sources`, andando pelo terreno (Infinity onde não se chega). Ignora quem
 * está no caminho: serve pra saber pra que lado ir, não pra contar passos.
 */
function walkingDistances(encounter: Encounter, sources: Pos[]): number[] {
  const { grid } = encounter;
  const distances = new Array<number>(grid.tiles.length).fill(Infinity);
  const queue: number[] = [];
  for (const source of sources) {
    distances[tileIndex(grid, source)] = 0;
    queue.push(tileIndex(grid, source));
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const next of stepNeighbors(grid, posOfIndex(grid, current))) {
      const index = tileIndex(grid, next);
      const cost = distances[current] + enterCost(encounter, next);
      if (cost >= distances[index]) continue;
      distances[index] = cost;
      queue.push(index);
    }
  }
  return distances;
}

// --- Linha de base ----------------------------------------------------------

/**
 * A IA mais burra que ainda luta: bate em quem alcança, senão anda em linha
 * reta pro inimigo mais próximo, senão passa a vez. Foi a IA provisória do
 * jogo; fica como linha de base — pros testes do motor, que só precisam de
 * uma luta que ande, e pra medir quanto a IA de verdade joga melhor.
 */
export function basicCommand(encounter: Encounter): Command {
  const unit = activeUnit(encounter);
  if (!unit) throw new Error("A luta acabou: não há quem comandar.");
  const enemies = encounter.units.filter((other) => other.team !== unit.team && isAlive(other));

  for (const ability of unit.abilities) {
    if (ability.targets === "self" || ability.targets === "ally") continue;
    if (!(ability.cost === "action" ? unit.turn.action : unit.turn.bonus)) continue;

    const target = abilityTargets(encounter, unit, ability).find((pos) =>
      enemies.some((enemy) => samePos(enemy.pos, pos)),
    );
    if (target) return { type: "ability", unitId: unit.id, abilityId: ability.id, target };
  }

  // Um movimento por turno: sem isto, quem não alcança ninguém ficaria andando em passos de um.
  if (unit.turn.movement === unit.speed) {
    const gap = (pos: Pos) => Math.min(...enemies.map((enemy) => distance(enemy.pos, pos)));
    let best: Pos | undefined;
    for (const tile of reachableTiles(encounter, unit)) {
      if (gap(tile.pos) < gap(best ?? unit.pos)) best = tile.pos;
    }
    if (best) return { type: "move", unitId: unit.id, to: best };
  }

  return { type: "endTurn", unitId: unit.id };
}
