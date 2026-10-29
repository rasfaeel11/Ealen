import type { Attributes } from "../../types/attributes";
import type { Character } from "../../types/character";
import type { ConsumableItem } from "../../types/inventory";
import {
  applyCommand,
  basicCommand,
  gridFromAscii,
  startEncounter,
  unitFromCharacter,
  type Ability,
  type Command,
  type Dice,
  type Effect,
  type Encounter,
  type Pos,
  type TacticalEvent,
  type TeamId,
  type Unit,
} from "../index";

/**
 * A ficha de teste: um espadachim humano de mãos vazias, com tudo em 5. O kit
 * dele é o do jogo (`espadachim.attack`, `.quick_attack`, `.heavy_attack`,
 * `.defend`); o que um teste precisa além disso vem de TEST_KIT, em `kit`.
 */
const BASE_CHARACTER: Character = {
  id: "base",
  name: "Base",
  race: "humano",
  characterClass: "espadachim",
  level: 1,
  xp: 0,
  attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
  currentHp: 30,
  maxHp: 30,
};

type CharacterOverrides = Omit<Partial<Character>, "attributes"> & { attributes?: Partial<Attributes> };
export type UnitOverrides = CharacterOverrides & {
  /** Habilidades de teste somadas ao kit da classe (ver TEST_KIT). */
  kit?: Ability[];
};

const D6: Dice = { count: 1, sides: 6 };
type Damage = Extract<Effect, { kind: "damage" }>;
const hit = (extra: Partial<Damage> = {}): Damage => ({ kind: "damage", dice: D6, attribute: "primary", ...extra });
const heavy = (): Damage => hit({ multiplier: 1.8, bonus: { attribute: "forca", divisor: 2 } });

function testAbility(slug: string, body: Omit<Ability, "id" | "name" | "flavor">): Ability {
  return { id: `teste.${slug}`, name: slug, flavor: "", ...body };
}

/**
 * As peças do motor que nenhum kit do jogo usa (ou não usa sem mana e
 * recitação): cada uma é uma habilidade de teste, de mãos vazias (d6), com id
 * `teste.<chave>`. Entra numa unidade por `kit` em makeUnit.
 */
export const TEST_KIT = {
  /** Golpe de longe, sem punir quem sai de perto. */
  tiro: testAbility("tiro", { cost: "action", range: 6, targets: "enemy", attack: { toHit: 0 }, effects: [hit()] }),
  /** Puxa de longe pra perto, ferindo pouco. */
  puxao: testAbility("puxao", {
    cost: "bonus",
    range: 3,
    targets: "enemy",
    attack: { toHit: 3 },
    effects: [hit({ multiplier: 0.6 }), { kind: "push", distance: -2 }],
  }),
  /** O golpe pesado que ainda empurra. */
  empurrao: testAbility("empurrao", {
    cost: "action",
    range: 1,
    targets: "enemy",
    attack: { toHit: -4 },
    effects: [heavy(), { kind: "push", distance: 2 }],
    breath: 2,
    cooldown: 1,
  }),
  /** Fere de longe e deixa o alvo Pesado. */
  peso: testAbility("peso", {
    cost: "action",
    range: 4,
    targets: "enemy",
    attack: { toHit: 0 },
    effects: [{ kind: "damage", dice: D6, attribute: "forca" }, { kind: "status", statusId: "heavy", turns: 2 }],
    breath: 1,
    cooldown: 2,
  }),
  ancora: testAbility("ancora", {
    cost: "bonus",
    range: 0,
    targets: "self",
    effects: [{ kind: "status", statusId: "anchored", turns: 3 }],
    breath: 2,
    cooldown: 4,
  }),
  /** Área 3x3 que pega aliados e deixa o chão gelado. */
  gelo: testAbility("gelo", {
    cost: "action",
    range: 5,
    targets: "tile",
    radius: 1,
    attack: { toHit: -4 },
    effects: [heavy()],
    surface: { id: "frost", rounds: 2 },
    breath: 2,
    cooldown: 1,
  }),
  /** Golpe de longe que deixa o chão do alvo em fogo. */
  fogo: testAbility("fogo", {
    cost: "action",
    range: 5,
    targets: "enemy",
    attack: { toHit: -4 },
    effects: [heavy()],
    surface: { id: "fire", rounds: 2 },
    breath: 2,
    cooldown: 1,
  }),
  /** Golpe pesado que tira Fôlego de quem apanha. */
  sufoco: testAbility("sufoco", {
    cost: "action",
    range: 1,
    targets: "enemy",
    attack: { toHit: -4 },
    effects: [heavy(), { kind: "breath", amount: -2 }],
    breath: 2,
    cooldown: 1,
  }),
  /** A guarda de não estar lá: Não-Visto até o próximo turno, e toma fôlego. */
  sumir: testAbility("sumir", {
    cost: "action",
    range: 0,
    targets: "self",
    effects: [{ kind: "status", statusId: "unseen", turns: 1 }, { kind: "breath", amount: 1 }],
  }),
  /** Sem rolagem e furando a armadura. */
  corte: testAbility("corte", {
    cost: "action",
    range: 1,
    targets: "enemy",
    effects: [hit({ multiplier: 1.2, piercing: true })],
    breath: 3,
    cooldown: 2,
  }),
  /** Fere quase nada e deixa Trincado. */
  trinca: testAbility("trinca", {
    cost: "bonus",
    range: 6,
    targets: "enemy",
    attack: { toHit: 3 },
    effects: [hit({ multiplier: 0.4 }), { kind: "status", statusId: "cracked", turns: 2 }],
  }),
  /** De longe, furando a armadura. */
  furo: testAbility("furo", {
    cost: "action",
    range: 6,
    targets: "enemy",
    attack: { toHit: 2 },
    effects: [hit({ piercing: true })],
    breath: 1,
    cooldown: 1,
  }),
  /** Uma guarda posta na frente de um aliado. */
  muralha: testAbility("muralha", {
    cost: "bonus",
    range: 4,
    targets: "ally",
    effects: [{ kind: "status", statusId: "warded", turns: 1 }],
    breath: 1,
    cooldown: 1,
  }),
  /** Devolve a quem bate o que o golpe tirou. */
  dreno: testAbility("dreno", {
    cost: "action",
    range: 1,
    targets: "enemy",
    attack: { toHit: 0 },
    effects: [hit({ leech: 1 })],
    breath: 2,
    cooldown: 2,
  }),
  /** A cura paga em Fôlego, na hora (a do jogo é magia: mana e recitada). */
  cura: testAbility("cura", {
    cost: "action",
    range: 4,
    targets: "ally",
    effects: [{ kind: "heal", dice: D6, attribute: "fator" }],
    breath: 2,
  }),
} satisfies Record<string, Ability>;

function testItem(slug: string, effect: ConsumableItem["data"]["effect"]): ConsumableItem {
  return {
    id: `item-teste-${slug}`,
    name: slug,
    description: "",
    category: "consumable",
    rarity: "common",
    data: { effect, usesRemaining: 1, maxUses: 1 },
  };
}

/** Os efeitos de item que o catálogo do jogo não usa: cada um num item de teste (`item-teste-<chave>`). */
export const TEST_ITEMS = {
  /** O próximo golpe é crítico. */
  foco: testItem("foco", { kind: "focus_charge", guaranteedCritNextHit: true }),
  /** Couro +4 por 2 turnos. */
  couro: testItem("couro", { kind: "buff_stat", stat: "couro", bonus: 4, durationTurns: 2 }),
  /** Tira as condições ruins. */
  purificar: testItem("purificar", { kind: "cure_status" }),
} satisfies Record<string, ConsumableItem>;

/** Olho alto o bastante pra agir primeiro, não importa o d20. */
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

export function makeUnit(id: string, team: TeamId, pos: Pos, overrides: UnitOverrides = {}): Unit {
  const { kit, ...character } = overrides;
  const unit = unitFromCharacter(makeCharacter(id, character), { team, pos });
  if (kit) unit.abilities.push(...kit.map((ability) => structuredClone(ability)));
  return unit;
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

/** Joga a luta com a IA de linha de base dos dois lados até acabar (ou até `maxCommands`). Devolve todos os eventos. */
export function playOut(encounter: Encounter, maxCommands = 3000): TacticalEvent[] {
  const log: TacticalEvent[] = [];
  for (let i = 0; i < maxCommands && !encounter.winner; i++) {
    log.push(...run(encounter, basicCommand(encounter)));
  }
  return log;
}
