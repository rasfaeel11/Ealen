import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { tileAt } from "../../tactics/grid";
import { markThings, newGame, parseSave, serializeSave, thingsInArea } from "../../save";
import type { Character } from "../../types/character";
import {
  TRAP_SIGHT,
  parseTiledMap,
  spotTraps,
  standThings,
  thingInReach,
  trapUnder,
  useThing,
  type AreaMap,
  type ThingHands,
} from "../index";

/** As coisas do mundo fora de luta (ver ../things.ts): baú, porta, alavanca, armadilha e o que está no chão. */

type Property = { name: string; type: string; value: string | number };

/** Um mapa de 10x10 sem nada, com as coisas pedidas: `[tipo, Nome, x, y, propriedades]`. */
function room(things: [string, string, number, number, Property[]?][]): AreaMap {
  return parseTiledMap({
    width: 10,
    height: 10,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { type: "tilelayer", name: "ground", width: 10, height: 10, data: Array(100).fill(0) },
      {
        type: "objectgroup",
        name: "objects",
        objects: [
          { id: 1, name: "inicio", type: "spawn", x: 8, y: 8 },
          ...things.map(([type, name, x, y, properties = []], index) => ({ id: 10 + index, name, type, x: x * 16 + 8, y: y * 16 + 8, properties })),
        ],
      },
    ],
    tilesets: [],
  } as never);
}

const text = (name: string, value: string): Property => ({ name, type: "string", value });
const hands = (keys: string[] = [], fator = 0): ThingHands => ({ hasItem: (itemId) => keys.includes(itemId), fator });
const rng = () => ({ rngState: 7 });

test("o mapa lê as coisas, com o que têm; e recusa o que não entende", () => {
  const map = room([
    ["chest", "Arca", 2, 2, [text("loot", "item-pao-de-viagem 2, item-unguento-de-barqueiro"), { name: "coins", type: "int", value: 5 }, text("key", "item-chave")]],
    ["lever", "Alavanca", 4, 2, [text("opens", "Grade, Porta")]],
    ["trap", "Dente", 6, 6, [text("damage", "2d4"), { name: "spot", type: "int", value: 13 }]],
  ]);
  const [chest, lever, trap] = map.things!;
  assert.deepEqual(chest.loot, [
    { item: "item-pao-de-viagem", count: 2 },
    { item: "item-unguento-de-barqueiro", count: 1 },
  ]);
  assert.deepEqual([chest.coins, chest.key, chest.tile], [5, "item-chave", { x: 2, y: 2 }]);
  assert.deepEqual(lever.opens, ["Grade", "Porta"]);
  assert.deepEqual([trap.damage, trap.spot], [{ count: 2, sides: 4 }, 13]);

  assert.throws(() => room([["trap", "Sem dano", 1, 1]]));
  assert.throws(() => room([["chest", "Arca", 1, 1, [text("loot", "item-pao-de-viagem dois")]]]));
});

test("o baú e a alavanca ocupam o quadrado; a porta, só fechada", () => {
  const map = room([
    ["chest", "Arca", 2, 2],
    ["door", "Porta", 3, 3],
    ["pickup", "Saco", 4, 4],
  ]);
  const [, door] = map.things!;
  standThings(map, map.things!, new Set());
  assert.equal(tileAt(map.grid, { x: 2, y: 2 })!.blocksMove, true);
  assert.equal(tileAt(map.grid, { x: 3, y: 3 })!.blocksMove, true);
  assert.equal(tileAt(map.grid, { x: 4, y: 4 })!.blocksMove, false);
  standThings(map, map.things!, new Set([door.id]));
  assert.equal(tileAt(map.grid, { x: 3, y: 3 })!.blocksMove, false, "a porta aberta devolve o chão");
  assert.equal(tileAt(map.grid, { x: 2, y: 2 })!.blocksMove, true);
});

test("mexe-se no que está colado; o que já foi não se refaz", () => {
  const map = room([["chest", "Arca", 5, 5]]);
  const [chest] = map.things!;
  assert.equal(thingInReach(map.things!, { x: 4, y: 4 }, new Set()), chest);
  assert.equal(thingInReach(map.things!, { x: 3, y: 5 }, new Set()), undefined);
  assert.equal(thingInReach(map.things!, { x: 4, y: 4 }, new Set([chest.id])), undefined);
});

test("o baú trancado pede a chave, e com ela entrega o que tem", () => {
  const map = room([["chest", "Arca", 5, 5, [text("loot", "item-pao-de-viagem 2"), { name: "coins", type: "int", value: 3 }, text("key", "item-chave")]]]);
  const [chest] = map.things!;
  assert.deepEqual(useThing(chest, map.things!, hands(), rng()), { kind: "locked", key: "item-chave" });
  assert.deepEqual(useThing(chest, map.things!, hands(["item-chave"]), rng()), {
    kind: "loot",
    loot: [{ item: "item-pao-de-viagem", count: 2 }],
    coins: 3,
  });
});

test("a porta de alavanca não abre na mão; a alavanca a abre pelo Nome", () => {
  const map = room([
    ["door", "Grade", 3, 3],
    ["lever", "Alavanca", 6, 3, [text("opens", "Grade")]],
    ["door", "Porta solta", 8, 8],
  ]);
  const [grate, lever, loose] = map.things!;
  assert.deepEqual(useThing(grate, map.things!, hands(), rng()), { kind: "stuck" });
  assert.deepEqual(useThing(lever, map.things!, hands(), rng()), { kind: "pulled", opens: [grate.id] });
  assert.deepEqual(useThing(loose, map.things!, hands(), rng()), { kind: "opened" });
});

test("a armadilha se vê com Olho, de perto; quem pisa sem ver a dispara; desarmar pede Fator", () => {
  const map = room([["trap", "Dente", 5, 5, [text("damage", "1d6"), { name: "spot", type: "int", value: 13 }]]]);
  const [trap] = map.things!;
  const none = new Set<string>();
  assert.deepEqual(spotTraps(map.things!, { x: 5, y: 5 - TRAP_SIGHT }, 3, none, none), [trap]);
  assert.deepEqual(spotTraps(map.things!, { x: 5, y: 5 - TRAP_SIGHT }, 2, none, none), [], "Olho curto não vê");
  assert.deepEqual(spotTraps(map.things!, { x: 5, y: 5 - TRAP_SIGHT - 1 }, 9, none, none), [], "longe não se vê");
  assert.equal(trapUnder(map.things!, { x: 5, y: 5 }, none), trap);
  assert.equal(trapUnder(map.things!, { x: 5, y: 5 }, new Set([trap.id])), undefined);

  // Vista, ela entra no alcance de mexer; com Fator, desarma; sem, dispara na mão.
  assert.equal(thingInReach(map.things!, { x: 5, y: 4 }, none, new Set([trap.id])), trap);
  assert.equal(thingInReach(map.things!, { x: 5, y: 4 }, none, none), undefined, "escondida não se mexe");
  assert.deepEqual(useThing(trap, map.things!, hands([], 3), rng()), { kind: "disarmed" });
  const sprung = useThing(trap, map.things!, hands([], 0), rng());
  assert.equal(sprung.kind, "sprung");
  assert.ok(sprung.kind === "sprung" && sprung.damage >= 1 && sprung.damage <= 6);
});

test("o save guarda o que já se mexeu e o que já se viu, por área, e o save antigo não mexeu em nada", () => {
  const hero = { id: "hero", name: "Endyru", race: "humano", characterClass: "atracao_repulsao", level: 1, xp: 0, attributes: { forca: 1, fator: 1, vigor: 1, olho: 1, couro: 1, labia: 1, saber: 1 }, currentHp: 10, maxHp: 10 } as Character;
  const save = newGame(hero);
  markThings(save, ["baixios:thing-10", "baixios:thing-11:vista", "ymonha:thing-10"]);
  const { done, seen } = thingsInArea(save, "baixios");
  assert.deepEqual([...done], ["thing-10"]);
  assert.deepEqual([...seen], ["thing-11"]);

  const parsed = parseSave(serializeSave(save));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.ok && parsed.save.things, save.things);
  const old = JSON.parse(serializeSave(save));
  delete old.things;
  const back = parseSave(JSON.stringify(old));
  assert.deepEqual(back.ok && back.save.things, []);
});
