import { restoreBreath } from "../breath";
import { consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { restoreMana } from "../mana";
import { fights, magicOf, type PartyMember } from "../party";
import type { Character } from "../types/character";

/**
 * O descanso, fora de luta e em qualquer lugar. Dois jeitos:
 *
 * - a PAUSA CURTA: sentar na beira da estrada, beber água, apertar a
 *   atadura. Devolve o Fôlego e metade da vida que falta. Mana não volta
 *   (só o sono a devolve) e a marca da mana não passa. Cabem SHORT_RESTS
 *   entre um acampamento e outro, e não gasta o relógio.
 * - o ACAMPAMENTO: fogo, comida e uma noite. Volta tudo — vida, Fôlego,
 *   mana —, a marca e a fome passam, e quem conjura grava. Mas cada um que
 *   luta come uma refeição de CAMP_FOOD (o Pão de Viagem dá duas); quem fica
 *   sem acorda com metade da vida que faltava e com Fome. E a noite gasta o
 *   relógio (o custo `rest` que a história põe, ver ../story/memory.ts).
 *
 * Quem acompanha sem lutar (Oryndu) come do que é dele. Quem já andou com o
 * grupo e não está nele descansa onde estiver, de graça.
 */

/** Quantas pausas curtas cabem entre dois acampamentos. */
export const SHORT_RESTS = 2;

/** A comida do acampamento: uma carga (uma refeição) por boca. */
export const CAMP_FOOD = "item-pao-de-viagem";

/** O que sobra da vida que faltava: metade, pra cima. */
function halfway(character: Character): number {
  return Math.min(character.maxHp, character.currentHp + Math.ceil((character.maxHp - character.currentHp) / 2));
}

/** Quem descansa junto: a protagonista e quem está no grupo agora. */
function company(hero: Character, members: readonly PartyMember[]): Character[] {
  return [hero, ...members.filter((member) => member.present).map((member) => member.character)];
}

/** Os de fora do grupo agora: descansam inteiros, longe dali. */
function away(members: readonly PartyMember[]): Character[] {
  return members.filter((member) => !member.present).map((member) => member.character);
}

function restoreAll(character: Character): void {
  character.currentHp = character.maxHp;
  restoreBreath(character);
  const magic = magicOf(character);
  if (magic) restoreMana(character, magic);
}

/** A pausa curta: Fôlego cheio e metade da vida que falta, pra quem está no grupo. Quem chama conta as pausas. */
export function shortRest(hero: Character, members: readonly PartyMember[]): void {
  for (const character of company(hero, members)) {
    character.currentHp = halfway(character);
    restoreBreath(character);
  }
}

/** Quantas refeições a mochila de `hero` (a do grupo) tem pro acampamento. */
export function campMeals(hero: Pick<Character, "inventory">): number {
  const slot = findInventorySlot(hero, CAMP_FOOD);
  if (!slot || slot.quantity <= 0) return 0;
  return (slot.quantity - 1) * slot.item.data.maxUses + slot.item.data.usesRemaining;
}

/** Quantas bocas o acampamento tem de alimentar: quem luta no grupo agora. */
export function campMouths(hero: Character, members: readonly PartyMember[]): number {
  return company(hero, members).filter((character) => fights(character)).length;
}

export interface CampOutcome {
  /** Os ids de quem dormiu sem comer: acordam com metade do que faltava, e com Fome (a história a põe, ver HUNGER). */
  hungry: string[];
}

/**
 * O acampamento. Come da mochila de `hero` uma refeição por quem luta, na
 * ordem do grupo (ela primeiro); quem fica sem comer volta só pela metade.
 * Quem chama tira da história o que passa com o descanso, põe a Fome em
 * `hungry`, cobra o relógio e devolve as pausas curtas.
 */
export function camp(hero: Character, members: readonly PartyMember[]): CampOutcome {
  const hungry: string[] = [];
  for (const character of company(hero, members)) {
    const slot = fights(character) ? findInventorySlot(hero, CAMP_FOOD) : undefined;
    if (fights(character) && !slot) {
      character.currentHp = halfway(character);
      restoreBreath(character);
      const magic = magicOf(character);
      if (magic) restoreMana(character, magic);
      hungry.push(character.id);
      continue;
    }
    if (slot) consumeInventoryCharge(hero, slot);
    restoreAll(character);
  }
  for (const character of away(members)) restoreAll(character);
  return { hungry };
}
