import { findEquipment } from "./mock/equipment";
import type { Dice } from "./tactics/rng";
import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import type { Character } from "./types/character";
import type { CharacterClass } from "./types/characterClass";
import type { Equipment, EquipmentItem, EquipmentSlot } from "./types/inventory";

/**
 * Equipamento: o que cada pessoa veste e o que isso muda.
 *
 * Cada um tem três lugares — arma, armadura e acessório (`Character.equipment`,
 * o id da peça de cada lugar). O que não está no corpo de ninguém fica
 * guardado com a dona da mochila (`Character.gear`), e é de lá que se veste:
 * vestir tira a peça do guardado e devolve a que estava no lugar.
 *
 * - A ARMA dá o dado e o alcance dos golpes de arma, e soma (ou tira) acerto:
 *   `armOf` é a pergunta, e quem a faz é `abilitiesFor`, ao montar o kit — a
 *   luta recebe as habilidades já com os números da arma, e o motor não sabe
 *   que arma existe. De mãos vazias vale o natural da Ordem (`BARE`).
 * - A ARMADURA soma na defesa (`gearDefense`, que vira `Unit.defense`) e,
 *   pesada, tira movimento (`gearSpeed`).
 * - O ACESSÓRIO soma atributos (`gearedAttributes`): na luta, nos testes da
 *   história e na cura feita fora de luta. Vida e Fôlego máximos continuam
 *   vindo do Nath da ficha, sem acessório.
 *
 * Criatura também pode vestir (`template.equipment` no bestiário): é como a
 * gente do capítulo ganha o bastão, o arpão e o gibão. O que ela veste não
 * cai — espólio é `drops`.
 *
 * Nada aqui faz I/O: as funções mutam as fichas recebidas e dizem o que houve.
 */

/** Com o que alguém bate: o dado do golpe, de quão longe, e o que isso soma no acerto. */
export interface Arm {
  dice: Dice;
  range: number;
  toHit: number;
}

const D6: Dice = { count: 1, sides: 6 };

/**
 * O que cada Ordem tem de mãos vazias: o dado mais fraco, no alcance do
 * próprio Princípio. É também a arma natural das criaturas.
 */
const BARE: Record<CharacterClass, Arm> = {
  luminar: { dice: D6, range: 1, toHit: 0 },
  guardiao: { dice: D6, range: 1, toHit: 0 },
  sombrilico: { dice: D6, range: 1, toHit: 0 },
  rachador: { dice: D6, range: 6, toHit: 0 },
  cantor_de_ealen: { dice: D6, range: 5, toHit: 0 },
  entropista: { dice: D6, range: 5, toHit: 0 },
};

/** Com o que cada Ordem começa. Quem é do elenco pode começar com outra coisa (`gear` em ./party.ts). */
const STARTING_EQUIPMENT: Record<CharacterClass, Equipment> = {
  luminar: { weapon: "gear-espada-de-prumo", armor: "gear-cota-de-escamas" },
  guardiao: { weapon: "gear-maca-de-lastro", armor: "gear-cota-de-escamas" },
  sombrilico: { weapon: "gear-adaga-fosca", armor: "gear-manto-de-viagem" },
  rachador: { weapon: "gear-arco-torto", armor: "gear-manto-de-viagem" },
  cantor_de_ealen: { weapon: "gear-diapasao-de-haste", armor: "gear-tunica-de-linho" },
  entropista: { weapon: "gear-ampulheta-rachada", armor: "gear-tunica-de-linho" },
};

export function startingEquipment(order: CharacterClass): Equipment {
  return { ...STARTING_EQUIPMENT[order] };
}

type Wearer = Pick<Character, "equipment">;

/** A peça que `character` tem em `slot`. Undefined se o lugar está vazio (ou guarda um id que o catálogo não tem mais). */
export function wornItem(character: Wearer, slot: EquipmentSlot): EquipmentItem | undefined {
  const id = character.equipment?.[slot];
  const item = id === undefined ? undefined : findEquipment(id);
  return item?.data.slot === slot ? item : undefined;
}

/** Com o que `character` bate: a arma que empunha ou, de mãos vazias, o natural da Ordem. */
export function armOf(character: Pick<Character, "characterClass" | "equipment">): Arm {
  const weapon = wornItem(character, "weapon")?.data;
  if (weapon?.slot !== "weapon") return BARE[character.characterClass];
  return { dice: weapon.dice, range: weapon.range, toHit: weapon.toHit ?? 0 };
}

/** O que a armadura de `character` soma na defesa dele. */
export function gearDefense(character: Wearer): number {
  const armor = wornItem(character, "armor")?.data;
  return armor?.slot === "armor" ? armor.defense : 0;
}

/** O que a armadura de `character` soma (ou, pesada, tira) nos quadrados de movimento dele. */
export function gearSpeed(character: Wearer): number {
  const armor = wornItem(character, "armor")?.data;
  return armor?.slot === "armor" ? (armor.speed ?? 0) : 0;
}

/** O que o acessório de `character` soma a cada atributo (só os que ele mexe). */
export function gearBonus(character: Wearer): Partial<Attributes> {
  const accessory = wornItem(character, "accessory")?.data;
  return accessory?.slot === "accessory" ? accessory.attributes : {};
}

/** Os atributos de `character` com o que ele veste somado. */
export function gearedAttributes(character: Pick<Character, "attributes" | "equipment">): Attributes {
  const bonus = gearBonus(character);
  const attributes = { ...character.attributes };
  for (const key of ATTRIBUTE_KEYS) attributes[key] += bonus[key] ?? 0;
  return attributes;
}

// --- O guardado ---------------------------------------------------------------

/** Guarda uma peça com `owner` (a dona da mochila). Peça igual não empilha: entra de novo. */
export function addGear(owner: Character, itemId: string): void {
  owner.gear = [...(owner.gear ?? []), itemId];
}

/** Quantas peças `itemId` `owner` tem guardadas. */
export function gearCount(owner: Pick<Character, "gear">, itemId: string): number {
  return (owner.gear ?? []).filter((id) => id === itemId).length;
}

/** Tira UMA peça `itemId` do guardado de `owner`. Diz se havia. */
export function removeGear(owner: Character, itemId: string): boolean {
  const index = (owner.gear ?? []).indexOf(itemId);
  if (index < 0) return false;
  owner.gear = owner.gear!.filter((_, at) => at !== index);
  return true;
}

/** As peças guardadas com `owner` que vão em `slot`, uma entrada por peça. Id que o catálogo não tem mais fica de fora. */
export function storedGear(owner: Pick<Character, "gear">, slot?: EquipmentSlot): EquipmentItem[] {
  return (owner.gear ?? []).flatMap((id) => {
    const item = findEquipment(id);
    return item && (slot === undefined || item.data.slot === slot) ? [item] : [];
  });
}

// --- Vestir -------------------------------------------------------------------

export type EquipError =
  /** A peça não existe, ou não está guardada. */
  | "not_owned"
  /** A Ordem de quem ia vestir não sabe usar esta arma. */
  | "wrong_order";

export type EquipResult = { ok: true; replaced?: EquipmentItem } | { ok: false; reason: EquipError };

/**
 * Por que `wearer` não pode vestir `item` — ou undefined, se pode. É a mesma
 * pergunta pra tela e pra regra. Não olha se a peça está guardada.
 */
export function equipRefusal(wearer: Pick<Character, "characterClass">, item: EquipmentItem): EquipError | undefined {
  const { data } = item;
  if (data.slot === "weapon" && data.orders && !data.orders.includes(wearer.characterClass)) return "wrong_order";
  return undefined;
}

/**
 * `wearer` veste a peça `itemId`, tirada do guardado de `owner`; a que estava
 * no lugar volta pro guardado (`replaced`). Recusado, não muda nada.
 */
export function equip(owner: Character, wearer: Character, itemId: string): EquipResult {
  const item = findEquipment(itemId);
  if (!item || gearCount(owner, itemId) === 0) return { ok: false, reason: "not_owned" };
  const refusal = equipRefusal(wearer, item);
  if (refusal) return { ok: false, reason: refusal };

  const { slot } = item.data;
  const replaced = wornItem(wearer, slot);
  removeGear(owner, itemId);
  if (replaced) addGear(owner, replaced.id);
  wearer.equipment = { ...wearer.equipment, [slot]: itemId };
  return replaced ? { ok: true, replaced } : { ok: true };
}

/** `wearer` tira o que tem em `slot`, que vai pro guardado de `owner`. Devolve a peça, ou undefined se o lugar estava vazio. */
export function unequip(owner: Character, wearer: Character, slot: EquipmentSlot): EquipmentItem | undefined {
  const item = wornItem(wearer, slot);
  const { [slot]: _removed, ...rest } = wearer.equipment ?? {};
  wearer.equipment = rest;
  if (item) addGear(owner, item.id);
  return item;
}
