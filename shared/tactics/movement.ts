import { distance, elevationAt, inBounds, posOfIndex, stepNeighbors, tileAt, tileIndex, type Pos } from "./grid";
import { enterCost, surfaceHarm } from "./surfaces";
import type { Encounter, Unit } from "./types";
import { isAlive, unitAt } from "./units";
import { strikesFirst } from "./styles";

/**
 * RECUAR (`combate` §3.2): terminar o movimento longe de um inimigo de pé que
 * estava colado em quem anda. Andar de lado, sem sair de perto dele, não é
 * recuar; ser empurrado ou puxado também não (não é movimento de quem vai).
 * Devolve de quem `unit` recuaria indo até `to`.
 */
export function retreatsFrom(encounter: Encounter, unit: Unit, to: Pos): Unit[] {
  return encounter.units.filter(
    (other) => other.team !== unit.team && isAlive(other) && distance(other.pos, unit.pos) === 1 && distance(other.pos, to) > 1,
  );
}

/**
 * O VOTO DO GRYSKAR (`combate` §4.2, `gryskar`): não recuar o primeiro passo.
 * Quem é do Bate-Primeiro não Recua antes de dar o primeiro golpe da luta dele
 * (`swung`): o primeiro passo é pra frente. Depois do golpe, recua como qualquer um.
 */
export function holdsGround(unit: Unit): boolean {
  return strikesFirst(unit) && !unit.swung;
}

/**
 * Por onde alguém consegue andar neste turno.
 *
 * Regras: parede e inimigo de pé barram o caminho; aliado deixa passar mas
 * não deixa parar em cima; terreno difícil custa mais, e subir um degrau
 * também (ver CLIMB_COST em ./grid.ts); diagonal custa o
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

  // O voto do Gryskar: dá pra passar por onde quiser, mas não parar longe de quem está colado nele.
  const vow = holdsGround(unit) && encounter.units.some((other) => other.team !== unit.team && isAlive(other) && distance(other.pos, unit.pos) === 1);
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

      const cost = here.cost + enterCost(encounter, next, posOfIndex(grid, current));
      if (cost > unit.turn.movement) continue;

      const reached = { cost, hazard: here.hazard + surfaceHarm(encounter, next) };
      const known = visits.get(index);
      if (known && !better(reached, known)) continue;
      visits.set(index, { ...reached, prev: current, canStop: !occupant && !(vow && retreatsFrom(encounter, unit, next).length > 0) });
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

/** Quanto dói cada degrau de queda: quem é empurrado (ou puxado) de um chão mais alto pra um mais baixo. */
export const FALL_PER_STEP = 3;

export interface ForcedPath {
  /** Onde o alvo para. */
  to: Pos;
  /** Quantos quadrados de deslocamento sobraram quando ele parou no que barra. */
  left: number;
  /** O quadrado em que ele parou de encontro (parede, corpo, barranco acima dele). */
  stop?: Pos;
  /** Quantos degraus ele desceu no caminho. */
  fall: number;
  /**
   * Parou na BEIRA D'ÁGUA (`combate` §4.1: a borda do barco e a margem prensam):
   * quem é de terra, empurrado do seco pra água, finca o pé na beira e fica
   * ali. Prensa, mas não bate: água não é parede.
   */
  edge?: boolean;
}

/**
 * Por onde vai quem é empurrado (distância positiva, pra longe de `origin`) ou
 * puxado (negativa, pra perto), em linha reta, um quadrado por vez: para no
 * que barra o passo, num corpo ou num chão mais alto que o dele (barranco não
 * se sobe empurrado). Quem é de terra para na beira d'água (`edge`); o bicho
 * de rio, não. Descer degrau conta como queda. O peso (`heft`) tira
 * quadrados. Só a conta: quem move é push em ./engine.ts, e a IA lê o mesmo.
 */
export function forcedPath(encounter: Encounter, origin: Pos, target: Unit, pushDistance: number): ForcedPath | undefined {
  const direction = Math.sign(pushDistance);
  const dx = Math.sign(target.pos.x - origin.x) * direction;
  const dy = Math.sign(target.pos.y - origin.y) * direction;
  if (dx === 0 && dy === 0) return undefined;

  const { grid } = encounter;
  const steps = Math.abs(pushDistance) - (target.heft ?? 0);
  let pos = target.pos;
  let fall = 0;
  for (let step = 0; step < steps; step++) {
    const next = { x: pos.x + dx, y: pos.y + dy };
    const rise = elevationAt(grid, next) - elevationAt(grid, pos);
    if ((tileAt(grid, next)?.blocksMove ?? true) || unitAt(encounter, next) || rise > 0) {
      return { to: pos, left: steps - step, stop: next, fall };
    }
    if (!target.river && !tileAt(grid, pos)?.water && tileAt(grid, next)?.water) {
      return { to: pos, left: steps - step, stop: next, fall, edge: true };
    }
    fall -= Math.min(0, rise);
    pos = next;
  }
  return { to: pos, left: 0, fall };
}
