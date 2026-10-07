import type { Attributes } from "./attributes";
import type { CharacterClass } from "./characterClass";

export interface UnlockableAbility {
  id: string;
  name: string;
  characterClass: CharacterClass;
  /** Atributo usado para escalar o efeito da habilidade. */
  scalingAttribute: keyof Attributes;
  description: string;
  /** Nível de personagem em que a habilidade é desbloqueada. */
  unlockLevel: number;
}
