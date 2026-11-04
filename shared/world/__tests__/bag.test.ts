import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { findItemTemplate } from "../../data/items";
import { addItemToInventory, discardItem, findInventorySlot, passItem, sortInventory } from "../../inventoryEffects";
import { createProtagonist, joinParty, type PartyMember } from "../../party";
import { usableOutside } from "../field";
import type { ConsumableItem } from "../../types/inventory";

/** A mochila: jogar fora, arrumar e o item-chave (task 59). */

function item(id: string): ConsumableItem {
  const template = findItemTemplate(id);
  assert.ok(template);
  return template;
}

test("jogar fora tira uma unidade da mochila, e a peça do guardado também", () => {
  const hero = createProtagonist();
  const bread = item("item-pao-de-viagem");
  const before = findInventorySlot(hero, bread.id)?.quantity ?? 0;
  addItemToInventory(hero, bread);
  assert.equal(discardItem(hero, bread.id), "ok");
  assert.equal(findInventorySlot(hero, bread.id)?.quantity ?? 0, before);
  hero.gear = ["gear-chuco"];
  assert.equal(discardItem(hero, "gear-chuco"), "ok");
  assert.deepEqual(hero.gear, []);
  assert.equal(discardItem(hero, "gear-chuco"), "none");
});

test("o item-chave não se joga fora nem se passa", () => {
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  const jarupa = joinParty(members, "jarupa", 1)!;
  const paper: ConsumableItem = { ...item("item-pao-de-viagem"), id: "item-teste-papel", name: "Papel", key: true };
  addItemToInventory(hero, paper);
  assert.equal(discardItem(hero, paper.id), "key");
  assert.equal(passItem(hero, jarupa, paper.id), "none");
  assert.equal(findInventorySlot(hero, paper.id)?.quantity, 1);
});

test("o item-chave cabe na mochila cheia, e não se usa nem fora nem dentro da luta", () => {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 1 };
  addItemToInventory(hero, item("item-pao-de-viagem"));
  assert.equal(addItemToInventory(hero, item("item-unguento-de-barqueiro")), false);
  const letter = item("item-carta-de-mbyraku");
  assert.equal(addItemToInventory(hero, letter), true);
  assert.equal(letter.key, true);
  assert.equal(usableOutside(letter), false);
});

test("arrumar põe o item-chave primeiro e o resto por nome, sem buraco", () => {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 12 };
  addItemToInventory(hero, item("item-unguento-de-barqueiro"));
  addItemToInventory(hero, item("item-pao-de-viagem"));
  addItemToInventory(hero, { ...item("item-pao-de-viagem"), id: "item-teste-papel", name: "Papel", key: true });
  hero.inventory.slots[0].slotIndex = 7;
  assert.equal(sortInventory(hero), true);
  assert.deepEqual(
    hero.inventory.slots.map((slot) => [slot.slotIndex, slot.item.id]),
    [
      [0, "item-teste-papel"],
      [1, "item-pao-de-viagem"],
      [2, "item-unguento-de-barqueiro"],
    ],
  );
  assert.equal(sortInventory(hero), false);
});
