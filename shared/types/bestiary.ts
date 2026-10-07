import type { Character } from "./character";
import type { Principle } from "./principle";

/** Chance de drop de um item ao vencer a criatura (0 a 1). */
export interface LootDrop {
  itemId: string;
  chance: number;
}

/**
 * Uma entrada do bestiário: a ficha de combate da criatura mais o que o
 * códice conta sobre ela. Criaturas reaproveitam o shape de `Character` —
 * têm atributos Tirán, Ordem e HP como qualquer um — e sobrescrevem os
 * nomes das próprias ações em `template.arts`.
 */
export interface BestiaryEntry {
  /** Ficha base, clonada a cada encontro (nunca use a referência direta). */
  template: Character;
  /** Símbolo exibido no lugar do retrato da criatura na tela de combate. */
  glyph: string;
  /** Princípio fundamental do qual a criatura é efeito colateral. */
  principle: Principle;
  /** Uma linha: o que é, pro sumário do códice. */
  summary: string;
  /** Duas ou três frases: de onde veio e como se comporta. */
  lore: string;
  /** O que pode deixar cair ao ser derrotada. */
  drops: LootDrop[];
}
