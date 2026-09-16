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
  | { type: "criticalHit"; actor: string; naturalRoll: 20; multiplier: number }
  | { type: "fumble"; actor: string; naturalRoll: 1; penaltyDescription: string }
  | { type: "block"; defender: string; blockedAmount: number; remainingDamage: number }
  | { type: "damage"; target: string; amount: number; remainingHp: number }
  | { type: "heal"; target: string; amount: number; remainingHp: number }
  | { type: "statusApplied"; target: string; status: string }
  | { type: "death"; actor: string }
  | { type: "victory"; winner: string };

/**
 * Ações que um combatente (jogador ou inimigo) pode escolher em seu turno:
 * - attack: equilibrado, sem modificadores.
 * - quick_attack: +3 de acerto no d20, mas só 60% do dano base — prioriza
 *   consistência sobre poder.
 * - heavy_attack: -4 de acerto no d20, mas 180% do dano base + bônus de
 *   Dain — risco alto, retorno alto.
 * - defend: postura defensiva; ativa o cálculo de bloqueio (Or + d6) contra
 *   o próximo ataque recebido neste turno.
 * - heal: ação de cura (só disponível pra classes com afinidade a Eir).
 */
export type CombatAction = "attack" | "quick_attack" | "heavy_attack" | "defend" | "heal";

/** Corpo da resposta de POST /api/combat/:nodeId/action. */
export interface CombatActionResult {
  events: CombatEvent[];
  characterState: Character;
  enemyState: Character;
  xpGained: number;
  levelUp: LevelUpResult;
}
