import assert from "node:assert/strict";
import { test } from "node:test";
import { findItemTemplate } from "../../data/items";
import { abilityTargets, activeUnit, applyCommand, itemTargets, findUnit, movementOf, readiness, resistOf, type Ability, type ActiveStatus } from "../index";
import { STATUSES, type StatusId } from "../statuses";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/** As condições de todo RPG e o tipo de dano (task 62). */

function carrying(id: StatusId, turns = 3): ActiveStatus {
  return { ...STATUSES[id], turnsLeft: turns };
}

/** Um golpe certeiro de corte, sem dado que varie: 1d1, e muito acerto. */
const CUT: Ability = {
  id: "test.cut",
  name: "Corte",
  flavor: "",
  cost: "action",
  range: 1,
  targets: "enemy",
  attack: { toHit: 50 },
  effects: [{ kind: "damage", dice: { count: 1, sides: 1 }, multiplier: 10, type: "corte" }],
};

/** Uma magia qualquer, gravada pra não precisar recitar. */
const SPELL: Ability = { id: "test.spell", name: "Verso", flavor: "", cost: "action", range: 3, targets: "enemy", effects: [], mana: 1 };

function strike(resist?: Partial<Record<"corte", number>>): number {
  const { encounter } = setup(["AE"], (at) => {
    const enemy = makeUnit("E", "enemy", at("E"), { attributes: { couro: 0 }, breath: 0 });
    if (resist) enemy.resist = resist;
    return [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST }, kit: [CUT] }), enemy];
  });
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "test.cut", target: findUnit(encounter, "E")!.pos });
  return eventsOf(events, "damage").reduce((sum, event) => sum + event.amount, 0);
}

test("o tipo de dano: quem resiste leva menos, quem é fraco leva mais, e sem tipo nada muda", () => {
  const plain = strike();
  assert.ok(plain > 0);
  assert.ok(strike({ corte: 0.5 }) < plain);
  assert.ok(strike({ corte: 1.5 }) > plain);
  assert.equal(resistOf({ resist: { corte: 0.5 } }, undefined), 1);
  assert.equal(resistOf({}, "corte"), 1);
});

test("Calado não conjura, e o resto ele faz", () => {
  const unit = makeUnit("A", "party", { x: 0, y: 0 }, { kit: [SPELL, CUT] });
  unit.mana = 5;
  unit.turn.action = true;
  const spell = unit.abilities.find((ability) => ability.id === "test.spell")!;
  const cut = unit.abilities.find((ability) => ability.id === "test.cut")!;
  assert.equal(readiness(unit, spell), "ready");
  unit.statuses.push(carrying("silenced"));
  assert.equal(readiness(unit, spell), "silenced");
  assert.equal(readiness(unit, cut), "ready");
});

test("Preso não anda; Envenenado e Sangrando ferem no começo da vez; Atordoado perde a vez", () => {
  const unit = makeUnit("A", "party", { x: 0, y: 0 });
  unit.statuses.push(carrying("rooted"));
  assert.equal(movementOf(unit), 0);

  const { encounter } = setup(["A...E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const enemy = findUnit(encounter, "E")!;
  enemy.statuses.push(carrying("poisoned"), carrying("bleeding"), carrying("stunned"));
  const hp = enemy.currentHp;
  const events = run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  assert.ok(enemy.currentHp < hp);
  assert.equal(eventsOf(events, "turnSkipped")[0]?.unit, "E");
});

test("Disparada: a ação vira passo, e o turno anda o dobro", () => {
  const { encounter } = setup(["A.........E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST }, characterClass: "espadachim" }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const unit = findUnit(encounter, "A")!;
  const before = unit.turn.movement;
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.disparada", target: unit.pos });
  assert.equal(unit.turn.movement, before * 2);
  assert.equal(eventsOf(events, "strode")[0]?.amount, before);
  assert.equal(unit.turn.action, false);
});

test("Ajudar: só num aliado colado, nunca em si, e ele sai Ajudado", () => {
  const { encounter } = setup(["AB.......E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST }, characterClass: "espadachim" }),
    makeUnit("B", "party", at("B"), { characterClass: "espadachim" }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const actor = findUnit(encounter, "A")!;
  const help = actor.abilities.find((ability) => ability.id === "espadachim.ajudar")!;
  const targets = abilityTargets(encounter, actor, help);
  assert.deepEqual(targets, [findUnit(encounter, "B")!.pos]);
  run(encounter, { type: "ability", unitId: "A", abilityId: help.id, target: targets[0] });
  assert.ok(findUnit(encounter, "B")!.statuses.some((status) => status.id === "aided" && (status.toHit ?? 0) > 0));
});

test("o item vai num aliado à vista, até três quadrados, e nunca num inimigo", () => {
  const { encounter } = setup(["A.B...C.E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("C", "party", at("C")),
    makeUnit("E", "enemy", at("E")),
  ]);
  const user = findUnit(encounter, "A")!;
  const ally = findUnit(encounter, "B")!;
  user.inventory = { slots: [{ slotIndex: 0, item: structuredClone(findItemTemplate("item-unguento-de-barqueiro")!), quantity: 1 }], maxSlots: 12 };
  assert.deepEqual(itemTargets(encounter, user), [user.pos, ally.pos]);
  ally.currentHp = 1;
  const refused = applyCommand(encounter, { type: "useItem", unitId: "A", itemId: "item-unguento-de-barqueiro", target: findUnit(encounter, "E")!.pos });
  assert.deepEqual(refused, { ok: false, reason: "invalid_target" });
  const events = run(encounter, { type: "useItem", unitId: "A", itemId: "item-unguento-de-barqueiro", target: ally.pos });
  assert.equal(eventsOf(events, "itemUsed")[0]?.target, "B");
  assert.ok(ally.currentHp > 1);
});
