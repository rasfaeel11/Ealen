/** Número que sobe e some sobre um combatente (dano ou cura). */
export interface Floater {
  id: string;
  amount: number;
  positive: boolean;
  critical?: boolean;
}

/** Resultado do d20 exibido sobre quem age. `nonce` força re-rolar a animação. */
export interface RollBadge {
  value: number;
  nonce: number;
}

/** Reação visual momentânea de um combatente. */
export type CombatFlash = "hit" | "miss" | "critical" | "fumble" | "block" | "item" | "guard";
