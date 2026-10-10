import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addGear,
  armOf,
  equip,
  equipRefusal,
  gearCount,
  gearDefense,
  gearedAttributes,
  startingEquipment,
  storedGear,
  unequip,
  wornItem,
} from "../../equipment";
import { findItem, giveItem, itemCount, takeItem } from "../../inventoryEffects";
import { BESTIARY } from "../../mock/bestiary";
import { EQUIPMENT, findEquipment } from "../../mock/equipment";
import { MOCK_ITEMS } from "../../mock/items";
import { COMPANIONS, HERO_ID, PROTAGONIST, STARTING_STASH, companionId, createProtagonist, joinParty, startingLoadout } from "../../party";
import { SAVE_VERSION, newGame, parseSave, serializeSave } from "../../save";
import { checkChance } from "../../story";
import { abilitiesFor, attackTotals, attackEdge, findUnit, gridFromAscii, startEncounter, unitFromCharacter } from "../../tactics";
import type { Character } from "../../types/character";
import { CLASS_INFO, type CharacterClass } from "../../types/characterClass";
import { EQUIPMENT_SLOTS, type Equipment } from "../../types/inventory";
import { grantEncounterRewards } from "../encounters";

/**
 * Equipamento (../../equipment.ts): o catálogo, vestir e guardar, o que cada
 * lugar muda numa luta e fora dela, por onde as peças entram (história e
 * espólio) e como um save de antes delas as ganha.
 */

const ORDERS = Object.keys(CLASS_INFO) as CharacterClass[];

function sheet(characterClass: CharacterClass, extra: Partial<Character> = {}): Character {
  return {
    id: "alguem",
    name: "Alguém",
    race: "althirim",
    characterClass,
    level: 1,
    xp: 0,
    attributes: { dain: 5, eir: 5, nath: 5, il: 5, or: 5, len: 5, ul: 5 },
    currentHp: 30,
    maxHp: 30,
    currentNodeId: "",
    ...extra,
  };
}

/** Confere que cada peça de `equipment` existe, está no lugar certo e serve a quem a veste. */
function assertWearable(who: string, characterClass: CharacterClass, equipment: Equipment): void {
  for (const slot of EQUIPMENT_SLOTS) {
    const id = equipment[slot];
    if (id === undefined) continue;
    const item = findEquipment(id);
    assert.ok(item, `${who} veste uma peça que não existe: ${id}`);
    assert.equal(item.data.slot, slot, `${who} veste ${id} no lugar errado`);
    assert.equal(equipRefusal({ characterClass }, item), undefined, `${who} (${characterClass}) não sabe usar ${id}`);
  }
}

test("o catálogo não repete id nem pisa nos consumíveis, e todo mundo que veste alguma coisa veste o que existe e sabe usar", () => {
  const ids = EQUIPMENT.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(MOCK_ITEMS.some((item) => item.id === id), false, `${id} também é consumível`);

  for (const order of ORDERS) assertWearable(`a Ordem ${order}`, order, startingEquipment(order));
  assertWearable("Halmira", PROTAGONIST.characterClass, PROTAGONIST.gear ?? {});
  for (const [key, member] of Object.entries(COMPANIONS)) assertWearable(key, member.characterClass, member.gear ?? {});
  for (const id of STARTING_STASH) assert.ok(findEquipment(id), `o guardado de começo tem ${id}, que não existe`);

  for (const [key, entry] of Object.entries(BESTIARY)) {
    assertWearable(key, entry.template.characterClass, entry.template.equipment ?? {});
    for (const drop of entry.drops) assert.ok(findItem(drop.itemId), `${key} deixa cair um item que não existe: ${drop.itemId}`);
  }
});

test("a arma dá o dado, o alcance e o acerto dos golpes de arma; de mãos vazias vale o natural da Ordem", () => {
  const bare = sheet("guardiao");
  assert.deepEqual(armOf(bare), { dice: { count: 1, sides: 6 }, range: 1, toHit: 0 });
  assert.equal(armOf(sheet("rachador")).range, 6);

  const hooked = sheet("guardiao", { equipment: { weapon: "gear-gancho-de-coleta" } });
  const strike = abilitiesFor(hooked).find((ability) => ability.id === "guardiao.attack")!;
  assert.equal(strike.range, 2);
  assert.equal(strike.attack?.toHit, -1);
  assert.deepEqual(strike.effects[0], { kind: "damage", dice: { count: 1, sides: 8 }, attribute: "primary" });
  // Um passo além do braço ainda pune quem sai de perto.
  assert.equal(strike.opportunity, true);

  // O golpe pesado é de arma também (-4 dele, -1 dela); o puxão do Guardião não é: fica como era.
  const heavy = abilitiesFor(hooked).find((ability) => ability.id === "guardiao.heavy_attack")!;
  assert.equal(heavy.attack?.toHit, -5);
  const pull = (who: Character) => abilitiesFor(who).find((ability) => ability.id === "guardiao.quick_attack")!;
  assert.deepEqual(pull(hooked), pull(bare));

  // Um Rachador com faca luta de perto; com o arco, de longe e com o dado dele.
  const knife = abilitiesFor(sheet("rachador", { equipment: { weapon: "gear-lamina-de-mergulho" } }));
  assert.equal(knife.find((ability) => ability.id === "rachador.attack")!.range, 1);
  const bow = abilitiesFor(sheet("rachador", { equipment: startingEquipment("rachador") }));
  assert.equal(bow.find((ability) => ability.id === "rachador.attack")!.range, 6);
});

test("vestir tira do guardado e devolve o que estava no lugar; recusado, não muda nada", () => {
  const owner = createProtagonist();
  assert.deepEqual(owner.equipment, PROTAGONIST.gear);
  assert.deepEqual(owner.gear, [...STARTING_STASH]);

  const swapped = equip(owner, owner, "gear-gancho-de-coleta");
  assert.ok(swapped.ok);
  assert.equal(swapped.replaced?.id, "gear-lamina-de-mergulho");
  assert.equal(wornItem(owner, "weapon")?.id, "gear-gancho-de-coleta");
  assert.deepEqual(owner.gear, ["gear-lamina-de-mergulho"]);

  // O que não está guardado não se veste — nem o que já está no corpo.
  assert.deepEqual(equip(owner, owner, "gear-gancho-de-coleta"), { ok: false, reason: "not_owned" });
  assert.deepEqual(equip(owner, owner, "gear-nao-existe"), { ok: false, reason: "not_owned" });

  // Arma de outra Ordem: a peça continua guardada.
  addGear(owner, "gear-arco-torto");
  const before = structuredClone(owner);
  assert.deepEqual(equip(owner, owner, "gear-arco-torto"), { ok: false, reason: "wrong_order" });
  assert.deepEqual(owner, before);

  // O guardado é do grupo: um companheiro veste o que está com ela.
  const members: Parameters<typeof joinParty>[0] = [];
  const lish = joinParty(members, "lish", 1)!;
  assert.deepEqual(lish.equipment, COMPANIONS.lish.gear);
  assert.ok(equip(owner, lish, "gear-arco-torto").ok);
  assert.equal(wornItem(lish, "weapon")?.id, "gear-arco-torto");
  assert.equal(gearCount(owner, "gear-faca-larga"), 1);

  // Tirar esvazia o lugar e guarda a peça; lugar vazio não devolve nada.
  assert.equal(unequip(owner, lish, "weapon")?.id, "gear-arco-torto");
  assert.equal(wornItem(lish, "weapon"), undefined);
  assert.equal(unequip(owner, lish, "weapon"), undefined);
  assert.deepEqual(storedGear(owner, "weapon").map((item) => item.id).sort(), ["gear-arco-torto", "gear-faca-larga", "gear-lamina-de-mergulho"]);
  assert.equal(storedGear(owner, "armor").length, 0);
});

test("na luta, a armadura entra na defesa e no passo, e o acessório nos atributos", () => {
  const plated = sheet("guardiao", { equipment: { armor: "gear-placa-de-servo", accessory: "gear-conta-de-forja" } });
  assert.equal(gearDefense(plated), 3);
  assert.equal(gearedAttributes(plated).dain, 7);
  // A ficha não muda: o que se veste é somado por cima.
  assert.equal(plated.attributes.dain, 5);

  const { grid, markers } = gridFromAscii(["AE"]);
  const { encounter } = startEncounter({
    grid,
    seed: 1,
    units: [
      unitFromCharacter(sheet("guardiao", { id: "A" }), { team: "party", pos: markers.A[0] }),
      unitFromCharacter({ ...plated, id: "E" }, { team: "enemy", pos: markers.E[0] }),
    ],
  });
  const attacker = findUnit(encounter, "A")!;
  const target = findUnit(encounter, "E")!;
  assert.equal(target.attributes.dain, 7);
  assert.equal(target.defense, 3);
  assert.equal(target.speed, attacker.speed - 1);

  const strike = attacker.abilities.find((ability) => ability.id === "guardiao.attack")!;
  const { defense } = attackTotals(attacker, strike, target, attackEdge(encounter, attacker, strike, target));
  assert.equal(defense, 10 + 5 + 3);
});

test("fora de luta, o acessório pesa nos testes da história", () => {
  const plain = sheet("luminar");
  const ringed = sheet("luminar", { equipment: { accessory: "gear-sinete-da-companhia" } });
  const check = { attribute: "len", difficulty: 14 } as const;
  assert.equal(Math.round((checkChance(ringed, check) - checkChance(plain, check)) * 20), 2);
});

test("equipamento é item como os outros pra história e pro espólio: entra no guardado, e só de lá sai", () => {
  const owner = createProtagonist();
  const plate = findItem("gear-placa-de-servo")!;
  assert.equal(plate.category, "equipment");
  assert.equal(giveItem(owner, plate), true);
  assert.equal(itemCount(owner, plate.id), 1);
  assert.equal(owner.inventory?.slots.some((slot) => slot.item.id === plate.id), false);

  // O que está vestido não conta nem sai: a história não tira a roupa de ninguém.
  assert.equal(itemCount(owner, "gear-lamina-de-mergulho"), 0);
  assert.equal(takeItem(owner, "gear-lamina-de-mergulho"), false);
  assert.equal(takeItem(owner, plate.id), true);
  assert.equal(takeItem(owner, plate.id), false);

  // Consumível continua indo pra mochila e saindo dela.
  assert.equal(itemCount(owner, "item-lagrima-de-eir"), 2);
  assert.equal(takeItem(owner, "item-lagrima-de-eir"), true);
  assert.equal(itemCount(owner, "item-lagrima-de-eir"), 1);

  // O lobo às vezes deixa a presa: quando deixa, ela vai pro guardado, não pra mochila.
  for (let seed = 1; seed < 200; seed++) {
    const winner = createProtagonist();
    const rewards = grantEncounterRewards(winner, ["encounter-lobo-de-bruma"], { rngState: seed });
    if (!rewards.loot.some((item) => item.id === "gear-presa-de-bruma")) continue;
    assert.equal(gearCount(winner, "gear-presa-de-bruma"), 1);
    assert.equal(winner.inventory?.slots.some((slot) => slot.item.id === "gear-presa-de-bruma"), false);
    return;
  }
  assert.fail("em 200 lutas o lobo nunca deixou a presa");
});

test("quem começa em outra Ordem começa com a arma dela, e fica com o que é seu", () => {
  const singer = createProtagonist("cantor_de_ealen");
  assert.deepEqual(singer.equipment, { ...startingEquipment("cantor_de_ealen"), accessory: "gear-rede-de-coleta" });
  assert.deepEqual(startingLoadout({ id: "ninguem", characterClass: "rachador" }), startingEquipment("rachador"));
  // Quem só acompanha não veste nada pra luta.
  assert.equal(joinParty([], "gil", 1)!.equipment, undefined);
});

test("save de antes do equipamento ganha o de começo; peça que o catálogo não tem mais não estraga o save", () => {
  const old = newGame(createProtagonist());
  joinParty(old.companions, "lish", 1);
  joinParty(old.companions, "gil", 1);
  const legacy = JSON.parse(serializeSave(old));
  legacy.version = 3;
  delete legacy.character.equipment;
  delete legacy.character.gear;
  for (const member of legacy.companions) delete member.character.equipment;

  const parsed = parseSave(legacy);
  assert.ok(parsed.ok);
  const { save } = parsed;
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.character.id, HERO_ID);
  assert.deepEqual(save.character.equipment, PROTAGONIST.gear);
  assert.deepEqual(save.character.gear, [...STARTING_STASH]);
  const byId = (id: string) => save.companions.find((member) => member.character.id === id)!.character;
  assert.deepEqual(byId(companionId("lish")).equipment, COMPANIONS.lish.gear);
  assert.equal(byId(companionId("gil")).equipment, undefined);

  // Um save já na versão atual não é mexido: quem tirou a arma continua sem ela.
  const bare = newGame(createProtagonist());
  unequip(bare.character, bare.character, "weapon");
  const again = parseSave(serializeSave(bare));
  assert.ok(again.ok);
  assert.equal(wornItem(again.save.character, "weapon"), undefined);

  // Id que não existe mais: o lugar vale como vazio, e a ficha luta com o natural da Ordem.
  const stale = newGame(createProtagonist());
  stale.character.equipment = { weapon: "gear-que-saiu-do-jogo" };
  stale.character.gear = ["gear-que-saiu-do-jogo"];
  const loaded = parseSave(serializeSave(stale));
  assert.ok(loaded.ok);
  assert.equal(wornItem(loaded.save.character, "weapon"), undefined);
  assert.equal(armOf(loaded.save.character).range, 1);
  assert.deepEqual(storedGear(loaded.save.character), []);

  // Equipamento mal formado é save estragado.
  const broken = JSON.parse(serializeSave(newGame(createProtagonist())));
  broken.character.gear = [1, 2];
  assert.deepEqual(parseSave(broken), { ok: false, problem: "invalid" });
});
