import assert from "node:assert/strict";
import { test } from "node:test";
import { addItemToInventory } from "../../inventoryEffects";
import { findItemTemplate } from "../../data/items";
import { chooseCommand, findUnit, gridFromAscii, planTurn, standProp, startEncounter, unitFromCharacter, type Encounter } from "../index";
import { FIRST, TEST_KIT, makeCharacter, makeUnit, setup } from "./helpers";

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
  if (sworn) Object.assign(findUnit(encounter, "E")!, { style: "ipojy", grade: 2 });
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
