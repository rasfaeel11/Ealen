import type { Attributes } from "../../types/attributes";
import type { Character } from "../../types/character";
import {
  applyCommand,
  basicCommand,
  gridFromAscii,
  startEncounter,
  unitFromCharacter,
  type Command,
  type Encounter,
  type Pos,
  type TacticalEvent,
  type TeamId,
  type Unit,
} from "../index";

const BASE_CHARACTER: Character = {
  id: "base",
  name: "Base",
  race: "althirim",
  characterClass: "guardiao",
  level: 1,
  xp: 0,
  attributes: { dain: 5, eir: 5, nath: 5, il: 5, or: 5, len: 5, ul: 5 },
  currentHp: 30,
  maxHp: 30,
  currentNodeId: "",
};

type CharacterOverrides = Omit<Partial<Character>, "attributes"> & { attributes?: Partial<Attributes> };

/** Il alto o bastante pra agir primeiro, não importa o d20. */
export const FIRST = 100;

export function makeCharacter(id: string, overrides: CharacterOverrides = {}): Character {
  return {
    ...BASE_CHARACTER,
    id,
    name: id,
    ...overrides,
    attributes: { ...BASE_CHARACTER.attributes, ...overrides.attributes },
  };
}

export function makeUnit(id: string, team: TeamId, pos: Pos, overrides: CharacterOverrides = {}): Unit {
  return unitFromCharacter(makeCharacter(id, overrides), { team, pos });
}

/** Monta uma luta a partir de um desenho; `place` recebe onde está cada letra do desenho. */
export function setup(
  rows: string[],
  place: (at: (marker: string) => Pos) => Unit[],
  seed = 1,
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  const at = (marker: string) => {
    const found = markers[marker]?.[0];
    if (!found) throw new Error(`marcador "${marker}" não está no desenho`);
    return found;
  };
  return startEncounter({ grid, units: place(at), seed });
}

/** Aplica um comando que TEM que ser aceito e devolve os eventos. */
export function run(encounter: Encounter, command: Command): TacticalEvent[] {
  const result = applyCommand(encounter, command);
  if (!result.ok) throw new Error(`comando recusado: ${result.reason} (${JSON.stringify(command)})`);
  return result.events;
}

export function eventsOf<T extends TacticalEvent["type"]>(
  events: TacticalEvent[],
  type: T,
): Extract<TacticalEvent, { type: T }>[] {
  return events.filter((event): event is Extract<TacticalEvent, { type: T }> => event.type === type);
}

/** Joga a luta com a IA provisória dos dois lados até acabar (ou até `maxCommands`). Devolve todos os eventos. */
export function playOut(encounter: Encounter, maxCommands = 3000): TacticalEvent[] {
  const log: TacticalEvent[] = [];
  for (let i = 0; i < maxCommands && !encounter.winner; i++) {
    log.push(...run(encounter, basicCommand(encounter)));
  }
  return log;
}
