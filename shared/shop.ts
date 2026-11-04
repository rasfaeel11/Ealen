import { findItem, giveItem, itemCount, takeItem, type GameItem } from "./inventoryEffects";
import { coinsOf, earnCoins, payCoins, type Coin } from "./purse";
import type { Character } from "./types/character";

/**
 * As lojas: quem vende o quê, por quanto, em que moeda e quanto tem.
 *
 * O preço é de cada loja, não do item: o mesmo pão custa o que a banca daquele
 * lugar cobra. A moeda também (as duas não se trocam, ver ./purse.ts): quem
 * vende em cobre recebe cobre. O estoque acaba: o que cada loja já vendeu fica
 * guardado com a história (`sold`, ver ./story/memory.ts), e uma loja não
 * repõe nada sozinha.
 *
 * Vender também se vende, mas só pra quem compra aquilo: uma loja aceita de
 * volta o que ela mesma vende, pela metade do preço (pelo menos 1), e o que
 * ela compra volta pro estoque. Item-chave não se vende.
 *
 * Quem abre a loja é o texto (`shop("banca")`, ver ./story/runner.ts). Como o
 * resto de shared/, isto é dado puro e não desenha nada.
 */

/** Uma mercadoria: o item, o preço e a moeda, e quanto a loja tem pra vender. */
export interface ShopWare {
  itemId: string;
  coin: Coin;
  price: number;
  /** Quanto há pra vender quando a loja abre a primeira vez. Ausente = não acaba. */
  stock?: number;
  /** O que quem vende diz ao entregar. */
  line?: string;
}

export interface Shop {
  id: string;
  /** Quem vende, como a caixa de diálogo o chama. */
  seller: string;
  wares: ShopWare[];
  /** Se aceita de volta o que vende (pela metade do preço). */
  buys?: boolean;
}

/**
 * As lojas do jogo. Os preços e as falas da banca são os do roteiro (task 25), sem fala nova; o
 * estoque e a compra de volta foram fechados pelo co-autor (docs/escolhas.md). Thrykar não tem loja:
 * ele tempera e conserta, não vende.
 */
export const SHOPS: Record<string, Shop> = {
  banca: {
    id: "banca",
    seller: "Vendedora do cais",
    wares: [
      { itemId: "item-pao-de-viagem", coin: "cobre", price: 2, stock: 6, line: "Duro até a lua que vem. Molha no rio." },
      { itemId: "item-unguento-de-barqueiro", coin: "cobre", price: 4, stock: 4, line: "Passa no talho e não olha. Arde." },
    ],
    buys: true,
  },
};

export function findShop(id: string): Shop | undefined {
  return SHOPS[id];
}

/** O que cada loja já vendeu (positivo) ou comprou de volta (negativo), pelo id da loja e do item. */
export type ShopLedger = Record<string, Record<string, number>>;

/** Quanto `ware` ainda tem pra vender. Infinity se não acaba. */
export function stockLeft(shop: Shop, ware: ShopWare, ledger: ShopLedger): number {
  if (ware.stock === undefined) return Infinity;
  return Math.max(0, ware.stock - (ledger[shop.id]?.[ware.itemId] ?? 0));
}

/** Quanto a loja paga por uma unidade de `ware`: metade do preço, pelo menos 1. */
export function buybackPrice(ware: ShopWare): number {
  return Math.max(1, Math.floor(ware.price / 2));
}

function record(ledger: ShopLedger, shop: Shop, itemId: string, delta: number): void {
  const sold = (ledger[shop.id] ??= {});
  sold[itemId] = (sold[itemId] ?? 0) + delta;
  if (sold[itemId] === 0) delete sold[itemId];
  if (Object.keys(sold).length === 0) delete ledger[shop.id];
}

/** Por que não se compra: a loja não tem, acabou, falta dinheiro, ou não cabe na mochila. */
export type BuyRefusal = "unknown" | "stock" | "coins" | "full";

/** Por que não compra agora, sem comprar. Undefined = pode. */
export function buyRefusal(shop: Shop, buyer: Character, itemId: string, ledger: ShopLedger): BuyRefusal | undefined {
  const ware = shop.wares.find((each) => each.itemId === itemId);
  if (!ware || !findItem(itemId)) return "unknown";
  if (stockLeft(shop, ware, ledger) < 1) return "stock";
  if (coinsOf(buyer, ware.coin) < ware.price) return "coins";
  return undefined;
}

/**
 * `buyer` (a dona da mochila e da bolsa) compra uma unidade de `itemId`. Paga
 * só se o item coube: mochila cheia não leva o dinheiro. Devolve o que impediu,
 * ou undefined se comprou.
 */
export function buyFrom(shop: Shop, buyer: Character, itemId: string, ledger: ShopLedger): BuyRefusal | undefined {
  const refusal = buyRefusal(shop, buyer, itemId, ledger);
  if (refusal) return refusal;
  const ware = shop.wares.find((each) => each.itemId === itemId)!;
  const item = findItem(itemId) as GameItem;
  if (!giveItem(buyer, item)) return "full";
  payCoins(buyer, ware.coin, ware.price);
  record(ledger, shop, itemId, 1);
  return undefined;
}

/** Por que não se vende: a loja não compra isso, não há o que vender, ou é item-chave. */
export type SellRefusal = "not_bought" | "none" | "key";

/** Por que não vende agora, sem vender. Undefined = pode. */
export function sellRefusal(shop: Shop, seller: Character, itemId: string): SellRefusal | undefined {
  const ware = shop.wares.find((each) => each.itemId === itemId);
  if (!shop.buys || !ware) return "not_bought";
  if (itemCount(seller, itemId) < 1) return "none";
  if (findItem(itemId)?.key) return "key";
  return undefined;
}

/** `seller` vende uma unidade de `itemId` à loja, que a põe de volta no estoque. Devolve o que impediu, ou undefined se vendeu. */
export function sellTo(shop: Shop, seller: Character, itemId: string, ledger: ShopLedger): SellRefusal | undefined {
  const refusal = sellRefusal(shop, seller, itemId);
  if (refusal) return refusal;
  const ware = shop.wares.find((each) => each.itemId === itemId)!;
  if (!takeItem(seller, itemId)) return "none";
  earnCoins(seller, ware.coin, buybackPrice(ware));
  record(ledger, shop, itemId, -1);
  return undefined;
}
