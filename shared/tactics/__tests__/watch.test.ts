import assert from "node:assert/strict";
import { test } from "node:test";
import { activeUnit, findUnit, planTurn, type Encounter } from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/**
 * Vigiar (AGENTS.md, tasks 57 e 63): a ação gasta em esperar com a arma pronta.
 * Até a vez seguinte, o primeiro inimigo que ENTRAR no alcance do golpe leva o
 * golpe, na reação. Quem já estava no alcance não dispara nada.
 */

const WATCH = "espadachim.vigiar";

/** A de vigia, E do outro lado, a `rows` de distância. A age primeiro. */
function watched(rows: string[]): Encounter {
  const { encounter } = setup(rows, (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
  ]);
  run(encounter, { type: "ability", unitId: "A", abilityId: WATCH, target: findUnit(encounter, "A")!.pos });
  run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(activeUnit(encounter)!.id, "E");
  return encounter;
}

test("quem entra no alcance de quem vigia leva o golpe, e a vigia se gasta", () => {
  const encounter = watched(["A....E"]);
  const watcher = findUnit(encounter, "A")!;
  assert.ok(watcher.statuses.some((status) => status.id === "watching"));

  const events = run(encounter, { type: "move", unitId: "E", to: { x: 1, y: 0 } });
  assert.equal(eventsOf(events, "watchTriggered")[0]?.unit, "A");
  const blow = eventsOf(events, "abilityUsed").find((event) => event.unit === "A");
  assert.equal(blow?.reaction, true);
  assert.equal(blow?.abilityId, "espadachim.attack");
  assert.equal(watcher.turn.reaction, false);
  assert.ok(!watcher.statuses.some((status) => status.id === "watching"));
  // O golpe sai depois do passo: quem entrou já está lá.
  assert.deepEqual(findUnit(encounter, "E")!.pos, { x: 1, y: 0 });
});

test("quem já estava no alcance e anda dentro dele não dispara a vigia", () => {
  const encounter = watched(["AE....", "......"]);
  const events = run(encounter, { type: "move", unitId: "E", to: { x: 1, y: 1 } });
  assert.equal(eventsOf(events, "watchTriggered").length, 0);
});

test("a vigia dura até a vez de quem vigia voltar", () => {
  const encounter = watched(["A.........E"]);
  run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.ok(!findUnit(encounter, "A")!.statuses.some((status) => status.id === "watching"));
});

test("a IA vigia quando não alcança ninguém e o outro tem de vir até ela, e chega a tempo", () => {
  const { encounter } = setup(["A.....E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  // Parada por ordem, não dispara: vigia.
  findUnit(encounter, "A")!.order = { kind: "hold" };
  assert.equal(planTurn(encounter).action?.ability.id, WATCH);

  // Longe demais, ele não chega até a vez dela voltar: vigiar não vale.
  const { encounter: far } = setup(["A...............E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  findUnit(far, "A")!.order = { kind: "hold" };
  assert.equal(planTurn(far).action, undefined);
});

test("a IA não vigia contra quem bate de longe: ele não precisa chegar perto", () => {
  const { encounter } = setup(["A.....E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { equipment: { weapon: "gear-besta" } }),
  ]);
  findUnit(encounter, "A")!.order = { kind: "hold" };
  assert.notEqual(planTurn(encounter).action?.ability.id, WATCH);
});

test("quem anda conta o golpe de quem vigia: chegar perto dela vale menos", () => {
  const scene = (watching: boolean) => {
    const { encounter } = setup(["A...E"], (at) => [
      makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
      makeUnit("E", "enemy", at("E")),
    ]);
    if (watching) run(encounter, { type: "ability", unitId: "A", abilityId: WATCH, target: findUnit(encounter, "A")!.pos });
    run(encounter, { type: "endTurn", unitId: "A" });
    return planTurn(encounter);
  };
  const calm = scene(false);
  const wary = scene(true);
  assert.ok(wary.score < calm.score, `com vigia ${wary.score}, sem ${calm.score}`);
});
