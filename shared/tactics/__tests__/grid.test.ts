import assert from "node:assert/strict";
import { test } from "node:test";
import { distance, gridFromAscii, hasLineOfSight, posOfIndex, stepNeighbors } from "../index";

test("diagonal custa o mesmo que reto", () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 3 }), 3);
  assert.equal(distance({ x: 0, y: 0 }, { x: 5, y: 2 }), 5);
});

test("parede barra a visão, obstáculo baixo não", () => {
  const { grid, markers } = gridFromAscii(["A.#.B", "C.o.D"]);
  assert.equal(hasLineOfSight(grid, markers.A[0], markers.B[0]), false);
  assert.equal(hasLineOfSight(grid, markers.C[0], markers.D[0]), true);
});

test("linha de visão vale igual nos dois sentidos", () => {
  const { grid } = gridFromAscii(["....#...", "..#.....", ".....#..", ".#......", "....#..."]);
  for (let a = 0; a < grid.tiles.length; a++) {
    for (let b = 0; b < grid.tiles.length; b++) {
      const from = posOfIndex(grid, a);
      const to = posOfIndex(grid, b);
      assert.equal(hasLineOfSight(grid, from, to), hasLineOfSight(grid, to, from));
    }
  }
});

test("não se enxerga pela fresta entre duas paredes na diagonal", () => {
  const { grid, markers } = gridFromAscii(["A#", "#B"]);
  assert.equal(hasLineOfSight(grid, markers.A[0], markers.B[0]), false);
});

test("passo diagonal não corta quina", () => {
  const { grid, markers } = gridFromAscii(["A#", ".."]);
  const steps = stepNeighbors(grid, markers.A[0]);
  assert.deepEqual(steps, [{ x: 0, y: 1 }]);
});
