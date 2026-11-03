import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, chooseCommand, distance, findUnit, planTurn } from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/** As ordens de companheiro (task 69): avançar, segurar posição e proteger alguém. */

/** O companheiro C age primeiro; Endyru (H) fica longe dele, e o inimigo mais longe ainda. */
function field() {
  return setup(["H.....C.........E"], (at) => [
    makeUnit("C", "party", at("C"), { attributes: { olho: FIRST }, characterClass: "espadachim" }),
    makeUnit("H", "party", at("H")),
    makeUnit("E", "enemy", at("E")),
  ]);
}

test("sem ordem, ele avança; segurando, não sai do quadrado", () => {
  const free = field().encounter;
  const start = findUnit(free, "C")!.pos;
  assert.notDeepEqual(planTurn(free).tile, start);

  const held = field().encounter;
  findUnit(held, "C")!.order = { kind: "hold" };
  assert.deepEqual(planTurn(held).tile, findUnit(held, "C")!.pos);
});

test("protegendo alguém, ele vai pra perto dele, não do inimigo", () => {
  const { encounter } = field();
  findUnit(encounter, "C")!.order = { kind: "guard", unit: "H" };
  const plan = planTurn(encounter);
  const toWard = (pos: { x: number; y: number }) => distance(pos, findUnit(encounter, "H")!.pos);
  assert.ok(toWard(plan.tile) < toWard(findUnit(encounter, "C")!.pos));
  assert.equal(chooseCommand(encounter).type, "move");
});

test("a ordem é um comando: não gasta nada, só vale pro mesmo lado, e avançar a apaga", () => {
  const { encounter } = setup(["HC.......E"], (at) => [
    makeUnit("H", "party", at("H"), { attributes: { olho: FIRST } }),
    makeUnit("C", "party", at("C")),
    makeUnit("E", "enemy", at("E")),
  ]);
  const hero = findUnit(encounter, "H")!;
  const events = run(encounter, { type: "order", unitId: "H", targetId: "C", order: { kind: "guard", unit: "H" } });
  assert.deepEqual(eventsOf(events, "ordered")[0]?.order, { kind: "guard", unit: "H" });
  assert.deepEqual(findUnit(encounter, "C")!.order, { kind: "guard", unit: "H" });
  assert.equal(hero.turn.action, true);
  assert.equal(hero.turn.bonus, true);
  assert.deepEqual(applyCommand(encounter, { type: "order", unitId: "H", targetId: "E", order: { kind: "hold" } }), {
    ok: false,
    reason: "invalid_target",
  });
  run(encounter, { type: "order", unitId: "H", targetId: "C", order: { kind: "advance" } });
  assert.equal(findUnit(encounter, "C")!.order, undefined);
});
