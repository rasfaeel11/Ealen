import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseCommand } from "../ai";
import { applyCommand } from "../engine";
import { LIFT_SHARE, liftable } from "../targeting";
import { activeUnit, findUnit, isAlive } from "../units";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/** Cair e levantar: quem chega a 0 fica caído, e um aliado colado pode pô-lo de pé. */

function fight(rows = ["ab.c"]) {
  const { encounter } = setup(rows, (at) => [
    makeUnit("a", "party", at("a"), { initiative: FIRST } as never),
    makeUnit("b", "party", at("b")),
    makeUnit("c", "enemy", at("c")),
  ]);
  while (activeUnit(encounter)?.id !== "a") run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  return encounter;
}

test("o aliado colado levanta quem caiu, gasta a ação, e ele volta com um quarto da vida e sem condições", () => {
  const encounter = fight();
  const fallen = findUnit(encounter, "b")!;
  fallen.currentHp = 0;
  fallen.statuses = [{ id: "x" } as never];
  const events = run(encounter, { type: "lift", unitId: "a", targetId: "b" });
  assert.equal(eventsOf(events, "lifted").length, 1);
  assert.ok(isAlive(fallen));
  assert.equal(fallen.currentHp, Math.ceil(fallen.maxHp * LIFT_SHARE));
  assert.deepEqual(fallen.statuses, []);
  assert.equal(findUnit(encounter, "a")!.turn.action, false);
});

test("de longe, ou sem a ação, não levanta; nem quem está de pé, nem o outro lado", () => {
  const far = fight(["a..b.c"]);
  findUnit(far, "b")!.currentHp = 0;
  assert.equal(liftable(far, findUnit(far, "a")!).length, 0);
  const near = fight();
  const result = applyCommand(near, { type: "lift", unitId: "a", targetId: "b" });
  assert.deepEqual(result, { ok: false, reason: "invalid_target" });
  findUnit(near, "c")!.currentHp = 0;
  assert.deepEqual(applyCommand(near, { type: "lift", unitId: "a", targetId: "c" }), { ok: false, reason: "invalid_target" });
  const spent = fight();
  findUnit(spent, "b")!.currentHp = 0;
  findUnit(spent, "a")!.turn.action = false;
  assert.deepEqual(applyCommand(spent, { type: "lift", unitId: "a", targetId: "b" }), { ok: false, reason: "resource_spent" });
});

test("quem foi levantado volta a ter a vez dele na ordem", () => {
  const encounter = fight();
  findUnit(encounter, "b")!.currentHp = 0;
  run(encounter, { type: "lift", unitId: "a", targetId: "b" });
  const seen = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const unit = activeUnit(encounter)!;
    seen.add(unit.id);
    run(encounter, { type: "endTurn", unitId: unit.id });
  }
  assert.ok(seen.has("b"));
});

test("quem caiu não ocupa o quadrado: se alguém ficou em cima, ele não levanta ali", () => {
  const encounter = fight();
  const fallen = findUnit(encounter, "b")!;
  fallen.currentHp = 0;
  findUnit(encounter, "c")!.pos = { ...fallen.pos };
  assert.equal(liftable(encounter, findUnit(encounter, "a")!).length, 0);
});

test("a IA de quem é do grupo levanta primeiro; a do outro lado não levanta", () => {
  const friends = fight();
  findUnit(friends, "b")!.currentHp = 0;
  assert.deepEqual(chooseCommand(friends), { type: "lift", unitId: "a", targetId: "b" });

  const { encounter } = setup(["cd.a"], (at) => [
    makeUnit("c", "enemy", at("c")),
    makeUnit("d", "enemy", at("d")),
    makeUnit("a", "party", at("a")),
  ]);
  while (activeUnit(encounter)?.id !== "c") run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  findUnit(encounter, "d")!.currentHp = 0;
  assert.notEqual(chooseCommand(encounter).type, "lift");
});
