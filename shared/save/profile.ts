import { PROTAGONIST, isOrder } from "../party";
import type { CharacterClass } from "../types/characterClass";

/**
 * O que o JOGADOR conquistou, por fora de qualquer partida: as Ordens que ele
 * destravou pra Halmira. Não mora no save porque vale pro jogo novo seguinte,
 * e apagar uma partida não pode levá-lo junto.
 *
 * Quem destrava é a história (`unlock_order("rachador")` no texto — num
 * epílogo, por exemplo). Como o save, é dado puro: onde fica guardado é
 * problema do client.
 */
export interface Profile {
  /** Ordens destravadas, fora a que Halmira já tem. */
  orders: CharacterClass[];
}

export function emptyProfile(): Profile {
  return { orders: [] };
}

/** Lê um perfil, de texto ou já como objeto. Nunca lança: o que não se entende vira um perfil vazio. */
export function parseProfile(raw: unknown): Profile {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return emptyProfile();
    }
  }
  const orders = typeof data === "object" && data !== null ? (data as { orders?: unknown }).orders : undefined;
  if (!Array.isArray(orders)) return emptyProfile();
  return { orders: [...new Set(orders.filter(isOrder))].filter((order) => order !== PROTAGONIST.characterClass) };
}

/** Destrava uma Ordem. Muta `profile`; devolve false se ela já estava disponível. */
export function unlockOrder(profile: Profile, order: CharacterClass): boolean {
  if (availableOrders(profile).includes(order)) return false;
  profile.orders.push(order);
  return true;
}

/** As Ordens entre as quais um jogo novo pode escolher: a de Halmira primeiro, depois as destravadas. */
export function availableOrders(profile: Profile): CharacterClass[] {
  return [PROTAGONIST.characterClass, ...profile.orders];
}
