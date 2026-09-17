import type { Attributes } from "./attributes";
import type { Race } from "./race";
import type { CharacterClass } from "./characterClass";
import type { CombatAction } from "./combatEvent";
import type { ConsumableItem, Inventory } from "./inventory";

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
  /** Ausente = personagem ainda não tem mochila inicializada. */
  inventory?: Inventory<ConsumableItem>;
  /**
   * Nomes próprios das ações desta criatura em combate, sobrescrevendo as
   * Artes da Ordem (ver shared/combatArts.ts). Personagens jogáveis nunca
   * preenchem isto — quem usa são as criaturas do bestiário, que reaproveitam
   * o shape de Character mas não deveriam narrar "usa Fome do Vazio" só
   * porque foram modeladas como sombrílicas.
   */
  arts?: Partial<Record<CombatAction, string>>;
}
