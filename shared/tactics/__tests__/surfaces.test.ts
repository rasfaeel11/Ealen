import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  findPath,
  findUnit,
  planTurn,
  reachableTiles,
  samePos,
  type Encounter,
  type Pos,
  type SurfaceId,
} from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

function lay(encounter: Encounter, id: SurfaceId, ...tiles: Pos[]): void {
  for (const pos of tiles) encounter.surfaces.push({ pos, id, roundsLeft: 3 });
}

function duel(rows: string[], overrides: Parameters<typeof makeUnit>[3] = {}, seed = 1) {
  return setup(
    rows,
    (at) => [
      makeUnit("A", "party", at("A"), { attributes: { il: FIRST }, ...overrides }),
      makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
    ],
    seed,
  ).encounter;
}

test("o Entropista deixa o chão do alvo em chamas, acerte ou erre, e elas queimam quem começa o turno ali", () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const encounter = duel(["A....E"], { characterClass: "entropista", attributes: { il: FIRST } }, seed);
    const target = { x: 5, y: 0 };

    const cast = run(encounter, { type: "ability", unitId: "A", abilityId: "entropista.heavy_attack", target });
    const [created] = eventsOf(cast, "surfaceCreated");
    assert.deepEqual({ id: created.surfaceId, tiles: created.tiles, rounds: created.rounds }, { id: "fire", tiles: [target], rounds: 2 });
    // O chão pegou fogo DEPOIS do golpe: o alvo não queima na hora.
    assert.equal(eventsOf(cast, "surfaceTriggered").length, 0);

    const hpBefore = findUnit(encounter, "E")!.currentHp;
    const turn = run(encounter, { type: "endTurn", unitId: "A" });
    const types = turn.map((event) => event.type);
    assert.deepEqual(types.slice(types.indexOf("turnStarted")), ["turnStarted", "surfaceTriggered", "damage"]);

    const [burn] = eventsOf(turn, "damage");
    assert.ok(burn.amount >= 1 && burn.amount <= 6);
    assert.equal(findUnit(encounter, "E")!.currentHp, hpBefore - burn.amount);
  }
});

test("a superfície dura as rodadas dela e some", () => {
  const encounter = duel(["A....E"], { characterClass: "entropista", attributes: { il: FIRST } });
  run(encounter, { type: "ability", unitId: "A", abilityId: "entropista.heavy_attack", target: { x: 5, y: 0 } });

  run(encounter, { type: "endTurn", unitId: "A" });
  const second = run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(encounter.round, 2);
  assert.equal(eventsOf(second, "surfaceExpired").length, 0);
  assert.equal(encounter.surfaces.length, 1);

  // Ainda queima na segunda rodada.
  assert.equal(eventsOf(run(encounter, { type: "endTurn", unitId: "A" }), "surfaceTriggered").length, 1);

  const third = run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(encounter.round, 3);
  assert.deepEqual(eventsOf(third, "surfaceExpired")[0].tiles, [{ x: 5, y: 0 }]);
  assert.deepEqual(encounter.surfaces, []);
});

test("atravessar as chamas queima no passo em que se pisa nelas, e o movimento segue", () => {
  const encounter = duel(["A...E"]);
  lay(encounter, "fire", { x: 2, y: 0 });

  const events = run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  assert.deepEqual(
    events.map((event) => event.type),
    ["moved", "surfaceTriggered", "damage", "moved"],
  );
  assert.deepEqual(eventsOf(events, "moved")[0].path, [{ x: 1, y: 0 }, { x: 2, y: 0 }]);
  assert.deepEqual(findUnit(encounter, "A")!.pos, { x: 3, y: 0 });
  assert.equal(findUnit(encounter, "A")!.currentHp, 30 - eventsOf(events, "damage")[0].amount);
});

test("quem cai nas chamas no meio do caminho para ali", () => {
  const encounter = duel(["A...E"], { currentHp: 1 });
  lay(encounter, "fire", { x: 2, y: 0 });

  const events = run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  assert.deepEqual(findUnit(encounter, "A")!.pos, { x: 2, y: 0 });
  assert.equal(eventsOf(events, "death").length, 1);
  assert.equal(encounter.winner, "enemy");
});

test("entre dois caminhos do mesmo custo, anda-se pelo que não queima", () => {
  const encounter = duel(["A....E", "......"]);
  lay(encounter, "fire", { x: 1, y: 0 }, { x: 2, y: 0 });

  const route = findPath(encounter, findUnit(encounter, "A")!, { x: 3, y: 0 })!;
  assert.equal(route.cost, 3);
  assert.equal(route.hazard, 0);
  assert.ok(route.path.every((step) => !encounter.surfaces.some((surface) => samePos(surface.pos, step))));

  // Sem volta possível, o caminho passa pelo fogo e avisa quanto isso custa em média.
  const corridor = duel(["A...E"]);
  lay(corridor, "fire", { x: 2, y: 0 });
  assert.equal(findPath(corridor, findUnit(corridor, "A")!, { x: 3, y: 0 })!.hazard, 3.5);
});

test("a geada prende o passo: entrar nela custa o dobro", () => {
  const encounter = duel(["A......E"]);
  lay(encounter, "frost", { x: 1, y: 0 }, { x: 2, y: 0 });

  const costs = new Map(reachableTiles(encounter, findUnit(encounter, "A")!).map((tile) => [tile.pos.x, tile.cost]));
  assert.equal(costs.get(1), 2);
  assert.equal(costs.get(2), 4);
  assert.equal(costs.get(3), 5);
  assert.equal(costs.has(5), false);
});

test("a área do Cantor deixa geada em todo o raio, menos onde ninguém pisa", () => {
  const { encounter } = setup(["A.....", "....E.", "....#."], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const events = run(encounter, {
    type: "ability",
    unitId: "A",
    abilityId: "cantor_de_ealen.heavy_attack",
    target: { x: 4, y: 1 },
  });

  const [created] = eventsOf(events, "surfaceCreated");
  assert.equal(created.surfaceId, "frost");
  assert.equal(created.tiles.length, 8);
  assert.ok(!created.tiles.some((pos) => samePos(pos, { x: 4, y: 2 })), "a parede não fica coberta de geada");
});

test("quem cai ao começar o turno nas chamas perde a vez — e a luta, se era o último", () => {
  const { encounter } = setup(["A.EF"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 1, attributes: { il: 50 } }),
    makeUnit("F", "enemy", at("F")),
  ]);
  lay(encounter, "fire", { x: 2, y: 0 });

  const events = run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(eventsOf(events, "death")[0].unit, "E");
  assert.equal(activeUnit(encounter)!.id, "F");

  const last = setup(["A.E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 1 }),
  ]).encounter;
  lay(last, "fire", { x: 2, y: 0 });
  const ending = run(last, { type: "endTurn", unitId: "A" });
  assert.equal(last.winner, "party");
  assert.equal(ending.at(-1)!.type, "battleEnded");
});

test("ser arremessado pra dentro das chamas queima", () => {
  let pushed = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const encounter = duel(["AE..."], {}, seed);
    lay(encounter, "fire", { x: 3, y: 0 });
    const events = run(encounter, {
      type: "ability",
      unitId: "A",
      abilityId: "guardiao.heavy_attack",
      target: { x: 1, y: 0 },
    });
    if (eventsOf(events, "pushed").length === 0) continue;

    pushed++;
    const types = events.map((event) => event.type);
    assert.deepEqual(types.slice(types.indexOf("pushed")), ["pushed", "surfaceTriggered", "damage"]);
  }
  assert.ok(pushed > 0, "algum golpe deveria ter acertado");
});

test("a IA não fica parada no fogo podendo bater do quadrado ao lado, nem corta por ele à toa", () => {
  const { encounter } = setup([".....", ".AE..", "....."], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]);
  lay(encounter, "fire", { x: 1, y: 1 });

  const plan = planTurn(encounter);
  assert.notDeepEqual(plan.tile, { x: 1, y: 1 });
  assert.ok(plan.action, "continua batendo");

  const chase = setup(["A.....E", "......."], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
  lay(chase, "fire", { x: 5, y: 0 }, { x: 5, y: 1 });
  // O único quadrado colado no alvo ao alcance está em chamas: fica um passo antes em vez de se queimar por nada.
  const approach = planTurn(chase);
  assert.ok(!chase.surfaces.some((surface) => samePos(surface.pos, approach.tile)));
});
