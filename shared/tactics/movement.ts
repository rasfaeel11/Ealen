import { inBounds, posOfIndex, stepNeighbors, tileIndex, type Pos } from "./grid";
import type { Encounter, Unit } from "./types";
import { isAlive } from "./units";

/**
 * Por onde alguém consegue andar neste turno.
 *
 * Regras: parede e inimigo de pé barram o caminho; aliado deixa passar mas
 * não deixa parar em cima; terreno difícil custa mais; diagonal custa o
 * mesmo que reto e não corta quina (ver stepNeighbors em ./grid.ts).
 */

interface Visit {
  cost: number;
  /** Índice do quadrado de onde se chegou aqui; -1 no ponto de partida. */
  prev: number;
  /** Falso no ponto de partida e em cima de aliado: dá pra passar, não pra ficar. */
  canStop: boolean;
}

/** Dijkstra a partir de onde `unit` está, limitado ao movimento que resta. */
function explore(encounter: Encounter, unit: Unit): Map<number, Visit> {
  const { grid } = encounter;
  const occupants = new Map<number, Unit>();
  for (const other of encounter.units) {
    if (other !== unit && isAlive(other)) occupants.set(tileIndex(grid, other.pos), other);
  }

  const start = tileIndex(grid, unit.pos);
  const visits = new Map<number, Visit>([[start, { cost: 0, prev: -1, canStop: false }]]);
  const open = [start];

  while (open.length > 0) {
    let cheapest = 0;
    for (let i = 1; i < open.length; i++) {
      if (visits.get(open[i])!.cost < visits.get(open[cheapest])!.cost) cheapest = i;
    }
    const current = open.splice(cheapest, 1)[0];
    const currentCost = visits.get(current)!.cost;

    for (const next of stepNeighbors(grid, posOfIndex(grid, current))) {
      const index = tileIndex(grid, next);
      const occupant = occupants.get(index);
      if (occupant && occupant.team !== unit.team) continue;

      const cost = currentCost + grid.tiles[index].moveCost;
      if (cost > unit.turn.movement) continue;

      const known = visits.get(index);
      if (known && known.cost <= cost) continue;
      visits.set(index, { cost, prev: current, canStop: !occupant });
      if (!open.includes(index)) open.push(index);
    }
  }
  return visits;
}

export interface ReachableTile {
  pos: Pos;
  cost: number;
}

/** Todo quadrado em que `unit` pode terminar um movimento agora. */
export function reachableTiles(encounter: Encounter, unit: Unit): ReachableTile[] {
  const result: ReachableTile[] = [];
  for (const [index, visit] of explore(encounter, unit)) {
    if (visit.canStop) result.push({ pos: posOfIndex(encounter.grid, index), cost: visit.cost });
  }
  return result;
}

export interface Route {
  /** Quadrado a quadrado, sem o de partida, terminando no destino. */
  path: Pos[];
  cost: number;
}

/** O caminho mais barato até `to`, ou undefined se não dá pra terminar o movimento lá neste turno. */
export function findPath(encounter: Encounter, unit: Unit, to: Pos): Route | undefined {
  const { grid } = encounter;
  if (!inBounds(grid, to)) return undefined;

  const visits = explore(encounter, unit);
  const destination = visits.get(tileIndex(grid, to));
  if (!destination?.canStop) return undefined;

  const path: Pos[] = [];
  for (let index = tileIndex(grid, to); visits.get(index)!.prev !== -1; index = visits.get(index)!.prev) {
    path.unshift(posOfIndex(grid, index));
  }
  return { path, cost: destination.cost };
}
