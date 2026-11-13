import type { AreaExit, AreaMap } from "./tiledMap";

/**
 * O GRAFO DAS ÁREAS e a viagem entre as que o grupo já pisou.
 *
 * O mundo não tem um mapa próprio: é o que as saídas de cada mapa formam (ver
 * ./areas.ts). Uma ligação é uma saída ABERTA agora (`open`, que lê o `if` e o
 * `unless` dela com a história): a estrada que a história ainda fecha não liga
 * nada, nem na viagem. Saída que leva a outro ponto da mesma área não conta.
 *
 * Viajar é andar o caminho de saída em saída, sem ver: chega-se pelo ponto da
 * última saída, e cada área no caminho gasta o tempo como se o grupo tivesse
 * entrado nela (o custo `area` do relógio, se a história disse que gasta).
 * Só se vai aonde já se esteve.
 */

export interface WorldLink {
  from: string;
  to: string;
  /** A saída, no mapa de `from`. */
  exit: AreaExit;
}

export type ExitOpen = (exit: AreaExit) => boolean;

/** Todas as ligações abertas entre as áreas de `maps`, na ordem dos mapas e das saídas. */
export function worldLinks(maps: Readonly<Record<string, AreaMap>>, open: ExitOpen): WorldLink[] {
  return Object.entries(maps).flatMap(([from, map]) =>
    map.exits.filter((exit) => exit.area !== from && exit.area in maps && open(exit)).map((exit) => ({ from, to: exit.area, exit })),
  );
}

/**
 * O caminho mais curto de `from` a `to`, saída por saída (a primeira, no mapa
 * de `from`; a última leva a `to`). Undefined se não há, e vazio se já se está lá.
 * `through` diz por quais áreas se pode passar (sem ela, qualquer uma).
 */
export function travelRoute(
  maps: Readonly<Record<string, AreaMap>>,
  from: string,
  to: string,
  open: ExitOpen,
  through?: ReadonlySet<string>,
): AreaExit[] | undefined {
  if (from === to) return [];
  const links = worldLinks(maps, open);
  const came = new Map<string, WorldLink>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const here = queue.shift()!;
    for (const link of links) {
      if (link.from !== here || seen.has(link.to)) continue;
      if (through && link.to !== to && !through.has(link.to)) continue;
      seen.add(link.to);
      came.set(link.to, link);
      if (link.to === to) {
        const route: AreaExit[] = [];
        for (let at = to; at !== from; at = came.get(at)!.from) route.unshift(came.get(at)!.exit);
        return route;
      }
      queue.push(link.to);
    }
  }
  return undefined;
}

/** Um destino da viagem: a área, o ponto em que se chega e quantas áreas se cruza pra chegar (contando ela). */
export interface TravelSpot {
  area: string;
  spawn: string;
  steps: number;
}

/**
 * Pra onde o grupo pode viajar de `from`: as áreas já pisadas (`visited`) a que
 * um caminho de saídas abertas chega, passando só por áreas já pisadas (não se
 * atravessa sem ver o que nunca se viu). A de agora não entra. Na ordem de `visited`.
 */
export function travelSpots(
  maps: Readonly<Record<string, AreaMap>>,
  from: string,
  visited: readonly string[],
  open: ExitOpen,
): TravelSpot[] {
  const known = new Set(visited);
  return visited.flatMap((area) => {
    if (area === from || !(area in maps)) return [];
    const route = travelRoute(maps, from, area, open, known);
    if (!route || route.length === 0) return [];
    return [{ area, spawn: route[route.length - 1].spawn, steps: route.length }];
  });
}
