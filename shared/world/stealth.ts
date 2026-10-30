import { distance, hasLineOfSight, type Pos } from "../tactics/grid";
import { tileOfPixel, type AreaEnemy, type AreaMap, type Heading } from "./tiledMap";

/**
 * Chegar escondido, ou não. Nada aqui é obrigatório: é o jogador quem
 * escolhe como uma luta começa, e cada jeito tem o seu preço.
 *
 * - ANDANDO à vista, quem entra no olhar de um inimigo (o cone à frente
 *   dele, SIGHT_RANGE quadrados, com linha de visão) ou passa a HEAR_RANGE
 *   dele, por qualquer lado, é percebido na hora: luta comum.
 * - ESGUEIRANDO (agachado, devagar), não se ouve ninguém, e quem só está
 *   no olhar dele não é visto na hora: ele DESCONFIA (`suspicion`, de 0 a
 *   1), mais depressa quanto mais perto. Chegou a 1, o grupo é PEGO — e
 *   pego no meio do bote, entra na luta Surpreso. Saiu do olhar, a
 *   desconfiança baixa. Quem chega a CLOSE_RANGE na frente dele é pego na
 *   hora. Escondido, o grupo pode EMBOSCAR: o outro lado entra Surpreso.
 * - Começar a luta à vista, de propósito, é a INVESTIDA (chutar a porta,
 *   ver `charge` no motor): o grupo age antes de todo mundo, e a Força pode
 *   deixar o outro lado Abalado.
 * - A luta que a história abre (um diálogo que acaba em espada) não dá
 *   vantagem a ninguém.
 *
 * Grupo `passive` não olha ninguém: a luta dele é da história.
 */

/** Até quantos quadrados à frente um inimigo enxerga. */
export const SIGHT_RANGE = 6;
/** Até quantos quadrados, por qualquer lado, um inimigo ouve quem anda à vista. */
export const HEAR_RANGE = 2;
/** Tão perto, na frente dele, nem esgueirando: é pego na hora. */
export const CLOSE_RANGE = 1;
/** Quantos segundos de olhar, do limite da vista, até desconfiar de vez. Mais perto, mais depressa. */
export const SUSPICION_SECONDS = 2.4;
/** Quanto a desconfiança baixa por segundo fora do olhar. */
export const CALM_PER_SECOND = 0.35;

const STEP: Record<Heading, Pos> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * `tile` está no cone à frente de quem olha de `from` pra `heading`: um
 * quarto de volta (45° pra cada lado), o próprio quadrado não conta.
 */
export function inCone(from: Pos, heading: Heading, tile: Pos): boolean {
  const step = STEP[heading];
  const dx = tile.x - from.x;
  const dy = tile.y - from.y;
  const ahead = dx * step.x + dy * step.y;
  const aside = Math.abs(dx * step.y - dy * step.x);
  return ahead > 0 && aside <= ahead;
}

/** O inimigo `enemy` vê `tile`: está no cone dele, a SIGHT_RANGE, e nada barra a vista. */
export function sees(map: AreaMap, enemy: AreaEnemy, tile: Pos): boolean {
  const from = tileOfPixel(map, enemy);
  return (
    distance(from, tile) <= SIGHT_RANGE && inCone(from, enemy.facing ?? "down", tile) && hasLineOfSight(map.grid, from, tile)
  );
}

/** Os quadrados que `enemy` vê agora: o que a tela pinta pra quem se esgueira. */
export function sightTiles(map: AreaMap, enemy: AreaEnemy): Pos[] {
  const from = tileOfPixel(map, enemy);
  const tiles: Pos[] = [];
  for (let y = from.y - SIGHT_RANGE; y <= from.y + SIGHT_RANGE; y++) {
    for (let x = from.x - SIGHT_RANGE; x <= from.x + SIGHT_RANGE; x++) {
      if (x < 0 || y < 0 || x >= map.grid.width || y >= map.grid.height) continue;
      if (sees(map, enemy, { x, y })) tiles.push({ x, y });
    }
  }
  return tiles;
}

/** A desconfiança de cada inimigo, pelo id: 0 nada, 1 pegou. Some quem voltou a 0. */
export type Suspicion = Record<string, number>;

export type Watch =
  /** Ninguém percebeu ninguém (ainda). */
  | { kind: "unseen" }
  /** O grupo `group` percebeu quem andava à vista: luta comum. */
  | { kind: "spotted"; group: string }
  /** O grupo `group` pegou quem se esgueirava: o grupo do jogador entra Surpreso. */
  | { kind: "caught"; group: string };

/**
 * Um passo do olhar dos inimigos, `seconds` depois do anterior, com o
 * jogador em `tile`, esgueirando (`sneaking`) ou não. Muta `suspicion`.
 * `enemies` são os que estão de pé; os `passive` não olham.
 */
export function watch(
  map: AreaMap,
  enemies: readonly AreaEnemy[],
  tile: Pos,
  sneaking: boolean,
  seconds: number,
  suspicion: Suspicion,
): Watch {
  for (const enemy of enemies) {
    if (enemy.passive) continue;
    const from = tileOfPixel(map, enemy);
    const gap = distance(from, tile);
    const seen = sees(map, enemy, tile);
    if (!sneaking) {
      if (seen || (gap <= HEAR_RANGE && hasLineOfSight(map.grid, from, tile))) return { kind: "spotted", group: enemy.group };
      continue;
    }
    if (seen && gap <= CLOSE_RANGE) return { kind: "caught", group: enemy.group };
    const before = suspicion[enemy.id] ?? 0;
    const after = seen
      ? before + (seconds / SUSPICION_SECONDS) * ((SIGHT_RANGE + 1 - gap) / SIGHT_RANGE)
      : before - seconds * CALM_PER_SECOND;
    if (after >= 1) {
      suspicion[enemy.id] = 1;
      return { kind: "caught", group: enemy.group };
    }
    if (after > 0) suspicion[enemy.id] = after;
    else delete suspicion[enemy.id];
  }
  return { kind: "unseen" };
}

/** Alguém do grupo `group` já desconfia? Desconfiado não se embosca: ele está olhando. */
export function wary(enemies: readonly AreaEnemy[], group: string, suspicion: Suspicion): boolean {
  return enemies.some((enemy) => enemy.group === group && (suspicion[enemy.id] ?? 0) > 0);
}
