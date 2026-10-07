import type { Attributes } from "../types/attributes";
import type { CharacterClass } from "../types/characterClass";
import type { ConsumableItem, Inventory } from "../types/inventory";
import type { Grid, Pos } from "./grid";
import type { Dice } from "./rng";
import type { ActiveStatus, StatusId } from "./statuses";

export type TeamId = "party" | "enemy";

/** Um atributo Tirán, ou "primary" = o primeiro atributo primário da Ordem de quem age. */
export type AttributeRef = keyof Attributes | "primary";

/**
 * O que uma habilidade FAZ a cada alvo, em ordem. Os efeitos são peças: uma
 * habilidade nova é uma lista delas, sem código novo no motor.
 */
export type Effect =
  /**
   * Dano: (atributo + dados) x multiplicador + bônus, dobrado em crítico,
   * menos metade do Or do alvo (mínimo 1).
   */
  | {
      kind: "damage";
      dice: Dice;
      attribute?: AttributeRef;
      multiplier?: number;
      /** Soma fixa de `attribute / divisor`, arredondada pra baixo. */
      bonus?: { attribute: keyof Attributes; divisor: number };
    }
  /** Cura: atributo + dados, limitada ao HP que falta. */
  | { kind: "heal"; dice: Dice; attribute?: AttributeRef }
  | { kind: "status"; statusId: StatusId; turns: number }
  /**
   * Empurra o alvo pra longe de quem usou, até `distance` quadrados
   * (negativo puxa). Para na primeira parede ou corpo no caminho.
   */
  | { kind: "push"; distance: number };

export type AbilityCost = "action" | "bonus";

/**
 * Uma habilidade como dado. Quem ela pode mirar, de quão longe, o que
 * acontece — tudo aqui; o motor só interpreta.
 */
export interface Ability {
  id: string;
  name: string;
  /** O que a habilidade é, no mundo — não o que ela faz em números. */
  flavor: string;
  cost: AbilityCost;
  /** Alcance em quadrados. 1 = corpo a corpo; 0 = só em si mesmo. */
  range: number;
  /** "tile" mira um quadrado qualquer à vista — é o que as áreas usam. */
  targets: "enemy" | "ally" | "self" | "tile";
  /**
   * Área: atinge TODO MUNDO a até `radius` quadrados do ponto mirado,
   * aliados inclusive. Sem isto, só quem está no quadrado mirado.
   */
  radius?: number;
  /** Rola d20 + atributo primário + `toHit` contra 10 + Or do alvo. Sem isto, sempre funciona. */
  attack?: { toHit: number };
  effects: Effect[];
  /** Pode ser usada como ataque de oportunidade, gastando a reação. */
  opportunity?: boolean;
}

/** O que um combatente ainda pode gastar no turno atual. */
export interface TurnResources {
  /** Quadrados de movimento restantes. */
  movement: number;
  action: boolean;
  bonus: boolean;
  /** Uma por rodada, gasta fora do próprio turno (ataque de oportunidade). */
  reaction: boolean;
}

/**
 * Um combatente dentro de uma luta. É uma CÓPIA do que importa da ficha
 * (ver unitFromCharacter em ./units.ts): a luta nunca mexe no personagem
 * salvo, e o estado inteiro continua sendo dado puro, clonável.
 */
export interface Unit {
  id: string;
  name: string;
  team: TeamId;
  characterClass: CharacterClass;
  level: number;
  attributes: Attributes;
  currentHp: number;
  maxHp: number;
  pos: Pos;
  /** Quadrados de movimento por turno. */
  speed: number;
  abilities: Ability[];
  statuses: ActiveStatus[];
  inventory?: Inventory<ConsumableItem>;
  turn: TurnResources;
}

/**
 * Uma luta em andamento, inteira. Dado puro (sem classe, sem função, sem
 * closure): `structuredClone(encounter)` é uma luta independente que
 * continua do mesmo ponto, com os mesmos dados por rolar.
 */
export interface Encounter {
  grid: Grid;
  /** Todos que entraram na luta — os mortos ficam aqui, com 0 de HP. */
  units: Unit[];
  /** Ids em ordem de iniciativa, rolada uma vez no começo. */
  order: string[];
  /** Posição em `order` de quem está agindo. */
  turnIndex: number;
  round: number;
  rngState: number;
  /** Preenchido quando um dos lados acaba. Depois disso nenhum comando é aceito. */
  winner?: TeamId;
}

/** O que um combatente pede pra fazer. Só quem está no turno pode pedir. */
export type Command =
  | { type: "move"; unitId: string; to: Pos }
  | { type: "ability"; unitId: string; abilityId: string; target: Pos }
  | { type: "useItem"; unitId: string; itemId: string }
  | { type: "endTurn"; unitId: string };

export type AttackOutcome = "hit" | "miss" | "crit" | "fumble";

/**
 * O que aconteceu, em ordem. O motor nunca anima nada: devolve esta lista
 * e a cena reproduz. Regra nova de combate vira evento novo aqui.
 */
export type TacticalEvent =
  | { type: "battleStarted"; order: { unit: string; initiative: number }[] }
  | { type: "roundStarted"; round: number }
  | { type: "turnStarted"; unit: string }
  | { type: "turnEnded"; unit: string }
  /** `path` não inclui `from`. Um movimento interrompido por um ataque de oportunidade vira dois destes. */
  | { type: "moved"; unit: string; from: Pos; path: Pos[] }
  | { type: "abilityUsed"; unit: string; abilityId: string; name: string; target: Pos; reaction: boolean }
  | {
      type: "attackRoll";
      actor: string;
      target: string;
      /** O d20 puro. */
      natural: number;
      total: number;
      defense: number;
      outcome: AttackOutcome;
    }
  | { type: "blocked"; unit: string; amount: number }
  | { type: "damage"; target: string; amount: number; remainingHp: number }
  | { type: "heal"; target: string; amount: number; remainingHp: number }
  | { type: "pushed"; unit: string; from: Pos; to: Pos }
  | { type: "statusApplied"; target: string; statusId: string; name: string; turns: number }
  | { type: "statusExpired"; target: string; statusId: string; name: string }
  | { type: "itemUsed"; unit: string; itemId: string; itemName: string; description: string }
  | { type: "death"; unit: string }
  | { type: "battleEnded"; winner: TeamId };

/** Por que um comando foi recusado. Um comando recusado não muda nada na luta. */
export type CommandError =
  | "battle_over"
  | "not_your_turn"
  | "unreachable"
  | "unknown_ability"
  | "resource_spent"
  | "invalid_target"
  | "item_unavailable";

export type CommandResult = { ok: true; events: TacticalEvent[] } | { ok: false; reason: CommandError };
