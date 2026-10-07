/**
 * O tabuleiro do combate: uma grade de quadrados sobre o mesmo mapa em que
 * o jogador anda livre fora de luta. Aqui só existe terreno — quem está em
 * cima de cada quadrado é assunto de `Encounter.units`.
 *
 * Distância é a de D&D 5e: andar na diagonal custa o mesmo que andar reto
 * (Chebyshev). "Alcance 6" é um quadrado de 13x13 em volta de quem age.
 */

export interface Pos {
  x: number;
  y: number;
}

export interface Tile {
  /** Ninguém entra: parede, pedra, buraco. */
  blocksMove: boolean;
  /** Não se enxerga nem se mira através: parede sim, buraco não. */
  blocksSight: boolean;
  /** Quanto de movimento custa ENTRAR aqui. 1 = chão normal, 2 = terreno difícil. */
  moveCost: number;
}

export interface Grid {
  width: number;
  height: number;
  /** Linha a linha: o quadrado (x, y) está em `y * width + x`. */
  tiles: Tile[];
}

export function inBounds(grid: Grid, pos: Pos): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < grid.width && pos.y < grid.height;
}

export function tileIndex(grid: Grid, pos: Pos): number {
  return pos.y * grid.width + pos.x;
}

export function posOfIndex(grid: Grid, index: number): Pos {
  return { x: index % grid.width, y: Math.floor(index / grid.width) };
}

export function tileAt(grid: Grid, pos: Pos): Tile | undefined {
  return inBounds(grid, pos) ? grid.tiles[tileIndex(grid, pos)] : undefined;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Distância em quadrados, com diagonal valendo 1. */
export function distance(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function blocksMoveAt(grid: Grid, x: number, y: number): boolean {
  return tileAt(grid, { x, y })?.blocksMove ?? true;
}

function blocksSightAt(grid: Grid, x: number, y: number): boolean {
  return tileAt(grid, { x, y })?.blocksSight ?? true;
}

/**
 * Quadrados vizinhos em que o terreno deixa pisar, nas oito direções. Não
 * se corta quina: o passo diagonal só vale se os dois quadrados ortogonais
 * que ele "raspa" também estiverem livres.
 */
export function stepNeighbors(grid: Grid, pos: Pos): Pos[] {
  const result: Pos[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = pos.x + dx;
      const y = pos.y + dy;
      if (blocksMoveAt(grid, x, y)) continue;
      if (dx !== 0 && dy !== 0 && (blocksMoveAt(grid, x, pos.y) || blocksMoveAt(grid, pos.x, y))) continue;
      result.push({ x, y });
    }
  }
  return result;
}

/**
 * Linha de visão entre dois quadrados: traça uma reta (Bresenham) e falha
 * se algum quadrado NO MEIO do caminho bloqueia a visão — as pontas não
 * contam. A reta sempre sai da ponta de menor índice, pra que "A vê B" e
 * "B vê A" nunca discordem.
 */
export function hasLineOfSight(grid: Grid, from: Pos, to: Pos): boolean {
  const [a, b] = tileIndex(grid, from) <= tileIndex(grid, to) ? [from, to] : [to, from];
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  let x = a.x;
  let y = a.y;

  while (x !== b.x || y !== b.y) {
    const e2 = 2 * err;
    let nx = x;
    let ny = y;
    if (e2 > -dy) {
      err -= dy;
      nx += sx;
    }
    if (e2 < dx) {
      err += dx;
      ny += sy;
    }
    // Passo diagonal espremido entre duas paredes: não passa olhar nenhum.
    if (nx !== x && ny !== y && blocksSightAt(grid, nx, y) && blocksSightAt(grid, x, ny)) return false;

    x = nx;
    y = ny;
    if ((x !== b.x || y !== b.y) && blocksSightAt(grid, x, y)) return false;
  }
  return true;
}

const FLOOR: Tile = { blocksMove: false, blocksSight: false, moveCost: 1 };

const ASCII_TILES: Record<string, Tile> = {
  ".": FLOOR,
  "#": { blocksMove: true, blocksSight: true, moveCost: 1 },
  o: { blocksMove: true, blocksSight: false, moveCost: 1 },
  "~": { blocksMove: false, blocksSight: false, moveCost: 2 },
};

export interface AsciiGrid {
  grid: Grid;
  /** Onde apareceu cada caractere que não é terreno (ex: `markers.A[0]`). */
  markers: Record<string, Pos[]>;
}

/**
 * Monta uma grade a partir de um desenho em texto — pra testes e mapas
 * provisórios, enquanto os mapas de verdade não vêm do Tiled.
 *
 *   `.` chão   `#` parede   `o` obstáculo baixo (barra o passo, não a visão)
 *   `~` terreno difícil (custa 2)
 *
 * Qualquer outro caractere é chão e vira um marcador (posição de spawn).
 */
export function gridFromAscii(rows: string[]): AsciiGrid {
  const width = Math.max(...rows.map((row) => row.length));
  const tiles: Tile[] = [];
  const markers: Record<string, Pos[]> = {};

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const char = row[x] ?? ".";
      const tile = ASCII_TILES[char];
      if (!tile) (markers[char] ??= []).push({ x, y });
      tiles.push({ ...(tile ?? FLOOR) });
    }
  });

  return { grid: { width, height: rows.length, tiles }, markers };
}
