import assert from "node:assert/strict";
import { test } from "node:test";
import { breathOf, maxBreath } from "../../breath";
import { findItemTemplate } from "../../data/items";
import { addItemToInventory, findInventorySlot } from "../../inventoryEffects";
import { manaOf, maxMana } from "../../mana";
import { createProtagonist, joinParty, magicOf, type PartyMember } from "../../party";
import { CAMP_FOOD, camp, campMeals, campMouths, shortRest } from "../index";

/** O descanso (ver ../rest.ts): a pausa curta e o acampamento, que come da mochila. */

function trio(): { hero: ReturnType<typeof createProtagonist>; members: PartyMember[] } {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 12 };
  const members: PartyMember[] = [];
  joinParty(members, "jarupa", 1);
  joinParty(members, "xandui", 1);
  joinParty(members, "oryndu", 1);
  return { hero, members };
}

function hurt(...characters: { currentHp: number; maxHp: number; breath?: number }[]): void {
  for (const character of characters) {
    character.currentHp = 1;
    character.breath = 0;
  }
}

function bread(hero: ReturnType<typeof createProtagonist>, loaves: number): void {
  for (let i = 0; i < loaves; i++) addItemToInventory(hero, structuredClone(findItemTemplate(CAMP_FOOD)!));
}

test("a pausa curta devolve o Fôlego e metade da vida que falta, e não a mana", () => {
  const { hero, members } = trio();
  hurt(hero);
  hero.mana = 0;
  shortRest(hero, members);
  assert.equal(hero.currentHp, 1 + Math.ceil((hero.maxHp - 1) / 2));
  assert.equal(breathOf(hero), maxBreath(hero));
  assert.equal(manaOf(hero, magicOf(hero)!), 0);
});

test("o acampamento conta as bocas de quem luta e as refeições da mochila", () => {
  const { hero, members } = trio();
  assert.equal(campMouths(hero, members), 3, "o barqueiro come do que é dele");
  bread(hero, 2);
  assert.equal(campMeals(hero), 4, "o Pão de Viagem dá duas refeições");
});

test("com comida, o acampamento devolve tudo e come uma refeição por quem luta", () => {
  const { hero, members } = trio();
  hurt(hero, members[0].character);
  hero.mana = 0;
  bread(hero, 2);
  const { hungry } = camp(hero, members);
  assert.deepEqual(hungry, []);
  assert.equal(hero.currentHp, hero.maxHp);
  assert.equal(members[0].character.currentHp, members[0].character.maxHp);
  assert.equal(manaOf(hero, magicOf(hero)!), maxMana(hero, magicOf(hero)!));
  assert.equal(campMeals(hero), 1);
});

test("sem comida pra todos, quem fica sem acorda pela metade e com fome; a protagonista come primeiro", () => {
  const { hero, members } = trio();
  hurt(hero, members[0].character, members[1].character);
  bread(hero, 1);
  const { hungry } = camp(hero, members);
  assert.equal(hero.currentHp, hero.maxHp);
  assert.equal(members[0].character.currentHp, members[0].character.maxHp);
  const xandui = members[1].character;
  assert.deepEqual(hungry, [xandui.id]);
  assert.equal(xandui.currentHp, 1 + Math.ceil((xandui.maxHp - 1) / 2));
  assert.equal(breathOf(xandui), maxBreath(xandui), "o Fôlego volta mesmo com fome");
  assert.equal(findInventorySlot(hero, CAMP_FOOD), undefined, "o pão acabou");
});

test("quem não está no grupo descansa inteiro, longe dali", () => {
  const { hero, members } = trio();
  members[0].present = false;
  hurt(members[0].character);
  camp(hero, members);
  assert.equal(members[0].character.currentHp, members[0].character.maxHp);
});
