import { distance, hasLineOfSight, posOfIndex, samePos, stepNeighbors, tileAt, tileIndex, type Pos } from "./grid";
import { attackOdds } from "./attack";
import { healCap, healToll } from "../breath";
import { FALL_PER_STEP, forcedPath, reachableTiles } from "./movement";
import { PROPS, propTemplate, type Prop, type PropTemplate } from "./props";
import { SLAM_PER_TILE, cueEnding } from "./engine";
import { STATUSES, isHarmful, type StatusId, type StatusTemplate } from "./statuses";
import { counters, punishFactor, styleReduction, waveBonus } from "./styles";
import { SURFACES, enterCost, spreadTiles, surfaceHarm, surfaceTiles, type SurfaceTemplate } from "./surfaces";
import { abilityTargets, affectedProps, affectedUnits, canAimAt, interactTargets, isBlow, isThrown, itemTargets, liftable, vowAllows, vowForbids } from "./targeting";
import type { Attributes } from "../types/attributes";
import type { ConsumableItem } from "../types/inventory";
import type { Ability, AiProfile, AttributeRef, Command, Encounter, Unit } from "./types";
import { activeUnit, damageTakenOf, resistOf, effectiveAttribute, isAlive, movementOf, primaryAttribute, readiness, unitAt } from "./units";

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
 * que `readiness`, `abilityTargets` e `reachableTiles` oferecem — o que o
 * motor aceita. Fôlego ela gasta sem poupar (criatura só luta uma vez) e
 * dá valor a recuperar.
 *
 * O Contragolpe da Ipojy (ver ./styles.ts) só o grupo do jogador pesa: o
 * companheiro que joga sozinho conta o golpe que volta se ele errar. O outro
 * lado bate em quem é da Espera como em qualquer um, e é isso que a Espera
 * pune. Pesando dos dois lados, duas IAs diante de um da Ipojy em guarda
 * ficavam se guardando pra sempre.
 *
 * O empurrão vale pelo que bate: o alvo jogado contra parede, corpo ou barril
 * (ver push em ./engine.ts). A Disparada vale o caminho que encurta, quando
 * não há em quem bater; o Ajudar, o golpe a mais que o aliado acerta.
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
/** Quanto vale, por turno, cada ponto que uma condição soma ou tira da rolagem de ataque de alguém. */
const TO_HIT_VALUE = 0.75;
/** Quantos golpes por turno se espera que aproveitem uma condição que faz o alvo sofrer mais. */
const VULNERABLE_HITS = 0.75;
/** Por até quantos turnos conta o dano que uma condição de proteção poupa: mais longe que isso a luta já é outra. */
const PROTECTION_TURNS = 2;
/** Quanto vale, por turno, impedir que alguém se cure. */
const NO_HEAL_VALUE = 0.5;
/** Quanto vale derrubar a guarda de quem estava em guarda. */
const BROKEN_GUARD_VALUE = 3;
/** Quanto vale garantir um crítico. */
const GUARANTEED_CRIT_VALUE = 4;
/** Quanto vale cada ponto de Fôlego recuperado: é o que paga o próximo golpe pesado. */
const BREATH_VALUE = 1.5;
/** Quanto vale cada quadrado de empurrão. Quase nada: só desempata. */
const PUSH_VALUE = 0.25;
/** Quanto vale pôr sob os pés de alguém uma superfície que atrapalha o passo. */
const SLOW_VALUE = 1;
/** Quanto vale tirar do corpo uma condição que atrapalha sem mexer em atributo (um passo preso, um golpe abafado). */
const HARMFUL_STATUS_VALUE = 2;
/** Quanto vale mexer no objeto que dá a vitória (o guincho da corrente): mais que qualquer golpe. */
const OBJECTIVE_VALUE = 40;
/** Que parte do golpe de quem vigia se espera que saia: o inimigo pode não vir. */
const WATCH_SHARE = 0.5;
/** Quanto vale cada quadrado que um círculo gravado tira o bicho de rio da água. */
const CIRCLE_PULL_VALUE = 4;
/** Quanto cada ponto de acerto muda a chance de um golpe pegar, no d20. */
const TO_HIT_CHANCE = 0.05;
/** Desempate: entre jogadas iguais, a que anda menos. */
const STEP_COST = 0.01;
/** Abaixo disto uma habilidade não vale o gesto. */
const MIN_VALUE = 0.01;
/** Abaixo disto um item não vale ser gasto: ele não volta. */
const MIN_ITEM_VALUE = 3;
/** O que vale a chama que o pote jogado deixa no quadrado de quem apanhou (ele sai dela ou queima). */
const THROWN_FIRE_VALUE = 2;
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
  /** Em quem: um aliado ao alcance do braço (ver itemTargets). Sem isto, em si. */
  target?: Pos;
}

/** O turno que a IA escolheu: onde parar e o que fazer de lá. */
export interface AiPlan {
  /** Onde terminar o movimento — o próprio quadrado, se o melhor é não andar. */
  tile: Pos;
  action?: AiChoice;
  /** A habilidade da ação bônus. Nunca vem junto com `item`: os dois gastam a mesma ação bônus. */
  bonus?: AiChoice;
  item?: AiItemChoice;
  /** O objeto em que mexer com a ação (ver interactTargets). Nunca vem junto com `action`: os dois gastam a ação. */
  use?: { target: Pos; value: number };
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
  // Companheiro por conta própria: aliado caído ao lado vem antes de tudo. O outro lado não se levanta.
  const fallen = unit.team === "party" && unit.turn.action ? liftable(encounter, unit)[0] : undefined;
  if (fallen) return { type: "lift", unitId: unit.id, targetId: fallen.id };
  const plan = planTurn(encounter);

  if (!samePos(plan.tile, unit.pos)) return { type: "move", unitId: unit.id, to: plan.tile };
  // O item vem antes do golpe: um Foco bebido depois do ataque não serve pra nada.
  if (plan.item) {
    const { item, target } = plan.item;
    return { type: "useItem", unitId: unit.id, itemId: item.id, ...(target ? { target } : {}) };
  }

  // O guincho vem antes do golpe bônus: soltá-lo pode acabar a luta.
  if (plan.use) return { type: "interact", unitId: unit.id, target: plan.use.target };
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
  delete sim.interlude;
  unit.turn = { movement: movementOf(unit), action: true, bonus: true, reaction: unit.turn.reaction };
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
  // Quem vem atrás de uma presa (quem gastou mana demais de uma vez, ver `drawnToMana`) só vê ela; e quem
  // recebeu ordem de mirar um inimigo só, enquanto ele estiver de pé.
  const marked = me.order?.kind === "focus" ? (me.order as { unit: string }).unit : undefined;
  const prey = foes.find((unit) => unit.id === me.prey) ?? foes.find((unit) => unit.id === marked);
  // O que a luta espera que se mexa pra acabar (o guincho): o grupo vai até lá, e não até o inimigo.
  const goals = prey || me.order ? [] : objectives(sim, me);
  const toFoe = walkingDistances(sim, goals.length > 0 ? goals.map((prop) => prop.pos) : (prey ? [prey] : foes).map((foe) => foe.pos));
  const origin = { ...actor.pos };

  // A ordem do jogador (ver AiOrder): segurar não sai do quadrado; proteger fica colado em quem protege, ou vai até ele.
  const ward = me.order?.kind === "guard" ? sim.units.find((unit) => unit.id === (me.order as { unit: string }).unit && isAlive(unit)) : undefined;
  let stops = [{ pos: origin, cost: 0, hazard: 0 }, ...reachableTiles(encounter, actor)];
  if (me.order?.kind === "hold") stops = stops.slice(0, 1);
  const toWard = ward ? walkingDistances(sim, [ward.pos]) : undefined;
  if (ward) {
    const beside = stops.filter((stop) => distance(stop.pos, ward.pos) <= 1);
    if (beside.length > 0) stops = beside;
  }
  let best: AiPlan | undefined;

  // As manias (ver AiQuirks): quem só revida, e quem repete o tipo da última ação de alguém.
  const provoked = (unit: Unit) => (unit.habit?.attackTurns ?? 0) >= (me.quirks?.retaliates ?? 0);
  const copied = stanceOf(sim.units.find((unit) => unit.id === me.quirks?.mirrors)?.habit?.last);
  // O que falta Fôlego pra fazer, ou está em recarga, não entra na conta (a ação do turno se confere adiante).
  const usable = me.abilities.filter((ability) => readiness(me, ability, true) === "ready");
  const mirrors = copied !== undefined && usable.some((ability) => ability.cost === "action" && stanceOf(ability.id) === copied);
  // Se de algum quadrado deste turno dá pra bater em alguém: aí vigiar não vale (ver watchValue).
  const longest = Math.max(0, ...usable.filter(isOffensive).map((ability) => ability.range));
  const reachesFoe = stops.some((stop) => foes.some((foe) => distance(stop.pos, foe.pos) <= longest));

  for (const stop of stops) {
    me.pos = { ...stop.pos };

    let action: AiChoice | undefined;
    let bonus: AiChoice | undefined;
    let canStrike = false;
    for (const ability of usable) {
      if (mirrors && ability.cost === "action" && stanceOf(ability.id) !== copied) continue;
      const offensive = isOffensive(ability);
      for (const target of aimPoints(sim, me, ability, foes)) {
        const struck = offensive ? affectedUnits(sim, ability, target).filter((unit) => unit.team !== me.team) : [];
        // Quem só revida não levanta a mão pra quem ainda não o provocou o bastante.
        if (me.quirks?.retaliates && offensive && !struck.some(provoked)) continue;
        if (prey && offensive && !struck.includes(prey)) continue;
        if (struck.length > 0) canStrike = true;

        let value = abilityValue(sim, me, profile, ability, target);
        if (ability.effects.some((effect) => effect.kind === "stride")) value += strideValue(sim, me, profile, toWard ?? toFoe, ability);
        if (!reachesFoe && watches(ability)) value += profile.aggression * watchValue(sim, me);
        if (value < MIN_VALUE) continue;
        if (ability.cost === "action") {
          if (me.turn.action && value > (action?.value ?? 0)) action = { ability, target, value };
        } else if (me.turn.bonus && value > (bonus?.value ?? 0)) {
          bonus = { ability, target, value };
        }
      }
    }

    // Quem já se pôs em guarda neste turno está exposto a menos: sem isto, guardava e saía de perto.
    const exposure = threatAt(sim, me);
    let item: AiItemChoice | undefined;
    if (me.turn.bonus) {
      const fight = { engaged: canStrike || exposure > 0, striking: canStrike && action !== undefined };
      item = bestItem(sim, me, profile, fight);
      if (item && item.value > (bonus?.value ?? 0)) bonus = undefined;
      else item = undefined;
    }

    // Mexer num objeto disputa a ação com as habilidades.
    let use: { target: Pos; value: number } | undefined;
    if (me.turn.action) {
      for (const prop of interactTargets(sim, me)) {
        const value = useValue(sim, me, prop, goals);
        if (value >= MIN_VALUE && value > (use?.value ?? 0)) use = { target: { ...prop.pos }, value };
      }
      if (use && use.value > (action?.value ?? 0)) action = undefined;
      else use = undefined;
    }

    let score = (action?.value ?? use?.value ?? 0) + (bonus?.value ?? item?.value ?? 0) - STEP_COST * stop.cost;
    if (action && bonus) score -= overkill(sim, me, profile, action, bonus);
    score -= profile.caution * THREAT_DISCOUNT * exposure;
    score -= profile.caution * opportunityDamage(sim, me, origin, me.pos);
    // Dano certo, na mesma moeda do que se causa: o do caminho, e o de amanhecer o próximo turno ali.
    score -= stop.hazard + Math.min(surfaceHarm(sim, me.pos), me.currentHp);

    // Quem protege alguém se aproxima dele, não do inimigo.
    // Quem tem um objetivo vai até ele, alcance ou não alguém no caminho.
    const gap = (toWard ?? toFoe)[tileIndex(sim.grid, me.pos)];
    const drawn = toWard !== undefined || goals.length > 0;
    if ((drawn || !canStrike) && Number.isFinite(gap)) score -= (drawn ? APPROACH_VALUE : profile.aggression * APPROACH_VALUE) * gap;

    if (!best || score > best.score) best = { tile: { ...stop.pos }, action, bonus, item, use, score };
  }
  return best!;
}

/**
 * Os objetos que a luta espera que alguém mexa pra dar a vitória ao grupo (uma
 * deixa `used` que encerra em `win`), ainda por mexer: o guincho da corrente.
 * Só o grupo do jogador mexe em objeto.
 */
function objectives(encounter: Encounter, unit: Unit): Prop[] {
  if (unit.team !== "party") return [];
  const wanted = new Set(encounter.cues.flatMap((cue) => (cue.when.kind === "used" && cueEnding(cue) === "win" ? cue.when.props : [])));
  return encounter.props.filter((prop) => wanted.has(prop.id) && prop.hp > 0 && !prop.used);
}

/**
 * O que rende `unit` mexer em `prop`: o objetivo da luta vale a vitória; o
 * círculo gravado, o tanto que tira da água o bicho de rio que ele puxaria (o
 * espelho de interact em ./engine.ts). O resto, nada.
 */
function useValue(encounter: Encounter, unit: Unit, prop: Prop, goals: Prop[]): number {
  if (goals.includes(prop)) return OBJECTIVE_VALUE;
  const { pull } = propTemplate(prop);
  if (!pull) return 0;
  const [target] = encounter.units
    .filter((other) => other.team !== unit.team && isAlive(other) && distance(other.pos, prop.pos) <= pull.reach)
    .sort((a, b) => Number(b.river === true) - Number(a.river === true) || distance(a.pos, prop.pos) - distance(b.pos, prop.pos));
  if (!target?.river || tileAt(encounter.grid, target.pos)?.water !== true) return 0;
  return CIRCLE_PULL_VALUE * Math.max(0, Math.min(pull.distance - (target.heft ?? 0), distance(target.pos, prop.pos) - 1));
}

/** O tipo de uma habilidade de kit, tirado do id dela ("espadachim.defend" -> "defend"). */
function stanceOf(abilityId: string | undefined): string | undefined {
  return abilityId === undefined ? undefined : abilityId.slice(abilityId.lastIndexOf(".") + 1);
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
  if (vowForbids(encounter, unit) && isBlow(ability)) return [];

  const radius = ability.radius ?? 0;
  const seen = new Set<number>();
  const points: Pos[] = [];
  for (const foe of foes) {
    for (let y = foe.pos.y - radius; y <= foe.pos.y + radius; y++) {
      for (let x = foe.pos.x - radius; x <= foe.pos.x + radius; x++) {
        const pos = { x, y };
        if (!canAimAt(encounter, unit, ability, pos) || !vowAllows(encounter, unit, ability, pos)) continue;
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
    const outlook = forecast(encounter, actor, ability, victim, target);
    // O que é bom pro alvo: bom se ele é do nosso lado, ruim se não é.
    let favor = 0;
    // Tirar alguém do lugar só desempata entre golpes que já valem: sozinho não é motivo pra gastar o gesto.
    let shove = 0;
    // O que ele leva batendo no que barra o passo, empurrado.
    let slammed = 0;

    for (const effect of ability.effects) {
      switch (effect.kind) {
        case "damage":
          break; // já está em `outlook`, somado abaixo
        case "heal": {
          if (victim.statuses.some((status) => status.noHeal)) break;
          const missing = victim.maxHp - victim.currentHp;
          // A cura não vai além do que o corpo dele pode pagar, e o Fôlego que ele paga conta contra (ver healCap em ../breath.ts).
          const hungry = victim.statuses.some((status) => status.hunger);
          const amount = Math.min(missing, attributeOf(actor, effect.attribute) + meanRoll(effect.dice), healCap(victim.breath, hungry));
          // Curar quem está por um fio vale o dobro de curar um arranhão.
          favor += outlook.lands * (amount * (1 + missing / victim.maxHp) - BREATH_VALUE * healToll(amount, hungry));
          break;
        }
        case "status":
          favor += outlook.lands * statusFavor(encounter, victim, effect.statusId, effect.turns, profile);
          break;
        case "breath":
          // Devolver Fôlego ajuda quem o recebe; tirar (negativo) atrapalha, até o que ele tem.
          favor +=
            outlook.lands *
            BREATH_VALUE *
            (effect.amount < 0 ? -Math.min(-effect.amount, victim.breath) : Math.min(effect.amount, victim.maxBreath - victim.breath));
          break;
        case "push": {
          if (victim.statuses.some((status) => status.immovable)) break;
          shove += outlook.lands * PUSH_VALUE * Math.abs(effect.distance);
          // Jogado contra o que barra o passo, ele bate, e de cima do barranco, cai: é dano, e o barril em que bateu quebra (ver push em ./engine.ts).
          const crash = slamOf(encounter, actor.pos, victim, effect.distance);
          if (crash) {
            if (!victim.invulnerable) slammed += outlook.lands * crash.amount;
            if (crash.prop) value += outlook.lands * spillValue(encounter, actor, profile, crash.prop, crash.amount);
          }
          break;
        }
      }
    }

    const harm = Math.min(outlook.damage + slammed, victim.currentHp);
    if (harm > 0) favor -= shove;
    // O golpe que devolve vida a quem bate: vale como a cura que é, pelo que falta a ele.
    const leech = ability.effects.reduce((sum, effect) => sum + (effect.kind === "damage" ? (effect.leech ?? 0) : 0), 0);
    if (leech > 0 && !ally && !actor.statuses.some((status) => status.noHeal)) {
      const missing = actor.maxHp - actor.currentHp;
      value += profile.support * Math.min(missing, harm * leech) * (1 + missing / actor.maxHp);
    }
    if (ally) {
      value += profile.support * favor - FRIENDLY_FIRE * (harm + KILL_VALUE * outlook.kill);
    } else {
      value += profile.aggression * (harm - favor) + profile.finisher * KILL_VALUE * outlook.kill;
      // O companheiro conta o golpe que a Espera devolve se ele errar.
      if (actor.team === "party" && ability.attack) value -= profile.caution * (1 - outlook.lands) * counterDamage(encounter, victim, actor);
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
    if (!(PROPS[prop.kind] as PropTemplate).spill) continue;

    let damage = 0;
    for (const effect of ability.effects) {
      if (effect.kind !== "damage") continue;
      damage += (attributeOf(actor, effect.attribute) + meanRoll(effect.dice)) * (effect.multiplier ?? 1);
      if (effect.bonus) damage += Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor);
    }
    value += spillValue(encounter, actor, profile, prop, damage);
  }
  return value;
}

/** O que rende acertar `prop` com `damage`: o que ele derrama, se quebra. Nada, se aguenta. */
function spillValue(encounter: Encounter, actor: Unit, profile: AiProfile, prop: Prop, damage: number): number {
  const { spill }: PropTemplate = PROPS[prop.kind];
  if (!spill || damage < prop.hp) return 0;
  return spreadValue(encounter, actor, profile, SURFACES[spill.surface], spreadTiles(encounter.grid, prop.pos, spill.radius));
}

/**
 * O que o empurrão (ou puxão) de `pushDistance` vindo de `origin` faz `victim`
 * levar no corpo, e em que destrutível ele bate: o espelho de push em
 * ./engine.ts. Bater só no empurrão; cair de degrau, nos dois. Nada, se o
 * caminho é livre e plano.
 */
function slamOf(encounter: Encounter, origin: Pos, victim: Unit, pushDistance: number): { amount: number; prop?: Prop } | undefined {
  const path = forcedPath(encounter, origin, victim, pushDistance);
  if (!path) return undefined;
  const amount = path.fall * FALL_PER_STEP + (pushDistance > 0 && path.stop ? path.left * SLAM_PER_TILE : 0);
  if (amount <= 0) return undefined;
  const prop = pushDistance > 0 && path.stop ? encounter.props.find((candidate) => candidate.hp > 0 && samePos(candidate.pos, path.stop!)) : undefined;
  return { amount, ...(prop ? { prop } : {}) };
}

/** O golpe que `defender` devolve em `attacker` se for atacado e errar (o Contragolpe, ver counterStrike em ./engine.ts). */
function counterDamage(encounter: Encounter, defender: Unit, attacker: Unit): number {
  if (!counters(defender) || !defender.turn.reaction) return 0;
  const ability = defender.abilities.find((candidate) => candidate.opportunity && readiness(defender, candidate, true) === "ready");
  if (!ability || distance(defender.pos, attacker.pos) > ability.range) return 0;
  if (!hasLineOfSight(encounter.grid, defender.pos, attacker.pos)) return 0;
  return Math.min(forecast(encounter, defender, ability, attacker).damage, attacker.currentHp);
}

/**
 * O que rende a Disparada de onde `me` está: o caminho que ela encurta até
 * quem ele procura (`toGoal`, a distância andando). Parado por ordem, nada.
 */
function strideValue(encounter: Encounter, me: Unit, profile: AiProfile, toGoal: number[], stride: Ability): number {
  if (me.order?.kind === "hold") return 0;
  const gap = toGoal[tileIndex(encounter.grid, me.pos)];
  if (!Number.isFinite(gap)) return 0;
  // Basta chegar ao alcance do golpe mais longo dele.
  const reach = Math.max(1, ...me.abilities.filter((ability) => ability !== stride && isOffensive(ability)).map((ability) => ability.range));
  const closed = Math.min(movementOf(me), Math.max(0, gap - reach));
  return (me.order?.kind === "guard" ? 1 : profile.aggression) * APPROACH_VALUE * closed;
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

    const a = forecast(encounter, actor, first.ability, victim, first.target);
    const b = forecast(encounter, actor, second.ability, victim, second.target);
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
  if (status.guard || (status.evasion ?? 0) > 0 || (status.damageTaken ?? 0) < 0) {
    // O que protege (guarda, esquiva, golpe que chega mais leve) vale o dano que deve poupar — nada, se ninguém alcança.
    const shielded: Unit = { ...victim, statuses: [...victim.statuses, { ...status, attributeBonus: undefined, turnsLeft: turns }] };
    const spared = threatAt(encounter, victim) - threatAt(encounter, shielded);
    favor += profile.caution * THREAT_DISCOUNT * spared * Math.min(turns, PROTECTION_TURNS);
  }
  if (status.guaranteedCrit) favor += GUARANTEED_CRIT_VALUE;
  for (const points of Object.values(status.attributeBonus ?? {})) favor += ATTRIBUTE_POINT_VALUE * points * turns;
  // Acerto a mais só vale pra quem tem em quem bater logo; acerto a menos sempre atrapalha.
  if ((status.toHit ?? 0) < 0 || engagedSoon(encounter, victim)) favor += TO_HIT_VALUE * (status.toHit ?? 0) * turns;
  // O que atrapalha quem a recebe, na moeda de sempre: pontos de vida.
  if ((status.damageTaken ?? 0) > 0) favor -= VULNERABLE_HITS * status.damageTaken! * turns;
  if (status.harm) favor -= Math.min(meanRoll(status.harm) * turns, victim.currentHp);
  if (status.speed) favor += SLOW_VALUE * Math.sign(status.speed) * turns;
  if (status.noHeal) favor -= NO_HEAL_VALUE * turns;
  if (status.breaksGuard && isGuarding(victim)) favor -= BROKEN_GUARD_VALUE;
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

/**
 * O item que `unit` leva que mais vale usar agora, se algum vale: nele, ou num
 * aliado ao alcance do braço (ver itemTargets). No aliado, o reforço só vale se
 * ele já tem inimigo ao alcance, e o Foco nunca: quem o bebe é quem bate agora.
 */
function bestItem(encounter: Encounter, unit: Unit, profile: AiProfile, fight: FightState): AiItemChoice | undefined {
  const slots = (unit.inventory?.slots ?? []).filter((slot) => slot.quantity > 0);
  if (slots.length === 0) return undefined;

  let best: AiItemChoice | undefined;
  for (const pos of itemTargets(encounter, unit)) {
    const other = samePos(pos, unit.pos) ? undefined : unitAt(encounter, pos);
    const state = other ? { engaged: threatAt(encounter, other) > 0, striking: false } : fight;
    for (const slot of slots) {
      if (isThrown(slot.item)) continue;
      const value = itemValue(other ?? unit, profile, slot.item, state);
      if (value >= MIN_ITEM_VALUE && value > (best?.value ?? 0)) best = { item: slot.item, value, ...(other ? { target: { ...pos } } : {}) };
    }
  }
  // O que se joga vai no inimigo: vale o dano que entra, e a chama que fica, se ele não está na água.
  for (const slot of slots) {
    const { effect } = slot.item.data;
    if (effect.kind !== "throw") continue;
    for (const pos of itemTargets(encounter, unit, slot.item)) {
      const foe = unitAt(encounter, pos);
      if (!foe || foe.invulnerable) continue;
      const hit = Math.max(1, meanRoll(effect.dice) * resistOf(foe, effect.type) - styleReduction(foe));
      const burns = effect.surface && !tileAt(encounter.grid, pos)?.water ? THROWN_FIRE_VALUE : 0;
      const value = profile.aggression * (Math.min(hit, foe.currentHp) + burns);
      if (value >= MIN_ITEM_VALUE && value > (best?.value ?? 0)) best = { item: slot.item, value, target: { ...pos } };
    }
  }
  return best;
}

/** A nota de usar `item` em `unit` (ver useItem em ./engine.ts). */
function itemValue(unit: Unit, profile: AiProfile, item: ConsumableItem, fight: FightState): number {
  const { effect } = item.data;
  const missing = unit.maxHp - unit.currentHp;
  const healWorth = (amount: number) => Math.min(missing, amount) * (1 + missing / unit.maxHp);

  switch (effect.kind) {
    case "heal_hp":
      if (unit.statuses.some((status) => status.noHeal)) return 0;
      return missing >= effect.amount * MIN_HEAL_USE ? profile.support * healWorth(effect.amount) : 0;
    case "cure_status": {
      // Vale pelo que tira do corpo: cada ponto de atributo que as condições ruins ainda iam custar,
      // e um tanto fixo por condição que atrapalha de outro jeito.
      let burden = 0;
      for (const status of unit.statuses) {
        if (!isHarmful(status)) continue;
        let points = 0;
        for (const bonus of Object.values(status.attributeBonus ?? {})) points -= Math.min(0, bonus);
        burden += points > 0 ? ATTRIBUTE_POINT_VALUE * points * status.turnsLeft : HARMFUL_STATUS_VALUE;
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
    case "throw":
      // Em aliado, nunca: ver bestItem.
      return 0;
    case "none":
      return 0;
  }
}

/** Se `stat` muda alguma coisa na luta de `unit`: é com o que ele ataca, se defende ou soma num efeito. */
function reliesOn(unit: Unit, stat: keyof Attributes): boolean {
  if (stat === "couro" || stat === primaryAttribute(unit)) return true;
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
function forecast(encounter: Encounter, actor: Unit, ability: Ability, target: Unit, aim?: Pos): Forecast {
  const { hit, crit } = attackOdds(encounter, actor, ability, target, aim);

  const guarded = isGuarding(target);
  const targetOr = effectiveAttribute(target, "couro");
  const damageOn = (critical: boolean) => {
    // Quem não tem vida pra perder não sofre dano nenhum.
    if (target.invulnerable) return 0;
    let total = 0;
    for (const effect of ability.effects) {
      if (effect.kind !== "damage") continue;
      let amount = (attributeOf(actor, effect.attribute) + meanRoll(effect.dice)) * (effect.multiplier ?? 1);
      if (effect.bonus) amount += Math.floor(effectiveAttribute(actor, effect.bonus.attribute) / effect.bonus.divisor);
      // Na mesma ordem do motor: Onda, crítico, Rachadura, o que as condições do alvo somam, armadura (se o golpe não a fura), Muralha.
      amount += waveBonus(actor, ability, target);
      if (critical) amount *= 2;
      amount *= punishFactor(actor, target) * resistOf(target, effect.type);
      amount = Math.max(1, amount + damageTakenOf(target) - (effect.piercing ? 0 : Math.floor(targetOr / 2)));
      amount = Math.max(1, amount - styleReduction(target));
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

/** Se `ability` põe quem a usa de vigia (Vigiar). */
function watches(ability: Ability): boolean {
  return ability.effects.some((effect) => effect.kind === "status" && (STATUSES[effect.statusId] as StatusTemplate).watch === true);
}

/**
 * O que rende `watcher` ficar de vigia onde está: parte do golpe da arma dele
 * no inimigo que, pra bater nele, precisa entrar no alcance dessa arma — e que
 * chega a tempo. Só se pergunta quando ele não alcança ninguém neste turno:
 * podendo bater, bate.
 */
function watchValue(encounter: Encounter, watcher: Unit): number {
  const ability = watcher.abilities.find((candidate) => candidate.id === `${watcher.characterClass}.attack`);
  if (!ability || readiness(watcher, ability, true) !== "ready") return 0;
  let best = 0;
  for (const foe of encounter.units) {
    if (foe.team === watcher.team || !isAlive(foe)) continue;
    const gap = distance(foe.pos, watcher.pos);
    // Quem bate de mais longe que a arma dele não precisa entrar no alcance dela.
    const reach = Math.max(0, ...foe.abilities.filter(isOffensive).map((blow) => blow.range));
    if (gap <= ability.range || reach > ability.range || gap > movementOf(foe) + reach) continue;
    best = Math.max(best, Math.min(forecast(encounter, watcher, ability, foe).damage, foe.currentHp));
  }
  return WATCH_SHARE * best;
}

/** Se `unit` tem algum inimigo de pé ao alcance de um golpe dele, andando o passo inteiro. */
function engagedSoon(encounter: Encounter, unit: Unit): boolean {
  const reach = movementOf(unit) + Math.max(0, ...unit.abilities.filter(isOffensive).map((ability) => ability.range));
  return encounter.units.some((foe) => foe.team !== unit.team && isAlive(foe) && distance(foe.pos, unit.pos) <= reach);
}

// --- Quanto custa uma posição -----------------------------------------------

/**
 * O dano médio a que `victim` fica exposto onde está: o melhor golpe de cada
 * inimigo que já o alcança DE ONDE ESTÁ. Quem ainda precisa andar não conta
 * — é o que deixa sair da linha de tiro (ou pra trás de uma pedra) valer
 * alguma coisa. `victim` pode ser uma cópia com uma condição a mais: é como
 * se pergunta quanto uma guarda pouparia.
 */
function threatAt(encounter: Encounter, victim: Unit): number {
  const { pos } = victim;
  let total = 0;
  for (const foe of encounter.units) {
    // Quem é da Ipojy não bate antes de a luta abrir: até lá, não ameaça ninguém.
    if (foe.team === victim.team || !isAlive(foe) || vowForbids(encounter, foe)) continue;

    let worst = 0;
    for (const ability of foe.abilities) {
      if (!isOffensive(ability) || readiness(foe, ability, true) !== "ready") continue;
      if (distance(foe.pos, pos) > ability.range + (ability.radius ?? 0)) continue;
      if (!hasLineOfSight(encounter.grid, foe.pos, pos)) continue;
      worst = Math.max(worst, forecast(encounter, foe, ability, victim).damage);
    }
    total += Math.min(worst, victim.currentHp);
  }
  return total;
}

/**
 * O dano médio dos ataques de oportunidade que `mover` leva indo de `from` a
 * `to`, e dos golpes de quem está de vigia e o vê entrar no alcance (ver move
 * em ./engine.ts). Só olha as pontas do caminho.
 */
function opportunityDamage(encounter: Encounter, mover: Unit, from: Pos, to: Pos): number {
  // O golpe pega quem sai ainda no lugar de onde saiu: é de lá que flanco e altura contam.
  const stop = mover.pos;
  mover.pos = from;
  let total = 0;
  for (const foe of encounter.units) {
    if (foe.team === mover.team || !isAlive(foe) || !foe.turn.reaction || vowForbids(encounter, foe)) continue;

    const ability = foe.abilities.find((candidate) => candidate.opportunity && readiness(foe, candidate, true) === "ready");
    if (ability && distance(foe.pos, from) <= ability.range && distance(foe.pos, to) > ability.range) {
      total += forecast(encounter, foe, ability, mover).damage;
    }
    if (foe.statuses.some((status) => status.watch)) {
      const blow = foe.abilities.find((candidate) => candidate.id === `${foe.characterClass}.attack`);
      const sees = (pos: Pos) => blow !== undefined && distance(foe.pos, pos) <= blow.range && hasLineOfSight(encounter.grid, foe.pos, pos);
      if (blow && readiness(foe, blow, true) === "ready" && !sees(from) && sees(to)) {
        mover.pos = to;
        total += forecast(encounter, foe, blow, mover).damage;
        mover.pos = from;
      }
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
      const cost = distances[current] + enterCost(encounter, next, posOfIndex(grid, current));
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
    if (readiness(unit, ability) !== "ready") continue;

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
