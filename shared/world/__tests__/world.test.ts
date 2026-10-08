import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findBestiaryEntry } from "../../mock/bestiary";
import { applyCommand, chooseCommand } from "../../tactics";
import { distance, samePos, stepNeighbors, tileAt, tileIndex, type Pos } from "../../tactics/grid";
import { isPropId } from "../../tactics/props";
import type { Character } from "../../types/character";
import {
  AGGRO_RANGE,
  AREAS,
  STARTING_AREA,
  STARTING_SPAWN,
  aggroedGroup,
  exitAt,
  grantEncounterRewards,
  isBlocked,
  parseTiledMap,
  standAreaProps,
  startAreaEncounter,
  tileOfPixel,
  unusedItems,
  walk,
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

  test(`${areaId}: ninguém chega na área já dentro de uma luta`, () => {
    for (const [name, spawn] of Object.entries(map.spawns)) {
      for (const enemy of map.enemies) {
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
    const { encounter } = startAreaEncounter(map, structuredClone(hero), playerTile, group, 5);
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

    const { encounter } = startAreaEncounter(map, structuredClone(hero), { x: 18, y: 16 }, group, 9);
    for (let i = 0; i < 3000 && !encounter.winner; i++) {
      assert.equal(applyCommand(encounter, chooseCommand(encounter)).ok, true);
    }
    assert.ok(encounter.winner);
  });

  test("a criatura entra na luta com o que carrega, e o que ela não usou fica pra quem vence", () => {
    const map = maps.estrada;
    const servo = { ...map.enemies[0], id: "servo", creature: "encounter-servo-enferrujado" };
    const tile = tileOfPixel(map, servo);
    const { encounter } = startAreaEncounter(map, structuredClone(hero), { x: tile.x - 3, y: tile.y }, [servo], 5);

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
    spawns: {},
    exits: [],
    enemies: [],
    props: [],
  };
  const body = { halfWidth: 4, height: 4 };

  // A coluna da direita é parede: empurrar na diagonal contra ela só anda pra baixo.
  let pos = { x: 27, y: 20 };
  for (let i = 0; i < 20; i++) pos = walk(map, pos, 1, 1, body);

  assert.equal(isBlocked(map, pos, body), false);
  assert.equal(pos.x, 28);
  assert.equal(pos.y, 40);
});
