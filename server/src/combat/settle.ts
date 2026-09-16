import type { Character, CombatEvent, LevelUpResult } from "@ealen/shared";
import { applyXpGain, xpForEnemy } from "./leveling";

export interface SettleResult {
  combatEnded: boolean;
  playerWon: boolean;
  xpGained: number;
  levelUp: LevelUpResult;
}

/**
 * Interpreta o resultado de um turno de combate: se houve vitória, aplica
 * XP/level up em `character` (mutando-o) quando quem venceu foi o jogador.
 * Não persiste nada — quem chama decide o que fazer com o resultado
 * (gravar no Supabase, ou só devolver pro cliente, no caso do convidado).
 */
export function settleCombat(character: Character, enemy: Character, events: CombatEvent[]): SettleResult {
  const victoryEvent = events.find(
    (event): event is Extract<CombatEvent, { type: "victory" }> => event.type === "victory",
  );
  if (!victoryEvent) {
    return { combatEnded: false, playerWon: false, xpGained: 0, levelUp: { leveledUp: false } };
  }

  const playerWon = victoryEvent.winner === character.id;
  const xpGained = playerWon ? xpForEnemy(enemy) : 0;
  const levelUp = playerWon ? applyXpGain(character, xpGained) : { leveledUp: false };

  return { combatEnded: true, playerWon, xpGained, levelUp };
}
