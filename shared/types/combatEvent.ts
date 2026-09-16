import type { Character } from "./character";
import type { LevelUpResult } from "./levelUp";

/**
 * Eventos ordenados que descrevem o que aconteceu em um turno de combate.
 * O servidor NUNCA anima nada — só calcula e devolve esta lista; a
 * animação em sequência é responsabilidade exclusiva do frontend.
 */
export type CombatEvent =
  | { type: "roll"; actor: string; value: number; target: number }
  | { type: "hit"; actor: string }
  | { type: "miss"; actor: string }
  | { type: "damage"; target: string; amount: number; remainingHp: number }
  | { type: "heal"; target: string; amount: number; remainingHp: number }
  | { type: "statusApplied"; target: string; status: string }
  | { type: "death"; actor: string }
  | { type: "victory"; winner: string };

/** Ações que um combatente (jogador ou inimigo) pode escolher em seu turno. */
export type CombatAction = "attack" | "defend" | "heal";

/** Corpo da resposta de POST /api/combat/:nodeId/action. */
export interface CombatActionResult {
  events: CombatEvent[];
  characterState: Character;
  enemyState: Character;
  xpGained: number;
  levelUp: LevelUpResult;
}
