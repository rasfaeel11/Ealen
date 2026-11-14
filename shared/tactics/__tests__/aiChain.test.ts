import assert from "node:assert/strict";
import { test } from "node:test";
import { activeUnit, applyCommand, chainStep, chooseCommand, findUnit, planTurn, type Encounter, type TacticalEvent } from "../index";
import { FIRST, eventsOf, makeUnit, setup } from "./helpers";

/** A IA que monta a cadeia (task 102): emenda no mesmo alvo, pesa o Fôlego, e o que abre vale o que deixa emendar. */

const TOUGH = { currentHp: 9000, maxHp: 9000, breath: 0 };

/** Joga o turno inteiro de quem está nele, com a IA, e devolve os eventos. */
function aiTurn(encounter: Encounter): TacticalEvent[] {
  const id = activeUnit(encounter)!.id;
  const log: TacticalEvent[] = [];
  for (let i = 0; i < 20 && activeUnit(encounter)?.id === id; i++) {
    const result = applyCommand(encounter, chooseCommand(encounter));
    if (!result.ok) throw new Error(result.reason);
    log.push(...result.events);
  }
  return log;
}

test("com Fôlego e um alvo que aguenta, a IA emenda verbos no mesmo turno", () => {
  const { encounter } = setup(["#AE."], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { olho: FIRST, forca: 40, fator: 40 } }),
    makeUnit("E", "party", at("E"), TOUGH),
  ]);
  Object.assign(findUnit(encounter, "A")!, { breath: 10, maxBreath: 10 });
  const log = aiTurn(encounter);
  assert.ok(eventsOf(log, "chained").length > 0, "emendou ao menos um verbo");
  assert.ok(eventsOf(log, "abilityUsed").every((event) => event.unit !== "A" || event.target.x === 2), "sempre no mesmo alvo");
});

test("com a cadeia aberta, a IA não anda (andar a solta) e emenda de onde está", () => {
  const { encounter } = setup(["AE......"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { olho: FIRST, forca: 40 } }),
    makeUnit("E", "party", at("E"), TOUGH),
  ]);
  const a = Object.assign(findUnit(encounter, "A")!, { breath: 10, maxBreath: 10 });
  a.turn.action = false;
  a.turn.chain = { target: "E", verbs: 1, last: "espadachim.agarrar", struck: false };
  const plan = planTurn(encounter);
  assert.deepEqual(plan.tile, a.pos);
  assert.ok(plan.action && chainStep(a, plan.action.ability) !== undefined, "o próximo verbo da cadeia");
});

test("sem Fôlego pro passo, a cadeia não segue", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { olho: FIRST, forca: 40 } }),
    makeUnit("E", "party", at("E"), TOUGH),
  ]);
  const a = Object.assign(findUnit(encounter, "A")!, { breath: 0 });
  a.turn.action = false;
  a.turn.chain = { target: "E", verbs: 1, last: "espadachim.attack", struck: true };
  assert.equal(planTurn(encounter).action, undefined);
});
