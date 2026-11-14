import { elevationAt, tileAt } from "../tactics/grid";
import type { AreaMap, PixelPos } from "./tiledMap";

/**
 * Andar livre fora de combate: posição em pixels, sem grade — mas barrada
 * pelo mesmo terreno que a grade do combate usa.
 *
 * Quem anda é uma caixa pequena nos PÉS do personagem: `pos` é o meio da
 * base dela. É por isso que a cabeça passa "por cima" de uma mureta e o
 * boneco consegue encostar numa parede.
 */
export interface WalkBody {
  halfWidth: number;
  height: number;
}

/** Os quadrados que a caixa dos pés, posta em `pos`, toca. */
function footTiles(map: AreaMap, pos: PixelPos, body: WalkBody): { x: number; y: number }[] {
  // A caixa é [esquerda, direita) x [topo, base): a borda de lá não conta como dentro do vizinho.
  const edge = 0.001;
  const left = Math.floor((pos.x - body.halfWidth) / map.tileSize);
  const right = Math.floor((pos.x + body.halfWidth - edge) / map.tileSize);
  const top = Math.floor((pos.y - body.height) / map.tileSize);
  const bottom = Math.floor((pos.y - edge) / map.tileSize);
  const tiles: { x: number; y: number }[] = [];
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) tiles.push({ x, y });
  return tiles;
}

/** A altura do chão em que os pés estão: a maior dos quadrados que a caixa toca (quem está na beira está em cima). */
export function footElevation(map: AreaMap, pos: PixelPos, body: WalkBody): number {
  return Math.max(0, ...footTiles(map, pos, body).map((tile) => elevationAt(map.grid, tile)));
}

/**
 * A caixa dos pés, posta em `pos`, encosta em algum quadrado que não se pisa (ou
 * sai do mapa)? Com `ceiling`, o chão mais alto que ela também barra: andando, o
 * pé não sobe degrau (ver walk); só o pulo (ver jumpTarget).
 */
export function isBlocked(map: AreaMap, pos: PixelPos, body: WalkBody, ceiling = Infinity): boolean {
  return footTiles(map, pos, body).some((tile) => (tileAt(map.grid, tile)?.blocksMove ?? true) || elevationAt(map.grid, tile) > ceiling);
}

/**
 * Tenta andar (dx, dy) pixels. Cada eixo é resolvido sozinho: quem anda na
 * diagonal contra uma parede desliza por ela em vez de travar. O chão mais alto
 * que o dos pés barra como parede (o barranco, o cais de pedra, o patamar da
 * cidade): sobe-se pulando. Descer, desce-se andando.
 */
export function walk(map: AreaMap, pos: PixelPos, dx: number, dy: number, body: WalkBody): PixelPos {
  const ceiling = footElevation(map, pos, body);
  const next = { ...pos };
  if (dx !== 0 && !isBlocked(map, { x: next.x + dx, y: next.y }, body, ceiling)) next.x += dx;
  if (dy !== 0 && !isBlocked(map, { x: next.x, y: next.y + dy }, body, ceiling)) next.y += dy;
  return next;
}

/** Quantos pixels o pulo leva pra frente: o bastante pra pôr os pés inteiros no degrau de cima. */
export const JUMP_REACH = 18;

/**
 * Pra onde vai o pulo de quem está em `pos` olhando pra (dx, dy): JUMP_REACH
 * pra frente, se o chão lá é no máximo um degrau acima do dos pés, se pisa, e se
 * a frente está mesmo barrada por um degrau (pular no plano não serve pra nada).
 * Dois degraus de uma vez ninguém sobe. Undefined se não dá.
 */
export function jumpTarget(map: AreaMap, pos: PixelPos, dx: number, dy: number, body: WalkBody): PixelPos | undefined {
  if (dx === 0 && dy === 0) return undefined;
  const ceiling = footElevation(map, pos, body);
  const length = Math.hypot(dx, dy);
  const ahead = (pixels: number) => ({ x: pos.x + (dx / length) * pixels, y: pos.y + (dy / length) * pixels });
  // Só pula quem está de cara pra um degrau: um passo curto à frente está barrado pela altura, não por parede.
  const nudge = ahead(8);
  if (!isBlocked(map, nudge, body, ceiling) || isBlocked(map, nudge, body, ceiling + 1)) return undefined;
  for (const reach of [JUMP_REACH, JUMP_REACH + 6]) {
    const landing = ahead(reach);
    if (!isBlocked(map, landing, body, ceiling + 1) && footElevation(map, landing, body) === ceiling + 1) return landing;
  }
  return undefined;
}
