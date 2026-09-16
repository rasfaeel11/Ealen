import type { ConsumableItem } from "../types/inventory";

/**
 * Consumíveis de exemplo do lore de Eälen. `usesRemaining`/`maxUses`
 * modelam cargas de UM item (ex: um cajado com 3 cargas); `quantity` no
 * InventorySlot modela quantas cópias empilhadas existem no slot — pra
 * poções simples de uso único, ambos ficam em 1.
 */
export const MOCK_ITEMS: ConsumableItem[] = [
  {
    id: "item-lagrima-de-eir",
    name: "Lágrima de Eir",
    description: "Uma gota cristalizada de ressonância pura. Cura 15 HP ao ser consumida.",
    category: "consumable",
    rarity: "common",
    data: { effect: { kind: "heal_hp", amount: 15 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-balsamo-de-pedra-de-taharim",
    name: "Bálsamo de Pedra de Taharim",
    description: "Unguento mineral forjado nas Gargantas de Pedra. Concede +4 de Densidade (Or) por 2 turnos.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "buff_stat", stat: "or", bonus: 4, durationTurns: 2 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-oleo-da-coruja-de-miraven",
    name: "Óleo da Coruja de Miraven",
    description: "Extrato que aguça os sentidos sob o luar. Concede foco ao próximo golpe, garantindo acerto crítico.",
    category: "consumable",
    rarity: "rare",
    data: { effect: { kind: "focus_charge", guaranteedCritNextHit: true }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-incenso-purificador-de-althir",
    name: "Incenso Purificador de Althir",
    description: "Fumaça sagrada que dissipa corrupções e acalma feridas leves. Remove status negativos e restaura 5 HP.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "cure_status" }, usesRemaining: 1, maxUses: 1 },
  },
];
