import assert from "node:assert/strict";
import { test } from "node:test";
import { activeUnit, applyCommand, findUnit, holdsGround, reachableTiles, retreatsFrom, type Unit } from "../index";
import { FIRST, makeUnit, run, setup } from "./helpers";

/** Recuar (`combate` §3.2) e o voto do Gryskar (§4.2): não recuar o primeiro passo. */

const TOUGH = { currentHp: 9000, maxHp: 9000 };
const gryskar = (unit: Unit): Unit => Object.assign(unit, { style: "gryskar", grade: 3 });

test("recuar é terminar longe de quem estava colado; andar de lado, colado ainda, não é", () => {
  const { encounter } = setup([".....", ".AE..", "....."], (at) => [makeUnit("A", "party", at("A")), makeUnit("E", "enemy", at("E"))]);
  const a = findUnit(encounter, "A")!;
  assert.deepEqual(retreatsFrom(encounter, a, { x: 0, y: 1 }).map((unit) => unit.id), ["E"]);
  assert.deepEqual(retreatsFrom(encounter, a, { x: 2, y: 0 }), [], "de lado, ainda colado");
});

test("o Gryskar não recua antes de dar o primeiro golpe da luta; depois, recua", () => {
  const { encounter } = setup([".....", ".AE..", "....."], (at) => [
    gryskar(makeUnit("A", "party", at("A"), { attributes: { olho: FIRST }, ...TOUGH })),
    makeUnit("E", "enemy", at("E"), TOUGH),
  ]);
  const a = findUnit(encounter, "A")!;
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.ok(holdsGround(a));
  const stops = reachableTiles(encounter, a).map((tile) => tile.pos);
  assert.ok(stops.length > 0, "anda de lado");
  assert.ok(stops.every((pos) => Math.max(Math.abs(pos.x - 2), Math.abs(pos.y - 1)) === 1), "só para colado no inimigo");
  assert.deepEqual(applyCommand(encounter, { type: "move", unitId: "A", to: { x: 0, y: 1 } }), { ok: false, reason: "unreachable" });

  run(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: { x: 2, y: 1 } });
  assert.ok(!holdsGround(a));
  run(encounter, { type: "move", unitId: "A", to: { x: 0, y: 1 } });
  assert.deepEqual(a.pos, { x: 0, y: 1 });
});

test("o voto não prende quem não está colado em ninguém, nem quem não é do Gryskar", () => {
  const { encounter } = setup(["A...E"], (at) => [
    gryskar(makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } })),
    makeUnit("E", "enemy", at("E")),
  ]);
  run(encounter, { type: "move", unitId: "A", to: { x: 1, y: 0 } });
  const plain = setup([".AE"], (at) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"), TOUGH)]);
  run(plain.encounter, { type: "move", unitId: "A", to: { x: 0, y: 0 } });
  assert.deepEqual(findUnit(plain.encounter, "A")!.pos, { x: 0, y: 0 });
});
