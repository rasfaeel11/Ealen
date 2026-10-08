import { distance, hasLineOfSight, inBounds, samePos, tileAt, type Grid, type Pos } from "./grid";
import type { Dice } from "./rng";
import type { Ability, Encounter } from "./types";

/**
 * Superfícies: o que uma habilidade (ou um barril arrebentado) deixa NO CHÃO
 * por algumas rodadas. Não é terreno: é uma camada por cima dele, que mora
 * na própria luta (`Encounter.surfaces`) e acaba com ela.
 *
 * Como as condições, uma superfície é só dados: o motor não conhece "Chamas"
 * pelo nome, ele olha as marcas (`damage`, `moveCost`). Um quadrado tem no
 * máximo uma; a nova substitui a velha.
 */
export interface SurfaceTemplate {
  id: string;
  name: string;
  /** Fere quem ENTRA no quadrado e quem COMEÇA o turno nele. Sem rolagem de ataque, sem armadura, sem guarda. */
  damage?: Dice;
  /** Custo de entrar no quadrado, quando maior que o do terreno. */
  moveCost?: number;
}

export const SURFACES = {
  fire: { id: "fire", name: "Chamas", damage: { count: 1, sides: 6 } },
  frost: { id: "frost", name: "Geada", moveCost: 2 },
} satisfies Record<string, SurfaceTemplate>;

export type SurfaceId = keyof typeof SURFACES;

/** Uma superfície de pé num quadrado. `roundsLeft` cai no começo de cada rodada; em 0 ela some. */
export interface Surface {
  pos: Pos;
  id: SurfaceId;
  roundsLeft: number;
}

export function surfaceAt(encounter: Encounter, pos: Pos): SurfaceTemplate | undefined {
  const surface = encounter.surfaces.find((candidate) => samePos(candidate.pos, pos));
  return surface && SURFACES[surface.id];
}

/** Quanto de movimento custa entrar em `pos`: o do terreno ou o da superfície, o que for maior. */
export function enterCost(encounter: Encounter, pos: Pos): number {
  return Math.max(tileAt(encounter.grid, pos)?.moveCost ?? 1, surfaceAt(encounter, pos)?.moveCost ?? 1);
}

/** O dano médio que a superfície de `pos` causa a cada vez que pega alguém (0 onde não há nenhuma que fira). */
export function surfaceHarm(encounter: Encounter, pos: Pos): number {
  const dice = surfaceAt(encounter, pos)?.damage;
  return dice ? (dice.count * (dice.sides + 1)) / 2 : 0;
}

/**
 * Até onde uma superfície se espalha a partir de `center`: todo quadrado do
 * raio que o centro enxerga. Onde ninguém pisa (parede, água) não fica nada.
 */
export function spreadTiles(grid: Grid, center: Pos, radius: number): Pos[] {
  const tiles: Pos[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y++) {
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      const pos = { x, y };
      if (!inBounds(grid, pos) || tileAt(grid, pos)!.blocksMove) continue;
      if (distance(pos, center) > 0 && !hasLineOfSight(grid, center, pos)) continue;
      tiles.push(pos);
    }
  }
  return tiles;
}

/**
 * Os quadrados em que `ability`, mirada em `target`, deixa a superfície
 * dela: o quadrado mirado ou, numa área, o raio todo.
 */
export function surfaceTiles(encounter: Encounter, ability: Ability, target: Pos): Pos[] {
  return ability.surface ? spreadTiles(encounter.grid, target, ability.radius ?? 0) : [];
}
