import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
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
    race: "humano",
    characterClass,
    level: 1,
    xp: 0,
    attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
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

  for (const order of ORDERS) assertWearable(`a classe ${order}`, order, startingEquipment(order));
  assertWearable("Endyru", PROTAGONIST.characterClass, PROTAGONIST.gear ?? {});
  for (const [key, member] of Object.entries(COMPANIONS)) assertWearable(key, member.characterClass, member.gear ?? {});
  for (const id of STARTING_STASH) assert.ok(findEquipment(id), `o guardado de começo tem ${id}, que não existe`);

  for (const [key, entry] of Object.entries(BESTIARY)) {
    assertWearable(key, entry.template.characterClass, entry.template.equipment ?? {});
    for (const drop of entry.drops) assert.ok(findItem(drop.itemId), `${key} deixa cair um item que não existe: ${drop.itemId}`);
  }
});

test("a arma dá o dado, o alcance e o acerto dos golpes de arma; de mãos vazias vale 1d6 de perto", () => {
  for (const order of ["atracao_repulsao", "espadachim"] as const) {
    assert.deepEqual(armOf(sheet(order)), { dice: { count: 1, sides: 6 }, range: 1, toHit: 0 });
  }

  const hooked = sheet("espadachim", { equipment: { weapon: "gear-teste-gancho" } });
  const strike = abilitiesFor(hooked).find((ability) => ability.id === "espadachim.attack")!;
  assert.equal(strike.range, 2);
  assert.equal(strike.attack?.toHit, -1);
  assert.deepEqual(strike.effects[0], { kind: "damage", dice: { count: 1, sides: 8 }, attribute: "primary" });
  // Um passo além do braço ainda pune quem sai de perto.
  assert.equal(strike.opportunity, true);

  // O golpe pesado é de arma também (-4 dele, -1 dela); o Puxão do mago é magia, não arma: fica como era.
  const heavy = abilitiesFor(hooked).find((ability) => ability.id === "espadachim.heavy_attack")!;
  assert.equal(heavy.attack?.toHit, -5);
  const pull = (who: Character) => abilitiesFor(who).find((ability) => ability.id === "atracao_repulsao.quick_attack")!;
  assert.deepEqual(pull(sheet("atracao_repulsao", { equipment: { weapon: "gear-teste-gancho" } })), pull(sheet("atracao_repulsao")));

  // Com a besta, o espadachim luta de longe e com o dado dela.
  const bow = abilitiesFor(sheet("espadachim", { equipment: { weapon: "gear-besta" } }));
  assert.equal(bow.find((ability) => ability.id === "espadachim.attack")!.range, 6);
});

test("vestir tira do guardado e devolve o que estava no lugar; recusado, não muda nada", () => {
  const owner = createProtagonist();
  assert.deepEqual(owner.equipment, PROTAGONIST.gear);
  assert.deepEqual(owner.gear, [...STARTING_STASH]);

  addGear(owner, "gear-teste-gancho");
  const swapped = equip(owner, owner, "gear-teste-gancho");
  assert.ok(swapped.ok);
  assert.equal(swapped.replaced?.id, "gear-bordao");
  assert.equal(wornItem(owner, "weapon")?.id, "gear-teste-gancho");
  assert.deepEqual(owner.gear, ["gear-bordao"]);

  // O que não está guardado não se veste — nem o que já está no corpo.
  assert.deepEqual(equip(owner, owner, "gear-teste-gancho"), { ok: false, reason: "not_owned" });
  assert.deepEqual(equip(owner, owner, "gear-nao-existe"), { ok: false, reason: "not_owned" });

  // Arma de espadachim no mago: a peça continua guardada.
  addGear(owner, "gear-espada-reta");
  const before = structuredClone(owner);
  assert.deepEqual(equip(owner, owner, "gear-espada-reta"), { ok: false, reason: "wrong_order" });
  assert.deepEqual(owner, before);

  // O guardado é do grupo: um companheiro veste o que está com ele.
  const members: Parameters<typeof joinParty>[0] = [];
  const jarupa = joinParty(members, "jarupa", 1)!;
  assert.deepEqual(jarupa.equipment, COMPANIONS.jarupa.gear);
  assert.ok(equip(owner, jarupa, "gear-espada-reta").ok);
  assert.equal(wornItem(jarupa, "weapon")?.id, "gear-espada-reta");
  assert.equal(gearCount(owner, "gear-espada-pesada"), 1);

  // Tirar esvazia o lugar e guarda a peça; lugar vazio não devolve nada.
  assert.equal(unequip(owner, jarupa, "weapon")?.id, "gear-espada-reta");
  assert.equal(wornItem(jarupa, "weapon"), undefined);
  assert.equal(unequip(owner, jarupa, "weapon"), undefined);
  assert.deepEqual(storedGear(owner, "weapon").map((item) => item.id).sort(), ["gear-bordao", "gear-espada-pesada", "gear-espada-reta"]);
  assert.equal(storedGear(owner, "armor").length, 0);
});

test("na luta, a armadura entra na defesa e no passo, e o acessório nos atributos", () => {
  const plated = sheet("espadachim", { equipment: { armor: "gear-teste-placa", accessory: "gear-teste-anel-de-forca" } });
  assert.equal(gearDefense(plated), 3);
  assert.equal(gearedAttributes(plated).forca, 7);
  // A ficha não muda: o que se veste é somado por cima.
  assert.equal(plated.attributes.forca, 5);

  const { grid, markers } = gridFromAscii(["AE"]);
  const { encounter } = startEncounter({
    grid,
    seed: 1,
    units: [
      unitFromCharacter(sheet("espadachim", { id: "A" }), { team: "party", pos: markers.A[0] }),
      unitFromCharacter({ ...plated, id: "E" }, { team: "enemy", pos: markers.E[0] }),
    ],
  });
  const attacker = findUnit(encounter, "A")!;
  const target = findUnit(encounter, "E")!;
  assert.equal(target.attributes.forca, 7);
  assert.equal(target.defense, 3);
  assert.equal(target.speed, attacker.speed - 1);

  const strike = attacker.abilities.find((ability) => ability.id === "espadachim.attack")!;
  const { defense } = attackTotals(attacker, strike, target, attackEdge(encounter, attacker, strike, target));
  assert.equal(defense, 10 + 5 + 3);
});

test("fora de luta, o acessório pesa nos testes da história", () => {
  const plain = sheet("espadachim");
  const ringed = sheet("espadachim", { equipment: { accessory: "gear-teste-anel-de-labia" } });
  const check = { attribute: "labia", difficulty: 14 } as const;
  assert.equal(Math.round((checkChance(ringed, check) - checkChance(plain, check)) * 20), 2);
});

test("equipamento é item como os outros pra história e pro espólio: entra no guardado, e só de lá sai", () => {
  const owner = createProtagonist();
  const plate = findItem("gear-teste-placa")!;
  assert.equal(plate.category, "equipment");
  assert.equal(giveItem(owner, plate), true);
  assert.equal(itemCount(owner, plate.id), 1);
  assert.equal(owner.inventory?.slots.some((slot) => slot.item.id === plate.id), false);

  // O que está vestido não conta nem sai: a história não tira a roupa de ninguém.
  assert.equal(itemCount(owner, "gear-bordao"), 0);
  assert.equal(takeItem(owner, "gear-bordao"), false);
  assert.equal(takeItem(owner, plate.id), true);
  assert.equal(takeItem(owner, plate.id), false);

  // Consumível continua indo pra mochila e saindo dela.
  assert.equal(itemCount(owner, "item-lagrima-de-eir"), 2);
  assert.equal(takeItem(owner, "item-lagrima-de-eir"), true);
  assert.equal(itemCount(owner, "item-lagrima-de-eir"), 1);

  // O caçador às vezes deixa o anel: quando deixa, ele vai pro guardado, não pra mochila.
  const ring = "gear-teste-anel-de-forca";
  for (let seed = 1; seed < 200; seed++) {
    const winner = createProtagonist();
    const rewards = grantEncounterRewards(winner, ["encounter-teste-cacador"], { rngState: seed });
    if (!rewards.loot.some((item) => item.id === ring)) continue;
    assert.equal(gearCount(winner, ring), 1);
    assert.equal(winner.inventory?.slots.some((slot) => slot.item.id === ring), false);
    return;
  }
  assert.fail("em 200 lutas o caçador nunca deixou o anel");
});

test("cada um do elenco começa com o que é dele; quem não é do elenco, com o que a classe dá", () => {
  assert.deepEqual(startingLoadout({ id: HERO_ID, characterClass: "atracao_repulsao" }), PROTAGONIST.gear);
  assert.deepEqual(joinParty([], "xandui", 1)!.equipment, { weapon: "gear-espada-reta", armor: "gear-gibao-de-couro" });
  assert.deepEqual(startingLoadout({ id: "ninguem", characterClass: "espadachim" }), startingEquipment("espadachim"));
  // Quem só acompanha não veste nada pra luta.
  assert.equal(joinParty([], "oryndu", 1)!.equipment, undefined);
});

test("save de antes do equipamento ganha o de começo; peça que o catálogo não tem mais não estraga o save", () => {
  const old = newGame(createProtagonist());
  joinParty(old.companions, "jarupa", 1);
  joinParty(old.companions, "oryndu", 1);
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
  assert.deepEqual(byId(companionId("jarupa")).equipment, COMPANIONS.jarupa.gear);
  assert.equal(byId(companionId("oryndu")).equipment, undefined);

  // Um save já na versão atual não é mexido: quem tirou a arma continua sem ela.
  const bare = newGame(createProtagonist());
  unequip(bare.character, bare.character, "weapon");
  const again = parseSave(serializeSave(bare));
  assert.ok(again.ok);
  assert.equal(wornItem(again.save.character, "weapon"), undefined);

  // Id que não existe mais: o lugar vale como vazio, e a ficha luta de mãos vazias.
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
