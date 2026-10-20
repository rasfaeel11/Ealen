import type { Character } from "./types/character";

/**
 * O dinheiro: cobre e prata (a tabela da §4 do AGENTS.md). Fica na bolsa de
 * quem leva a mochila, Endyru (`Character.purse`), e quem mexe nele é o texto:
 * o pedágio que se paga, a fiança da Mesa dos Contratos, o pagamento do
 * conselho (`money`, `pay` e `earn`, ver ./story/runner.ts).
 *
 * As duas moedas não se trocam uma pela outra: o cânone não diz quanto cobre
 * vale uma prata, e o jogo não diz por ele. Quem cobra em prata quer prata.
 * Não há loja nem preço de item: nenhuma cena pede.
 */
export const COINS = ["cobre", "prata"] as const;

export type Coin = (typeof COINS)[number];

export type Purse = Partial<Record<Coin, number>>;

export function isCoin(name: unknown): name is Coin {
  return COINS.includes(name as Coin);
}

/** Quantas moedas de `coin` `character` tem. Bolsa que nunca teve nada está vazia. */
export function coinsOf(character: Pick<Character, "purse">, coin: Coin): number {
  const amount = character.purse?.[coin];
  return typeof amount === "number" && Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
}

/** Põe `amount` de `coin` na bolsa. Devolve quanto ficou. */
export function earnCoins(character: Character, coin: Coin, amount: number): number {
  const left = coinsOf(character, coin) + Math.max(0, Math.floor(amount));
  character.purse = { ...character.purse, [coin]: left };
  return left;
}

/** Tira `amount` de `coin` da bolsa, se tem tudo; senão, não tira nada. Devolve se pagou. */
export function payCoins(character: Character, coin: Coin, amount: number): boolean {
  const price = Math.max(0, Math.floor(amount));
  const has = coinsOf(character, coin);
  if (has < price) return false;
  character.purse = { ...character.purse, [coin]: has - price };
  return true;
}

/** "12 de cobre e 3 de prata", pra interface; "nada" com a bolsa vazia. */
export function describePurse(character: Pick<Character, "purse">): string {
  const parts = COINS.filter((coin) => coinsOf(character, coin) > 0).map((coin) => `${coinsOf(character, coin)} de ${coin}`);
  return parts.length > 0 ? parts.join(" e ") : "nada";
}
