import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AREAS, isActive, markVisited, newGame, parseSave, parseTiledMap, serializeSave, travelRoute, travelSpots, worldLinks, type AreaMap } from "../../index";
import { makeCharacter } from "../../tactics/__tests__/helpers";

/** O grafo das áreas (pelas saídas de verdade dos mapas) e a viagem entre as já pisadas. */

const PUBLIC_DIR = new URL("../../../client/public/", import.meta.url);
const maps: Record<string, AreaMap> = Object.fromEntries(
  Object.keys(AREAS).map((id) => [id, parseTiledMap(JSON.parse(readFileSync(new URL(AREAS[id].map, PUBLIC_DIR), "utf8")))]),
);
const story = (flags: Record<string, unknown>) => (exit: Parameters<typeof isActive>[0]) => isActive(exit, (name) => flags[name]);

test("no ato 1, Ybytuguá e os baixios se ligam; a floresta só abre no ato 2", () => {
  const act1 = worldLinks(maps, story({})).map((link) => `${link.from}>${link.to}`);
  assert.ok(act1.includes("ybytugua>baixios") && act1.includes("baixios>ybytugua"));
  assert.ok(!act1.includes("ybytugua>floresta"));
  const act2 = worldLinks(maps, story({ ato2: true })).map((link) => `${link.from}>${link.to}`);
  assert.ok(act2.includes("ybytugua>floresta"));
});

test("o caminho vai de saída em saída e chega pelo ponto da última", () => {
  const route = travelRoute(maps, "baixios", "floresta", story({ ato2: true }))!;
  assert.deepEqual(route.map((exit) => exit.area), ["ybytugua", "floresta"]);
  assert.equal(travelRoute(maps, "baixios", "floresta", story({})), undefined, "a estrada fechada não liga nada");
  assert.deepEqual(travelRoute(maps, "baixios", "baixios", story({})), []);
});

test("só se viaja pra onde já se esteve, e só passando pelo que já se viu", () => {
  const open = story({ ato2: true });
  assert.deepEqual(travelSpots(maps, "baixios", ["ybytugua", "baixios"], open), [{ area: "ybytugua", spawn: "from_baixios", steps: 1 }]);
  // A floresta foi vista, mas Ybytuguá não: não se atravessa sem ver.
  assert.deepEqual(travelSpots(maps, "baixios", ["baixios", "floresta"], open), []);
  const all = travelSpots(maps, "baixios", ["ymonha", "ybytugua", "baixios", "floresta"], open);
  assert.deepEqual(all.map((spot) => [spot.area, spot.steps]), [["ymonha", 3], ["ybytugua", 1], ["floresta", 2]]);
});

test("as áreas pisadas vão no save, e o save de antes começa sem nenhuma", () => {
  const save = newGame(makeCharacter("hero"));
  markVisited(save, "ymonha");
  markVisited(save, "ymonha");
  markVisited(save, "ybytugua");
  const back = parseSave(serializeSave(save));
  assert.ok(back.ok);
  assert.deepEqual(back.ok && back.save.visited, ["ymonha", "ybytugua"]);
  const { visited: _gone, ...old } = save;
  const older = parseSave(JSON.stringify(old));
  assert.deepEqual(older.ok && older.save.visited, []);
});
