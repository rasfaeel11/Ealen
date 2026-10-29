import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import "./catalog";
import { findBestiaryEntry } from "../../data/bestiary";
import { COMPANIONS, HERO_ID, companionId } from "../../party";
import { activeUnit, applyCommand, chooseCommand, findUnit, isOver, type Encounter } from "../../tactics";
import { distance, samePos, stepNeighbors, tileAt, tileIndex, type Pos } from "../../tactics/grid";
import { PROPS, isPropId, type PropTemplate } from "../../tactics/props";
import { isStatusId } from "../../tactics/statuses";
import type { Character } from "../../types/character";
import { isLook } from "../tiledMap";
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
  parseCueApply,
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

/**
 * Três mapas de teste (o campo, a trilha e o porão), que ficam aqui como peças
 * que exercitam o motor do mundo: luta puxada por quem chega perto, patamar, emboscada, deixas, quem não se fere.
 */
function loadFixture(name: string): AreaMap {
  return parseTiledMap(JSON.parse(readFileSync(new URL(`./fixtures/${name}.tmj`, import.meta.url), "utf8")));
}
const fixtures = { campo: loadFixture("campo"), trilha: loadFixture("trilha"), porao: loadFixture("porao") };
const fixtureProps = Object.fromEntries(Object.entries(fixtures).map(([name, map]) => [name, standAreaProps(map)]));
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

      assert.ok(isLook(npc.look), `${npc.name} tem uma cara que não existe: "${npc.look}"`);
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
      } else if (when.kind === "used") {
        for (const name of when.props) {
          const named = map.props.filter((prop) => prop.name === name);
          assert.equal(named.length, 1, `${cue.id} espera que mexam em "${name}": há ${named.length} objetos com esse Nome`);
          const template: PropTemplate | undefined = isPropId(named[0].kind) ? PROPS[named[0].kind] : undefined;
          assert.ok(template?.interact, `${cue.id} espera que mexam em "${name}", que não é de mexer`);
        }
      }
      if (when.kind === "broken") {
        const prop = map.props.find((candidate) => candidate.name === when.prop);
        const template: PropTemplate | undefined = prop && isPropId(prop.kind) ? PROPS[prop.kind] : undefined;
        assert.ok(!template?.unbreakable, `${cue.id} espera quebrar "${when.prop}", que não se quebra`);
      }

      const { apply } = cue;
      if (!apply) continue;
      assert.ok(isStatusId(apply.status), `${cue.id} aplica "${apply.status}", condição que não existe`);
      if (apply.on.startsWith("party:")) {
        assert.ok(apply.on.slice("party:".length) in COMPANIONS, `${cue.id} aplica uma condição em "${apply.on}", que não é companheiro`);
      } else if (!["enemies", "party", "hero"].includes(apply.on)) {
        const named = group.filter((enemy) => enemy.name === apply.on).length;
        assert.equal(named, 1, `${cue.id} aplica uma condição em "${apply.on}": há ${named} com esse Nome no grupo "${cue.group}"`);
      }
    }
    // Quem não tem vida não cai: a luta com ele precisa de uma deixa que a encerre sem depender da derrota.
    for (const enemy of map.enemies) {
      if (!findBestiaryEntry(enemy.creature)?.invulnerable) continue;
      assert.ok(
        map.cues.some((cue) => cue.group === enemy.group && cue.ends !== undefined && cue.when.kind !== "defeat"),
        `${enemy.id} não tem vida e a luta com "${enemy.group}" não tem deixa que a encerre: não acabaria nunca`,
      );
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
    race: "humano",
    characterClass: "espadachim",
    level: 1,
    xp: 0,
    attributes: { forca: 8, fator: 3, vigor: 7, olho: 4, couro: 6, labia: 5, saber: 5 },
    currentHp: 48,
    maxHp: 48,
  };

  test("chegar perto de um inimigo puxa o grupo dele inteiro pra luta, na grade da área", () => {
    const map = fixtures.trilha;
    const [wolf] = map.enemies;
    const wolfTile = tileOfPixel(map, wolf);
    const playerTile = { x: wolfTile.x - 3, y: wolfTile.y };

    assert.equal(aggroedGroup(map, map.enemies, { x: 3, y: 11 }), undefined);
    assert.equal(aggroedGroup(map, map.enemies, playerTile), "cacadores");

    const group = map.enemies.filter((enemy) => enemy.group === "cacadores");
    const { encounter } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: playerTile }], group, 5);
    assert.equal(encounter.grid, map.grid);
    assert.deepEqual(encounter.units.map((unit) => unit.team).sort(), ["enemy", "enemy", "party"]);

    // A luta anda até o fim na grade de verdade, com árvores, rio e ponte.
    for (let i = 0; i < 3000 && !encounter.winner; i++) {
      assert.equal(applyCommand(encounter, chooseCommand(encounter)).ok, true);
    }
    assert.ok(encounter.winner);
  });

  test("cobertura e altura vêm das propriedades dos tiles, e a luta no patamar das porão anda até o fim", () => {
    const map = fixtures.porao;
    const high = map.grid.tiles.filter((tile) => tile.elevation > 0);
    assert.ok(high.length > 0, "as porão deveriam ter chão elevado");
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
    const map = fixtures.trilha;
    const brute = { ...map.enemies[0], id: "bruto", creature: "encounter-teste-bruto" };
    const tile = tileOfPixel(map, brute);
    const { encounter } = startAreaEncounter(map, [{ character: structuredClone(hero), tile: { x: tile.x - 3, y: tile.y } }], [brute], 5);

    const unit = encounter.units.find((candidate) => candidate.id === "bruto")!;
    assert.deepEqual(
      unit.inventory?.slots.map((slot) => slot.item.id),
      ["item-pao-de-viagem"],
    );
    // O molde do bestiário não ganha mochila: cada luta monta a sua.
    assert.equal(findBestiaryEntry("encounter-teste-bruto")!.template.inventory, undefined);

    const carried = unusedItems(encounter, "enemy");
    assert.deepEqual(carried.map((item) => item.id), ["item-pao-de-viagem"]);

    const character = structuredClone(hero);
    const rewards = grantEncounterRewards(character, [], { rngState: 1 }, carried);
    assert.deepEqual(rewards.loot.map((item) => item.id), ["item-pao-de-viagem"]);
    assert.equal(character.inventory?.slots[0].quantity, 1);

    unit.inventory!.slots = [];
    assert.deepEqual(unusedItems(encounter, "enemy"), []);
  });

  test("vencer rende o XP de cada criatura, e o loot entra na mochila", () => {
    const character = structuredClone(hero);
    const rewards = grantEncounterRewards(
      character,
      ["encounter-teste-cacador", "encounter-teste-cacador", "encounter-teste-bruto"],
      { rngState: 1 },
    );

    assert.equal(rewards.xpGained, 30 + 30 + 40);
    assert.equal(rewards.levelUp.leveledUp && rewards.levelUp.newLevel, 2);
    // Espadachim não aprende Técnica subindo de nível.
    assert.deepEqual(rewards.levelUp.learned ?? [], []);
    assert.equal(character.level, 2);
    // O que se gasta foi pra mochila; o que se veste, pro guardado.
    const carried = (character.inventory?.slots ?? []).reduce((sum, slot) => sum + slot.quantity, 0);
    assert.equal(carried + (character.gear?.length ?? 0), rewards.loot.length);
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
  return { id, name: id, creature: "encounter-teste-cacador", group: id, passive: false, ...at(x, y), ...extra };
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
          { id: 1, name: "Guarda", type: "npc", x: 24, y: 24, properties: [property("dialog", "guarda"), property("look", "espadachim"), property("if", "guarda_chegou")] },
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
    { id: "npc-1", name: "Guarda", dialog: "guarda", look: "espadachim", ...at(2, 2) },
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
  const map = fixtures.trilha;
  const group = map.enemies.filter((candidate) => candidate.group === "cacadores");
  const wolfTile = tileOfPixel(map, group[0]);
  const hero: Character = {
    id: "hero",
    name: "Herói",
    race: "humano",
    characterClass: "espadachim",
    equipment: { weapon: "gear-besta" },
    level: 1,
    xp: 0,
    attributes: { forca: 6, fator: 3, vigor: 6, olho: 8, couro: 4, labia: 5, saber: 5 },
    currentHp: 40,
    maxHp: 40,
  };
  const playerTile = { x: wolfTile.x - 7, y: wolfTile.y };
  assert.equal(aggroedGroup(map, group, playerTile), undefined);
  assert.equal(ambushableGroup(map, group, playerTile), "cacadores");

  const { encounter, events } = startAreaEncounter(map, [{ character: hero, tile: playerTile }], group, 3, fixtureProps.trilha, "enemy");
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
  assert.deepEqual(parseCueWhen("  down Velha Vigia "), { kind: "down", who: "Velha Vigia" });
  assert.deepEqual(parseCueWhen("down party:jarupa"), { kind: "down", who: "party:jarupa" });
  assert.deepEqual(parseCueWhen("broken Sino"), { kind: "broken", prop: "Sino" });
  assert.deepEqual(parseCueWhen("defeat"), { kind: "defeat" });
  assert.deepEqual(parseCueWhen("used Sino"), { kind: "used", props: ["Sino"] });
  assert.deepEqual(parseCueWhen("used A cera,  Os nomes , O rol"), { kind: "used", props: ["A cera", "Os nomes", "O rol"] });
  assert.deepEqual(parseCueApply("exposed"), { status: "exposed", turns: 1 });
  assert.deepEqual(parseCueApply(" exposed 2 "), { status: "exposed", turns: 2 });
  for (const bad of ["", "exposed 0", "exposed dois", "exposed 2 3"]) {
    assert.equal(parseCueApply(bad), undefined, `"${bad}" não deveria ser aceito`);
  }
  for (const bad of ["", "round", "round 0", "round três", "down", "broken", "used", "used Sino,", "defeat agora", "quando der"]) {
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
  // A condição que ela aplica (sem `on`, nos inimigos) e o objetivo que o jogador lê.
  assert.deepEqual(
    parse(property("group", "chefe"), property("when", "used Sino"), property("apply", "exposed 2"), property("goal", "Toque o sino")),
    [{ id: "cue-7", group: "chefe", when: { kind: "used", props: ["Sino"] }, apply: { status: "exposed", turns: 2, on: "enemies" }, goal: "Toque o sino" }],
  );
  assert.deepEqual(parse(property("group", "chefe"), property("when", "round 2"), property("apply", "exposed"), property("on", "party:jarupa"))[0].apply, {
    status: "exposed",
    turns: 1,
    on: "party:jarupa",
  });
  assert.throws(() => parse(property("group", "chefe"), property("when", "round 3"), property("apply", "exposed muito")));
  assert.throws(() => parse(property("when", "round 3")));
  assert.throws(() => parse(property("group", "chefe"), property("when", "um dia")));
  assert.throws(() => parse(property("group", "chefe"), property("when", "round 3"), property("ends", "lose")));
});

test("o roteiro vai pra luta com os nomes do mapa trocados por ids, e sem as deixas de quem não está nela", () => {
  const boss = enemy("enemy-1", 5, 5, { name: "Chefe", group: "chefe" });
  const map = room({
    props: [
      { id: "prop-9", name: "Sino", kind: "crate", tile: { x: 2, y: 2 }, gid: 1 },
      { id: "prop-10", name: "Gongo de bronze", kind: "bell", tile: { x: 3, y: 2 }, gid: 1 },
    ],
  });
  const cue = (id: string, when: AreaCue["when"], ends?: AreaCue["ends"]): AreaCue => ({ id, group: "chefe", when, dialog: id, ...(ends ? { ends } : {}) });
  const applying = (id: string, on: string, status = "exposed"): AreaCue => ({ ...cue(id, { kind: "round", round: 2 }), apply: { status, turns: 2, on } });

  assert.deepEqual(
    fightCues(
      map,
      [
        cue("a", { kind: "round", round: 2 }),
        cue("b", { kind: "down", who: "Chefe" }, "win"),
        cue("c", { kind: "down", who: "hero" }),
        cue("d", { kind: "down", who: "party:jarupa" }, "stop"),
        cue("e", { kind: "broken", prop: "Sino" }, "win"),
        cue("f", { kind: "defeat" }),
        // Quem não entrou na luta e o que a área não tem: de fora.
        cue("g", { kind: "down", who: "Capanga" }),
        cue("h", { kind: "broken", prop: "Gongo" }),
        cue("i", { kind: "used", props: ["Gongo de bronze", "Sino"] }, "win"),
        cue("j", { kind: "used", props: ["Gongo de bronze", "Tambor"] }),
        // A condição vai com os ids de quem a recebe; a que não existe, ou sem ninguém pra receber, não vai (a deixa fica).
        applying("k", "enemies"),
        applying("l", "party"),
        applying("m", "hero"),
        applying("n", "party:jarupa"),
        applying("o", "Chefe"),
        applying("p", "Capanga"),
        applying("q", "enemies", "enfeitiçado"),
      ],
      [boss],
      [HERO_ID, companionId("jarupa")],
    ),
    [
      { id: "a", when: { kind: "round", round: 2 } },
      { id: "b", when: { kind: "down", unit: "enemy-1" }, ends: "win" },
      { id: "c", when: { kind: "down", unit: HERO_ID } },
      { id: "d", when: { kind: "down", unit: companionId("jarupa") }, ends: "stop" },
      { id: "e", when: { kind: "broken", prop: "prop-9" }, ends: "win" },
      { id: "f", when: { kind: "defeat" } },
      { id: "i", when: { kind: "used", props: ["prop-10", "prop-9"] }, ends: "win" },
      { id: "k", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: ["enemy-1"] } },
      { id: "l", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: [HERO_ID, companionId("jarupa")] } },
      { id: "m", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: [HERO_ID] } },
      { id: "n", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: [companionId("jarupa")] } },
      { id: "o", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: ["enemy-1"] } },
      { id: "p", when: { kind: "round", round: 2 } },
      { id: "q", when: { kind: "round", round: 2 } },
    ],
  );
});

test("nas porão, a luta com a Vigia para sozinha quando a rodada 4 começa", () => {
  const map = fixtures.porao;
  const group = map.enemies.filter((candidate) => candidate.group === "vigia");
  const cues = map.cues.filter((cue) => cue.group === "vigia");
  const stop = cues.find((cue) => cue.ends === "stop");
  assert.ok(stop, "a luta da Vigia deveria ter uma deixa que a para");

  const hero: Character = {
    id: HERO_ID,
    name: "Herói",
    race: "humano",
    characterClass: "espadachim",
    level: 1,
    xp: 0,
    attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
    currentHp: 500,
    maxHp: 500,
  };
  const tile = tileOfPixel(map, group[0]);
  const { encounter, events } = startAreaEncounter(
    map,
    [{ character: hero, tile: { x: tile.x + 2, y: tile.y } }],
    group,
    7,
    fixtureProps.porao,
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

  // Na rodada 3 a história mexe nas regras: a guarda dela cai (`apply` na deixa).
  const jam = cues.find((cue) => cue.apply !== undefined);
  assert.ok(jam, "a luta da Vigia deveria ter uma deixa que aplica uma condição");
  const at = log.findIndex((event) => event.type === "cue" && event.id === jam.id);
  assert.deepEqual(log[at - 1], { type: "roundStarted", round: 3 });
  assert.deepEqual(log[at + 1], { type: "statusApplied", target: group[0].id, statusId: "exposed", name: "Sem guarda", turns: 2 });
});

test("nas porão, o Intocado não se fere: a luta se vence tocando o sino, ou para sozinha na rodada 6", () => {
  const map = fixtures.porao;
  const group = map.enemies.filter((candidate) => candidate.group === "intocado");
  const cues = map.cues.filter((cue) => cue.group === "intocado");
  const bell = map.props.find((prop) => prop.name === "Sino")!;
  const hero = (): Character => ({
    id: HERO_ID,
    name: "Herói",
    race: "humano",
    characterClass: "espadachim",
    level: 1,
    xp: 0,
    attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
    currentHp: 5000,
    maxHp: 5000,
  });
  const fight = (tile: Pos) =>
    startAreaEncounter(map, [{ character: hero(), tile }], group, 7, standAreaProps(loadFixture("porao")), undefined, fightCues(map, cues, group));
  const collector = (encounter: Encounter) => findUnit(encounter, group[0].id)!;

  // Colado no sino: quando a vez chega, toca, e a luta acaba vencida com o Intocado inteiro.
  const won = fight({ x: bell.tile.x + 1, y: bell.tile.y });
  assert.equal(collector(won.encounter).invulnerable, true);
  const log = [...won.events];
  for (let i = 0; i < 400 && !isOver(won.encounter); i++) {
    const unit = activeUnit(won.encounter)!;
    const result = applyCommand(
      won.encounter,
      unit.team === "party" ? { type: "interact", unitId: unit.id, target: bell.tile } : chooseCommand(won.encounter),
    );
    assert.equal(result.ok, true);
    if (result.ok) log.push(...result.events);
  }
  assert.equal(won.encounter.winner, "party");
  assert.equal(collector(won.encounter).currentHp, collector(won.encounter).maxHp);
  assert.deepEqual(log.slice(-2), [{ type: "cue", id: cues.find((cue) => cue.ends === "win")!.id }, { type: "battleEnded", winner: "party" }]);

  // Batendo nele a luta não anda: nada o fere, e ela para sozinha quando a rodada 6 começa.
  const tile = tileOfPixel(map, group[0]);
  const stalled = fight({ x: tile.x - 1, y: tile.y });
  let immune = 0;
  for (let i = 0; i < 400 && !isOver(stalled.encounter); i++) {
    const unit = activeUnit(stalled.encounter)!;
    const strike = { type: "ability", unitId: unit.id, abilityId: "espadachim.attack", target: collector(stalled.encounter).pos } as const;
    let result = applyCommand(stalled.encounter, unit.team === "party" ? strike : chooseCommand(stalled.encounter));
    if (!result.ok) result = applyCommand(stalled.encounter, { type: "endTurn", unitId: unit.id });
    assert.equal(result.ok, true);
    if (result.ok) immune += result.events.filter((event) => event.type === "immune").length;
  }
  assert.ok(immune > 0, "nenhum golpe chegou a pegar nele");
  assert.equal(stalled.encounter.stopped, true);
  assert.equal(stalled.encounter.round, 6);
  assert.equal(collector(stalled.encounter).currentHp, collector(stalled.encounter).maxHp);
});

// A gente do capítulo, na trilha: cada luta exercita o jeito de lutar de quem está nela.
{
  const stout = (currentHp = 500): Character => ({
    id: HERO_ID,
    name: "Herói",
    race: "humano",
    characterClass: "espadachim",
    level: 1,
    xp: 0,
    attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
    currentHp,
    maxHp: 500,
  });
  /** A luta com `groupId`, num mapa só dela, com o herói em `tile`. */
  const fight = (groupId: string, tile: Pos, hero: Character, seed = 7) => {
    const map = loadFixture("trilha");
    const group = map.enemies.filter((candidate) => candidate.group === groupId);
    const cues = map.cues.filter((cue) => cue.group === groupId);
    const started = startAreaEncounter(map, [{ character: hero, tile }], group, seed, standAreaProps(map), undefined, fightCues(map, cues, group));
    return { ...started, map, group, cues };
  };
  /** Joga a luta até o fim (ou `turns` comandos): `heroTurn` diz o que o herói pede na vez dele; o que o motor recusar vira passar a vez. */
  const play = (encounter: Encounter, heroTurn: (encounter: Encounter) => Parameters<typeof applyCommand>[1], turns = 400) => {
    const log = [];
    for (let i = 0; i < turns && !isOver(encounter); i++) {
      const unit = activeUnit(encounter)!;
      let result = applyCommand(encounter, unit.team === "party" ? heroTurn(encounter) : chooseCommand(encounter));
      if (!result.ok) result = applyCommand(encounter, { type: "endTurn", unitId: unit.id });
      assert.equal(result.ok, true);
      if (result.ok) log.push(...result.events.map((event) => ({ event, habit: findUnit(encounter, HERO_ID)!.habit })));
    }
    return log;
  };

  test("na trilha, os porteiros fecham a ponte de lado a lado enquanto estão de pé nela", () => {
    const map = loadFixture("trilha");
    standAreaProps(map);
    const porteiros = map.enemies.filter((enemy) => enemy.group === "porteiros");
    assert.equal(porteiros.length, 2);
    assert.ok(porteiros.every((enemy) => enemy.passive && enemy.dialog === "porteiros" && enemy.unless === "porteiros_fora"));

    const from = tileOfPixel(map, map.spawns.from_campo);
    const beyond = tileIndex(map.grid, tileOfPixel(map, map.spawns.from_porao));
    assert.ok(flood(map, from).has(beyond));
    standPeople(map, peopleTiles(map, map.npcs, map.enemies));
    assert.ok(!flood(map, from).has(beyond), "com os porteiros na ponte, ainda dá pra atravessar");
    standPeople(map, []);
    assert.ok(flood(map, from).has(beyond));
  });

  test("na trilha, um porteiro não dá o primeiro golpe: fica no caminho até alguém bater, e depois revida", () => {
    const { encounter, group } = fight("porteiros", { x: 19, y: 11 }, stout());
    const porteiros = new Set(group.map((enemy) => enemy.id));
    for (const id of porteiros) {
      assert.equal(findUnit(encounter, id)!.quirks, undefined);
      assert.equal(findUnit(encounter, id)!.style, "ipojy");
    }

    // Quem só fica ali não apanha: quatro rodadas passando a vez, e nenhum golpe.
    const quiet = structuredClone(encounter);
    const idle = play(quiet, (now) => ({ type: "endTurn", unitId: activeUnit(now)!.id }), 12);
    assert.equal(idle.filter(({ event }) => event.type === "attackRoll" && porteiros.has(event.actor)).length, 0);
    // E não arredam pé: ficam colados nele, no caminho.
    for (const id of porteiros) assert.equal(distance(findUnit(quiet, id)!.pos, findUnit(quiet, HERO_ID)!.pos), 1);

    // O primeiro golpe é do herói; só depois dele um porteiro levanta o bastão por conta própria (o golpe que a
    // Ipojy devolve a quem erra é reação, não iniciativa: não conta).
    const target = findUnit(encounter, group[0].id)!;
    const log = play(encounter, () => ({ type: "ability", unitId: HERO_ID, abilityId: "espadachim.attack", target: target.pos }), 40);
    const first = log.findIndex(({ event }) => event.type === "abilityUsed" && event.unit === HERO_ID);
    const struck = log.findIndex(
      ({ event }) =>
        event.type === "abilityUsed" &&
        porteiros.has(event.unit) &&
        !event.reaction &&
        findUnit(encounter, event.unit)!.abilities.some(
          (ability) => ability.id === event.abilityId && ability.effects.some((effect) => effect.kind === "damage"),
        ),
    );
    assert.ok(first >= 0, "o herói não bateu");
    assert.ok(struck > first, struck < 0 ? "os porteiros não revidaram nunca" : "um porteiro bateu primeiro");
  });

  test("na trilha, os atiradores lutam de longe, no Gryskar, e a luta com eles anda até o fim", () => {
    const { encounter, group } = fight("atiradores", { x: 41, y: 14 }, stout());
    assert.equal(group.length, 2);
    assert.ok(group.every((enemy) => !enemy.passive));
    for (const enemy of group) {
      const unit = findUnit(encounter, enemy.id)!;
      assert.equal(unit.style, "gryskar");
      assert.ok(unit.abilities.some((ability) => ability.range > 1 && ability.effects.some((effect) => effect.kind === "damage")));
    }
    play(encounter, chooseCommand, 3000);
    assert.equal(encounter.winner, "party");
  });

  test("na trilha, o Imitador devolve o tipo da última ação da protagonista", () => {
    const { encounter, group } = fight("imitador", { x: 10, y: 17 }, stout());
    const imitador = findUnit(encounter, group[0].id)!;
    assert.deepEqual(imitador.quirks, { mirrors: HERO_ID });
    assert.equal(imitador.style, "tsvirana");

    const script = ["defend", "defend", "attack", "attack", "defend"];
    let turn = 0;
    const log = play(
      encounter,
      (now) => {
        const hero = findUnit(now, HERO_ID)!;
        if (!hero.turn.action) return { type: "endTurn", unitId: HERO_ID };
        const stance = script[turn++ % script.length];
        return { type: "ability", unitId: HERO_ID, abilityId: `espadachim.${stance}`, target: stance === "defend" ? hero.pos : imitador.pos };
      },
      60,
    );

    const stanceOf = (id: string | undefined) => id?.slice(id.lastIndexOf(".") + 1);
    const answers = log.flatMap(({ event, habit }) => {
      if (event.type !== "abilityUsed" || event.unit !== imitador.id || event.reaction) return [];
      const ability = imitador.abilities.find((candidate) => candidate.id === event.abilityId)!;
      return ability.cost === "action" && habit?.last !== undefined ? [[stanceOf(habit.last), stanceOf(ability.id)]] : [];
    });
    assert.ok(answers.length >= 4, `só ${answers.length} respostas`);
    for (const [hers, his] of answers) assert.equal(his, hers);
    assert.deepEqual([...new Set(answers.map(([hers]) => hers))].sort(), ["attack", "defend"]);
  });

  test("na trilha, a luta com o Imitador não se perde: ela para no lugar da derrota", () => {
    const { encounter, events, cues } = fight("imitador", { x: 10, y: 17 }, stout(3));
    const mercy = cues.find((cue) => cue.when.kind === "defeat");
    assert.ok(mercy, "a luta com o Imitador deveria ter uma deixa no lugar da derrota");

    const log = [...events, ...play(encounter, (now) => ({ type: "endTurn", unitId: activeUnit(now)!.id })).map(({ event }) => event)];
    assert.equal(findUnit(encounter, HERO_ID)!.currentHp, 0);
    assert.equal(encounter.stopped, true);
    assert.equal(encounter.winner, undefined);
    assert.deepEqual(log.slice(-2), [{ type: "cue", id: mercy.id }, { type: "battleEnded" }]);
  });
}
