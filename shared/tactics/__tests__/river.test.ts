import assert from "node:assert/strict";
import { test } from "node:test";
import { BESTIARY, creaturePlacement, spawnCreature } from "../../mock/bestiary";
import { parseCueWhen } from "../../world/tiledMap";
import {
  activeUnit,
  findUnit,
  gridFromAscii,
  planTurn,
  startEncounter,
  styleReduction,
  unitFromCharacter,
  type Ability,
  type Encounter,
  type EncounterSetup,
  type Pos,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * O Ykuruã (`referencias/bestiario.md` §1 no repositório da história): na água
 * se cura e é quase inútil bater nele; em seco o couro racha. Sente mana gasta
 * de uma vez e vem atrás de quem a gastou. Vence-se tirando-o da água, aos
 * poucos.
 */

const YKURUA = BESTIARY["encounter-ykurua"];

function ykurua(pos: Pos): Unit {
  return unitFromCharacter(spawnCreature(YKURUA), { team: "enemy", pos, id: "Y", ...creaturePlacement(YKURUA, "M") });
}

/** Um puxão gravado (sai na hora), de 1 de mana, e um empurrão gravado de 4 — mais que o limite de uma Página. */
const PULL: Ability = {
  id: "test.pull",
  name: "Puxão",
  flavor: "",
  cost: "action",
  range: 12,
  targets: "enemy",
  effects: [{ kind: "push", distance: -2 }],
  mana: 1,
  engraved: true,
};
const BIG: Ability = { ...PULL, id: "test.big", name: "Grande", cost: "bonus", effects: [{ kind: "push", distance: 1 }], mana: 4 };

function mage(pos: Pos): Unit {
  const unit = unitFromCharacter(makeCharacter("M", { attributes: { olho: FIRST } }), {
    team: "party",
    pos,
    magic: { concept: "atracao_repulsao", level: 3 },
  });
  unit.abilities.push({ ...PULL }, { ...BIG });
  return unit;
}

function stage(rows: string[], place: (at: (marker: string) => Pos) => Unit[], extra: Partial<EncounterSetup> = {}) {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed: 4, ...extra });
}

const statusIds = (unit: Unit) => unit.statuses.map((status) => status.id);
const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

test("o Ykuruã está no bestiário como bicho de rio, pesado e atraído pela mana", () => {
  assert.deepEqual([YKURUA.template.name, YKURUA.river, YKURUA.heft, YKURUA.drawnToMana, YKURUA.principle], ["Ykuruã", true, 1, true, undefined]);
  const unit = ykurua({ x: 0, y: 0 });
  assert.deepEqual([unit.river, unit.heft, unit.drawnToMana, unit.style], [true, 1, true, "baluarte"]);
});

test("na água ele fica Submerso, com a Muralha alta; em seco, o couro racha e a Muralha quase some", () => {
  // A letra do desenho é sempre chão: o bicho entra direto no quadrado de água.
  const wet = stage(["M..w"], (at) => [mage(at("M")), ykurua({ x: 3, y: 0 })]).encounter;
  const swimmer = findUnit(wet, "Y")!;
  assert.deepEqual(statusIds(swimmer), ["submerged"]);
  assert.equal(styleReduction(swimmer), 2 + 6);

  const dry = stage(["M...Y"], (at) => [mage(at("M")), ykurua(at("Y"))]).encounter;
  const beached = findUnit(dry, "Y")!;
  assert.deepEqual(statusIds(beached), ["beached"]);
  assert.equal(styleReduction(beached), 0);
});

test("na água ele se refaz no começo de cada turno dele", () => {
  const { encounter } = stage(["M..www"], (at) => [mage(at("M")), ykurua({ x: 5, y: 0 })]);
  const swimmer = findUnit(encounter, "Y")!;
  swimmer.currentHp = 50;
  const events = pass(encounter);
  const regen = eventsOf(events, "statusTriggered");
  assert.deepEqual(regen.map((event) => [event.unit, event.statusId]), [["Y", "submerged"]]);
  assert.deepEqual(eventsOf(events, "heal")[0], { type: "heal", target: "Y", amount: 6, remainingHp: 56 });
});

test("puxar funciona aos poucos: ele é pesado, e cada quadrado fora d'água conta", () => {
  // O Y está na beira do rio: um puxão de 2 o tira só um quadrado — pra terra.
  const { encounter } = stage(["M...Yw"], (at) => [mage(at("M")), ykurua({ x: at("Y").x + 1, y: at("Y").y })]);
  const swimmer = findUnit(encounter, "Y")!;
  assert.deepEqual(statusIds(swimmer), ["submerged"]);

  const events = run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: swimmer.pos });
  assert.deepEqual(eventsOf(events, "pushed").map((event) => [event.from.x, event.to.x]), [[5, 4]]);
  assert.deepEqual(statusIds(swimmer), ["beached"]);
  assert.deepEqual(
    events.filter((event) => event.type === "statusExpired" || event.type === "statusApplied").map((event) => [event.type, event.statusId]),
    [
      ["statusExpired", "submerged"],
      ["statusApplied", "beached"],
    ],
  );
});

test("quem passa do limite de mana chama o bicho: ele ganha um turno a mais, logo depois, e vai atrás de quem conjurou", () => {
  const { encounter } = stage(["M.X......Y"], (at) => [
    mage(at("M")),
    makeUnit("X", "party", at("X"), { attributes: { olho: 90 } }),
    ykurua(at("Y")),
  ]);
  const caster = findUnit(encounter, "M")!;
  const beast = findUnit(encounter, "Y")!;
  assert.deepEqual(encounter.order, ["M", "X", "Y"]);

  const burst = run(encounter, { type: "ability", unitId: "M", abilityId: BIG.id, target: beast.pos });
  assert.deepEqual(eventsOf(burst, "manaDrawn"), [{ type: "manaDrawn", unit: "Y", caster: "M" }]);
  assert.ok(burst.findIndex((event) => event.type === "manaBurst") < burst.findIndex((event) => event.type === "manaDrawn"));
  assert.equal(beast.prey, "M");
  assert.deepEqual(encounter.bonusTurns, ["Y"]);

  // Acabada a vez de quem conjurou, o turno é do bicho — antes de X, que vinha na ordem.
  const after = pass(encounter);
  assert.deepEqual(eventsOf(after, "turnStarted").map((event) => event.unit), ["Y"]);
  assert.equal(activeUnit(encounter)!.id, "Y");
  assert.equal(encounter.interlude, "Y");
  // Ele vai pra cima de quem conjurou, não do mais perto.
  const plan = planTurn(encounter);
  assert.ok(Math.abs(plan.tile.x - caster.pos.x) < Math.abs(beast.pos.x - caster.pos.x));

  // E depois a ordem segue de onde estava: X, e a rodada que vem com o bicho no lugar dele.
  const back = pass(encounter);
  assert.equal(beast.prey, undefined);
  assert.equal(encounter.interlude, undefined);
  assert.deepEqual(eventsOf(back, "turnStarted").map((event) => event.unit), ["X"]);
  assert.equal(encounter.round, 1);
});

test("a deixa `burst` dispara na primeira vez que alguém passa do limite de mana, e só nela", () => {
  const { encounter } = stage(["M........Y"], (at) => [mage(at("M")), ykurua(at("Y"))], {
    cues: [{ id: "pressa", when: { kind: "burst" } }],
  });
  const beast = findUnit(encounter, "Y")!;
  assert.deepEqual(eventsOf(run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: beast.pos }), "cue"), []);
  const burst = run(encounter, { type: "ability", unitId: "M", abilityId: BIG.id, target: beast.pos });
  assert.deepEqual(eventsOf(burst, "cue"), [{ type: "cue", id: "pressa" }]);
  assert.equal(encounter.bursts, 1);

  // No mapa, a deixa se escreve `burst`.
  assert.deepEqual(parseCueWhen("burst"), { kind: "burst" });
  assert.equal(parseCueWhen("burst Endyru"), undefined);
});

test("uma deixa pode impor a pressa (`burst`): quem ela diz gasta toda a mana de uma vez, e o corpo e o bicho respondem", () => {
  const { encounter } = stage(["M........Y"], (at) => [mage(at("M")), ykurua(at("Y"))], {
    cues: [{ id: "pressa", when: { kind: "round", round: 2 }, burst: "M", dismiss: "G" }],
    supporters: [{ id: "G", name: "Oryndu", support: "read_water" }],
  });
  const caster = findUnit(encounter, "M")!;
  const mana = caster.mana!;
  // Gastar só um verso cabe no limite e não chama nada.
  run(encounter, { type: "ability", unitId: "M", abilityId: PULL.id, target: findUnit(encounter, "Y")!.pos });
  pass(encounter);
  const events = pass(encounter);

  assert.deepEqual(eventsOf(events, "cue"), [{ type: "cue", id: "pressa" }]);
  assert.deepEqual(eventsOf(events, "manaSpent"), [{ type: "manaSpent", unit: "M", amount: mana - 1, remaining: 0 }]);
  assert.equal(eventsOf(events, "manaBurst").length, 1);
  assert.ok(statusIds(caster).includes("bloodied"));
  assert.deepEqual(caster.marks, ["bloodied"]);
  assert.equal(findUnit(encounter, "Y")!.prey, "M");
  assert.deepEqual(encounter.bonusTurns, ["Y"]);
  // E quem segurava a margem sai da luta: o apoio dele some.
  assert.deepEqual(eventsOf(events, "supporterLost"), [{ type: "supporterLost", id: "G" }]);
  assert.deepEqual(encounter.supporters, []);
});
