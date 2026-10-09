import assert from "node:assert/strict";
import { test } from "node:test";
import {
  abilityTargets,
  activeUnit,
  applyCommand,
  attackEdge,
  attackTotals,
  findUnit,
  gridFromAscii,
  planTurn,
  startEncounter,
  styleLabel,
  styleMatchup,
  unitFromCharacter,
  usesLeft,
  STYLE_TO_HIT,
  type Encounter,
  type EncounterSetup,
  type Pos,
  type StyleId,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * Os estilos: o triângulo na rolagem de ataque, o traço de cada um no dano,
 * e o que veio junto — habilidade com limite e preço, condição que dura a
 * luta toda, e as manias da IA que leem o que os outros vêm fazendo.
 */

function stage(
  rows: string[],
  place: (at: (marker: string) => Pos) => Unit[],
  extra: Partial<EncounterSetup> = {},
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed: 11, ...extra });
}

const styled = (unit: Unit, style: StyleId, grade = 3): Unit => Object.assign(unit, { style, grade });
/** Aguenta qualquer coisa: as contas de dano não podem acabar com a luta. */
const TOUGH = { currentHp: 9000, maxHp: 9000 };
const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

/** O dano que `command` causa em `encounter`, e o que causaria se `change` fosse feito antes — com os MESMOS dados. */
function compare(encounter: Encounter, command: Parameters<typeof applyCommand>[1], change: (copy: Encounter) => void) {
  const copy = structuredClone(encounter);
  change(copy);
  const damage = (events: TacticalEvent[]) => eventsOf(events, "damage").reduce((sum, event) => sum + event.amount, 0);
  const real = run(encounter, command);
  return { events: real, damage: damage(real), other: damage(run(copy, command)) };
}

test("o triângulo: Viés vence Baluarte, Maré vence Viés, Baluarte e Maré são neutros, igual empata", () => {
  assert.equal(styleMatchup("vies", "baluarte"), 1);
  assert.equal(styleMatchup("baluarte", "vies"), -1);
  assert.equal(styleMatchup("mare", "vies"), 1);
  assert.equal(styleMatchup("vies", "mare"), -1);
  assert.equal(styleMatchup("mare", "baluarte"), 0);
  assert.equal(styleMatchup("baluarte", "mare"), 0);
  assert.equal(styleMatchup("mare", "mare"), 0);
  assert.equal(styleMatchup("mare", undefined), 0);
  assert.equal(styleLabel({ style: "mare", grade: 3 }), "Maré III");
  assert.equal(styleLabel({}), "");
});

test("a vantagem de estilo entra na rolagem de ataque, pros dois lados, e só entre inimigos", () => {
  const { encounter } = stage(["AE.B"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), "vies"),
    styled(makeUnit("E", "enemy", at("E"), TOUGH), "baluarte"),
    styled(makeUnit("B", "party", at("B")), "baluarte"),
  ]);
  const [lish, guard, ally] = encounter.units;
  const strike = lish.abilities.find((ability) => ability.id === "guardiao.attack")!;

  const edge = attackEdge(encounter, lish, strike, guard);
  assert.equal(edge.style, 1);
  assert.equal(edge.toHit, STYLE_TO_HIT);
  assert.equal(attackEdge(encounter, guard, strike, lish).toHit, -STYLE_TO_HIT);
  assert.equal(attackEdge(encounter, lish, strike, ally).style, 0);

  const [roll] = eventsOf(run(encounter, { type: "ability", unitId: "A", abilityId: strike.id, target: guard.pos }), "attackRoll");
  assert.equal(roll.style, 1);
  assert.equal(roll.total, roll.natural + attackTotals(lish, strike, guard, edge).bonus);
});

test("Onda: cada golpe seguido no mesmo alvo soma no dano do próximo; errar zera", () => {
  const { encounter } = stage(["AE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), "mare"),
    makeUnit("E", "enemy", at("E"), TOUGH),
  ]);
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;

  let streak = 0;
  let waves = 0;
  let resets = 0;
  for (let turn = 0; turn < 40; turn++) {
    const { events, damage, other } = compare(
      encounter,
      { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos },
      (copy) => delete findUnit(copy, "A")!.style,
    );
    const [roll] = eventsOf(events, "attackRoll");
    const wave = eventsOf(events, "styleTrait");
    if (roll.outcome === "hit" || roll.outcome === "crit") {
      // Quatro golpes seguidos é o teto: daí em diante soma o mesmo.
      const bonus = Math.min(streak, 4);
      assert.deepEqual(wave, streak > 0 ? [{ type: "styleTrait", unit: "A", target: "E", trait: "wave", name: "Onda", hits: streak }] : []);
      assert.equal(damage - other, bonus * (roll.outcome === "crit" ? 2 : 1));
      if (streak > 0) waves += 1;
      streak += 1;
      assert.deepEqual(hero.streak, { target: "E", hits: streak });
    } else {
      if (streak > 0) resets += 1;
      streak = 0;
      assert.equal(hero.streak, undefined);
    }
    pass(encounter);
    // O inimigo só passa a vez: quem conta é ela.
    pass(encounter);
  }
  assert.ok(waves > 0 && resets > 0, "a luta deveria ter tido onda e erro");
});

test("Onda: trocar de alvo recomeça a conta, e área não é insistência", () => {
  const { encounter } = stage(["FAE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }), "mare"),
    makeUnit("E", "enemy", at("E"), TOUGH),
    makeUnit("F", "enemy", at("F"), TOUGH),
  ]);
  const hero = findUnit(encounter, "A")!;
  hero.streak = { target: "E", hits: 3 };
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "F")!.pos });
  const [roll] = eventsOf(events, "attackRoll");
  assert.equal(eventsOf(events, "styleTrait").length, 0);
  assert.deepEqual(hero.streak, roll.outcome === "fumble" ? undefined : { target: "F", hits: 1 });
});

test("Rachadura: o dano dobra em quem acabou de repetir a ação do turno anterior", () => {
  const { encounter } = stage(["AE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }), "vies"),
    makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { or: 0 } }),
  ]);
  const enemy = findUnit(encounter, "E")!;
  enemy.habit = { last: "guardiao.attack", repeated: true, attackTurns: 2 };

  const { events, damage, other } = compare(
    encounter,
    { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos },
    (copy) => (findUnit(copy, "E")!.habit!.repeated = false),
  );
  const [roll] = eventsOf(events, "attackRoll");
  if (roll.outcome === "fumble") return;
  assert.deepEqual(eventsOf(events, "styleTrait"), [{ type: "styleTrait", unit: "A", target: "E", trait: "crack", name: "Rachadura" }]);
  assert.equal(damage, other * 2);
});

test("o motor anota o que cada um faz com a ação: repetir, variar e bater em seguida", () => {
  const { encounter } = stage(["A...E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const hero = findUnit(encounter, "A")!;
  const turn = (abilityId?: string) => {
    if (abilityId) run(encounter, { type: "ability", unitId: "A", abilityId, target: hero.pos });
    pass(encounter);
    pass(encounter);
  };

  turn("guardiao.defend");
  assert.deepEqual(hero.habit, { last: "guardiao.defend", repeated: false, attackTurns: 0 });
  turn("guardiao.defend");
  assert.equal(hero.habit!.repeated, true);
  // Um turno sem ação não repete nada, e quebra a sequência.
  turn();
  assert.deepEqual(hero.habit, { last: undefined, repeated: false, attackTurns: 0 });
  turn("guardiao.defend");
  assert.equal(hero.habit!.repeated, false);

  // Golpe atrás de golpe conta os turnos seguidos batendo; a guarda zera.
  run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  const strike = () => {
    run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "E")!.pos });
    pass(encounter);
    pass(encounter);
  };
  findUnit(encounter, "E")!.currentHp = findUnit(encounter, "E")!.maxHp = 9000;
  strike();
  strike();
  assert.equal(hero.habit!.attackTurns, 2);
  assert.equal(hero.habit!.repeated, true);
  turn("guardiao.defend");
  assert.equal(hero.habit!.attackTurns, 0);
});

test("Muralha: o Baluarte tira um tanto fixo de cada golpe, depois da armadura", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }),
    styled(makeUnit("E", "enemy", at("E"), TOUGH), "baluarte"),
  ]);
  const { events, damage, other } = compare(
    encounter,
    { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "E")!.pos },
    (copy) => delete findUnit(copy, "E")!.style,
  );
  if (eventsOf(events, "attackRoll")[0].outcome === "fumble") return;
  assert.equal(other - damage, 2);
});

test("Adiantar a Maré pega todo inimigo de pé, vale uma vez por luta e cobra o turno seguinte de quem a fez", () => {
  const { encounter } = stage(["A....E.F.G"], (at) => [
    unitFromCharacter(makeCharacter("A", { attributes: { il: FIRST } }), { team: "party", pos: at("A"), gifts: ["tide_pull"] }),
    makeUnit("E", "enemy", at("E"), { attributes: { il: 50 } }),
    makeUnit("F", "enemy", at("F"), { attributes: { il: 40 } }),
    makeUnit("G", "enemy", at("G"), { currentHp: 0 }),
  ]);
  const varel = findUnit(encounter, "A")!;
  const tide = varel.abilities.find((ability) => ability.id === "gift.tide_pull")!;
  assert.deepEqual(abilityTargets(encounter, varel, tide), [varel.pos]);
  assert.equal(usesLeft(varel, tide), 1);

  const events = run(encounter, { type: "ability", unitId: "A", abilityId: tide.id, target: varel.pos });
  assert.deepEqual(
    eventsOf(events, "statusApplied").map((event) => [event.target, event.statusId]),
    [
      ["E", "exposed"],
      ["F", "exposed"],
      ["A", "winded"],
    ],
  );
  assert.equal(usesLeft(varel, tide), 0);

  // Não há segunda vez, nem na rodada seguinte — e a vez seguinte dele se perde.
  const round = [...pass(encounter), ...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(round, "turnSkipped"), [{ type: "turnSkipped", unit: "A", name: "Sem fôlego" }]);
  assert.equal(activeUnit(encounter)!.id, "E");
  pass(encounter);
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: tide.id, target: varel.pos }), {
    ok: false,
    reason: "resource_spent",
  });
});

test("condição que já chega com alguém dura a luta toda, e a de braço ferido pesa na rolagem", () => {
  const { encounter, events } = stage(
    ["AE"],
    (at) => [makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), makeUnit("E", "enemy", at("E"), TOUGH)],
    { lasting: { A: ["wounded_arm"], ninguém: ["wounded_arm"] } },
  );
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;
  assert.deepEqual(eventsOf(events, "statusApplied").map((event) => [event.target, event.name]), [["A", "Braço ferido"]]);

  const strike = hero.abilities.find((ability) => ability.id === "guardiao.attack")!;
  const edge = attackEdge(encounter, hero, strike, enemy);
  const healthy = structuredClone(hero);
  healthy.statuses = [];
  assert.equal(attackTotals(hero, strike, enemy, edge).bonus, attackTotals(healthy, strike, enemy, edge).bonus - 2);

  for (let i = 0; i < 12; i++) pass(encounter);
  assert.deepEqual(hero.statuses.map((status) => status.id), ["wounded_arm"]);
});

test("quem só revida não bate em quem ainda não o provocou o bastante", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A")),
    Object.assign(makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST } }), { quirks: { retaliates: 3 } }),
  ]);
  const hero = findUnit(encounter, "A")!;
  const strikes = () => {
    const plan = planTurn(encounter);
    return [plan.action, plan.bonus].some((choice) => choice?.ability.effects.some((effect) => effect.kind === "damage"));
  };

  assert.equal(strikes(), false);
  hero.habit = { repeated: true, attackTurns: 2 };
  assert.equal(strikes(), false);
  hero.habit = { repeated: true, attackTurns: 3 };
  assert.equal(strikes(), true);
});

test("quem espelha repete o tipo da última ação de quem ele copia", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A")),
    Object.assign(makeUnit("E", "enemy", at("E"), { characterClass: "sombrilico", attributes: { il: FIRST } }), { quirks: { mirrors: "A" } }),
  ]);
  const hero = findUnit(encounter, "A")!;

  hero.habit = { last: "guardiao.defend", repeated: false, attackTurns: 0 };
  assert.equal(planTurn(encounter).action?.ability.id, "sombrilico.defend");
  hero.habit = { last: "guardiao.heavy_attack", repeated: false, attackTurns: 1 };
  assert.equal(planTurn(encounter).action?.ability.id, "sombrilico.heavy_attack");
  // Sem nada pra copiar (ela ainda não agiu), luta como qualquer um.
  hero.habit = { last: undefined, repeated: false, attackTurns: 0 };
  assert.ok(planTurn(encounter).action);
});
