/**
 * Dado com seed. O estado do gerador mora DENTRO do estado da luta
 * (`Encounter.rngState`), não num closure: clonar a luta clona junto a
 * sequência de dados que ainda vai sair. É isso que deixa a IA simular uma
 * jogada numa cópia sem gastar a sorte da luta de verdade, e que faz a mesma
 * seed + os mesmos comandos darem sempre o mesmo combate.
 */
export interface RngHolder {
  rngState: number;
}

/** Próximo número em [0, 1) — mulberry32. Avança `holder.rngState`. */
export function nextRandom(holder: RngHolder): number {
  holder.rngState = (holder.rngState + 0x6d2b79f5) >>> 0;
  let t = holder.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Um dado de `sides` lados: inteiro de 1 a `sides`. */
export function rollDie(holder: RngHolder, sides: number): number {
  return 1 + Math.floor(nextRandom(holder) * sides);
}

export interface Dice {
  count: number;
  sides: number;
}

/** Soma de `count` dados de `sides` lados (ex: 2d6). */
export function rollDice(holder: RngHolder, dice: Dice): number {
  let total = 0;
  for (let i = 0; i < dice.count; i++) total += rollDie(holder, dice.sides);
  return total;
}
