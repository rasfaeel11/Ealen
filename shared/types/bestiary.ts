import type { StyleId } from "../tactics/styles";
import type { AiProfile, AiQuirks } from "../tactics/types";
import type { Character } from "./character";
import type { Principle } from "./principle";

/** Chance de drop de um item ao vencer a criatura (0 a 1). `itemId` é um consumível (../mock/items.ts) ou uma peça de equipamento (../mock/equipment.ts). */
export interface LootDrop {
  itemId: string;
  chance: number;
}

/**
 * Uma entrada do bestiário: a ficha de combate da criatura mais o que o
 * códice conta sobre ela. Criaturas reaproveitam o shape de `Character` —
 * têm atributos Tirán, Ordem e HP como qualquer um —, dizem em
 * `template.arts` o que sabem do kit da Ordem e com que nome, e podem vestir
 * (`template.equipment`).
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
  /** Como ela luta: os pesos da IA que fogem do padrão (ver AiProfile). */
  ai?: Partial<AiProfile>;
  /** Manias de comportamento (ver AiQuirks). Em `mirrors`, "hero" é a protagonista. */
  quirks?: AiQuirks;
  /** É gente, não um Princípio solto: no mapa usa o boneco, não o vulto. */
  person?: boolean;
  /** O estilo de luta e o grau nele (ver ../tactics/styles.ts). */
  style?: { id: StyleId; grade: number };
  /**
   * Não tem vida pra perder: nada a fere e ela nunca cai (ver `invulnerable`
   * em Unit). A luta com ela só acaba por uma deixa do roteiro — o teste dos
   * mapas acusa o grupo que tem uma destas e nenhuma deixa que encerre.
   */
  invulnerable?: boolean;
  /**
   * Ids dos consumíveis que ela leva pra luta (repita o id pra levar mais de
   * um). A IA usa quando vale a pena; o que sobrar fica pra quem a vencer.
   */
  carries?: string[];
  /** O que pode deixar cair ao ser derrotada, além do que carregava. */
  drops: LootDrop[];
}
