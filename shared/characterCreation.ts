import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import { RACE_MODIFIERS, type Race } from "./types/race";
import type { CharacterClass } from "./types/characterClass";
import type { ConsumableItem, Inventory } from "./types/inventory";
import { MOCK_ITEMS } from "./mock/items";

const STARTING_INVENTORY_MAX_SLOTS = 12;
const STARTING_ITEM_ID = "item-lagrima-de-eir";
const STARTING_ITEM_QUANTITY = 2;

/**
 * Atributos de cada classe no nível 1, antes do modificador do povo. São
 * provisórios, pra ajustar à mão: o mago lê (Fator e Saber), o espadachim
 * aguenta e acerta (Força e Olho), e nenhum dos dois é culto no que não é dele.
 */
const CLASS_BASE_ATTRIBUTES: Record<CharacterClass, Attributes> = {
  atracao_repulsao: { forca: 3, fator: 8, vigor: 5, olho: 5, couro: 4, labia: 6, saber: 8 },
  espadachim: { forca: 8, fator: 2, vigor: 7, olho: 7, couro: 6, labia: 4, saber: 3 },
};

/** Atributos iniciais de um personagem novo: base da classe + modificador do povo. */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = { ...CLASS_BASE_ATTRIBUTES[characterClass] };
  const raceModifier = RACE_MODIFIERS[race];
  for (const key of ATTRIBUTE_KEYS) attributes[key] += raceModifier[key] ?? 0;
  return attributes;
}

/** HP máximo inicial, derivado de Vigor. */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.vigor * 4;
}

/** Mochila inicial de Endyru: uns potes de unguento de barqueiro, o que se leva pra descer o rio. */
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
