import assert from "node:assert/strict";
import { maxBreath } from "../../breath";
import { maxMana } from "../../mana";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  PROTAGONIST,
  createProtagonist,
  fights,
  joinParty,
  keepsVow,
  leaveParty,
  partyCondition,
  presentCompanions,
  restoreParty,
  supportOf,
  type PartyMember,
} from "../../party";
import { applyCommand, chooseCommand, findUnit } from "../../tactics";
import { samePos, tileAt } from "../../tactics/grid";
import {
  AREAS,
  FOLLOW_GAP,
  ambushableGroup,
  engrave,
  engravable,
  engravingSlots,
  extendTrail,
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
  joinParty(members, "jarupa", level);
  joinParty(members, "xandui", level);
  return { hero, members, company: presentCompanions(members) };
}

test("o protagonista é Endyru, mago de atração e repulsão, com mochila; companheiro entra sem mochila e no nível pedido", () => {
  const { hero, company } = makeParty(4);
  assert.deepEqual([hero.name, hero.race, hero.characterClass], ["Endyru", "humano", "atracao_repulsao"]);
  assert.deepEqual(PROTAGONIST.magic, { concept: "atracao_repulsao", level: 3 });
  assert.equal(PROTAGONIST.style, undefined);
  assert.ok(hero.inventory);
  assert.deepEqual(hero.equipment, { weapon: "gear-bordao", armor: "gear-tunica-de-linho" });

  assert.deepEqual(company.map((character) => [character.name, character.characterClass]), [
    ["Jarupã", "espadachim"],
    ["Xanduí", "espadachim"],
  ]);
  assert.deepEqual(company.map((character) => character.equipment?.weapon), ["gear-espada-pesada", "gear-espada-reta"]);
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

  // Jarupã vinha em cima do personagem e Xanduí em cima de um lobo: nenhum dos dois pode ficar onde está.
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

  // Faz de conta que Jarupã caiu no último golpe.
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
  // Subir de nível não ensina Técnica a ninguém do trio: as do mago chegam com o Círculo (`mage_rise`), e o
  // espadachim não tem nenhuma (o golpe-selo é por iniciação).
  assert.deepEqual(rewards.levelUp.leveledUp && rewards.levelUp.learned?.map((ability) => ability.name), []);
  assert.deepEqual(
    rewards.companionLevels.map(({ name, level, learned }) => ({ name, level, learned: learned.map((ability) => ability.name) })),
    [
      { name: "Jarupã", level: 2, learned: [] },
      { name: "Xanduí", level: 2, learned: [] },
    ],
  );
  assert.equal(company[0].inventory, undefined);

  // Numa derrota a ficha fica como a luta deixou, e o descanso levanta todo mundo.
  findUnit(encounter, company[1].id)!.currentHp = 0;
  syncPartyFromEncounter(encounter, [hero, ...company], false);
  assert.equal(company[1].currentHp, 0);
  hero.breath = 0;
  hero.mana = 0;
  restoreParty(hero, members);
  for (const character of [hero, ...company]) assert.equal(character.currentHp, character.maxHp);
  for (const character of [hero, ...company]) assert.equal(character.breath, maxBreath(character));
  // Só quem conjura tem mana pra encher.
  assert.equal(hero.mana, maxMana(hero, PROTAGONIST.magic!));
  for (const character of company) assert.equal(character.mana, undefined);
});

test("uma condição de mapa pode perguntar pelo grupo: party:jarupa vale enquanto ele anda junto", () => {
  const { members } = makeParty();
  assert.equal(partyCondition("party:jarupa", members), true);
  leaveParty(members, "jarupa");
  assert.equal(partyCondition("party:jarupa", members), false);
  assert.equal(partyCondition("party:jarupa", []), false);
  // O que não pergunta pelo grupo, ou pergunta por quem não existe, fica pra história responder (ou pro teste acusar).
  assert.equal(partyCondition("sentinela_fora", members), undefined);
  assert.equal(partyCondition("party:ninguem", members), undefined);
});

test("quem acompanha sem lutar entra na luta como apoio, não como unidade", () => {
  const { map, props } = loadArea("clareira");
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  joinParty(members, "jarupa", 1);
  joinParty(members, "oryndu", 1);
  const [jarupa, oryndu] = presentCompanions(members);
  assert.equal(fights(jarupa), true);
  assert.equal(fights(oryndu), false);
  assert.equal(fights(hero), true);
  assert.equal(supportOf(oryndu), "read_water");
  // Quem não luta não veste nada pra luta.
  assert.equal(oryndu.equipment, undefined);

  const heroTile = tileOfPixel(map, map.spawns.default);
  const group = map.enemies.filter((enemy) => enemy.group === "fiapo");
  const party = placeParty(map, hero, heroTile, [{ character: jarupa, at: pixelOfTile(map, { x: heroTile.x - 1, y: heroTile.y }) }]);
  // Passar quem luta entre os que só olham não o tira da luta nem faz dele apoio.
  const { encounter } = startAreaEncounter(map, party, group, 5, props, undefined, [], [oryndu, jarupa]);

  assert.deepEqual(encounter.supporters, [{ id: oryndu.id, name: "Oryndu", support: "read_water", ready: true }]);
  assert.equal(findUnit(encounter, oryndu.id), undefined);
  assert.ok(findUnit(encounter, jarupa.id));

  // Fora da luta ele é do grupo como os outros: a vitória devolve as fichas e paga o XP sem tropeçar nele.
  const before = oryndu.currentHp;
  syncPartyFromEncounter(encounter, [hero, jarupa, oryndu], true);
  assert.equal(oryndu.currentHp, before);
  const rewards = grantEncounterRewards(hero, group.map((enemy) => enemy.creature), { rngState: 1 }, [], [jarupa, oryndu]);
  assert.ok(rewards.xpGained > 0);
});

test("a escola, a aura e a magia vêm do elenco e do bestiário, a cada luta", () => {
  const { map, props } = loadArea("ruinas");
  const hero = createProtagonist();
  const members: PartyMember[] = [];
  joinParty(members, "jarupa", 1);
  joinParty(members, "xandui", 1);
  const [jarupa, xandui] = presentCompanions(members);

  const group = map.enemies.filter((enemy) => enemy.group === "salao");
  const servant = group.find((enemy) => enemy.creature === "encounter-servo-enferrujado")!;
  const heroTile = { x: 17, y: 20 };
  const party = placeParty(map, hero, heroTile, [jarupa, xandui].map((character) => ({ character, at: pixelOfTile(map, heroTile) })));
  const { encounter, events } = startAreaEncounter(map, party, group, 9, props, undefined, [], [], {
    [jarupa.id]: ["wounded_arm"],
  });

  // Jarupã é do Gryskar e Xanduí da Ipojy, os dois com aura no Fio; Endyru não tem escola, tem mana.
  const unit = (id: string) => findUnit(encounter, id)!;
  assert.deepEqual([unit(jarupa.id).style, unit(jarupa.id).grade, unit(jarupa.id).aura], ["gryskar", 2, 2]);
  assert.deepEqual([unit(xandui.id).style, unit(xandui.id).grade, unit(xandui.id).aura], ["ipojy", 2, 2]);
  assert.equal(unit(hero.id).style, undefined);
  assert.deepEqual([unit(hero.id).mana, unit(hero.id).manaLimit, unit(hero.id).concept], [maxMana(hero, PROTAGONIST.magic!), 3, "atracao_repulsao"]);
  assert.equal(unit(jarupa.id).mana, undefined);
  // Ninguém do trio tem habilidade própria além do kit.
  for (const id of [hero.id, jarupa.id, xandui.id]) assert.ok(!unit(id).abilities.some((ability) => ability.id.startsWith("gift.")));
  assert.deepEqual([unit(servant.id).style, unit(servant.id).grade], ["baluarte", 2]);

  // O que a história pôs em Jarupã entra com ele, e fica.
  assert.ok(events.some((event) => event.type === "statusApplied" && event.target === jarupa.id && event.statusId === "wounded_arm"));
  assert.deepEqual(unit(jarupa.id).statuses.map((status) => status.id), ["wounded_arm"]);
});

test("Xanduí guarda o voto da Ipojy fora da luta também: com ela no comando, ninguém embosca", () => {
  const { map } = loadArea("clareira");
  const { hero, company } = makeParty();
  const [jarupa, xandui] = company;
  assert.deepEqual([keepsVow(hero), keepsVow(jarupa), keepsVow(xandui)], [false, false, true]);

  const fiapo = map.enemies.filter((enemy) => enemy.group === "fiapo");
  const near = { x: tileOfPixel(map, fiapo[0]).x - 7, y: tileOfPixel(map, fiapo[0]).y };
  assert.equal(ambushableGroup(map, fiapo, near, hero), "fiapo");
  assert.equal(ambushableGroup(map, fiapo, near, xandui), undefined);
});

test("Endyru grava no descanso até o nível de mago dele, só o que é magia dele; quem não conjura não grava", () => {
  const { hero, company } = makeParty();
  assert.equal(engravingSlots(hero), 3);
  const spells = engravable(hero).map((ability) => ability.id);
  assert.deepEqual(spells.sort(), ["atracao_repulsao.heal", "atracao_repulsao.heavy_attack", "atracao_repulsao.quick_attack"]);

  assert.equal(engrave(hero, "atracao_repulsao.quick_attack"), true);
  assert.equal(engrave(hero, "atracao_repulsao.attack"), false);
  assert.equal(engrave(hero, "atracao_repulsao.quick_attack"), true);
  assert.equal(engrave(hero, "atracao_repulsao.heavy_attack"), true);
  assert.equal(engrave(hero, "atracao_repulsao.heal"), false, "não cabe mais nenhuma");
  assert.deepEqual(hero.engraved, ["atracao_repulsao.quick_attack", "atracao_repulsao.quick_attack", "atracao_repulsao.heavy_attack"]);

  assert.equal(engravingSlots(company[0]), 0);
  assert.equal(engrave(company[0], "espadachim.attack"), false);
});
