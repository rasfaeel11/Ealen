import type { Attributes, Character } from "@ealen/shared";

/**
 * Efeitos ativos de itens usados em combate, escopados a uma sessão de
 * combate (guardados em CombatSession.buffs — ver sessions.ts) pra
 * sobreviver entre as várias chamadas HTTP de uma mesma luta.
 * - "stat": bônus fixo num atributo por N turnos (ex: Bálsamo de Taharim).
 * - "guaranteed_crit": o próximo ataque do alvo é crítico automático,
 *   mesmo sem tirar 20 natural (ex: Óleo da Coruja de Miraven).
 */
export type ActiveBuff =
  | { kind: "stat"; targetId: string; stat: keyof Attributes; bonus: number; turnsRemaining: number }
  | { kind: "guaranteed_crit"; targetId: string; turnsRemaining: number };

/** Soma de todos os bônus ativos de `stat` sobre `unit` (0 se nenhum). */
export function buffBonus(unit: Character, stat: keyof Attributes, activeBuffs: ActiveBuff[]): number {
  return activeBuffs
    .filter((b): b is Extract<ActiveBuff, { kind: "stat" }> => b.kind === "stat" && b.targetId === unit.id && b.stat === stat)
    .reduce((sum, b) => sum + b.bonus, 0);
}

export function hasGuaranteedCrit(unit: Character, activeBuffs: ActiveBuff[]): boolean {
  return activeBuffs.some((b) => b.kind === "guaranteed_crit" && b.targetId === unit.id);
}

/** Consome (remove) o buff de crítico garantido de `unit`, se houver — é um efeito de uso único. */
export function consumeGuaranteedCrit(unit: Character, activeBuffs: ActiveBuff[]): void {
  const idx = activeBuffs.findIndex((b) => b.kind === "guaranteed_crit" && b.targetId === unit.id);
  if (idx !== -1) activeBuffs.splice(idx, 1);
}

/** Decrementa turnsRemaining de todos os buffs (in place) e remove os expirados. Chamado 1x por rodada resolvida. */
export function tickBuffs(activeBuffs: ActiveBuff[]): void {
  for (let i = activeBuffs.length - 1; i >= 0; i--) {
    activeBuffs[i].turnsRemaining -= 1;
    if (activeBuffs[i].turnsRemaining <= 0) activeBuffs.splice(i, 1);
  }
}
