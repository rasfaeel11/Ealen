import { inBounds, posOfIndex, stepNeighbors, tileIndex, type Pos } from "./grid";
import { enterCost, surfaceHarm } from "./surfaces";
import type { Encounter, Unit } from "./types";
import { isAlive } from "./units";

/**
 * Por onde alguém consegue andar neste turno.
 *
 * Regras: parede e inimigo de pé barram o caminho; aliado deixa passar mas
 * não deixa parar em cima; terreno difícil custa mais; diagonal custa o
 * mesmo que reto e não corta quina (ver stepNeighbors em ./grid.ts).
 *
 * Entre dois caminhos do mesmo custo, vale o que fere menos: ninguém corta
 * por dentro das chamas podendo dar a volta sem gastar mais. Se o caminho
 * mais curto passa por elas, é por elas que se vai — `hazard` avisa.
 */

interface Visit {
  cost: number;
  /** Dano médio das superfícies atravessadas até aqui (ver surfaceHarm). */
  hazard: number;
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
  const visits = new Map<number, Visit>([[start, { cost: 0, hazard: 0, prev: -1, canStop: false }]]);
  const better = (a: { cost: number; hazard: number }, b: { cost: number; hazard: number }) =>
    a.cost < b.cost || (a.cost === b.cost && a.hazard < b.hazard);
  const open = [start];

  while (open.length > 0) {
    let cheapest = 0;
    for (let i = 1; i < open.length; i++) {
      if (better(visits.get(open[i])!, visits.get(open[cheapest])!)) cheapest = i;
    }
    const current = open.splice(cheapest, 1)[0];
    const here = visits.get(current)!;

    for (const next of stepNeighbors(grid, posOfIndex(grid, current))) {
      const index = tileIndex(grid, next);
      const occupant = occupants.get(index);
      if (occupant && occupant.team !== unit.team) continue;

      const cost = here.cost + enterCost(encounter, next);
      if (cost > unit.turn.movement) continue;

      const reached = { cost, hazard: here.hazard + surfaceHarm(encounter, next) };
      const known = visits.get(index);
      if (known && !better(reached, known)) continue;
      visits.set(index, { ...reached, prev: current, canStop: !occupant });
      if (!open.includes(index)) open.push(index);
    }
  }
  return visits;
}

export interface ReachableTile {
  pos: Pos;
  cost: number;
  /** Dano médio que as superfícies do caminho causam a quem for até lá. */
  hazard: number;
}

/** Todo quadrado em que `unit` pode terminar um movimento agora. */
export function reachableTiles(encounter: Encounter, unit: Unit): ReachableTile[] {
  const result: ReachableTile[] = [];
  for (const [index, visit] of explore(encounter, unit)) {
    if (visit.canStop) result.push({ pos: posOfIndex(encounter.grid, index), cost: visit.cost, hazard: visit.hazard });
  }
  return result;
}

export interface Route {
  /** Quadrado a quadrado, sem o de partida, terminando no destino. */
  path: Pos[];
  cost: number;
  /** Dano médio que as superfícies do caminho causam. */
  hazard: number;
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
  return { path, cost: destination.cost, hazard: destination.hazard };
}
