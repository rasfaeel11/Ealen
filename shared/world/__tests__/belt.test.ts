import assert from "node:assert/strict";
import { test } from "node:test";
import { findItemTemplate } from "../../data/items";
import { BELT_SLOTS, addItemToInventory, findInventorySlot, passItem } from "../../inventoryEffects";
import { createProtagonist, joinParty, type PartyMember } from "../../party";
import { applyCommand } from "../../tactics/engine";
import { activeUnit, findUnit, syncCharacterFromUnit, unitFromCharacter } from "../../tactics/units";
import { setup } from "../../tactics/__tests__/helpers";
import { CAMP_FOOD, camp, campMeals, sheetAbilities, toggleBenched } from "../index";

/** O cinto de cada um (ver passItem em ../../inventoryEffects.ts) e o que cada um leva pra luta. */

const UNGUENTO = "item-unguento-de-barqueiro";

function party(): { hero: ReturnType<typeof createProtagonist>; members: PartyMember[]; jarupa: PartyMember["character"]; xandui: PartyMember["character"] } {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 12 };
  const members: PartyMember[] = [];
  joinParty(members, "jarupa", 1);
  joinParty(members, "xandui", 1);
  return { hero, members, jarupa: members[0].character, xandui: members[1].character };
}

function give(owner: ReturnType<typeof createProtagonist>, id: string, count = 1): void {
  for (let i = 0; i < count; i++) addItemToInventory(owner, structuredClone(findItemTemplate(id)!));
}

test("passar um item tira de um e põe no outro, e quem nunca carregou ganha um cinto", () => {
  const { hero, jarupa } = party();
  give(hero, UNGUENTO, 2);
  assert.equal(passItem(hero, jarupa, UNGUENTO), "ok");
  assert.equal(findInventorySlot(hero, UNGUENTO)?.quantity, 1);
  assert.equal(findInventorySlot(jarupa, UNGUENTO)?.quantity, 1);
  assert.equal(jarupa.inventory?.maxSlots, BELT_SLOTS);
});

test("o último item sai do lugar dele; quem não tem o item não passa nada", () => {
  const { hero, jarupa, xandui } = party();
  give(hero, UNGUENTO);
  assert.equal(passItem(hero, jarupa, UNGUENTO), "ok");
  assert.equal(findInventorySlot(hero, UNGUENTO), undefined);
  assert.equal(passItem(hero, xandui, UNGUENTO), "none");
  assert.equal(findInventorySlot(xandui, UNGUENTO), undefined);
});

test("no cinto cheio não entra um item novo, e nada se perde", () => {
  const { hero, jarupa } = party();
  give(hero, UNGUENTO);
  jarupa.inventory = { slots: [], maxSlots: 0 };
  assert.equal(passItem(hero, jarupa, UNGUENTO), "full");
  assert.equal(findInventorySlot(hero, UNGUENTO)?.quantity, 1);
});

test("na luta, quem leva o item o usa na vez dele, e a ficha sai da luta sem ele", () => {
  const { hero, jarupa } = party();
  give(hero, UNGUENTO);
  passItem(hero, jarupa, UNGUENTO);
  jarupa.currentHp = 5;
  const { encounter } = setup(["a....b"], (at) => [
    unitFromCharacter(jarupa, { team: "party", pos: at("a") }),
    unitFromCharacter(createProtagonist(), { team: "enemy", id: "outro", pos: at("b") }),
  ]);
  if (activeUnit(encounter)?.id !== jarupa.id) applyCommand(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  assert.equal(activeUnit(encounter)?.id, jarupa.id);
  const before = findUnit(encounter, jarupa.id)!.currentHp;
  const result = applyCommand(encounter, { type: "useItem", unitId: jarupa.id, itemId: UNGUENTO });
  assert.ok(result.ok);
  const after = findUnit(encounter, jarupa.id)!;
  assert.ok(after.currentHp > before);
  syncCharacterFromUnit(jarupa, after);
  assert.equal(findInventorySlot(jarupa, UNGUENTO), undefined);
});

test("o acampamento conta e come o pão que está no cinto", () => {
  const { hero, members, jarupa } = party();
  give(hero, CAMP_FOOD);
  passItem(hero, jarupa, CAMP_FOOD);
  assert.equal(campMeals(hero), 0);
  const meals = campMeals(hero, members);
  assert.ok(meals > 0);
  const { hungry } = camp(hero, members);
  assert.equal(campMeals(hero, members), Math.max(0, meals - 3));
  assert.equal(hungry.length, Math.max(0, 3 - meals));
});

test("a habilidade deixada de fora não entra na luta, e volta quando se leva de novo", () => {
  const { xandui } = party();
  const ability = sheetAbilities(xandui).find((candidate) => !candidate.attack)!;
  assert.ok(toggleBenched(xandui, ability.id));
  const unit = unitFromCharacter(xandui, { team: "party", pos: { x: 0, y: 0 } });
  assert.ok(!unit.abilities.some((candidate) => candidate.id === ability.id));
  assert.ok(toggleBenched(xandui, ability.id));
  assert.equal(xandui.benched, undefined);
  const again = unitFromCharacter(xandui, { team: "party", pos: { x: 0, y: 0 } });
  assert.ok(again.abilities.some((candidate) => candidate.id === ability.id));
});

test("ninguém fica sem golpe nenhum: o último não sai", () => {
  const { xandui } = party();
  const blows = sheetAbilities(xandui).filter((ability) => ability.attack);
  const last = blows.pop()!;
  for (const blow of blows) assert.ok(toggleBenched(xandui, blow.id));
  assert.equal(toggleBenched(xandui, last.id), false);
  assert.ok(!xandui.benched?.includes(last.id));
});
