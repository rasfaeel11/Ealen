import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createProtagonist,
  fights,
  joinParty,
  leaveParty,
  partyCondition,
  presentCompanions,
  restoreParty,
  supportOf,
  type PartyMember,
} from "../../party";
import { addItemToInventory, fieldUseRefusal, findInventorySlot, useItemInField } from "../../inventoryEffects";
import { findItemTemplate } from "../../mock/items";
import { activeUnit, applyCommand, chooseCommand, findUnit, planTurn, type Encounter } from "../../tactics";
import { samePos, tileAt } from "../../tactics/grid";
import {
  AREAS,
  FOLLOW_GAP,
  extendTrail,
  fightCues,
  grantEncounterRewards,
  parseTiledMap,
  pixelOfTile,
  placeParty,
  standAreaProps,
  startAreaEncounter,
  stepToward,
  syncPartyFromEncounter,
  tileOfPixel,
  trailPoint,
  type Trail,
} from "../index";

/** O grupo no mundo de verdade: os mapas são os do jogo (client/public/maps). */
const PUBLIC_DIR = new URL("../../../client/public/", import.meta.url);

function loadArea(areaId: string) {
  const map = parseTiledMap(JSON.parse(readFileSync(new URL(AREAS[areaId].map, PUBLIC_DIR), "utf8")));
  return { map, props: standAreaProps(map) };
}

function makeParty(level = 1) {
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  joinParty(members, "lish", level);
  joinParty(members, "varel", level);
  return { hero, members, company: presentCompanions(members) };
}

test("a protagonista é Halmira, com mochila; companheiro entra sem mochila e no nível pedido", () => {
  const { hero, company } = makeParty(4);
  assert.equal(hero.name, "Halmira");
  assert.equal(hero.race, "miraven");
  assert.ok(hero.inventory);
  assert.equal(createProtagonist("rachador").characterClass, "rachador");

  assert.deepEqual(company.map((character) => character.name), ["Lish", "Varel"]);
  for (const character of company) {
    assert.equal(character.level, 4);
    assert.equal(character.currentHp, character.maxHp);
    assert.equal(character.inventory, undefined);
    assert.notEqual(character.id, hero.id);
  }
});

test("o rastro leva cada companheiro pra um ponto atrás do personagem, pelo caminho que ele fez", () => {
  const trail: Trail = [{ x: 0, y: 0 }];
  // Sem ter andado, todo mundo está no mesmo ponto.
  assert.deepEqual(trailPoint(trail, FOLLOW_GAP), { x: 0, y: 0 });

  // Vinte pra leste, depois vinte pro sul: quem segue dobra a esquina, não corta.
  for (let x = 1; x <= 20; x++) extendTrail(trail, { x, y: 0 }, 60);
  for (let y = 1; y <= 20; y++) extendTrail(trail, { x: 20, y }, 60);
  assert.deepEqual(trailPoint(trail, 5), { x: 20, y: 15 });
  assert.deepEqual(trailPoint(trail, 30), { x: 10, y: 0 });
  // Parado no mesmo lugar, o rastro não cresce.
  const length = trail.length;
  extendTrail(trail, { x: 20, y: 20 }, 60);
  assert.equal(trail.length, length);

  // O que ficou mais longe do que o último da fila precisa é cortado.
  for (let y = 21; y <= 200; y++) extendTrail(trail, { x: 20, y }, 30);
  assert.ok(trail.length <= 32);
  assert.deepEqual(trailPoint(trail, 500), trail[trail.length - 1]);

  assert.deepEqual(stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 4), { x: 4, y: 0 });
  assert.deepEqual(stepToward({ x: 0, y: 0 }, { x: 3, y: 0 }, 4), { x: 3, y: 0 });
});

test("cada companheiro entra na luta num quadrado livre: o dele se der, senão o mais perto do personagem", () => {
  const { map } = loadArea("estrada");
  const { hero, company } = makeParty();
  const wolves = map.enemies.filter((enemy) => enemy.group === "lobos");
  const wolfTile = tileOfPixel(map, wolves[0]);
  const heroTile = { x: wolfTile.x - 3, y: wolfTile.y };
  const taken = wolves.map((enemy) => tileOfPixel(map, enemy));

  // Lish vinha em cima do personagem e Varel em cima de um lobo: nenhum dos dois pode ficar onde está.
  const party = placeParty(
    map,
    hero,
    heroTile,
    [
      { character: company[0], at: pixelOfTile(map, heroTile) },
      { character: company[1], at: pixelOfTile(map, wolfTile) },
    ],
    taken,
  );
  assert.equal(party.length, 3);
  assert.deepEqual(party[0], { character: hero, tile: heroTile });
  const tiles = party.map((fighter) => fighter.tile);
  for (const [index, tile] of tiles.entries()) {
    assert.equal(tileAt(map.grid, tile)!.blocksMove, false);
    assert.ok(!taken.some((other) => samePos(other, tile)));
    assert.ok(!tiles.some((other, at) => at !== index && samePos(other, tile)));
  }

  // Quem vinha num quadrado bom fica nele.
  const free = { x: heroTile.x - 2, y: heroTile.y };
  assert.equal(tileAt(map.grid, free)!.blocksMove, false);
  const [, kept] = placeParty(map, hero, heroTile, [{ character: company[0], at: pixelOfTile(map, free) }], taken);
  assert.deepEqual(kept.tile, free);
});

test("o grupo luta junto até o fim; quem cai numa vitória se levanta com 1 de vida e todos ganham o XP inteiro", () => {
  const { map, props } = loadArea("estrada");
  const { hero, members, company } = makeParty();
  const wolves = map.enemies.filter((enemy) => enemy.group === "lobos");
  const wolfTile = tileOfPixel(map, wolves[0]);
  const heroTile = { x: wolfTile.x - 3, y: wolfTile.y };
  const party = placeParty(
    map,
    hero,
    heroTile,
    company.map((character) => ({ character, at: pixelOfTile(map, heroTile) })),
    wolves.map((enemy) => tileOfPixel(map, enemy)),
  );

  const { encounter } = startAreaEncounter(map, party, wolves, 11, props);
  assert.equal(encounter.units.filter((unit) => unit.team === "party").length, 3);
  for (let i = 0; i < 3000 && !encounter.winner; i++) {
    assert.equal(applyCommand(encounter, chooseCommand(encounter)).ok, true);
  }
  assert.equal(encounter.winner, "party");

  // Faz de conta que Lish caiu no último golpe.
  findUnit(encounter, company[0].id)!.currentHp = 0;
  syncPartyFromEncounter(encounter, [hero, ...company], true);
  assert.equal(company[0].currentHp, 1);
  assert.equal(hero.currentHp, findUnit(encounter, hero.id)!.currentHp);

  const rewards = grantEncounterRewards(
    hero,
    ["encounter-lobo-de-bruma", "encounter-lobo-de-bruma", "encounter-servo-enferrujado", "encounter-servo-enferrujado"],
    { rngState: 1 },
    [],
    company,
  );
  assert.equal(rewards.xpGained, 140);
  assert.equal(rewards.levelUp.leveledUp, true);
  assert.deepEqual(rewards.companionLevels, [
    { name: "Lish", level: 2 },
    { name: "Varel", level: 2 },
  ]);
  assert.equal(company[0].inventory, undefined);

  // Numa derrota a ficha fica como a luta deixou, e o descanso levanta todo mundo.
  findUnit(encounter, company[1].id)!.currentHp = 0;
  syncPartyFromEncounter(encounter, [hero, ...company], false);
  assert.equal(company[1].currentHp, 0);
  restoreParty(hero, members);
  for (const character of [hero, ...company]) assert.equal(character.currentHp, character.maxHp);
});

test("uma condição de mapa pode perguntar pelo grupo: party:lish vale enquanto ele anda junto", () => {
  const { members } = makeParty();
  assert.equal(partyCondition("party:lish", members), true);
  leaveParty(members, "lish");
  assert.equal(partyCondition("party:lish", members), false);
  assert.equal(partyCondition("party:lish", []), false);
  // O que não pergunta pelo grupo, ou pergunta por quem não existe, fica pra história responder (ou pro teste acusar).
  assert.equal(partyCondition("sentinela_fora", members), undefined);
  assert.equal(partyCondition("party:ninguem", members), undefined);
});

test("quem acompanha sem lutar entra na luta como apoio, não como unidade", () => {
  const { map, props } = loadArea("clareira");
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  joinParty(members, "lish", 1);
  joinParty(members, "gil", 1);
  const [lish, gil] = presentCompanions(members);
  assert.equal(fights(lish), true);
  assert.equal(fights(gil), false);
  assert.equal(fights(hero), true);
  assert.equal(supportOf(gil), "annotate");

  const heroTile = tileOfPixel(map, map.spawns.default);
  const group = map.enemies.filter((enemy) => enemy.group === "fiapo");
  const party = placeParty(map, hero, heroTile, [{ character: lish, at: pixelOfTile(map, { x: heroTile.x - 1, y: heroTile.y }) }]);
  // Passar quem luta entre os que só olham não o tira da luta nem faz dele apoio.
  const { encounter } = startAreaEncounter(map, party, group, 5, props, undefined, [], [gil, lish]);

  assert.deepEqual(encounter.supporters, [{ id: gil.id, name: "Gil", support: "annotate", ready: true }]);
  assert.equal(findUnit(encounter, gil.id), undefined);
  assert.ok(findUnit(encounter, lish.id));

  // Fora da luta ele é do grupo como os outros: a vitória devolve as fichas e paga o XP sem tropeçar nele.
  const before = gil.currentHp;
  syncPartyFromEncounter(encounter, [hero, lish, gil], true);
  assert.equal(gil.currentHp, before);
  const rewards = grantEncounterRewards(hero, group.map((enemy) => enemy.creature), { rngState: 1 }, [], [lish, gil]);
  assert.ok(rewards.xpGained > 0);
});

test("o estilo e o que cada um sabe além do kit vêm do elenco e do bestiário, a cada luta", () => {
  const { map, props } = loadArea("ruinas");
  const hero = createProtagonist("rachador");
  const members: PartyMember[] = [];
  joinParty(members, "lish", 1);
  joinParty(members, "varel", 1);
  const [lish, varel] = presentCompanions(members);

  const group = map.enemies.filter((enemy) => enemy.group === "salao");
  const servant = group.find((enemy) => enemy.creature === "encounter-servo-enferrujado")!;
  const heroTile = { x: 17, y: 20 };
  const party = placeParty(map, hero, heroTile, [lish, varel].map((character) => ({ character, at: pixelOfTile(map, heroTile) })));
  const { encounter, events } = startAreaEncounter(map, party, group, 9, props, undefined, [], [], {
    [lish.id]: ["wounded_arm"],
  });

  // Halmira é Maré III com qualquer Ordem: o estilo é dela, não do kit.
  const unit = (id: string) => findUnit(encounter, id)!;
  assert.deepEqual([unit(hero.id).style, unit(hero.id).grade], ["mare", 3]);
  assert.equal(unit(hero.id).characterClass, "rachador");
  assert.deepEqual([unit(lish.id).style, unit(lish.id).grade], ["vies", 3]);
  assert.equal(unit(varel.id).style, undefined);
  assert.ok(unit(varel.id).abilities.some((ability) => ability.id === "gift.tide_pull"));
  assert.ok(!unit(lish.id).abilities.some((ability) => ability.id === "gift.tide_pull"));
  assert.deepEqual([unit(servant.id).style, unit(servant.id).grade], ["baluarte", 2]);

  // O que a história pôs em Lish entra com ele, e fica.
  assert.ok(events.some((event) => event.type === "statusApplied" && event.target === lish.id && event.statusId === "wounded_arm"));
  assert.deepEqual(unit(lish.id).statuses.map((status) => status.id), ["wounded_arm"]);
});

/** Passa a vez de todo mundo até chegar a de `id`. */
function waitFor(encounter: Encounter, id: string): void {
  for (let turns = 0; activeUnit(encounter)!.id !== id; turns++) {
    assert.ok(turns < 20, `a vez de ${id} não chegou`);
    applyCommand(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  }
}

const strikes = (encounter: Encounter) => {
  const plan = planTurn(encounter);
  return [plan.action, plan.bonus].some((choice) => choice?.ability.effects.some((effect) => effect.kind === "damage"));
};

test("o fiscal da Companhia é Baluarte e só levanta a espada pra quem insiste três turnos seguidos", () => {
  const { map, props } = loadArea("estrada");
  const hero = createProtagonist();
  const group = map.enemies.filter((enemy) => enemy.group === "fiscais");
  assert.equal(group.length, 2);
  const [fiscal] = group;
  const tile = tileOfPixel(map, fiscal);
  const { encounter } = startAreaEncounter(map, [{ character: hero, tile: { x: tile.x + 1, y: tile.y } }], group, 4, props);

  const unit = findUnit(encounter, fiscal.id)!;
  assert.deepEqual([unit.style, unit.grade, unit.quirks], ["baluarte", 3, { retaliates: 3 }]);

  waitFor(encounter, fiscal.id);
  assert.equal(strikes(encounter), false, "ao primeiro empurrão ele não revida");
  findUnit(encounter, hero.id)!.habit = { repeated: true, attackTurns: 3 };
  assert.equal(strikes(encounter), true);
});

test("Taevel é Maré como Halmira e devolve o tipo da última coisa que ela fez", () => {
  const { map, props } = loadArea("estrada");
  const hero = createProtagonist();
  const group = map.enemies.filter((enemy) => enemy.group === "primos");
  const taevel = group.find((enemy) => enemy.creature === "encounter-taevel")!;
  const tile = tileOfPixel(map, taevel);
  const { encounter } = startAreaEncounter(map, [{ character: hero, tile: { x: tile.x + 1, y: tile.y } }], group, 4, props);

  const unit = findUnit(encounter, taevel.id)!;
  // No bestiário ele copia "hero"; na luta, o id dela.
  assert.deepEqual([unit.style, unit.grade, unit.quirks], ["mare", 3, { mirrors: hero.id }]);
  assert.equal(findUnit(encounter, hero.id)!.style, "mare");

  waitFor(encounter, taevel.id);
  const heroUnit = findUnit(encounter, hero.id)!;
  heroUnit.habit = { last: `${hero.characterClass}.defend`, repeated: false, attackTurns: 0 };
  assert.equal(planTurn(encounter).action?.ability.id, "guardiao.defend");
  heroUnit.habit = { last: `${hero.characterClass}.heavy_attack`, repeated: false, attackTurns: 1 };
  assert.equal(planTurn(encounter).action?.ability.id, "guardiao.heavy_attack");

  // A luta com ele para sozinha; a deixa da queda de Lish só entra com Lish na luta.
  const cues = map.cues.filter((cue) => cue.group === "primos");
  assert.equal(fightCues(map, cues, group, [hero.id]).length, 1);
  const members: PartyMember[] = [];
  const lish = joinParty(members, "lish", 1)!;
  const withLish = fightCues(map, cues, group, [hero.id, lish.id]);
  assert.equal(withLish.length, 2);
  assert.ok(withLish.every((cue) => cue.ends === "stop"));
});

test("fora de luta, um item da mochila de Halmira cura qualquer um do grupo — e só o que cura se usa assim", () => {
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  const lish = joinParty(members, "lish", 1)!;
  addItemToInventory(hero, findItemTemplate("item-brasa-de-forjardente")!);
  addItemToInventory(hero, findItemTemplate("item-pao-de-cinza")!);
  const tears = findInventorySlot(hero, "item-lagrima-de-eir")!.quantity;

  // Em quem está inteiro não se gasta nada.
  assert.equal(fieldUseRefusal(hero, "item-lagrima-de-eir", lish), "no_effect");
  assert.deepEqual(useItemInField(hero, "item-lagrima-de-eir", lish), { ok: false, reason: "no_effect" });
  assert.equal(findInventorySlot(hero, "item-lagrima-de-eir")!.quantity, tears);

  lish.currentHp = 1;
  assert.deepEqual(useItemInField(hero, "item-lagrima-de-eir", lish), { ok: true, healed: 15 });
  assert.equal(lish.currentHp, 16);
  assert.equal(findInventorySlot(hero, "item-lagrima-de-eir")?.quantity ?? 0, tears - 1);

  // O que dá atributo dura turnos: fora de luta não há turno.
  hero.currentHp = 1;
  assert.deepEqual(useItemInField(hero, "item-brasa-de-forjardente", hero), { ok: false, reason: "only_in_combat" });
  assert.equal(findInventorySlot(hero, "item-brasa-de-forjardente")!.quantity, 1);
  assert.deepEqual(useItemInField(hero, "item-nao-existe", hero), { ok: false, reason: "item_unavailable" });

  // Um item com cargas gasta uma por vez, e a cura não passa do máximo.
  assert.deepEqual(useItemInField(hero, "item-pao-de-cinza", hero), { ok: true, healed: 8 });
  assert.equal(findInventorySlot(hero, "item-pao-de-cinza")!.item.data.usesRemaining, 1);
  hero.currentHp = hero.maxHp - 3;
  assert.deepEqual(useItemInField(hero, "item-pao-de-cinza", hero), { ok: true, healed: 3 });
  assert.equal(findInventorySlot(hero, "item-pao-de-cinza"), undefined);
});
