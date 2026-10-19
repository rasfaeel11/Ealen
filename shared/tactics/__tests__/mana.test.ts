import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  applyCommand,
  attackEdge,
  attackTotals,
  findUnit,
  gridFromAscii,
  readiness,
  startEncounter,
  syncCharacterFromUnit,
  unitFromCharacter,
  type Ability,
  type Encounter,
  type EncounterSetup,
  type Pos,
  type Unit,
} from "../index";
import { lingeringMarks } from "../../world/encounters";
import { CONCEPTS, manaLimit, manaOf, maxMana, type Magic } from "../../mana";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * A mana: quem conjura paga a magia em mana, e o que passa do limite do turno
 * cobra do corpo — o evento `manaBurst` e a marca do conceito, que sai da
 * luta com ele.
 */

/** Página: limite de 3 por turno. Com Eir 5, a mana cheia é 2 x 3 + 2 = 8. */
const PAGE: Magic = { concept: "atracao_repulsao", level: 3 };

/** Duas magias de teste: um puxão pequeno (ação) e um empurrão (bônus), cada um de 2 de mana. */
const PULL: Ability = {
  id: "test.pull",
  name: "Puxão",
  flavor: "",
  cost: "action",
  range: 4,
  targets: "enemy",
  effects: [{ kind: "push", distance: -1 }],
  mana: 2,
};
const SHOVE: Ability = { ...PULL, id: "test.shove", name: "Empurrão", cost: "bonus", effects: [{ kind: "push", distance: 1 }] };

function stage(rows: string[], place: (at: (marker: string) => Pos) => Unit[], extra: Partial<EncounterSetup> = {}) {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed: 5, ...extra });
}

function mage(id: string, pos: Pos, mana?: number): Unit {
  const unit = unitFromCharacter(makeCharacter(id, { attributes: { il: FIRST }, mana }), { team: "party", pos, magic: PAGE });
  unit.abilities.push({ ...PULL }, { ...SHOVE });
  return unit;
}

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
const TOUGH = { currentHp: 9000, maxHp: 9000 };

test("quem conjura entra na luta com a mana da ficha, o teto e o limite do nível de mago", () => {
  const character = makeCharacter("M", { mana: 5 });
  assert.equal(maxMana(character, PAGE), 8);
  assert.equal(manaLimit(PAGE), 3);
  assert.equal(manaOf(character, PAGE), 5);
  assert.equal(manaOf(makeCharacter("N"), PAGE), 8);
  assert.equal(manaOf(makeCharacter("N", { mana: 40 }), PAGE), 8);

  const unit = unitFromCharacter(character, { team: "party", pos: { x: 0, y: 0 }, magic: PAGE });
  assert.deepEqual([unit.mana, unit.maxMana, unit.manaLimit, unit.concept], [5, 8, 3, "atracao_repulsao"]);
  // Quem não conjura não tem mana nenhuma, e magia não sai dele.
  const swordsman = makeUnit("S", "party", { x: 0, y: 0 });
  assert.equal(swordsman.mana, undefined);
  assert.equal(readiness(swordsman, PULL, true), "mana");
});

test("a magia paga mana; dentro do limite do turno, o corpo não cobra nada", () => {
  const { encounter } = stage(["M...E"], (at) => [mage("M", at("M")), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const events = run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: findUnit(encounter, "E")!.pos });
  assert.deepEqual(eventsOf(events, "manaSpent"), [{ type: "manaSpent", unit: "M", amount: 2, remaining: 6 }]);
  assert.deepEqual(eventsOf(events, "manaBurst"), []);
  // O preço vem antes do gesto.
  assert.ok(events.findIndex((event) => event.type === "manaSpent") < events.findIndex((event) => event.type === "abilityUsed"));
  assert.equal(findUnit(encounter, "M")!.manaSpent, 2);
});

test("passou do limite num turno: vem o manaBurst e a marca do conceito, uma vez por turno, e ela sai da luta com ele", () => {
  const { encounter } = stage(["M...E"], (at) => [mage("M", at("M")), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const caster = findUnit(encounter, "M")!;
  const enemy = findUnit(encounter, "E")!;

  run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: enemy.pos });
  const burst = run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: enemy.pos });
  assert.deepEqual(eventsOf(burst, "manaBurst"), [{ type: "manaBurst", unit: "M", spent: 4, limit: 3 }]);
  const mark = CONCEPTS.atracao_repulsao.mark;
  assert.deepEqual(
    eventsOf(burst, "statusApplied").map((event) => [event.target, event.statusId, event.turns]),
    [["M", mark, Infinity]],
  );
  // O que vem depois do aviso é o gesto que passou do limite.
  assert.ok(burst.findIndex((event) => event.type === "manaBurst") < burst.findIndex((event) => event.type === "abilityUsed"));
  assert.deepEqual(caster.marks, [mark]);
  // Passar mais no mesmo turno não dispara de novo.
  caster.turn.bonus = true;
  assert.deepEqual(eventsOf(run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: enemy.pos }), "manaBurst"), []);

  // Sangue e tremor: a mão erra mais.
  const strike = caster.abilities.find((ability) => ability.id === "guardiao.attack")!;
  const edge = attackEdge(encounter, caster, strike, enemy);
  const clean = structuredClone(caster);
  clean.statuses = [];
  assert.equal(attackTotals(caster, strike, enemy, edge).bonus, attackTotals(clean, strike, enemy, edge).bonus - 2);

  // O turno seguinte começa com a conta do corpo zerada, e a marca continua.
  pass(encounter);
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "M");
  assert.equal(caster.manaSpent, undefined);
  const calm = run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: enemy.pos });
  assert.deepEqual(eventsOf(calm, "manaBurst"), []);
  assert.ok(caster.statuses.some((status) => status.id === mark));

  // Cair apaga as condições, não a marca que ele leva da luta.
  caster.currentHp = 0;
  caster.statuses = [];
  assert.deepEqual(lingeringMarks(encounter, [{ id: "M" }, { id: "E" }]), { M: [mark] });
});

test("sem mana, a magia é recusada e nada muda", () => {
  const { encounter } = stage(["M...E"], (at) => [mage("M", at("M"), 1), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const before = structuredClone(encounter);
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: findUnit(encounter, "E")!.pos }), {
    ok: false,
    reason: "no_mana",
  });
  assert.deepEqual(encounter, before);
});

test("o golpe de abertura que passa do limite cobra na abertura, antes da primeira rodada", () => {
  const big: Ability = { ...PULL, id: "test.big", name: "Grande", mana: 5 };
  const { encounter, events } = stage(
    ["M...E"],
    (at) => {
      const caster = mage("M", at("M"));
      caster.abilities.push(big);
      return [caster, makeUnit("E", "enemy", at("E"), TOUGH)];
    },
    { surprised: "enemy", opening: { unitId: "M", abilityId: big.id, target: { x: 4, y: 0 } } },
  );
  assert.deepEqual(eventsOf(events, "manaBurst"), [{ type: "manaBurst", unit: "M", spent: 5, limit: 3 }]);
  assert.ok(events.findIndex((event) => event.type === "manaBurst") < events.findIndex((event) => event.type === "roundStarted"));
  // E a primeira vez dele começa com a conta zerada.
  assert.equal(findUnit(encounter, "M")!.manaSpent, undefined);
});

test("a mana gasta numa luta volta pra ficha", () => {
  const character = makeCharacter("M");
  const unit = unitFromCharacter(character, { team: "party", pos: { x: 0, y: 0 }, magic: PAGE });
  unit.mana = 3;
  syncCharacterFromUnit(character, unit);
  assert.equal(character.mana, 3);

  // Quem não conjura não ganha mana na ficha.
  const swordsman = makeCharacter("S");
  syncCharacterFromUnit(swordsman, unitFromCharacter(swordsman, { team: "party", pos: { x: 0, y: 0 } }));
  assert.equal(swordsman.mana, undefined);
});
