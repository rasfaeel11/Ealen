import assert from "node:assert/strict";
import { test } from "node:test";
import { addItemToInventory } from "../../inventoryEffects";
import { findItemTemplate } from "../../data/items";
import { activeUnit, applyCommand, chooseCommand, distance, findUnit, gridFromAscii, planTurn, standProp, startEncounter, unitFromCharacter, type Encounter } from "../index";
import { FIRST, TEST_KIT, makeCharacter, makeUnit, run, setup } from "./helpers";

/**
 * A IA dos aliados (AGENTS.md, task 93): o item no aliado, o empurrão mirado no
 * que faz o alvo bater, o Contragolpe da Ipojy pesado só pelo grupo, a Disparada
 * e o Ajudar quando valem.
 */

// --- O item no aliado -------------------------------------------------------

test("com o aliado por um fio ao lado, o Unguento vai nele", () => {
  const carrier = makeCharacter("A", { attributes: { olho: FIRST } });
  addItemToInventory(carrier, findItemTemplate("item-unguento-de-barqueiro")!);
  const { encounter } = setup(["A.B.........E"], (at) => [
    unitFromCharacter(carrier, { team: "party", pos: at("A") }),
    makeUnit("B", "party", at("B"), { currentHp: 6 }),
    makeUnit("E", "enemy", at("E")),
  ]);
  findUnit(encounter, "A")!.order = { kind: "hold" };

  const plan = planTurn(encounter);
  assert.deepEqual(plan.item?.target, findUnit(encounter, "B")!.pos);
  assert.deepEqual(chooseCommand(encounter), {
    type: "useItem",
    unitId: "A",
    itemId: "item-unguento-de-barqueiro",
    target: findUnit(encounter, "B")!.pos,
  });
});

test("o aliado inteiro não ganha o Unguento", () => {
  const carrier = makeCharacter("A", { attributes: { olho: FIRST } });
  addItemToInventory(carrier, findItemTemplate("item-unguento-de-barqueiro")!);
  const { encounter } = setup(["A.B.........E"], (at) => [
    unitFromCharacter(carrier, { team: "party", pos: at("A") }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.equal(planTurn(encounter).item, undefined);
});

// --- O empurrão que bate ----------------------------------------------------

/** A, colado em E, com o empurrão de teste; `b` é um barril de óleo. */
function shove(rows: string[]): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  const props = (markers.b ?? []).map((pos, index) => standProp(grid, `barril-${index}`, "barrel", pos));
  const units = [
    makeUnit("A", "party", markers.A[0], { kit: [TEST_KIT.empurrao], attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", markers.E[0], { currentHp: 500, maxHp: 500 }),
  ];
  return startEncounter({ grid, units, props, seed: 3 }).encounter;
}

/** A nota que a IA dá ao empurrão de A, parado onde está. */
function shoveValue(encounter: Encounter): number {
  findUnit(encounter, "A")!.order = { kind: "hold" };
  const plan = planTurn(encounter);
  return plan.action?.ability.id === "teste.empurrao" ? plan.action.value : 0;
}

test("o empurrão contra a parede vale mais que no aberto", () => {
  const open = shoveValue(shove(["AE...."]));
  const wall = shoveValue(shove(["AE#..."]));
  assert.ok(wall > open, `parede ${wall} contra aberto ${open}`);
});

test("contra o barril de óleo, o empurrão vale ainda mais", () => {
  const wall = shoveValue(shove(["AE#..."]));
  const barrel = shoveValue(shove(["AEb..."]));
  assert.ok(barrel > wall, `barril ${barrel} contra parede ${wall}`);
});

// --- O Contragolpe ----------------------------------------------------------

/** A nota do melhor golpe de `team` contra um inimigo colado, da Ipojy ou não. */
function strikeValue(team: "party" | "enemy", sworn: boolean): number {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", team, at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", team === "party" ? "enemy" : "party", at("E")),
  ]);
  encounter.opened = true;
  // As duas são de escola (as duas aparam); só a Ipojy devolve.
  Object.assign(findUnit(encounter, "E")!, { style: sworn ? "ipojy" : "gryskar", grade: 2 });
  const plan = planTurn(encounter);
  return plan.action?.value ?? 0;
}

test("o companheiro pesa o golpe que a Espera devolve; o outro lado não", () => {
  assert.ok(strikeValue("party", true) < strikeValue("party", false));
  assert.equal(strikeValue("enemy", true), strikeValue("enemy", false));
});

// --- A Disparada e o Ajudar ---------------------------------------------------

test("longe de todo mundo, dispara", () => {
  const { encounter } = setup(["A..................E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.equal(planTurn(encounter).action?.ability.id, "espadachim.disparada");
});

test("parado por ordem, não dispara", () => {
  const { encounter } = setup(["A..................E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  findUnit(encounter, "A")!.order = { kind: "hold" };
  assert.equal(planTurn(encounter).action, undefined);
});

test("o Ajudar só vale em quem tem em quem bater", () => {
  const scene = (rows: string[]) =>
    setup(rows, (at) => [
      makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
      makeUnit("B", "party", at("B")),
      makeUnit("E", "enemy", at("E")),
    ]).encounter;

  const near = scene(["AB.E"]);
  findUnit(near, "A")!.order = { kind: "hold" };
  assert.equal(planTurn(near).action?.ability.id, "espadachim.ajudar");

  const far = scene(["AB..........................E"]);
  findUnit(far, "A")!.order = { kind: "hold" };
  assert.equal(planTurn(far).action, undefined);
});

// --- O objetivo, o círculo e a ordem de mirar ---------------------------------

/** A do grupo, E do outro lado; `g` é o guincho que vence a luta, `k` um círculo gravado; `w` é água. */
function staged(rows: string[], winch = true): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  const props = [
    ...(markers.g ?? []).map((pos, index) => standProp(grid, `guincho-${index}`, "winch", pos)),
    ...(markers.k ?? []).map((pos, index) => standProp(grid, `circulo-${index}`, "circle", pos)),
  ];
  const units = [
    makeUnit("A", "party", markers.A[0], { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", markers.E[0]),
    ...(markers.F ? [makeUnit("F", "enemy", markers.F[0], { currentHp: 3 })] : []),
  ];
  const cues = winch ? [{ id: "solto", when: { kind: "used" as const, props: ["guincho-0"] }, ends: "win" as const }] : [];
  return startEncounter({ grid, units, props, cues, seed: 5 }).encounter;
}

test("com o guincho que vence a luta, o companheiro vai até ele e o solta", () => {
  // Longe, a vez inteira vai em chegar mais perto, e não em bater em quem está colado.
  const encounter = staged(["A...........g", "E............"]);
  const unit = findUnit(encounter, "A")!;
  const before = distance(unit.pos, encounter.props[0].pos);
  const events = [];
  while (activeUnit(encounter)?.id === "A") {
    const command = chooseCommand(encounter);
    events.push(...run(encounter, command));
    if (command.type === "endTurn") break;
  }
  assert.ok(distance(unit.pos, encounter.props[0].pos) < before - 4, "devia andar pro guincho");
  assert.equal(events.filter((event) => event.type === "attackRoll" && event.actor === "A").length, 0);

  const near = staged(["E.....Ag"]);
  assert.deepEqual(chooseCommand(near), { type: "interact", unitId: "A", target: near.props[0].pos });
});

test("o guincho que só conta a história não puxa ninguém", () => {
  const encounter = staged(["AE......g"], false);
  assert.equal(planTurn(encounter).use, undefined);
  assert.equal(planTurn(encounter).action?.ability.id.endsWith("attack"), true);
});

test("o círculo gravado se acende pra tirar o bicho de rio da água", () => {
  const encounter = staged(["Ak..wwwE"], false);
  const beast = findUnit(encounter, "E")!;
  Object.assign(beast, { river: true, pos: { x: 5, y: 0 } });
  assert.deepEqual(planTurn(encounter).use?.target, encounter.props[0].pos);

  // Em seco, o círculo não tem o que tirar da água.
  beast.pos = { x: 3, y: 0 };
  assert.equal(planTurn(encounter).use, undefined);
});

test("a ordem de mirar: só bate no inimigo marcado, e só vale num inimigo de pé", () => {
  const encounter = staged(["FAE"], false);
  const unit = findUnit(encounter, "A")!;
  // Sem ordem, o ferido (F) apanha primeiro.
  assert.equal(planTurn(encounter).action?.target.x, 0);
  unit.order = { kind: "focus", unit: "E" };
  assert.equal(planTurn(encounter).action?.target.x, 2);

  const { encounter: pair } = setup(["AB.E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.deepEqual(applyCommand(pair, { type: "order", unitId: "A", targetId: "B", order: { kind: "focus", unit: "A" } }), {
    ok: false,
    reason: "invalid_target",
  });
  assert.ok(applyCommand(pair, { type: "order", unitId: "A", targetId: "B", order: { kind: "focus", unit: "E" } }).ok);
});
