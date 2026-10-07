import { tileAt } from "../tactics/grid";
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

/** A caixa dos pés, posta em `pos`, encosta em algum quadrado que não se pisa (ou sai do mapa)? */
export function isBlocked(map: AreaMap, pos: PixelPos, body: WalkBody): boolean {
  // A caixa é [esquerda, direita) x [topo, base): a borda de lá não conta como dentro do vizinho.
  const edge = 0.001;
  const left = Math.floor((pos.x - body.halfWidth) / map.tileSize);
  const right = Math.floor((pos.x + body.halfWidth - edge) / map.tileSize);
  const top = Math.floor((pos.y - body.height) / map.tileSize);
  const bottom = Math.floor((pos.y - edge) / map.tileSize);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (tileAt(map.grid, { x, y })?.blocksMove ?? true) return true;
    }
  }
  return false;
}

/**
 * Tenta andar (dx, dy) pixels. Cada eixo é resolvido sozinho: quem anda na
 * diagonal contra uma parede desliza por ela em vez de travar.
 */
export function walk(map: AreaMap, pos: PixelPos, dx: number, dy: number, body: WalkBody): PixelPos {
  const next = { ...pos };
  if (dx !== 0 && !isBlocked(map, { x: next.x + dx, y: next.y }, body)) next.x += dx;
  if (dy !== 0 && !isBlocked(map, { x: next.x, y: next.y + dy }, body)) next.y += dy;
  return next;
}
