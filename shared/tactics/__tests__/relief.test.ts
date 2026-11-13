import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIMB_COST,
  FALL_PER_STEP,
  SLAM_PER_TILE,
  attackEdge,
  findPath,
  gridFromAscii,
  hasLineOfSight,
  reachableTiles,
  startEncounter,
  type Encounter,
  type Pos,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, TEST_KIT, eventsOf, makeUnit, run } from "./helpers";

/**
 * O relevo: o chão tem altura (`elevation`), e ela pesa. Subir custa passo, atrás da crista não se vê, de cima se
 * mira por cima da mureta, e quem é tirado do lugar de cima do barranco cai.
 */

/**
 * Um desenho e, por baixo dele, as alturas: cada dígito de `heights` é a altura do quadrado na mesma posição (o
 * marcador de quem está ali não diz nada da altura).
 */
function terrain(rows: string[], heights: string[], place: (at: (marker: string) => Pos) => Unit[], seed = 1): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  heights.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) grid.tiles[y * grid.width + x].elevation = Number(row[x]);
  });
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed }).encounter;
}

/** `A` andando, com um inimigo longe pra luta não acabar antes. */
const lone = (at: (marker: string) => Pos) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"))];

test("subir um degrau custa um passo a mais; descer não custa", () => {
  const encounter = terrain(["A....", "....E"], ["00111", "00000"], lone);
  const hero = encounter.units[0];
  assert.equal(findPath(encounter, hero, { x: 2, y: 0 })!.cost, 2 + CLIMB_COST);
  assert.equal(findPath(encounter, hero, { x: 4, y: 0 })!.cost, 4 + CLIMB_COST);

  const down = terrain(["A....", "....E"], ["11100", "00000"], lone);
  assert.equal(findPath(down, down.units[0], { x: 4, y: 0 })!.cost, 4);
});

test("com o passo contado, quem está embaixo alcança menos chão em cima", () => {
  const flat = terrain(["A.......", ".......E"], ["00000000", "00000000"], lone);
  const hill = terrain(["A.......", ".......E"], ["01234567", "01234567"], lone);
  const farthest = (encounter: Encounter) => Math.max(...reachableTiles(encounter, encounter.units[0]).map((tile) => tile.pos.x));
  assert.ok(farthest(hill) < farthest(flat));
});

test("atrás da crista não se vê; de cima dela, sim", () => {
  const { grid } = gridFromAscii([".....", ".....", "....."]);
  for (let x = 0; x < 5; x++) grid.tiles[1 * 5 + x].elevation = 1;
  // De um lado ao outro da crista, os dois embaixo.
  assert.equal(hasLineOfSight(grid, { x: 2, y: 0 }, { x: 2, y: 2 }), false);
  // Quem está em cima enxerga os dois lados.
  assert.equal(hasLineOfSight(grid, { x: 2, y: 1 }, { x: 2, y: 2 }), true);
  // Do alto de um lado pro alto do outro, por cima da crista da mesma altura.
  for (let x = 0; x < 5; x++) grid.tiles[0 * 5 + x].elevation = 1;
  grid.tiles[2 * 5 + 2].elevation = 1;
  assert.equal(hasLineOfSight(grid, { x: 2, y: 0 }, { x: 2, y: 2 }), true);
});

test("de cima se mira por cima da mureta: a cobertura do alvo não conta, e o acerto sobe", () => {
  const rows = ["A..oE"];
  const below = terrain(rows, ["00000"], (at) => [makeUnit("A", "party", at("A"), { kit: [TEST_KIT.tiro] }), makeUnit("E", "enemy", at("E"))]);
  const above = terrain(rows, ["11000"], (at) => [makeUnit("A", "party", at("A"), { kit: [TEST_KIT.tiro] }), makeUnit("E", "enemy", at("E"))]);
  const edge = (encounter: Encounter) => attackEdge(encounter, encounter.units[0], TEST_KIT.tiro, encounter.units[1]);
  assert.equal(edge(below).cover, true);
  assert.equal(edge(above).cover, false);
  assert.equal(edge(above).height, 1);
});

/** O empurrão de `A` em `E`, nas sementes em que acerta. */
function shoves(rows: string[], heights: string[], abilityId: string): TacticalEvent[][] {
  const hits: TacticalEvent[][] = [];
  for (let seed = 1; seed <= 16; seed++) {
    const encounter = terrain(
      rows,
      heights,
      (at) => [
        makeUnit("A", "party", at("A"), { kit: [TEST_KIT.empurrao, TEST_KIT.puxao], attributes: { olho: FIRST } }),
        makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
      ],
      seed,
    );
    const target = encounter.units[1].pos;
    const events = run(encounter, { type: "ability", unitId: "A", abilityId, target });
    const roll = eventsOf(events, "attackRoll")[0]?.outcome;
    // O golpe que pega por pouco pode ser esquivado: não houve empurrão.
    if (roll !== "miss" && roll !== "fumble" && eventsOf(events, "dodged").length === 0) hits.push(events);
  }
  assert.ok(hits.length > 0, "algum golpe deveria ter acertado");
  return hits;
}

test("empurrado de cima do barranco, o alvo cai e leva a queda por degrau", () => {
  for (const events of shoves(["AE..."], ["11000"], TEST_KIT.empurrao.id)) {
    const [pushed] = eventsOf(events, "pushed");
    assert.deepEqual(pushed.to, { x: 3, y: 0 });
    const [fell] = eventsOf(events, "fell");
    assert.equal(fell.steps, 1);
    const index = events.findIndex((event) => event.type === "fell");
    const next = events[index + 1];
    assert.equal(next.type, "damage");
    assert.equal((next as Extract<TacticalEvent, { type: "damage" }>).amount, FALL_PER_STEP);
  }
});

test("barranco não se sobe empurrado: o alvo bate nele como numa parede", () => {
  for (const events of shoves(["AE..."], ["00111"], TEST_KIT.empurrao.id)) {
    assert.equal(eventsOf(events, "pushed").length, 0);
    const [slam] = eventsOf(events, "slammed");
    assert.deepEqual(slam.pos, { x: 2, y: 0 });
    const index = events.findIndex((event) => event.type === "slammed");
    assert.equal((events[index + 1] as Extract<TacticalEvent, { type: "damage" }>).amount, 2 * SLAM_PER_TILE);
  }
});

test("puxado de cima pra baixo, também se cai", () => {
  for (const events of shoves(["A..E"], ["0011"], TEST_KIT.puxao.id)) {
    assert.ok(eventsOf(events, "pushed").length > 0);
    assert.equal(eventsOf(events, "fell")[0]?.steps, 1);
  }
});
