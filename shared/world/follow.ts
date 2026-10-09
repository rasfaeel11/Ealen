import type { PixelPos } from "./tiledMap";

/**
 * O rastro de quem vai na frente: por onde o personagem passou, do ponto mais
 * recente pro mais antigo. Os companheiros não procuram caminho — cada um
 * anda em cima do rastro, a uma distância fixa atrás (`trailPoint`), e por
 * isso contorna o que o personagem contornou. Eles não ocupam quadrado nem
 * barram ninguém fora de luta.
 */
export type Trail = PixelPos[];

/** A que distância, em pixels, cada companheiro segue o da frente. */
export const FOLLOW_GAP = 14;

function gap(a: PixelPos, b: PixelPos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Registra onde o líder está agora. Muta `trail`, e corta o que ficou mais
 * pra trás do que `keep` pixels — o que o último da fila ainda vai usar.
 */
export function extendTrail(trail: Trail, pos: PixelPos, keep: number): void {
  if (trail.length > 0 && gap(trail[0], pos) === 0) return;
  trail.unshift({ ...pos });

  let length = 0;
  for (let i = 1; i < trail.length; i++) {
    length += gap(trail[i - 1], trail[i]);
    if (length >= keep) {
      trail.length = i + 1;
      return;
    }
  }
}

/** O ponto do rastro `back` pixels atrás do líder. Rastro mais curto que isso: a ponta dele. */
export function trailPoint(trail: Trail, back: number): PixelPos {
  let left = back;
  for (let i = 1; i < trail.length; i++) {
    const from = trail[i - 1];
    const to = trail[i];
    const length = gap(from, to);
    if (length >= left && length > 0) {
      const t = left / length;
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    }
    left -= length;
  }
  return { ...trail[trail.length - 1] };
}

/** Um passo de `from` em direção a `to`, de no máximo `reach` pixels. */
export function stepToward(from: PixelPos, to: PixelPos, reach: number): PixelPos {
  const length = gap(from, to);
  if (length <= reach) return { ...to };
  return { x: from.x + ((to.x - from.x) * reach) / length, y: from.y + ((to.y - from.y) * reach) / length };
}
