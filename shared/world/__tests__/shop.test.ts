import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { itemCount } from "../../inventoryEffects";
import { createProtagonist } from "../../party";
import { coinsOf, earnCoins } from "../../purse";
import { SHOPS, buyFrom, sellTo, stockLeft, type Shop, type ShopLedger } from "../../shop";

/** As lojas (ver ../../shop.ts). */

const BREAD = "item-pao-de-viagem";
const SALVE = "item-unguento-de-barqueiro";

function buyer(cobre: number) {
  const character = createProtagonist();
  earnCoins(character, "cobre", cobre);
  return character;
}

test("comprar paga o preço da loja, na moeda dela, e gasta o estoque", () => {
  const shop = SHOPS.banca;
  const ledger: ShopLedger = {};
  const character = buyer(5);
  const breads = itemCount(character, BREAD);
  assert.equal(buyFrom(shop, character, BREAD, ledger), undefined);
  assert.equal(coinsOf(character, "cobre"), 3);
  assert.equal(itemCount(character, BREAD), breads + 1);
  assert.equal(stockLeft(shop, shop.wares[0], ledger), 5);
  assert.equal(buyFrom(shop, character, SALVE, ledger), "coins", "quatro de cobre, e ele tem três");
  assert.equal(coinsOf(character, "cobre"), 3, "quem não compra não paga");
  assert.equal(buyFrom(shop, character, "item-que-nao-existe", ledger), "unknown");
});

test("o estoque acaba, e o que a loja compra de volta volta pra ele, pela metade do preço", () => {
  const shop: Shop = { id: "teste", seller: "Quem vende", wares: [{ itemId: SALVE, coin: "cobre", price: 4, stock: 1 }], buys: true };
  const ledger: ShopLedger = {};
  const character = buyer(20);
  assert.equal(buyFrom(shop, character, SALVE, ledger), undefined);
  assert.equal(buyFrom(shop, character, SALVE, ledger), "stock");
  assert.equal(sellTo(shop, character, SALVE, ledger), undefined);
  assert.equal(coinsOf(character, "cobre"), 18);
  assert.deepEqual(ledger, {}, "vendeu um e comprou um de volta: o estoque está como abriu");
  assert.equal(buyFrom(shop, character, SALVE, ledger), undefined);
  assert.equal(sellTo(shop, character, BREAD, ledger), "not_bought");
  assert.equal(sellTo({ ...shop, buys: false }, character, SALVE, ledger), "not_bought");
});

test("mochila cheia não leva o dinheiro", () => {
  const shop = SHOPS.banca;
  const ledger: ShopLedger = {};
  const character = buyer(10);
  character.inventory = { maxSlots: 0, slots: [] };
  assert.equal(buyFrom(shop, character, SALVE, ledger), "full");
  assert.equal(coinsOf(character, "cobre"), 10);
  assert.deepEqual(ledger, {});
});
