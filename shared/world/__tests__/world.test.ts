import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findBestiaryEntry } from "../../mock/bestiary";
import { COMPANIONS, HERO_ID, companionId } from "../../party";
import { activeUnit, applyCommand, chooseCommand, isOver } from "../../tactics";
import { distance, samePos, stepNeighbors, tileAt, tileIndex, type Pos } from "../../tactics/grid";
import { isPropId } from "../../tactics/props";
import type { Character } from "../../types/character";
import { CLASS_INFO } from "../../types/characterClass";
import {
  AGGRO_RANGE,
  AMBUSH_RANGE,
  AREAS,
  STARTING_AREA,
  STARTING_SPAWN,
  aggroedGroup,
  ambushableGroup,
  exitAt,
  fightCues,
  firedTrigger,
  grantEncounterRewards,
  isActive,
  isBlocked,
  npcInReach,
  parseCueWhen,
  parseTiledMap,
  peopleTiles,
  standAreaProps,
  standPeople,
  startAreaEncounter,
  talkers,
  tileOfPixel,
  unusedItems,
  walk,
  type AreaCue,
  type AreaEnemy,
  type AreaMap,
} from "../index";

/**
 * Estes testes leem os mapas DE VERDADE (client/public/maps). São a rede de
 * segurança de quem desenha: saída apontando pra área que não existe, ponto
 * de chegada dentro de uma parede ou pedaço do mapa sem acesso aparecem
 * aqui, não no meio do jogo.
 */
const PUBLIC_DIR = new URL("../../../client/public/", import.meta.url);

function loadArea(areaId: string): AreaMap {
  return parseTiledMap(JSON.parse(readFileSync(new URL(AREAS[areaId].map, PUBLIC_DIR), "utf8")));
}

const maps = Object.fromEntries(Object.keys(AREAS).map((areaId) => [areaId, loadArea(areaId)]));
/** O terreno de cada área antes dos destrutíveis: é nele que eles têm que caber. */
const bare = Object.fromEntries(Object.keys(AREAS).map((areaId) => [areaId, loadArea(areaId)]));
/** Os destrutíveis de cada área, de pé na grade de `maps` — como o jogo a vê ao entrar. */
const props = Object.fromEntries(Object.entries(maps).map(([areaId, map]) => [areaId, standAreaProps(map)]));

/** Todo quadrado que se alcança andando a partir de `start`. */
function flood(map: AreaMap, start: Pos): Set<number> {
  const seen = new Set([tileIndex(map.grid, start)]);
  const queue = [start];
  while (queue.length > 0) {
    for (const next of stepNeighbors(map.grid, queue.pop()!)) {
      const index = tileIndex(map.grid, next);
      if (seen.has(index)) continue;
      seen.add(index);
      queue.push(next);
    }
  }
  return seen;
}

test("o jogo começa num ponto que existe", () => {
  assert.ok(maps[STARTING_AREA].spawns[STARTING_SPAWN]);
});

for (const [areaId, map] of Object.entries(maps)) {
  test(`${areaId}: toda saída leva a uma área e a um ponto de chegada que existem`, () => {
    assert.ok(map.exits.length > 0, "área sem saída");
    for (const exit of map.exits) {
      assert.ok(maps[exit.area], `área "${exit.area}" não existe`);
      assert.ok(maps[exit.area].spawns[exit.spawn], `"${exit.area}" não tem o ponto "${exit.spawn}"`);
    }
  });

  test(`${areaId}: todo ponto de chegada cai em chão livre, fora de qualquer saída`, () => {
    for (const [name, spawn] of Object.entries(map.spawns)) {
      assert.equal(tileAt(map.grid, tileOfPixel(map, spawn))?.blocksMove, false, `"${name}" está num quadrado bloqueado`);
      assert.equal(exitAt(map, spawn), undefined, `"${name}" está dentro de uma saída`);
    }
  });

  test(`${areaId}: de qualquer ponto de chegada se alcança todos os outros e todas as saídas`, () => {
    const [first, ...others] = Object.values(map.spawns);
    const reachable = flood(map, tileOfPixel(map, first));

    for (const spawn of others) assert.ok(reachable.has(tileIndex(map.grid, tileOfPixel(map, spawn))));
    for (const exit of map.exits) {
      const middle = { x: exit.x + exit.width / 2, y: exit.y + exit.height / 2 };
      assert.ok(reachable.has(tileIndex(map.grid, tileOfPixel(map, middle))), `saída pra "${exit.area}" sem acesso`);
    }
  });

  test(`${areaId}: todo inimigo é uma criatura do bestiário, em chão livre e ao alcance de quem anda`, () => {
    const reachable = flood(map, tileOfPixel(map, Object.values(map.spawns)[0]));
    for (const enemy of map.enemies) {
      assert.ok(findBestiaryEntry(enemy.creature), `criatura "${enemy.creature}" não existe`);
      assert.ok(reachable.has(tileIndex(map.grid, tileOfPixel(map, enemy))), `${enemy.id} está fora de alcance`);
    }
  });

  test(`${areaId}: todo destrutível existe e fica em chão livre, sem tapar chegada, saída nem inimigo`, () => {
    for (const prop of map.props) {
      assert.ok(isPropId(prop.kind), `destrutível "${prop.kind}" não existe`);
      assert.equal(tileAt(bare[areaId].grid, prop.tile)?.blocksMove, false, `${prop.id} está num quadrado bloqueado`);
      assert.equal(map.props.filter((other) => samePos(other.tile, prop.tile)).length, 1, `${prop.id} divide o quadrado`);

      const occupied = [...Object.values(map.spawns), ...map.enemies].map((point) => tileOfPixel(map, point));
      assert.ok(!occupied.some((tile) => samePos(tile, prop.tile)), `${prop.id} está em cima de alguém`);
      const middle = { x: (prop.tile.x + 0.5) * map.tileSize, y: (prop.tile.y + 0.5) * map.tileSize };
      assert.equal(exitAt(map, middle), undefined, `${prop.id} está dentro de uma saída`);
    }
    assert.equal(props[areaId].length, map.props.length);
  });

  test(`${areaId}: todo mundo com quem se fala tem nome, e quem está de pé tem cara, chão e por onde chegar`, () => {
    const reachable = flood(map, tileOfPixel(map, Object.values(map.spawns)[0]));
    for (const npc of map.npcs) {
      assert.ok(npc.name, `${npc.id} não tem nome`);
      const tile = tileOfPixel(map, npc);
      const neighbors = stepNeighbors(map.grid, tile).concat(
        // Um ponto pra examinar pode estar numa parede: basta dar pra chegar ao lado.
        [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ x: tile.x + dx, y: tile.y + dy }))),
      );
      assert.ok(neighbors.some((pos) => reachable.has(tileIndex(map.grid, pos))), `não dá pra chegar perto de ${npc.name}`);
      if (npc.look === undefined) continue;

      assert.ok(npc.look in CLASS_INFO, `${npc.name} tem uma cara que não existe: "${npc.look}"`);
      assert.equal(tileAt(bare[areaId].grid, tile)?.blocksMove, false, `${npc.name} está num quadrado bloqueado`);
      const others = [...Object.values(map.spawns), ...map.enemies].map((point) => tileOfPixel(map, point));
      assert.ok(!others.some((other) => samePos(other, tile)), `${npc.name} está em cima de alguém`);
      assert.ok(!map.props.some((prop) => samePos(prop.tile, tile)), `${npc.name} está em cima de um destrutível`);
    }
  });

  test(`${areaId}: inimigo que fala é passivo e tem nome, e o passivo fica num quadrado só dele`, () => {
    for (const enemy of map.enemies) {
      if (enemy.dialog !== undefined) {
        assert.ok(enemy.passive, `${enemy.id} tem "dialog" mas não é "passive": atacaria antes de falar`);
        assert.ok(enemy.name, `${enemy.id} fala mas não tem nome`);
      }
      if (!enemy.passive) continue;

      const tile = tileOfPixel(map, enemy);
      const others = [...Object.values(map.spawns), ...map.npcs, ...map.enemies.filter((other) => other !== enemy)];
      assert.ok(!others.some((other) => samePos(tileOfPixel(map, other), tile)), `${enemy.id} está em cima de alguém`);
      const middle = { x: (tile.x + 0.5) * map.tileSize, y: (tile.y + 0.5) * map.tileSize };
      assert.equal(exitAt(map, middle), undefined, `${enemy.id} está dentro de uma saída`);
    }
  });

  test(`${areaId}: todo gatilho tem tamanho e fica onde se pisa`, () => {
    const reachable = flood(map, tileOfPixel(map, Object.values(map.spawns)[0]));
    for (const trigger of map.triggers) {
      assert.ok(trigger.width > 0 && trigger.height > 0, `${trigger.id} não tem tamanho: precisa ser um retângulo`);
      const tiles: Pos[] = [];
      for (let y = trigger.y; y < trigger.y + trigger.height; y += map.tileSize) {
        for (let x = trigger.x; x < trigger.x + trigger.width; x += map.tileSize) tiles.push(tileOfPixel(map, { x, y }));
      }
      assert.ok(tiles.some((tile) => reachable.has(tileIndex(map.grid, tile))), `ninguém consegue pisar em ${trigger.id}`);
    }
  });

  test(`${areaId}: toda deixa é de um grupo que existe, e quem (ou o quê) ela espera está lá, sem ambiguidade`, () => {
    for (const cue of map.cues) {
      const group = map.enemies.filter((enemy) => enemy.group === cue.group);
      assert.ok(group.length > 0, `${cue.id} é da luta com "${cue.group}", grupo que não existe`);

      const { when } = cue;
      if (when.kind === "broken") {
        const named = map.props.filter((prop) => prop.name === when.prop).length;
        assert.equal(named, 1, `${cue.id} espera quebrar "${when.prop}": há ${named} destrutíveis com esse Nome`);
      } else if (when.kind === "down" && when.who.startsWith("party:")) {
        assert.ok(when.who.slice("party:".length) in COMPANIONS, `${cue.id} espera a queda de "${when.who}", que não é companheiro`);
      } else if (when.kind === "down" && when.who !== "hero") {
        const named = group.filter((enemy) => enemy.name === when.who).length;
        assert.equal(named, 1, `${cue.id} espera a queda de "${when.who}": há ${named} com esse Nome no grupo "${cue.group}"`);
      }
    }
    // Duas deixas iguais no mesmo grupo: a segunda nunca seria a que decide.
    const keys = map.cues.map((cue) => JSON.stringify([cue.group, cue.when, cue.if, cue.unless]));
    assert.equal(new Set(keys).size, keys.length, "há deixas repetidas");
  });

  test(`${areaId}: ninguém chega na área já dentro de uma luta`, () => {
    for (const [name, spawn] of Object.entries(map.spawns)) {
      for (const enemy of map.enemies.filter((candidate) => !candidate.passive)) {
        const gap = distance(tileOfPixel(map, spawn), tileOfPixel(map, enemy));
        assert.ok(gap > AGGRO_RANGE, `"${name}" nasce a ${gap} quadrados de ${enemy.id}`);
      }
    }
  });
}

{
  const hero: Character = {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass: "guardiao",
    level: 1,
    xp: 0,
    attributes: { dain: 8, eir: 3, nath: 7, il: 4, or: 6, len: 5, ul: 5 },
    currentHp: 48,
    maxHp: 48,
    currentNodeId: "",
  };

  test("chegar perto de um inimigo puxa o grupo dele inteiro pra luta, na grade da área", () => {
    const map = maps.estrada;
    const [wolf] = map.enemies;
    const wolfTile = tileOfPixel(map, wolf);
    const playerTile = { x: wolfTile.x - 3, y: wolfTile.y };

    assert.equal(aggroedGroup(map, map.enemies, { x: 3, y: 11 }), undefined);
    assert.equal(aggroedGroup(map, map.enemies, playerTile), "lobos");

    const group = map.enemies.filter((enemy) => enemy.group === "lobos");
    const { encounter } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: playerTile }], group, 5);
    assert.equal(encounter.grid, map.grid);
    assert.deepEqual(encounter.units.map((unit) => unit.team).sort(), ["enemy", "enemy", "party"]);

    // A luta anda até o fim na grade de verdade, com árvores, rio e ponte.
    for (let i = 0; i < 3000 && !encounter.winner; i++) {
      assert.equal(applyCommand(encounter, chooseCommand(encounter)).ok, true);
    }
    assert.ok(encounter.winner);
  });

  test("cobertura e altura vêm das propriedades dos tiles, e a luta no patamar das ruínas anda até o fim", () => {
    const map = maps.ruinas;
    const high = map.grid.tiles.filter((tile) => tile.elevation > 0);
    assert.ok(high.length > 0, "as ruínas deveriam ter chão elevado");
    assert.ok(high.every((tile) => !tile.blocksMove));
    // Pedra e mureta dão cobertura; árvore e parede barram a visão de uma vez.
    const cover = map.grid.tiles.filter((tile) => tile.cover);
    assert.ok(cover.length > 0);
    assert.ok(cover.every((tile) => tile.blocksMove && !tile.blocksSight));

    const group = map.enemies.filter((enemy) => enemy.group === "salao");
    assert.ok(group.some((enemy) => tileAt(map.grid, tileOfPixel(map, enemy))!.elevation > 0), "alguém começa no alto");

    const { encounter } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: { x: 18, y: 16 } }], group, 9);
    for (let i = 0; i < 3000 && !encounter.winner; i++) {
      assert.equal(applyCommand(encounter, chooseCommand(encounter)).ok, true);
    }
    assert.ok(encounter.winner);
  });

  test("a criatura entra na luta com o que carrega, e o que ela não usou fica pra quem vence", () => {
    const map = maps.estrada;
    const servo = { ...map.enemies[0], id: "servo", creature: "encounter-servo-enferrujado" };
    const tile = tileOfPixel(map, servo);
    const { encounter } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: { x: tile.x - 3, y: tile.y } }], [servo], 5);

    const unit = encounter.units.find((candidate) => candidate.id === "servo")!;
    assert.deepEqual(
      unit.inventory?.slots.map((slot) => slot.item.id),
      ["item-balsamo-de-pedra-de-taharim"],
    );
    // O molde do bestiário não ganha mochila: cada luta monta a sua.
    assert.equal(findBestiaryEntry("encounter-servo-enferrujado")!.template.inventory, undefined);

    const carried = unusedItems(encounter, "enemy");
    assert.deepEqual(carried.map((item) => item.id), ["item-balsamo-de-pedra-de-taharim"]);

    const character = structuredClone(hero);
    const rewards = grantEncounterRewards(character, [], { rngState: 1 }, carried);
    assert.deepEqual(rewards.loot.map((item) => item.id), ["item-balsamo-de-pedra-de-taharim"]);
    assert.equal(character.inventory?.slots[0].quantity, 1);

    unit.inventory!.slots = [];
    assert.deepEqual(unusedItems(encounter, "enemy"), []);
  });

  test("vencer rende o XP de cada criatura, e o loot entra na mochila", () => {
    const character = structuredClone(hero);
    const rewards = grantEncounterRewards(
      character,
      ["encounter-lobo-de-bruma", "encounter-lobo-de-bruma", "encounter-servo-enferrujado"],
      { rngState: 1 },
    );

    assert.equal(rewards.xpGained, 30 + 30 + 40);
    assert.deepEqual(rewards.levelUp, { leveledUp: true, newLevel: 2, newAbility: rewards.levelUp.newAbility });
    assert.equal(character.level, 2);
    const carried = (character.inventory?.slots ?? []).reduce((sum, slot) => sum + slot.quantity, 0);
    assert.equal(carried, rewards.loot.length);
  });
}

test("andar desliza pela parede em vez de travar, e nunca atravessa", () => {
  const map: AreaMap = {
    tileSize: 16,
    grid: {
      width: 3,
      height: 3,
      tiles: Array.from({ length: 9 }, (_, index) => ({
        blocksMove: index % 3 === 2,
        blocksSight: false,
        moveCost: 1,
        cover: false,
        elevation: 0,
      })),
    },
    occupied: [],
    spawns: {},
    exits: [],
    enemies: [],
    npcs: [],
    props: [],
    triggers: [],
    cues: [],
  };
  const body = { halfWidth: 4, height: 4 };

  // A coluna da direita é parede: empurrar na diagonal contra ela só anda pra baixo.
  let pos = { x: 27, y: 20 };
  for (let i = 0; i < 20; i++) pos = walk(map, pos, 1, 1, body);

  assert.equal(isBlocked(map, pos, body), false);
  assert.equal(pos.x, 28);
  assert.equal(pos.y, 40);
});

// --- Quem está no mapa, gatilhos e emboscada ---------------------------------

/** Uma sala aberta de 12x12, sem nada: o que cada teste precisa entra por `extra`. */
function room(extra: Partial<AreaMap> = {}): AreaMap {
  const side = 12;
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
    occupied: [],
    spawns: {},
    exits: [],
    enemies: [],
    npcs: [],
    props: [],
    triggers: [],
    cues: [],
    ...extra,
  };
}

/** O meio do quadrado (x, y), em pixels. */
const at = (x: number, y: number) => ({ x: x * 16 + 8, y: y * 16 + 8 });

function enemy(id: string, x: number, y: number, extra: Partial<AreaEnemy> = {}): AreaEnemy {
  return { id, name: id, creature: "encounter-lobo-de-bruma", group: id, passive: false, ...at(x, y), ...extra };
}

test("os objetos do Tiled chegam com condição, gatilho e inimigo passivo; e o mapa sai sem gente na grade", () => {
  const property = (name: string, value: unknown) => ({ name, value });
  const map = parseTiledMap({
    width: 4,
    height: 4,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [],
    layers: [
      {
        type: "objectgroup",
        objects: [
          { id: 1, name: "Guarda", type: "npc", x: 24, y: 24, properties: [property("dialog", "guarda"), property("look", "guardiao"), property("if", "guarda_chegou")] },
          { id: 2, name: "Chefe", type: "enemy", x: 40, y: 8, properties: [property("creature", "x"), property("group", "chefe"), property("passive", true), property("dialog", "chefe"), property("onDefeat", "chefe_caiu"), property("unless", "chefe_fugiu")] },
          { id: 3, name: "lobo", type: "enemy", x: 8, y: 40, properties: [property("creature", "x")] },
          { id: 4, name: "cena", type: "trigger", x: 0, y: 0, width: 32, height: 16, properties: [property("dialog", "cena")] },
          { id: 5, name: "eco", type: "trigger", x: 0, y: 16, width: 16, height: 16, properties: [property("dialog", "eco"), property("once", false), property("if", "")] },
          { id: 6, name: "porta", type: "exit", x: 48, y: 48, width: 16, height: 16, properties: [property("area", "a"), property("spawn", "s"), property("if", "porta_aberta")] },
        ],
      },
    ],
  });

  assert.deepEqual(map.npcs[0].if, "guarda_chegou");
  assert.deepEqual(
    map.enemies.map(({ name, group, passive, dialog, onDefeat, unless }) => ({ name, group, passive, dialog, onDefeat, unless })),
    [
      { name: "Chefe", group: "chefe", passive: true, dialog: "chefe", onDefeat: "chefe_caiu", unless: "chefe_fugiu" },
      { name: "lobo", group: "enemy-3", passive: false, dialog: undefined, onDefeat: undefined, unless: undefined },
    ],
  );
  assert.deepEqual(
    map.triggers.map(({ id, dialog, once }) => ({ id, dialog, once })),
    [
      { id: "trigger-4", dialog: "cena", once: true },
      { id: "trigger-5", dialog: "eco", once: false },
    ],
  );
  // Propriedade vazia é como não ter: o Tiled deixa o campo lá.
  assert.equal("if" in map.triggers[1], false);
  assert.equal(map.exits[0].if, "porta_aberta");
  // Gente não vem escrita na grade: quem a põe de pé é standPeople.
  assert.ok(map.grid.tiles.every((tile) => !tile.blocksMove));
  assert.throws(() => parseTiledMap({ width: 1, height: 1, tilewidth: 16, tileheight: 16, tilesets: [], layers: [{ type: "objectgroup", objects: [{ id: 1, type: "trigger", x: 0, y: 0 }] }] }));
});

test("um objeto com condição existe enquanto a variável de `if` vale e a de `unless` não", () => {
  const flags: Record<string, unknown> = { sim: true, nao: false, contador: 2, zero: 0 };
  const flag = (name: string) => flags[name];

  assert.equal(isActive({}, flag), true);
  assert.equal(isActive({ if: "sim" }, flag), true);
  assert.equal(isActive({ if: "nao" }, flag), false);
  assert.equal(isActive({ if: "contador" }, flag), true);
  assert.equal(isActive({ if: "zero" }, flag), false);
  assert.equal(isActive({ unless: "sim" }, flag), false);
  assert.equal(isActive({ unless: "nao" }, flag), true);
  assert.equal(isActive({ if: "sim", unless: "nao" }, flag), true);
  assert.equal(isActive({ if: "sim", unless: "contador" }, flag), false);
  // Variável que a história não declara conta como falsa — o teste da história acusa o nome errado.
  assert.equal(isActive({ if: "nao_existe" }, flag), false);
  assert.equal(isActive({ unless: "nao_existe" }, flag), true);
});

test("gente de pé ocupa o quadrado, e devolve o chão que havia quando sai", () => {
  const map = room();
  const wall = { x: 3, y: 3 };
  tileAt(map.grid, wall)!.blocksMove = true;
  const blocked = (pos: Pos) => tileAt(map.grid, pos)!.blocksMove;

  standPeople(map, [{ x: 1, y: 1 }, wall, { x: 5, y: 5 }, { x: 99, y: 99 }]);
  assert.deepEqual([blocked({ x: 1, y: 1 }), blocked(wall), blocked({ x: 5, y: 5 })], [true, true, true]);

  // Trocar a lista: quem saiu libera o quadrado, quem ficou continua, e a parede de baixo não se abre.
  standPeople(map, [{ x: 5, y: 5 }]);
  assert.deepEqual([blocked({ x: 1, y: 1 }), blocked(wall), blocked({ x: 5, y: 5 })], [false, true, true]);
  standPeople(map, [{ x: 5, y: 5 }, { x: 5, y: 5 }]);
  standPeople(map, []);
  assert.deepEqual([blocked({ x: 1, y: 1 }), blocked(wall), blocked({ x: 5, y: 5 })], [false, true, false]);
  assert.deepEqual(map.occupied, []);
});

test("ocupa quadrado quem tem cara e o inimigo passivo; fala-se com npc e com passivo que tenha o que dizer", () => {
  const map = room();
  const npcs = [
    { id: "npc-1", name: "Guarda", dialog: "guarda", look: "guardiao", ...at(2, 2) },
    { id: "npc-2", name: "Inscrição", dialog: "inscricao", ...at(4, 2) },
  ];
  const enemies = [
    enemy("lobo", 6, 6),
    enemy("chefe", 8, 2, { passive: true, dialog: "chefe", name: "Chefe" }),
    enemy("estatua", 10, 2, { passive: true }),
  ];

  assert.deepEqual(peopleTiles(map, npcs, enemies), [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 10, y: 2 }]);
  const all = talkers(npcs, enemies);
  assert.deepEqual(
    all.map(({ name, dialog, stands }) => ({ name, dialog, stands })),
    [
      { name: "Guarda", dialog: "guarda", stands: true },
      { name: "Inscrição", dialog: "inscricao", stands: false },
      { name: "Chefe", dialog: "chefe", stands: true },
    ],
  );
  assert.equal(npcInReach(map, at(8, 3), all)?.name, "Chefe");
  assert.equal(npcInReach(map, at(10, 3), all), undefined);
  assert.equal(npcInReach(map, at(6, 7), all), undefined);
});

test("um gatilho dispara ao entrar nele; o de uma vez só se gasta quando o trecho é lido", () => {
  const rect = { x: 32, y: 32, width: 32, height: 32 };
  const map = room({
    triggers: [
      { id: "cena", dialog: "cena", once: true, ...rect },
      { id: "eco", dialog: "eco", once: false, ...rect, if: "eco_armado" },
    ],
  });
  const flags: Record<string, unknown> = { eco_armado: false };
  const seen = new Set<string>();
  const inside = new Set<string>();
  const step = (x: number, y: number) =>
    firedTrigger(map, at(x, y), inside, (name) => flags[name], (knot) => seen.has(knot))?.id;

  assert.equal(step(0, 0), undefined);
  assert.equal(step(2, 2), "cena");
  // A cena foi lida; parado ou andando lá dentro, nada dispara de novo.
  seen.add("cena");
  assert.equal(step(2, 2), undefined);
  assert.equal(step(3, 3), undefined);
  assert.equal(step(0, 0), undefined);
  assert.equal(step(2, 2), undefined);

  // Armado com o personagem em cima, o outro dispara na hora — e de novo a cada entrada.
  flags.eco_armado = true;
  assert.equal(step(2, 2), "eco");
  assert.equal(step(3, 2), undefined);
  assert.equal(step(5, 5), undefined);
  assert.equal(step(3, 3), "eco");

  // Dois prontos no mesmo lugar saem um de cada vez.
  seen.clear();
  inside.clear();
  assert.equal(step(2, 2), "cena");
  seen.add("cena");
  assert.equal(step(2, 2), "eco");
  assert.equal(step(2, 2), undefined);
});

test("inimigo passivo não percebe ninguém nem pode ser emboscado; o hostil se embosca de longe ou de fora da vista", () => {
  const map = room();
  for (let y = 0; y < 12; y++) {
    const tile = tileAt(map.grid, { x: 6, y })!;
    tile.blocksMove = true;
    tile.blocksSight = true;
  }
  const wolf = enemy("lobo", 8, 5);
  const chief = enemy("chefe", 2, 2, { passive: true });
  const enemies = [wolf, chief];

  // Colado no passivo: nada. Do outro lado da parede, a 3 quadrados do lobo: ele não vê, mas dá pra emboscar.
  assert.equal(aggroedGroup(map, enemies, { x: 2, y: 3 }), undefined);
  assert.equal(aggroedGroup(map, enemies, { x: 5, y: 5 }), undefined);
  assert.equal(ambushableGroup(map, enemies, { x: 5, y: 5 }), "lobo");
  assert.equal(ambushableGroup(map, [chief], { x: 2, y: 3 }), undefined);

  // À vista: perto demais ele percebe primeiro; na faixa entre os dois alcances, quem ataca primeiro é o jogador.
  const open = room();
  const far = enemy("longe", 1, 1);
  const near = enemy("perto", 10, 10);
  assert.ok(AMBUSH_RANGE > AGGRO_RANGE);
  assert.equal(aggroedGroup(open, [far], { x: 1 + AGGRO_RANGE, y: 1 }), "longe");
  assert.equal(aggroedGroup(open, [far], { x: 1 + AGGRO_RANGE + 1, y: 1 }), undefined);
  assert.equal(ambushableGroup(open, [far], { x: 1 + AMBUSH_RANGE, y: 1 }), "longe");
  assert.equal(ambushableGroup(open, [far], { x: 1 + AMBUSH_RANGE + 1, y: 1 }), undefined);
  // Com dois ao alcance, o mais próximo.
  assert.equal(ambushableGroup(open, [far, near], { x: 7, y: 7 }), "perto");
});

test("numa emboscada o grupo entra surpreso: perde a primeira vez, e a luta anda até o fim", () => {
  const map = maps.estrada;
  const group = map.enemies.filter((candidate) => candidate.group === "lobos");
  const wolfTile = tileOfPixel(map, group[0]);
  const hero: Character = {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass: "rachador",
    level: 1,
    xp: 0,
    attributes: { dain: 6, eir: 3, nath: 6, il: 8, or: 4, len: 5, ul: 5 },
    currentHp: 40,
    maxHp: 40,
    currentNodeId: "",
  };
  const playerTile = { x: wolfTile.x - 7, y: wolfTile.y };
  assert.equal(aggroedGroup(map, group, playerTile), undefined);
  assert.equal(ambushableGroup(map, group, playerTile), "lobos");

  const { encounter, events } = startAreaEncounter(map, [{ character: hero, tile: playerTile }], group, 3, props.estrada, "enemy");
  // Quem abre a luta de verdade é o herói: todo lobo que estava na frente dele perdeu a vez.
  assert.equal(encounter.order[encounter.turnIndex], "hero");
  assert.equal(encounter.round, 1);

  const log = [...events];
  for (let i = 0; i < 3000 && !encounter.winner; i++) {
    const result = applyCommand(encounter, chooseCommand(encounter));
    assert.equal(result.ok, true);
    if (result.ok) log.push(...result.events);
  }
  assert.ok(encounter.winner);
  // Cada lobo perde uma vez só (ou nenhuma, se cair antes de ela chegar).
  const skipped = log.flatMap((event) => (event.type === "turnSkipped" ? [event.unit] : []));
  assert.ok(skipped.length >= 1 && skipped.length <= 2);
  assert.equal(new Set(skipped).size, skipped.length);
});

// --- Lutas com roteiro ------------------------------------------------------

test("a deixa do Tiled chega lida: de que grupo é, quando dispara, o que abre e como encerra", () => {
  assert.deepEqual(parseCueWhen("round 3"), { kind: "round", round: 3 });
  assert.deepEqual(parseCueWhen("  down Velha Sentinela "), { kind: "down", who: "Velha Sentinela" });
  assert.deepEqual(parseCueWhen("down party:lish"), { kind: "down", who: "party:lish" });
  assert.deepEqual(parseCueWhen("broken Sino"), { kind: "broken", prop: "Sino" });
  assert.deepEqual(parseCueWhen("defeat"), { kind: "defeat" });
  for (const bad of ["", "round", "round 0", "round três", "down", "broken", "defeat agora", "quando der"]) {
    assert.equal(parseCueWhen(bad), undefined, `"${bad}" não deveria ser aceito`);
  }

  const property = (name: string, value: unknown) => ({ name, value });
  const parse = (...properties: { name: string; value: unknown }[]) =>
    parseTiledMap({
      width: 2,
      height: 2,
      tilewidth: 16,
      tileheight: 16,
      tilesets: [],
      layers: [{ type: "objectgroup", objects: [{ id: 7, name: "deixa", type: "cue", x: 0, y: 0, properties }] }],
    }).cues;

  assert.deepEqual(
    parse(property("group", "chefe"), property("when", "round 3"), property("dialog", "chefe_cansa"), property("ends", "stop"), property("unless", "chefe_fugiu")),
    [{ id: "cue-7", group: "chefe", when: { kind: "round", round: 3 }, dialog: "chefe_cansa", ends: "stop", unless: "chefe_fugiu" }],
  );
  // Sem `dialog` e sem `ends`, não leva nenhum dos dois.
  assert.deepEqual(parse(property("group", "chefe"), property("when", "defeat")), [{ id: "cue-7", group: "chefe", when: { kind: "defeat" } }]);
  assert.throws(() => parse(property("when", "round 3")));
  assert.throws(() => parse(property("group", "chefe"), property("when", "um dia")));
  assert.throws(() => parse(property("group", "chefe"), property("when", "round 3"), property("ends", "lose")));
});

test("o roteiro vai pra luta com os nomes do mapa trocados por ids, e sem as deixas de quem não está nela", () => {
  const boss = enemy("enemy-1", 5, 5, { name: "Chefe", group: "chefe" });
  const map = room({ props: [{ id: "prop-9", name: "Sino", kind: "crate", tile: { x: 2, y: 2 }, gid: 1 }] });
  const cue = (id: string, when: AreaCue["when"], ends?: AreaCue["ends"]): AreaCue => ({ id, group: "chefe", when, dialog: id, ...(ends ? { ends } : {}) });

  assert.deepEqual(
    fightCues(
      map,
      [
        cue("a", { kind: "round", round: 2 }),
        cue("b", { kind: "down", who: "Chefe" }, "win"),
        cue("c", { kind: "down", who: "hero" }),
        cue("d", { kind: "down", who: "party:lish" }, "stop"),
        cue("e", { kind: "broken", prop: "Sino" }, "win"),
        cue("f", { kind: "defeat" }),
        // Quem não entrou na luta e o que a área não tem: de fora.
        cue("g", { kind: "down", who: "Capanga" }),
        cue("h", { kind: "broken", prop: "Gongo" }),
      ],
      [boss],
    ),
    [
      { id: "a", when: { kind: "round", round: 2 } },
      { id: "b", when: { kind: "down", unit: "enemy-1" }, ends: "win" },
      { id: "c", when: { kind: "down", unit: HERO_ID } },
      { id: "d", when: { kind: "down", unit: companionId("lish") }, ends: "stop" },
      { id: "e", when: { kind: "broken", prop: "prop-9" }, ends: "win" },
      { id: "f", when: { kind: "defeat" } },
    ],
  );
});

test("nas ruínas, a luta com a Sentinela para sozinha quando a rodada 4 começa", () => {
  const map = maps.ruinas;
  const group = map.enemies.filter((candidate) => candidate.group === "sentinela");
  const cues = map.cues.filter((cue) => cue.group === "sentinela");
  const stop = cues.find((cue) => cue.ends === "stop");
  assert.ok(stop, "a luta da Sentinela deveria ter uma deixa que a para");

  const hero: Character = {
    id: HERO_ID,
    name: "Herói",
    race: "althirim",
    characterClass: "guardiao",
    level: 1,
    xp: 0,
    attributes: { dain: 5, eir: 5, nath: 5, il: 5, or: 5, len: 5, ul: 5 },
    currentHp: 500,
    maxHp: 500,
    currentNodeId: "",
  };
  const tile = tileOfPixel(map, group[0]);
  const { encounter, events } = startAreaEncounter(
    map,
    [{ character: hero, tile: { x: tile.x + 2, y: tile.y } }],
    group,
    7,
    props.ruinas,
    undefined,
    fightCues(map, cues, group),
  );

  // O herói só aguenta: passa a vez. Quem bate é ela.
  const log = [...events];
  for (let i = 0; i < 400 && !isOver(encounter); i++) {
    const unit = activeUnit(encounter)!;
    const result = applyCommand(encounter, unit.team === "party" ? { type: "endTurn", unitId: unit.id } : chooseCommand(encounter));
    assert.equal(result.ok, true);
    if (result.ok) log.push(...result.events);
  }

  assert.equal(encounter.round, 4);
  assert.equal(encounter.stopped, true);
  assert.equal(encounter.winner, undefined);
  assert.deepEqual(log.slice(-2), [{ type: "cue", id: stop.id }, { type: "battleEnded" }]);
});
