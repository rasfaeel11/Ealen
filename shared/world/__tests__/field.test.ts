import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import "./catalog";
import { breathOf, maxBreath } from "../../breath";
import { addItemToInventory, findInventorySlot } from "../../inventoryEffects";
import { findItemTemplate } from "../../mock/items";
import { manaOf } from "../../mana";
import { HERO_ID, createProtagonist, joinParty, magicOf } from "../../party";
import { activeUnit, findUnit, kitOf, type Ability } from "../../tactics";
import { TEST_ITEMS } from "../../tactics/__tests__/helpers";
import { distance, tileAt } from "../../tactics/grid";
import type { Character } from "../../types/character";
import {
  AMBUSH_RANGE,
  AREAS,
  aggroedGroup,
  burstMark,
  canAfford,
  fieldUse,
  mend,
  missing,
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
    occupied: [],
  };
}

function enemy(id: string, x: number, y: number, extra: Partial<AreaEnemy> = {}): AreaEnemy {
  return { id, name: id, creature: "encounter-teste-cacador", group: id, passive: false, x: x * 16 + 8, y: y * 16 + 8, ...extra };
}

function sheet(id: string, characterClass: Character["characterClass"], extra: Partial<Character> = {}): Character {
  return {
    id,
    name: id,
    race: "humano",
    characterClass,
    level: 1,
    xp: 0,
    attributes: { forca: 6, fator: 5, vigor: 6, olho: 8, couro: 4, labia: 5, saber: 5 },
    currentHp: 40,
    maxHp: 40,
    ...extra,
  };
}

const ability = (character: Character, stance: string) =>
  sheetAbilities(character).find((candidate) => candidate.id.endsWith(`.${stance}`))!;

/** Uma cura de teste paga em Fôlego por quem a faz (a do jogo, a de Endyru, é paga em mana). */
const BREATH_HEAL: Ability = {
  id: "teste.cura",
  name: "Cura",
  flavor: "",
  cost: "action",
  range: 4,
  targets: "ally",
  effects: [{ kind: "heal", dice: { count: 1, sides: 6 }, attribute: "fator" }],
  breath: 2,
};

/** Quem atira: espadachim de besta. */
const ARCHER = { equipment: { weapon: "gear-besta" } };

test("fora de luta, golpe abre luta, cura remenda o grupo e guarda não serve pra nada", () => {
  const blade = sheet(HERO_ID, "espadachim");
  assert.equal(fieldUse(ability(blade, "attack")), "opening");
  assert.equal(fieldUse(ability(blade, "heavy_attack")), "opening");
  assert.equal(fieldUse(ability(blade, "defend")), undefined);
  assert.equal(fieldUse(BREATH_HEAL), "mend");

  // A ficha mostra o kit e o que ficou gravado no descanso: a magia recitada não abre luta, a gravada abre.
  const endyru = createProtagonist();
  assert.equal(fieldUse(ability(endyru, "attack")), "opening");
  assert.equal(fieldUse(ability(endyru, "quick_attack")), undefined);
  assert.equal(fieldUse(ability(endyru, "heal")), "mend");
  endyru.engraved = ["atracao_repulsao.quick_attack"];
  const circle = sheetAbilities(endyru).find((candidate) => candidate.engraved)!;
  assert.equal(circle.name, "Puxão (gravada)");
  assert.equal(fieldUse(circle), "opening");
  assert.equal(sheetAbilities(sheet("ninguem", "espadachim")).some((candidate) => candidate.id.startsWith("gift.")), false);
});

test("fora de luta a magia custa mana; quem não conjura não paga nenhuma, e o que passa do limite de uma vez marca", () => {
  const endyru = createProtagonist();
  const pull = ability(endyru, "quick_attack");
  assert.equal(missing(endyru, pull), undefined);
  endyru.mana = 0;
  assert.equal(missing(endyru, pull), "mana");
  assert.equal(canAfford(endyru, pull), false);
  // Quem não conjura não tem mana pra pagar magia nenhuma.
  assert.equal(missing(joinParty([], "jarupa", 1)!, pull), "mana");

  const throwing = kitOf({ characterClass: "atracao_repulsao" }).find((entry) => entry.slug === "arremesso")!.ability;
  assert.equal(burstMark(endyru, throwing), "bloodied");
  assert.equal(burstMark(endyru, pull), undefined);
  assert.equal(burstMark(joinParty([], "jarupa", 1)!, throwing), undefined);
});

test("a cura fora de luta usa a conta do motor, não passa da vida cheia e não rola o dado à toa", () => {
  const healer = createProtagonist();
  const heal = ability(healer, "heal");
  const hurt = sheet("h", "espadachim", { currentHp: 10 });
  const rng = { rngState: 7 };

  const healed = mend(healer, heal, hurt, rng)!;
  // Fator + 1d6.
  const { fator } = healer.attributes;
  assert.ok(healed >= fator + 1 && healed <= fator + 6, `curou ${healed}`);
  assert.equal(hurt.currentHp, 10 + healed);

  const almost = sheet("a", "espadachim", { currentHp: 38 });
  assert.equal(mend(healer, heal, almost, rng), 2);
  assert.equal(almost.currentHp, 40);

  const before = rng.rngState;
  assert.equal(mend(healer, heal, almost, rng), undefined, "quem está inteiro não gasta a cura");
  assert.equal(mend(healer, ability(healer, "attack"), hurt, rng), undefined, "golpe não cura");
  assert.equal(rng.rngState, before);
});

test("fora de luta a cura custa o mesmo que na luta, a quem a faz: a mana de Endyru, ou o Fôlego; e sem ele não sai", () => {
  const endyru = createProtagonist();
  const cure = ability(endyru, "heal");
  const mana = manaOf(endyru, magicOf(endyru)!);
  assert.ok(mend(endyru, cure, sheet("h", "espadachim", { currentHp: 5 }), { rngState: 3 })! > 0);
  assert.equal(endyru.mana, mana - cure.mana!);
  assert.equal(breathOf(endyru), maxBreath(endyru), "a cura de Endyru não custa Fôlego a ele");

  const healer = sheet("l", "espadachim");
  const heal = BREATH_HEAL;
  const full = maxBreath(healer);
  const rng = { rngState: 3 };

  const hurt = sheet("h", "espadachim", { currentHp: 5 });
  assert.ok(mend(healer, heal, hurt, rng)! > 0);
  assert.equal(breathOf(healer), full - heal.breath!);

  // Quem está inteiro não gasta o Fôlego de ninguém.
  assert.equal(mend(healer, heal, sheet("a", "espadachim"), rng), undefined);
  assert.equal(breathOf(healer), full - heal.breath!);

  healer.breath = heal.breath! - 1;
  const before = { hp: hurt.currentHp, rng: rng.rngState };
  assert.equal(canAfford(healer, heal), false);
  assert.equal(mend(healer, heal, hurt, rng), undefined);
  assert.deepEqual({ hp: hurt.currentHp, rng: rng.rngState }, before);
  assert.equal(healer.breath, heal.breath! - 1);

  // Sem Fôlego pro golpe pesado não há em quem abrir a luta com ele; com o golpe comum, há.
  const hero = sheet("hero", "espadachim", { breath: 0 });
  const wolf = enemy("cacador", 7, 2);
  assert.deepEqual(openingStrikes(room(), hero, { x: 2, y: 2 }, ability(hero, "heavy_attack"), [wolf]), []);
  assert.equal(openingStrikes(room(), hero, { x: 2, y: 2 }, ability(hero, "attack"), [wolf]).length, 1);
});

test("item que cura se usa em qualquer um do grupo; o que é de luta fica pra luta, e recusa não gasta nada", () => {
  const hero = createProtagonist();
  hero.inventory = { slots: [], maxSlots: 12 };
  const tear = findItemTemplate("item-unguento-de-barqueiro")!;
  const balm = TEST_ITEMS.couro;
  addItemToInventory(hero, tear);
  addItemToInventory(hero, tear);
  addItemToInventory(hero, balm);
  assert.equal(usableOutside(tear), true);
  assert.equal(usableOutside(balm), false);

  const jarupa = joinParty([], "jarupa", 1)!;
  jarupa.currentHp = 3;
  const used = useItemOutside(hero, tear.id, jarupa);
  assert.equal(used.ok && used.healed, Math.min(15, jarupa.maxHp - 3));
  assert.equal(findInventorySlot(hero, tear.id)!.quantity, 1);

  // Endyru está inteiro: a segunda Lágrima fica na mochila.
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
  const melee = sheet(HERO_ID, "espadachim");
  const archer = sheet(HERO_ID, "espadachim", ARCHER);

  // A 7 quadrados: seis passos e o golpe.
  const wolf = enemy("cacador", 8, 1);
  const [charge] = openingStrikes(map, melee, heroTile, ability(melee, "attack"), [wolf]);
  assert.equal(charge.enemy, wolf);
  assert.deepEqual(charge.target, { x: 8, y: 1 });
  assert.equal(distance(charge.from, charge.target), 1);
  assert.equal(distance(charge.from, heroTile), 6);

  // A 9: ainda dá pra emboscar, mas a espada não chega; o virote, andando três, chega.
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
  assert.deepEqual(both.map((strike) => strike.enemy.id), ["cacador", "longe"]);
  for (let y = 0; y < map.grid.height; y++) {
    const tile = tileAt(map.grid, { x: 5, y })!;
    tile.blocksMove = true;
    tile.blocksSight = true;
  }
  assert.deepEqual(openingStrikes(map, archer, heroTile, ability(archer, "attack"), [wolf]), []);
});

test("o golpe dado de fora abre a luta numa estrada do Tiled: o lobo apanha antes da primeira rodada e o grupo dele perde a vez", () => {
  const map = parseTiledMap(JSON.parse(readFileSync(new URL("./fixtures/estrada.tmj", import.meta.url), "utf8")));
  const props = standAreaProps(map);
  const group = map.enemies.filter((candidate) => candidate.group === "lobos");
  const wolfTile = tileOfPixel(map, group[0]);
  const hero = sheet(HERO_ID, "espadachim", ARCHER);
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
