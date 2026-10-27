import assert from "node:assert/strict";
import { test } from "node:test";
import { BESTIARY, creaturePlacement, spawnCreature } from "../../mock/bestiary";
import { parseCueWhen } from "../../world/tiledMap";
import {
  CRACK_TURNS,
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
  assert.deepEqual([YKURUA.template.name, YKURUA.template.race, YKURUA.river, YKURUA.heft, YKURUA.drawnToMana], ["Ykuruã", "bicho", true, 1, true]);
  const unit = ykurua({ x: 0, y: 0 });
  assert.deepEqual([unit.river, unit.heft, unit.drawnToMana, unit.style], [true, 1, true, "baluarte"]);
});

test("na água ele fica Submerso, com a Muralha alta; em seco, fica só com a do Baluarte", () => {
  // A letra do desenho é sempre chão: o bicho entra direto no quadrado de água.
  const wet = stage(["M..w"], (at) => [mage(at("M")), ykurua({ x: 3, y: 0 })]).encounter;
  const swimmer = findUnit(wet, "Y")!;
  assert.deepEqual(statusIds(swimmer), ["submerged"]);
  assert.equal(styleReduction(swimmer), 2 + 6);

  const dry = stage(["M...Y"], (at) => [mage(at("M")), ykurua(at("Y"))]).encounter;
  const beached = findUnit(dry, "Y")!;
  assert.deepEqual(statusIds(beached), ["beached"]);
  assert.equal(styleReduction(beached), 2);
});

test("em seco, o couro racha no segundo turno dele fora d'água, e volta inteiro se ele voltar pra água", () => {
  const { encounter } = stage(["M.Yw"], (at) => [mage(at("M")), ykurua(at("Y"))]);
  const beast = findUnit(encounter, "Y")!;
  assert.deepEqual(encounter.order, ["M", "Y"]);
  // Ninguém faz nada: um teste de regra, não de IA.
  const hold = () => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

  hold(); // a vez de M acaba; o primeiro turno de Y em seco começa
  assert.equal(beast.dryTurns, 1);
  assert.deepEqual(statusIds(beast), ["beached"]);
  assert.equal(styleReduction(beast), 2);
  hold(); // Y passa; rodada 2, vez de M
  const second = hold(); // M passa; o segundo turno de Y em seco: o couro racha
  assert.equal(CRACK_TURNS, 2);
  assert.deepEqual(eventsOf(second, "statusApplied").map((event) => event.statusId), ["cracked_hide"]);
  assert.deepEqual(statusIds(beast), ["beached", "cracked_hide"]);
  assert.equal(styleReduction(beast), 0);
  hold(); // Y passa; vez de M

  // Empurrado de volta pra água: Submerso, e o couro se refaz.
  const shove: Ability = { ...PULL, id: "test.shove", name: "Empurrão", effects: [{ kind: "push", distance: 2 }] };
  findUnit(encounter, "M")!.abilities.push(shove);
  run(encounter, { type: "ability", unitId: "M", abilityId: shove.id, target: beast.pos });
  assert.deepEqual(beast.pos, { x: 3, y: 0 });
  assert.deepEqual(statusIds(beast), ["submerged"]);
  assert.equal(beast.dryTurns, undefined);
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

test("a cheia: de tantas em tantas rodadas a água come um anel da margem, e o bicho que estava ali volta pra água", () => {
  const { grid } = gridFromAscii(["M..Yw"]);
  const mapGrid = grid;
  const { encounter } = startEncounter({
    grid,
    units: [mage({ x: 0, y: 0 }), ykurua({ x: 3, y: 0 })],
    seed: 4,
    flood: { every: 1, rises: 1 },
  });
  const beast = findUnit(encounter, "Y")!;
  assert.deepEqual(statusIds(beast), ["beached"]);

  // A rodada 2 começa: a água sobe uma vez, só no quadrado que encostava nela.
  const events = [...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(events, "waterRose"), [{ type: "waterRose", tiles: [{ x: 3, y: 0 }] }]);
  assert.equal(encounter.grid.tiles[3].water, true);
  assert.equal(encounter.grid.tiles[3].moveCost, 2);
  assert.equal(encounter.grid.tiles[2].water, undefined);
  assert.deepEqual(statusIds(beast), ["submerged"]);
  // A luta alagou a cópia dela: o mapa da área continua seco.
  assert.equal(mapGrid.tiles[3].water, undefined);

  // Uma vez só: na rodada 3 a água não sobe mais.
  const later = [...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(later, "waterRose"), []);
  assert.equal(encounter.flood?.risen, 1);
});

test("uma deixa com `rise` faz a água subir na hora em que dispara, e conta na cheia", () => {
  const { grid } = gridFromAscii(["M...w"]);
  const { encounter } = startEncounter({
    grid,
    units: [mage({ x: 0, y: 0 }), ykurua({ x: 2, y: 0 })],
    seed: 4,
    cues: [{ id: "chuva", when: { kind: "round", round: 2 }, rise: true }],
  });
  const events = [...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(events, "waterRose")[0]?.tiles, [{ x: 3, y: 0 }]);
});
