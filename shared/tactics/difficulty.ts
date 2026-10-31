import type { Unit } from "./types";

/** A dificuldade que o jogador escolhe nas opções. Hoje ela só mexe na vida do outro lado. */
export type Difficulty = "facil" | "normal" | "dificil";

const ENEMY_LIFE: Record<Difficulty, number> = { facil: 0.7, normal: 1, dificil: 1.35 };

/** Dá ao outro lado a vida da dificuldade. Quem não tem vida pra perder não muda. */
export function applyDifficulty(units: readonly Unit[], difficulty: Difficulty): void {
  const factor = ENEMY_LIFE[difficulty];
  for (const unit of units) {
    if (unit.team !== "enemy" || unit.invulnerable) continue;
    unit.maxHp = Math.max(1, Math.round(unit.maxHp * factor));
    unit.currentHp = unit.maxHp;
  }
}
