import type { Dice } from "../tactics/rng";
import type { Attributes } from "./attributes";
import type { CharacterClass } from "./characterClass";

/** Categorias de item que existem. `equipment` se veste (ver ../equipment.ts); `relic`, `material` e `rune` ainda não têm uso. */
export type ItemCategory = "consumable" | "equipment" | "relic" | "material" | "rune";

/**
 * Modelo base de item, genérico em cima da categoria (`TCategory`) e do
 * formato dos dados específicos dela (`TData`) — um relic vai ter um
 * `data` bem diferente de um consumable, por exemplo, mas ambos
 * compartilham o mesmo envelope (id, nome, raridade etc.).
 */
export interface Item<TCategory extends ItemCategory = ItemCategory, TData = unknown> {
  id: string;
  name: string;
  description: string;
  category: TCategory;
  rarity: "common" | "uncommon" | "rare" | "sacred";
  data: TData;
}

/** Efeito aplicado ao usar um consumível. */
export type ConsumableEffect =
  | { kind: "heal_hp"; amount: number }
  | { kind: "buff_stat"; stat: keyof Attributes; bonus: number; durationTurns: number }
  | { kind: "cure_status" }
  | { kind: "focus_charge"; guaranteedCritNextHit: boolean };

export type ConsumableItem = Item<"consumable", { effect: ConsumableEffect; usesRemaining: number; maxUses: number }>;

/** Onde uma peça de equipamento vai: cada pessoa tem um lugar de cada. */
export type EquipmentSlot = "weapon" | "armor" | "accessory";

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ["weapon", "armor", "accessory"];

/**
 * O que uma peça faz, por lugar:
 * - a ARMA dá o dado e o alcance dos golpes de arma de quem a empunha (ver
 *   `abilitiesFor` em ../tactics/abilities.ts), e pode somar ou tirar acerto.
 *   Com `orders`, só essas Ordens sabem usá-la;
 * - a ARMADURA soma na defesa (o número que a rolagem de ataque precisa
 *   alcançar) e, pesada, tira quadrados de movimento;
 * - o ACESSÓRIO soma atributos — na luta e nos testes da história.
 */
export type EquipmentData =
  | { slot: "weapon"; dice: Dice; range: number; toHit?: number; orders?: CharacterClass[] }
  | { slot: "armor"; defense: number; speed?: number }
  | { slot: "accessory"; attributes: Partial<Attributes> };

export type EquipmentItem = Item<"equipment", EquipmentData>;

/** O que uma pessoa veste: o id da peça (em ../mock/equipment.ts) de cada lugar ocupado. */
export type Equipment = Partial<Record<EquipmentSlot, string>>;

export interface InventorySlot<TItem extends Item = Item> {
  slotIndex: number;
  item: TItem;
  quantity: number;
}

export interface Inventory<TItem extends Item = Item> {
  slots: InventorySlot<TItem>[];
  maxSlots: number;
}
