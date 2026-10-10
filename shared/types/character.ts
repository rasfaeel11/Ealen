import type { Attributes } from "./attributes";
import type { Race } from "./race";
import type { CharacterClass } from "./characterClass";
import type { ConsumableItem, Equipment, Inventory } from "./inventory";

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
  /** O Fôlego que resta (ver ../breath.ts). Ausente = cheio. */
  breath?: number;
  /** Ausente = personagem ainda não tem mochila inicializada. */
  inventory?: Inventory<ConsumableItem>;
  /** O que veste: arma, armadura e acessório (ver ../equipment.ts). Lugar ausente = vazio. */
  equipment?: Equipment;
  /**
   * O equipamento GUARDADO, fora do corpo de qualquer um: os ids das peças,
   * repetidos quando há mais de uma igual. Só a dona da mochila o tem — é a
   * parte da mochila do grupo que não se gasta.
   */
  gear?: string[];
  /**
   * O que esta criatura sabe fazer, e com que nome: as habilidades do kit da
   * Ordem que ela tem, pela chave de cada uma (`attack`, `heavy_attack`,
   * `puxao_de_mare`... ver KITS em ../tactics/abilities.ts), e o nome próprio
   * que ela dá a cada. Com isto, o kit é SÓ o que está aqui, seja qual for o
   * nível. Personagens jogáveis nunca o preenchem: o kit deles vem da Ordem e
   * cresce com o nível. Quem usa são as criaturas do bestiário, que
   * reaproveitam o shape de Character mas não deveriam narrar "usa Fome do
   * Vazio" só porque foram modeladas como sombrílicas.
   */
  arts?: Partial<Record<string, string>>;
}
