import assert from "node:assert/strict";
import { test } from "node:test";
import { breathed, closeLegs, idleColumns, standingPose, swayed, type Cell } from "../../src/game/idlePose";

const SIZE = 20;

function rowsOf(cell: Cell): string[] {
  return Array.from({ length: cell.height }, (_, y) =>
    Array.from({ length: cell.width }, (_, x) => (cell.data[(y * cell.width + x) * 4 + 3] > 0 ? "#" : ".")).join(""),
  );
}

/** Um boneco de 20x20: tronco reto até a linha 13, e dali as pernas abrem até `gap` colunas entre os pés. `lift` o põe no ar. */
function figure(gap: number, lift = 0): Cell {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  const paint = (x: number, y: number) => data.fill(255, (y * SIZE + x) * 4, (y * SIZE + x + 1) * 4);
  for (let y = 0; y < SIZE - lift; y++) {
    if (y < 14) for (let x = 8; x < 12; x++) paint(x, y);
    else {
      const open = Math.round((gap * (y - 13)) / 6);
      paint(9 - (open >> 1), y);
      paint(10 + open - (open >> 1), y);
    }
  }
  return { width: SIZE, height: SIZE, data };
}

function feetWidth(cell: Cell): number {
  const last = rowsOf(cell).at(-1)!;
  return last.lastIndexOf("#") - last.indexOf("#") + 1;
}

test("de perfil, fica de pé o quadro de pés mais juntos, encostado no chão", () => {
  const stand = standingPose([figure(10), figure(2, 1), figure(10), figure(6, 1)], true);
  assert.equal(feetWidth(stand), 4);
});

test("de frente, a passada não é fechada: as pernas ficam como vieram", () => {
  const step = figure(10);
  assert.equal(feetWidth(standingPose([step, step, step, step], false)), feetWidth(step));
});

test("passada aberta sem quadro melhor: as pernas fecham e o tronco não sai do lugar", () => {
  const stride = figure(12);
  const closed = closeLegs(stride);
  assert.ok(feetWidth(closed) < feetWidth(stride));
  assert.deepEqual(rowsOf(closed).slice(0, 13), rowsOf(stride).slice(0, 13));
});

test("pés já juntos ficam como estão", () => {
  const together = figure(0);
  assert.equal(closeLegs(together), together);
});

test("bicho não fecha pernas: a pose é o primeiro quadro", () => {
  const steps = [figure(12), figure(2), figure(4), figure(6)];
  assert.equal(standingPose(steps, true, false), steps[0]);
});

test("respirando, o tronco desce e os pés não saem do chão", () => {
  const stand = figure(4);
  const out = rowsOf(breathed(stand, 2));
  assert.equal(out[0], ".".repeat(SIZE));
  assert.equal(out[2], rowsOf(stand)[0]);
  assert.deepEqual(out.slice(-4), rowsOf(stand).slice(-4));
});

test("pendendo, a cabeça vai pro lado e os pés não saem do chão", () => {
  const stand = figure(4);
  const out = rowsOf(swayed(stand, 2));
  assert.equal(out[0].indexOf("#"), rowsOf(stand)[0].indexOf("#") + 2);
  assert.equal(out.at(-1), rowsOf(stand).at(-1));
});

test("todo quadro tem o tamanho da pose, e o primeiro é a própria pose", () => {
  const stand = figure(4);
  const columns = idleColumns(stand);
  assert.equal(columns[0], stand);
  for (const cell of columns) assert.equal(cell.data.length, stand.data.length);
});
