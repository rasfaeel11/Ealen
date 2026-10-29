import assert from "node:assert/strict";
import { test } from "node:test";
import { SLAM_PER_TILE, gridFromAscii, standProp, startEncounter, type Encounter, type TacticalEvent } from "../index";
import { FIRST, TEST_KIT, eventsOf, makeUnit, run } from "./helpers";

/**
 * O empurrão que bate (ver push em ../engine.ts): o armazém da guilda, em Ybytuguá, é luta de parede, caixote e
 * barril de óleo (AGENTS.md, task 35). Quem é empurrado contra o que barra o passo leva SLAM_PER_TILE por quadrado
 * que faltou andar; puxado, não.
 */

/** `A` empurra ou puxa `E`; `b` é um barril de óleo, `c` um caixote, `F` outro inimigo. */
function shove(rows: string[], seed: number): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  const props = [
    ...(markers.b ?? []).map((pos, index) => standProp(grid, `barril-${index}`, "barrel", pos)),
    ...(markers.c ?? []).map((pos, index) => standProp(grid, `caixote-${index}`, "crate", pos)),
  ];
  const units = [
    makeUnit("A", "party", markers.A[0], { kit: [TEST_KIT.empurrao, TEST_KIT.puxao], attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", markers.E[0], { currentHp: 500, maxHp: 500 }),
  ];
  if (markers.F) units.push(makeUnit("F", "enemy", markers.F[0], { currentHp: 500, maxHp: 500 }));
  return startEncounter({ grid, units, props, seed }).encounter;
}

/** Os eventos de cada golpe que acertou, em várias sementes (o empurrão erra às vezes). */
function landed(rows: string[], abilityId: string, target: { x: number; y: number }): TacticalEvent[][] {
  const hits: TacticalEvent[][] = [];
  for (let seed = 1; seed <= 16; seed++) {
    const encounter = shove(rows, seed);
    const events = run(encounter, { type: "ability", unitId: "A", abilityId, target });
    if (eventsOf(events, "attackRoll")[0]?.outcome !== "miss" && eventsOf(events, "attackRoll")[0]?.outcome !== "fumble") {
      hits.push(events);
    }
  }
  assert.ok(hits.length > 0, "algum golpe deveria ter acertado");
  return hits;
}

/** O dano que veio logo depois do choque. */
function slamDamage(events: TacticalEvent[]): number {
  const index = events.findIndex((event) => event.type === "slammed");
  const next = events[index + 1];
  assert.equal(next?.type, "damage");
  return (next as Extract<TacticalEvent, { type: "damage" }>).amount;
}

test("empurrado direto contra a parede, o alvo bate com a força do empurrão inteiro", () => {
  for (const events of landed(["AE#"], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    assert.equal(eventsOf(events, "pushed").length, 0);
    const [slam] = eventsOf(events, "slammed");
    assert.deepEqual({ into: slam.into, pos: slam.pos }, { into: "wall", pos: { x: 2, y: 0 } });
    assert.equal(slamDamage(events), 2 * SLAM_PER_TILE);
  }
});

test("quem anda um quadrado antes da parede bate só com o que sobrou", () => {
  for (const events of landed(["AE.#"], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    const types = events.map((event) => event.type);
    assert.deepEqual(types.slice(types.indexOf("pushed"), types.indexOf("pushed") + 3), ["pushed", "slammed", "damage"]);
    assert.equal(slamDamage(events), SLAM_PER_TILE);
  }
});

test("empurrado com espaço sobrando, ninguém bate", () => {
  for (const events of landed(["AE..."], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    assert.equal(eventsOf(events, "slammed").length, 0);
  }
});

test("contra o barril de óleo, o barril quebra e derrama fogo", () => {
  for (const events of landed(["AEb"], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    const [slam] = eventsOf(events, "slammed");
    assert.deepEqual({ into: slam.into, name: slam.name }, { into: "prop", name: "Barril de óleo" });
    assert.equal(eventsOf(events, "propDestroyed")[0]?.prop, "barril-0");
    assert.equal(eventsOf(events, "surfaceCreated")[0]?.surfaceId, "fire");
  }
});

test("contra o caixote, o caixote leva o mesmo que o alvo", () => {
  for (const events of landed(["AEc"], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    assert.equal(eventsOf(events, "propDamaged")[0]?.amount, 2 * SLAM_PER_TILE);
  }
});

test("contra outro corpo, o alvo bate nele", () => {
  for (const events of landed(["AEF"], TEST_KIT.empurrao.id, { x: 1, y: 0 })) {
    const [slam] = eventsOf(events, "slammed");
    assert.deepEqual({ into: slam.into, name: slam.name }, { into: "unit", name: "F" });
  }
});

test("puxado, o alvo não bate em nada", () => {
  for (const events of landed(["A.E"], TEST_KIT.puxao.id, { x: 2, y: 0 })) {
    assert.equal(eventsOf(events, "slammed").length, 0);
  }
});
