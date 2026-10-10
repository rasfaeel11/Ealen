import type * as Phaser from "phaser";
import type { PixelPos, Pos } from "@ealen/shared";

/**
 * As marcas que o combate põe no chão. A regra é uma só: o chão só ganha
 * marca onde alguma coisa está sendo MARCADA — o caminho que o clique faria,
 * quem dá pra mirar, a área que um golpe pega. Quadrado em que nada acontece
 * não aparece; não existe grade acesa.
 */

type Graphics = Phaser.GameObjects.Graphics;

const center = (tile: Pos, size: number): PixelPos => ({ x: (tile.x + 0.5) * size, y: (tile.y + 0.5) * size });

/** Quatro cantos em volta de um quadrado: "dá pra mirar aqui", sem tapar quem está nele. */
export function drawBrackets(g: Graphics, tile: Pos, size: number, color: number, alpha: number): void {
  const arm = Math.round(size / 4);
  const left = tile.x * size + 1;
  const top = tile.y * size + 1;
  const right = (tile.x + 1) * size - 1;
  const bottom = (tile.y + 1) * size - 1;
  g.lineStyle(1, color, alpha);
  for (const [x, dx] of [[left, arm], [right, -arm]] as const) {
    for (const [y, dy] of [[top, arm], [bottom, -arm]] as const) {
      g.lineBetween(x, y, x + dx, y);
      g.lineBetween(x, y, x, y + dy);
    }
  }
}

/**
 * Um conjunto de quadrados marcado como UMA mancha: preenchimento leve e o
 * contorno só por fora — as divisas entre quadrados vizinhos não se desenham.
 */
export function drawArea(g: Graphics, tiles: Pos[], size: number, color: number, fill = 0.16, edge = 0.85): void {
  const inside = new Set(tiles.map((tile) => `${tile.x},${tile.y}`));
  g.fillStyle(color, fill);
  for (const tile of tiles) g.fillRect(tile.x * size, tile.y * size, size, size);

  g.lineStyle(1, color, edge);
  for (const { x, y } of tiles) {
    const left = x * size;
    const top = y * size;
    if (!inside.has(`${x},${y - 1}`)) g.lineBetween(left, top + 0.5, left + size, top + 0.5);
    if (!inside.has(`${x},${y + 1}`)) g.lineBetween(left, top + size - 0.5, left + size, top + size - 0.5);
    if (!inside.has(`${x - 1},${y}`)) g.lineBetween(left + 0.5, top, left + 0.5, top + size);
    if (!inside.has(`${x + 1},${y}`)) g.lineBetween(left + size - 0.5, top, left + size - 0.5, top + size);
  }
}

/** Onde se vai parar: um losango pequeno no meio do quadrado. */
export function drawStop(g: Graphics, tile: Pos, size: number, color: number, alpha = 1): void {
  const { x, y } = center(tile, size);
  const reach = size / 4;
  g.fillStyle(color, alpha * 0.35);
  g.lineStyle(1, color, alpha);
  g.beginPath();
  g.moveTo(x, y - reach);
  g.lineTo(x + reach, y);
  g.lineTo(x, y + reach);
  g.lineTo(x - reach, y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** A trajetória: uma linha de `from` por cada quadrado de `path`, com o ponto de parada no fim. */
export function drawTrail(g: Graphics, from: Pos, path: Pos[], size: number, color: number): void {
  if (path.length === 0) return;
  const points = [from, ...path].map((tile) => center(tile, size));
  const last = points[points.length - 1];
  const before = points[points.length - 2];
  // A linha para na borda do losango, não no meio dele.
  const length = Math.hypot(last.x - before.x, last.y - before.y);
  const short = Math.min(1, size / 4 / length);
  const end = { x: last.x - (last.x - before.x) * short, y: last.y - (last.y - before.y) * short };

  g.lineStyle(1, color, 0.9);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1, -1)) g.lineTo(point.x, point.y);
  g.lineTo(end.x, end.y);
  g.strokePath();
  drawStop(g, path[path.length - 1], size, color);
}

/** Uma linha tracejada entre dois quadrados: de quem mira até onde o golpe vai. */
export function drawReach(g: Graphics, from: Pos, to: Pos, size: number, color: number): void {
  const a = center(from, size);
  const b = center(to, size);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  // Colado no alvo não há o que ligar.
  if (length <= size * 1.5) return;
  const dash = 3;
  const gap = 3;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  g.lineStyle(1, color, 0.55);
  // Começa e acaba a meio quadrado de cada ponta: não risca por cima de quem bate nem de quem apanha.
  for (let at = size / 2; at < length - size / 2; at += dash + gap) {
    const until = Math.min(at + dash, length - size / 2);
    g.lineBetween(a.x + ux * at, a.y + uy * at, a.x + ux * until, a.y + uy * until);
  }
}
