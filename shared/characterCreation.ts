import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import { RACE_MODIFIERS, type Race } from "./types/race";
import { CLASS_INFO, type CharacterClass } from "./types/characterClass";
import type { ConsumableItem, Inventory } from "./types/inventory";
import { MOCK_ITEMS } from "./mock/items";

const STARTING_INVENTORY_MAX_SLOTS = 12;
const STARTING_ITEM_ID = "item-lagrima-de-eir";
const STARTING_ITEM_QUANTITY = 2;

const BASE_ATTRIBUTE_VALUE = 5;
/** Bônus aplicado a cada atributo primário da classe na criação. */
const PRIMARY_ATTRIBUTE_BONUS = 2;

/** Atributos iniciais de um personagem novo: base + modificador racial + bônus de classe. */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = {} as Attributes;
  const raceModifier = RACE_MODIFIERS[race];
  const primaryAttributes = CLASS_INFO[characterClass].primaryAttributes;

  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] =
      BASE_ATTRIBUTE_VALUE + (raceModifier[key] ?? 0) + (primaryAttributes.includes(key) ? PRIMARY_ATTRIBUTE_BONUS : 0);
  }

  return attributes;
}

/** HP máximo inicial, derivado de Nath (Vitalidade). */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.nath * 4;
}

/** Mochila inicial de um personagem novo: algumas Lágrimas de Eir pra já dar pra testar o sistema de itens. */
export function createStartingInventory(): Inventory<ConsumableItem> {
  const startingItem = MOCK_ITEMS.find((item) => item.id === STARTING_ITEM_ID);
  if (!startingItem) {
    return { slots: [], maxSlots: STARTING_INVENTORY_MAX_SLOTS };
  }

  return {
    maxSlots: STARTING_INVENTORY_MAX_SLOTS,
    slots: [{ slotIndex: 0, item: structuredClone(startingItem), quantity: STARTING_ITEM_QUANTITY }],
  };
}
