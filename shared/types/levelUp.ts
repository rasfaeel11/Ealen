import type { Ability } from "./ability";

/** Resultado da progressão de nível aplicada ao final de um combate vitorioso. */
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel?: number;
  newAbility?: Ability;
}
