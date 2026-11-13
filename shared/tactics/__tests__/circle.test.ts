import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFLECT_MANA,
  activeUnit,
  abilityTargets,
  findUnit,
  gridFromAscii,
  startEncounter,
  unitFromCharacter,
  type Encounter,
  type Pos,
  type Unit,
} from "../index";
import type { Magic } from "../../mana";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/** Os dois verbos do Círculo que faltavam (`combate` §3.4): desviar projétil e puxar-se até um ponto. */

const CIRCLE: Magic = { concept: "atracao_repulsao", level: 4 };
const TOUGH = { currentHp: 9000, maxHp: 9000 };

function endyru(pos: Pos, first = true): Unit {
  return unitFromCharacter(
    makeCharacter("M", { characterClass: "atracao_repulsao", mageLevel: 4, attributes: first ? { olho: FIRST, saber: 30 } : { saber: 30 } }),
    { team: "party", pos, magic: CIRCLE },
  );
}

function stage(rows: string[], place: (at: (marker: string) => Pos) => Unit[], seed = 3): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed }).encounter;
}

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

test("Endyru no Círculo sabe desviar e puxar-se; na Página, não", () => {
  const circle = endyru({ x: 0, y: 0 });
  assert.ok(circle.abilities.some((ability) => ability.id === "atracao_repulsao.desviar"));
  assert.ok(circle.abilities.some((ability) => ability.id === "atracao_repulsao.puxar_se"));
  const page = unitFromCharacter(makeCharacter("P", { characterClass: "atracao_repulsao", mageLevel: 3 }), {
    team: "party",
    pos: { x: 0, y: 0 },
    magic: { concept: "atracao_repulsao", level: 3 },
  });
  assert.ok(!page.abilities.some((ability) => ability.id.endsWith("desviar") || ability.id.endsWith("puxar_se")));
});

test("desviar lê o texto agora, sem gastar mana; o tiro no aliado colado passa ao lado e cobra a última linha", () => {
  const encounter = stage(["MA....B"], (at) => [
    endyru(at("M")),
    makeUnit("A", "party", at("A"), TOUGH),
    makeUnit("B", "enemy", at("B"), { equipment: { weapon: "gear-besta" }, attributes: { olho: 50 } }),
  ]);
  const mage = findUnit(encounter, "M")!;
  const mana = mage.mana!;
  const held = run(encounter, { type: "ability", unitId: "M", abilityId: "atracao_repulsao.desviar", target: mage.pos });
  assert.equal(eventsOf(held, "recitationStarted").length, 0, "não se recita: o tempo se pagou agora");
  assert.equal(mage.mana, mana, "a mana espera a última linha");
  assert.ok(mage.statuses.some((status) => status.deflect));

  pass(encounter);
  while (activeUnit(encounter)!.id !== "B") pass(encounter);
  const ally = findUnit(encounter, "A")!;
  const hp = ally.currentHp;
  const shot = run(encounter, { type: "ability", unitId: "B", abilityId: "espadachim.attack", target: ally.pos });
  assert.deepEqual(eventsOf(shot, "deflected"), [{ type: "deflected", unit: "M", target: "A", attacker: "B" }]);
  assert.equal(eventsOf(shot, "attackRoll").length, 0);
  assert.equal(ally.currentHp, hp);
  assert.equal(mage.mana, mana - DEFLECT_MANA);
  assert.equal(mage.turn.reaction, false);
  assert.ok(!mage.statuses.some((status) => status.deflect), "serve a um tiro só");
  assert.ok(!findUnit(encounter, "B")!.statuses.some((status) => status.id === "exposto"), "quem atirou não errou");
});

test("desviar não pega golpe de perto, nem tiro em quem está longe dele", () => {
  const encounter = stage(["M.A..B"], (at) => [
    endyru(at("M")),
    makeUnit("A", "party", at("A"), TOUGH),
    makeUnit("B", "enemy", at("B"), { equipment: { weapon: "gear-besta" }, attributes: { olho: 50 } }),
  ]);
  const mage = findUnit(encounter, "M")!;
  run(encounter, { type: "ability", unitId: "M", abilityId: "atracao_repulsao.desviar", target: mage.pos });
  pass(encounter);
  while (activeUnit(encounter)!.id !== "B") pass(encounter);
  const shot = run(encounter, { type: "ability", unitId: "B", abilityId: "espadachim.attack", target: findUnit(encounter, "A")!.pos });
  assert.equal(eventsOf(shot, "deflected").length, 0);
  assert.ok(mage.statuses.some((status) => status.deflect), "o texto continua na boca");
});

test("Agarrado, o texto do desvio se perde", () => {
  const encounter = stage(["MB"], (at) => [endyru(at("M")), makeUnit("B", "enemy", at("B"), { attributes: { olho: 50, forca: 40 } })]);
  const mage = findUnit(encounter, "M")!;
  run(encounter, { type: "ability", unitId: "M", abilityId: "atracao_repulsao.desviar", target: mage.pos });
  pass(encounter);
  while (activeUnit(encounter)!.id !== "B") pass(encounter);
  run(encounter, { type: "ability", unitId: "B", abilityId: "espadachim.agarrar", target: mage.pos });
  if (mage.statuses.some((status) => status.id === "agarrado")) assert.ok(!mage.statuses.some((status) => status.deflect));
});

test("puxar-se mira só o quadrado colado numa parede, num corpo ou num destrutível, em linha reta", () => {
  const encounter = stage(
    [
      "......",
      ".M...#",
      "......",
      ".E....",
    ],
    (at) => [endyru(at("M")), makeUnit("E", "enemy", at("E"), TOUGH)],
  );
  const mage = findUnit(encounter, "M")!;
  const pull = mage.abilities.find((ability) => ability.id === "atracao_repulsao.puxar_se")!;
  const spots = abilityTargets(encounter, mage, pull).map((pos) => `${pos.x},${pos.y}`).sort();
  // A parede à direita (pára em 4,1) e o corpo embaixo (pára em 1,2). A borda do mapa não segura ninguém.
  assert.deepEqual(spots, ["1,2", "4,1"]);
});

test("puxar-se é recitado: sai no turno seguinte, leva Endyru até lá sem ataque de oportunidade e não abre a luta", () => {
  const encounter = stage(["EM...#"], (at) => [endyru(at("M")), makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { olho: 0 } })]);
  const mage = findUnit(encounter, "M")!;
  while (activeUnit(encounter)!.id !== "M") pass(encounter);
  run(encounter, { type: "ability", unitId: "M", abilityId: "atracao_repulsao.puxar_se", target: { x: 4, y: 0 } });
  assert.deepEqual(mage.pos, { x: 1, y: 0 });
  assert.equal(encounter.opened, undefined);
  pass(encounter);
  const released = [];
  while (activeUnit(encounter)!.id !== "M") released.push(...pass(encounter));
  released.push(...pass(encounter));
  const self = eventsOf(released, "pushed").find((event) => event.unit === "M");
  assert.ok(self?.self);
  assert.deepEqual(mage.pos, { x: 4, y: 0 });
  assert.equal(eventsOf(released, "abilityUsed").filter((event) => event.reaction).length, 0, "ninguém pune quem é puxado");
});
