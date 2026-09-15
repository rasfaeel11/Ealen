import type { Attributes } from "./attributes";
import type { Race } from "./race";
import type { CharacterClass } from "./characterClass";

export interface Character {
  id: string;
  name: string;
  race: Race;
  characterClass: CharacterClass;
  level: number;
  xp: number;
  attributes: Attributes;
  currentHp: number;
  maxHp: number;
  currentNodeId: string;
}
