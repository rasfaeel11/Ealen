import type { Attributes } from "./attributes";

/** Categorias de item que o inventário pode guardar. */
export type ItemCategory = "consumable" | "relic" | "material" | "rune";

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

export interface InventorySlot<TItem extends Item = Item> {
  slotIndex: number;
  item: TItem;
  quantity: number;
}

export interface Inventory<TItem extends Item = Item> {
  slots: InventorySlot<TItem>[];
  maxSlots: number;
}
