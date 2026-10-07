import type { Attributes } from "../types/attributes";
import type { Character } from "../types/character";
import { CLASS_INFO } from "../types/characterClass";
import { abilitiesFor } from "./abilities";
import { samePos, type Pos } from "./grid";
import type { AiProfile, Encounter, TeamId, Unit } from "./types";

/** Quadrados de movimento por turno de quem não diz o contrário. */
export const DEFAULT_SPEED = 6;

export interface UnitPlacement {
  team: TeamId;
  pos: Pos;
  /** Obrigatório quando a mesma ficha entra mais de uma vez na luta (três lobos = três ids). */
  id?: string;
  /** Pesos da IA de quem não é comandado pelo jogador (ver AiProfile). */
  ai?: Partial<AiProfile>;
}

/**
 * Põe uma ficha (personagem do jogador ou criatura do bestiário) dentro de
 * uma luta. Copia o que a luta precisa: nada do que acontecer no combate
 * mexe em `character` até alguém chamar syncCharacterFromUnit.
 */
export function unitFromCharacter(character: Character, placement: UnitPlacement): Unit {
  return {
    id: placement.id ?? character.id,
    name: character.name,
    team: placement.team,
    characterClass: character.characterClass,
    level: character.level,
    attributes: { ...character.attributes },
    currentHp: character.currentHp,
    maxHp: character.maxHp,
    pos: { ...placement.pos },
    speed: DEFAULT_SPEED,
    abilities: abilitiesFor(character),
    statuses: [],
    inventory: character.inventory ? structuredClone(character.inventory) : undefined,
    ai: placement.ai ? { ...placement.ai } : undefined,
    turn: { movement: 0, action: false, bonus: false, reaction: true },
  };
}

/** Devolve à ficha o que a luta gastou: HP e mochila. */
export function syncCharacterFromUnit(character: Character, unit: Unit): void {
  character.currentHp = unit.currentHp;
  if (unit.inventory) character.inventory = structuredClone(unit.inventory);
}

export function isAlive(unit: Unit): boolean {
  return unit.currentHp > 0;
}

export function findUnit(encounter: Encounter, id: string): Unit | undefined {
  return encounter.units.find((unit) => unit.id === id);
}

/** Quem está no turno. Undefined só depois que a luta acabou. */
export function activeUnit(encounter: Encounter): Unit | undefined {
  if (encounter.winner) return undefined;
  return findUnit(encounter, encounter.order[encounter.turnIndex]);
}

/** Quem está de pé neste quadrado. Mortos não ocupam espaço. */
export function unitAt(encounter: Encounter, pos: Pos): Unit | undefined {
  return encounter.units.find((unit) => isAlive(unit) && samePos(unit.pos, pos));
}

export function primaryAttribute(unit: Pick<Unit, "characterClass">): keyof Attributes {
  return CLASS_INFO[unit.characterClass].primaryAttributes[0];
}

/** Atributo já com as condições ativas somadas. Nunca fica negativo. */
export function effectiveAttribute(unit: Unit, stat: keyof Attributes): number {
  const bonus = unit.statuses.reduce((sum, status) => sum + (status.attributeBonus?.[stat] ?? 0), 0);
  return Math.max(0, unit.attributes[stat] + bonus);
}
