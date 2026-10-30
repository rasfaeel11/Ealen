import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { tileAt } from "../../tactics/grid";
import { CHARGE_DC } from "../../tactics/engine";
import { HERO_ID } from "../../party";
import type { Character } from "../../types/character";
import {
  CLOSE_RANGE,
  SIGHT_RANGE,
  inCone,
  sees,
  sightTiles,
  startAreaEncounter,
  wary,
  watch,
  type AreaEnemy,
  type AreaMap,
  type Suspicion,
} from "../index";

/** Chegar escondido, ou não (ver ../stealth.ts). */

function room(side = 16): AreaMap {
  return {
    tileSize: 16,
    grid: {
      width: side,
      height: side,
      tiles: Array.from({ length: side * side }, () => ({ blocksMove: false, blocksSight: false, moveCost: 1, cover: false, elevation: 0 })),
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

function guard(id: string, x: number, y: number, extra: Partial<AreaEnemy> = {}): AreaEnemy {
  return { id, name: id, creature: "encounter-teste-cacador", group: "guarda", passive: false, x: x * 16 + 8, y: y * 16 + 8, ...extra };
}

const hero: Character = {
  id: HERO_ID,
  name: "Herói",
  race: "humano",
  characterClass: "espadachim",
  level: 1,
  xp: 0,
  attributes: { forca: 30, fator: 3, vigor: 6, olho: 1, couro: 4, labia: 5, saber: 5 },
  currentHp: 40,
  maxHp: 40,
};

test("o olhar é um cone à frente, e a parede o corta", () => {
  assert.ok(inCone({ x: 5, y: 5 }, "down", { x: 5, y: 8 }));
  assert.ok(inCone({ x: 5, y: 5 }, "down", { x: 8, y: 8 }), "45° pro lado ainda vê");
  assert.ok(!inCone({ x: 5, y: 5 }, "down", { x: 9, y: 8 }));
  assert.ok(!inCone({ x: 5, y: 5 }, "down", { x: 5, y: 4 }), "atrás não vê");
  assert.ok(!inCone({ x: 5, y: 5 }, "right", { x: 5, y: 8 }));

  const map = room();
  const watcher = guard("g", 5, 2);
  assert.ok(sees(map, watcher, { x: 5, y: 2 + SIGHT_RANGE }));
  tileAt(map.grid, { x: 5, y: 4 })!.blocksSight = true;
  assert.ok(!sees(map, watcher, { x: 5, y: 6 }));
  assert.ok(sightTiles(map, watcher).every((tile) => sees(map, watcher, tile)));
});

test("esgueirando, no olhar dele, ele desconfia antes de pegar; fora do olhar, acalma", () => {
  const map = room();
  const enemies = [guard("g", 5, 2)];
  const suspicion: Suspicion = {};
  const far = { x: 5, y: 2 + SIGHT_RANGE };

  assert.deepEqual(watch(map, enemies, far, true, 0.5, suspicion), { kind: "unseen" });
  assert.ok(suspicion.g > 0 && suspicion.g < 1);
  assert.ok(wary(enemies, "guarda", suspicion));

  // De costas pra ele, a desconfiança baixa até sumir.
  const behind = { x: 5, y: 1 };
  for (let i = 0; i < 20; i++) watch(map, enemies, behind, true, 0.5, suspicion);
  assert.equal(suspicion.g, undefined);

  // Parado no olhar dele, acaba pego.
  let seen = watch(map, enemies, far, true, 0.5, suspicion);
  for (let i = 0; i < 40 && seen.kind === "unseen"; i++) seen = watch(map, enemies, far, true, 0.5, suspicion);
  assert.deepEqual(seen, { kind: "caught", group: "guarda" });

  // Colado na frente dele, na hora.
  assert.deepEqual(watch(map, enemies, { x: 5, y: 2 + CLOSE_RANGE }, true, 0, {}), { kind: "caught", group: "guarda" });
});

test("andando à vista, ele vê na hora; esgueirando, não ouve quem passa do lado", () => {
  const map = room();
  const enemies = [guard("g", 5, 2)];
  assert.deepEqual(watch(map, enemies, { x: 5, y: 7 }, false, 0, {}), { kind: "spotted", group: "guarda" });
  assert.deepEqual(watch(map, enemies, { x: 7, y: 2 }, false, 0, {}), { kind: "spotted", group: "guarda" });
  assert.deepEqual(watch(map, enemies, { x: 7, y: 2 }, true, 1, {}), { kind: "unseen" });
  assert.deepEqual(watch(map, [guard("g", 5, 2, { passive: true })], { x: 5, y: 3 }, false, 0, {}), { kind: "unseen" });
});

test("na investida, quem chuta a porta age antes de todos e, com Força, abala o outro lado", () => {
  const map = room();
  const enemies = [guard("a", 8, 8), guard("b", 9, 8)];
  const { encounter, events } = startAreaEncounter(
    map,
    [{ character: structuredClone(hero), tile: { x: 3, y: 8 } }],
    enemies,
    11,
    [],
    undefined,
    [],
    [],
    {},
    undefined,
    "party",
  );
  assert.equal(encounter.order[0], HERO_ID);
  const started = events.find((event) => event.type === "battleStarted");
  assert.ok(started?.type === "battleStarted" && started.charge?.shaken, `d20 + 30 de Força passa de ${CHARGE_DC}`);
  for (const id of ["a", "b"]) {
    const unit = encounter.units.find((candidate) => candidate.id === id)!;
    assert.ok(unit.statuses.some((status) => status.id === "shaken"));
  }
});

test("investida e surpresa não vêm juntas: a surpresa manda", () => {
  const map = room();
  const { events } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: { x: 3, y: 8 } }], [guard("a", 8, 8)], 2, [], "enemy", [], [], {}, undefined, "party");
  const started = events.find((event) => event.type === "battleStarted");
  assert.ok(started?.type === "battleStarted" && started.charge === undefined && started.surprised === "enemy");
});
