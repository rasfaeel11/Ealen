import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { breathOf, maxBreath } from "../../breath";
import { addItemToInventory, findInventorySlot } from "../../inventoryEffects";
import { findItemTemplate } from "../../mock/items";
import { HERO_ID, createProtagonist, joinParty } from "../../party";
import { activeUnit, findUnit } from "../../tactics";
import { distance, tileAt } from "../../tactics/grid";
import type { Character } from "../../types/character";
import {
  AMBUSH_RANGE,
  AREAS,
  aggroedGroup,
  canAfford,
  fieldUse,
  mend,
  openingStrikes,
  parseTiledMap,
  sheetAbilities,
  standAreaProps,
  startAreaEncounter,
  tileOfPixel,
  usableOutside,
  useItemOutside,
  type AreaEnemy,
  type AreaMap,
} from "../index";

/** Fora de luta: a mochila, a cura e o golpe que abre a luta (ver ../field.ts). */

function room(side = 14): AreaMap {
  return {
    tileSize: 16,
    grid: {
      width: side,
      height: side,
      tiles: Array.from({ length: side * side }, () => ({
        blocksMove: false,
        blocksSight: false,
        moveCost: 1,
        cover: false,
        elevation: 0,
      })),
    },
    spawns: {},
    exits: [],
    enemies: [],
    npcs: [],
    triggers: [],
    cues: [],
    props: [],
  };
}

function enemy(id: string, x: number, y: number, extra: Partial<AreaEnemy> = {}): AreaEnemy {
  return { id, name: id, creature: "encounter-lobo-de-bruma", group: id, passive: false, x: x * 16 + 8, y: y * 16 + 8, ...extra };
}

function sheet(id: string, characterClass: Character["characterClass"], extra: Partial<Character> = {}): Character {
  return {
    id,
    name: id,
    race: "althirim",
    characterClass,
    level: 1,
    xp: 0,
    attributes: { dain: 6, eir: 5, nath: 6, il: 8, or: 4, len: 5, ul: 5 },
    currentHp: 40,
    maxHp: 40,
    currentNodeId: "",
    ...extra,
  };
}

const ability = (character: Character, stance: string) =>
  sheetAbilities(character).find((candidate) => candidate.id.endsWith(`.${stance}`))!;

test("fora de luta, golpe abre luta, cura remenda o grupo e guarda não serve pra nada", () => {
  const guardian = sheet(HERO_ID, "guardiao");
  assert.equal(fieldUse(ability(guardian, "attack")), "opening");
  assert.equal(fieldUse(ability(guardian, "heavy_attack")), "opening");
  assert.equal(fieldUse(ability(guardian, "defend")), undefined);
  assert.equal(fieldUse(ability(sheet("l", "luminar"), "heal")), "mend");

  // A ficha mostra o kit da Ordem e o que só aquela pessoa sabe.
  const varel = joinParty([], "varel", 1)!;
  const gift = sheetAbilities(varel).find((candidate) => candidate.id === "gift.tide_pull");
  assert.ok(gift);
  assert.equal(fieldUse(gift), "opening");
  assert.equal(sheetAbilities(guardian).some((candidate) => candidate.id.startsWith("gift.")), false);
});

test("a cura fora de luta usa a conta do motor, não passa da vida cheia e não rola o dado à toa", () => {
  const healer = sheet("l", "luminar", { attributes: { dain: 6, eir: 5, nath: 6, il: 8, or: 4, len: 5, ul: 5 } });
  const hurt = sheet("h", "guardiao", { currentHp: 10 });
  const rng = { rngState: 7 };

  const healed = mend(healer, ability(healer, "heal"), hurt, rng)!;
  // Eir (5) + 1d6.
  assert.ok(healed >= 6 && healed <= 11, `curou ${healed}`);
  assert.equal(hurt.currentHp, 10 + healed);

  const almost = sheet("a", "guardiao", { currentHp: 38 });
  assert.equal(mend(healer, ability(healer, "heal"), almost, rng), 2);
  assert.equal(almost.currentHp, 40);

  const before = rng.rngState;
  assert.equal(mend(healer, ability(healer, "heal"), almost, rng), undefined, "quem está inteiro não gasta a cura");
  assert.equal(mend(healer, ability(healer, "attack"), hurt, rng), undefined, "golpe não cura");
  assert.equal(rng.rngState, before);
});

test("fora de luta a habilidade custa o mesmo Fôlego: a cura cobra de quem a faz, e sem ele não sai", () => {
  const healer = sheet("l", "luminar");
  const heal = ability(healer, "heal");
  const full = maxBreath(healer);
  const rng = { rngState: 3 };

  const hurt = sheet("h", "guardiao", { currentHp: 5 });
  assert.ok(mend(healer, heal, hurt, rng)! > 0);
  assert.equal(breathOf(healer), full - heal.breath!);

  // Quem está inteiro não gasta o Fôlego de ninguém.
  assert.equal(mend(healer, heal, sheet("a", "guardiao"), rng), undefined);
  assert.equal(breathOf(healer), full - heal.breath!);

  healer.breath = heal.breath! - 1;
  const before = { hp: hurt.currentHp, rng: rng.rngState };
  assert.equal(canAfford(healer, heal), false);
  assert.equal(mend(healer, heal, hurt, rng), undefined);
  assert.deepEqual({ hp: hurt.currentHp, rng: rng.rngState }, before);
  assert.equal(healer.breath, heal.breath! - 1);

  // Sem Fôlego pro golpe pesado não há em quem abrir a luta com ele; com o golpe comum, há.
  const hero = sheet("hero", "rachador", { breath: 0 });
  const wolf = enemy("lobo", 7, 2);
  assert.deepEqual(openingStrikes(room(), hero, { x: 2, y: 2 }, ability(hero, "heavy_attack"), [wolf]), []);
  assert.equal(openingStrikes(room(), hero, { x: 2, y: 2 }, ability(hero, "attack"), [wolf]).length, 1);
});

test("item que cura se usa em qualquer um do grupo; o que é de luta fica pra luta, e recusa não gasta nada", () => {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 12 };
  const tear = findItemTemplate("item-lagrima-de-eir")!;
  const balm = findItemTemplate("item-balsamo-de-pedra-de-taharim")!;
  addItemToInventory(hero, tear);
  addItemToInventory(hero, tear);
  addItemToInventory(hero, balm);
  assert.equal(usableOutside(tear), true);
  assert.equal(usableOutside(balm), false);

  const lish = joinParty([], "lish", 1)!;
  lish.currentHp = 3;
  const used = useItemOutside(hero, tear.id, lish);
  assert.equal(used.ok && used.healed, Math.min(15, lish.maxHp - 3));
  assert.equal(findInventorySlot(hero, tear.id)!.quantity, 1);

  // Halmira está inteira: a segunda Lágrima fica na mochila.
  assert.deepEqual(useItemOutside(hero, tear.id, hero), { ok: false, reason: "no_effect" });
  assert.equal(findInventorySlot(hero, tear.id)!.quantity, 1);

  hero.currentHp = 1;
  assert.deepEqual(useItemOutside(hero, balm.id, hero), { ok: false, reason: "only_in_fight" });
  assert.equal(findInventorySlot(hero, balm.id)!.quantity, 1);
  assert.deepEqual(useItemOutside(hero, "item-que-nao-existe", hero), { ok: false, reason: "item_unavailable" });

  // A última unidade leva o espaço junto.
  assert.equal(useItemOutside(hero, tear.id, hero).ok, true);
  assert.equal(findInventorySlot(hero, tear.id), undefined);
  assert.deepEqual(useItemOutside(hero, tear.id, hero), { ok: false, reason: "item_unavailable" });
});

test("quem luta de perto corre até o alvo pra abrir a luta; quem atira abre de onde está, ou do mais perto que der", () => {
  const map = room();
  const heroTile = { x: 1, y: 1 };
  const melee = sheet(HERO_ID, "guardiao");
  const archer = sheet(HERO_ID, "rachador");

  // A 7 quadrados: seis passos e o golpe.
  const wolf = enemy("lobo", 8, 1);
  const [charge] = openingStrikes(map, melee, heroTile, ability(melee, "attack"), [wolf]);
  assert.equal(charge.enemy, wolf);
  assert.deepEqual(charge.target, { x: 8, y: 1 });
  assert.equal(distance(charge.from, charge.target), 1);
  assert.equal(distance(charge.from, heroTile), 6);

  // A 9: ainda dá pra emboscar, mas a espada não chega; a flecha, andando três, chega.
  const far = enemy("longe", 10, 1);
  assert.deepEqual(openingStrikes(map, melee, heroTile, ability(melee, "attack"), [far]), []);
  const [shot] = openingStrikes(map, archer, heroTile, ability(archer, "attack"), [far]);
  assert.equal(distance(shot.from, heroTile), 3);
  assert.equal(distance(shot.from, shot.target), 6);

  // Ao alcance de onde está, não sai do lugar.
  const [still] = openingStrikes(map, archer, heroTile, ability(archer, "attack"), [enemy("perto", 7, 1)]);
  assert.deepEqual(still.from, heroTile);

  // Fora da faixa da emboscada, passivo, ou habilidade que não abre luta: ninguém.
  const beyond = enemy("fora", 1 + AMBUSH_RANGE + 1, 1);
  const chief = enemy("chefe", 5, 1, { passive: true });
  assert.deepEqual(openingStrikes(map, archer, heroTile, ability(archer, "attack"), [beyond, chief]), []);
  assert.deepEqual(openingStrikes(map, melee, heroTile, ability(melee, "defend"), [wolf]), []);

  // Do mais próximo pro mais distante; e parede no meio tira o alvo de quem atira.
  const both = openingStrikes(map, archer, heroTile, ability(archer, "attack"), [far, wolf]);
  assert.deepEqual(both.map((strike) => strike.enemy.id), ["lobo", "longe"]);
  for (let y = 0; y < map.grid.height; y++) {
    const tile = tileAt(map.grid, { x: 5, y })!;
    tile.blocksMove = true;
    tile.blocksSight = true;
  }
  assert.deepEqual(openingStrikes(map, archer, heroTile, ability(archer, "attack"), [wolf]), []);
});

test("o golpe dado de fora abre a luta na estrada de verdade: o lobo apanha antes da primeira rodada e o grupo dele perde a vez", () => {
  const map = parseTiledMap(
    JSON.parse(readFileSync(new URL(`../../../client/public/${AREAS.estrada.map}`, import.meta.url), "utf8")),
  );
  const props = standAreaProps(map);
  const group = map.enemies.filter((candidate) => candidate.group === "lobos");
  const wolfTile = tileOfPixel(map, group[0]);
  const hero = sheet(HERO_ID, "rachador");
  const heroTile = { x: wolfTile.x - 7, y: wolfTile.y };
  assert.equal(aggroedGroup(map, group, heroTile), undefined);

  const strike = openingStrikes(map, hero, heroTile, ability(hero, "attack"), group, props).find(
    (candidate) => candidate.enemy === group[0],
  )!;
  assert.ok(strike, "o lobo está ao alcance de um golpe de abertura");

  const { encounter, events } = startAreaEncounter(
    map,
    [{ character: hero, tile: heroTile }],
    group,
    3,
    props,
    "enemy",
    [],
    [],
    {},
    { unitId: HERO_ID, abilityId: ability(hero, "attack").id, target: strike.target, from: strike.from },
  );

  const types = events.map((event) => event.type);
  assert.ok(types.indexOf("abilityUsed") > 0 && types.indexOf("abilityUsed") < types.indexOf("roundStarted"));
  assert.deepEqual(findUnit(encounter, HERO_ID)!.pos, strike.from);
  // E a primeira vez de verdade é dele, inteira.
  assert.equal(activeUnit(encounter)!.id, HERO_ID);
  assert.deepEqual(activeUnit(encounter)!.turn, { movement: 6, action: true, bonus: true, reaction: true });
});
