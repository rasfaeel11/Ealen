import assert from "node:assert/strict";
import { test } from "node:test";
import { PROTAGONIST, joinParty, leaveParty } from "../../party";
import type { Character } from "../../types/character";
import {
  SAVE_VERSION,
  brokenInArea,
  formatPlayTime,
  isDefeated,
  markBroken,
  markDefeated,
  newGame,
  parseSave,
  serializeSave,
  summarizeSave,
  availableOrders,
  emptyProfile,
  parseProfile,
  unlockOrder,
  type GameSave,
} from "../index";

function makeCharacter(): Character {
  return {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass: "luminar",
    level: 3,
    xp: 40,
    attributes: { dain: 5, eir: 5, nath: 5, il: 5, or: 5, len: 5, ul: 5 },
    currentHp: 22,
    maxHp: 30,
    currentNodeId: "",
    inventory: { slots: [], maxSlots: 12 },
  };
}

function read(raw: unknown): GameSave {
  const parsed = parseSave(raw);
  assert.ok(parsed.ok, "o save deveria ser aceito");
  return parsed.save;
}

test("um save vai pra texto e volta igual", () => {
  const save = newGame(makeCharacter());
  save.location = { areaId: "ruinas", x: 120, y: 88 };
  markDefeated(save, "estrada:lobos");
  markBroken(save, ["ruinas:caixote-1"]);
  save.story = '{"flags":true}';
  save.playTimeMs = 90_000;
  save.savedAt = 1_700_000_000_000;
  joinParty(save.companions, "lish", 3);
  joinParty(save.companions, "varel", 3);
  leaveParty(save.companions, "varel");

  assert.deepEqual(read(serializeSave(save)), save);
});

test("jogo novo começa sem lugar, sem nada vencido e na versão atual", () => {
  const save = newGame(makeCharacter());
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.location, null);
  assert.deepEqual(save.defeated, []);
  assert.equal(save.story, null);
});

test("o que não é um save é recusado sem lançar", () => {
  const broken: unknown[] = [
    "{isto não é json",
    "null",
    "[]",
    "42",
    {},
    { version: "2", character: makeCharacter() },
    { version: SAVE_VERSION },
    { version: SAVE_VERSION, character: { ...makeCharacter(), characterClass: "bardo" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), race: "toString" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), level: "3" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), attributes: { dain: 5 } }, story: null },
    { version: SAVE_VERSION, character: makeCharacter(), story: 12 },
    // Versão sem caminho de migração.
    { version: 0, character: makeCharacter() },
  ];
  for (const raw of broken) {
    assert.deepEqual(parseSave(raw), { ok: false, problem: "invalid" }, JSON.stringify(raw));
  }
});

test("save de uma versão mais nova do jogo é recusado com o motivo", () => {
  const raw = { ...newGame(makeCharacter()), version: SAVE_VERSION + 1 };
  assert.deepEqual(parseSave(raw), { ok: false, problem: "newer" });
});

test("save da versão 1 é atualizado, com o que morava em chaves soltas", () => {
  const bare = read({ version: 1, character: makeCharacter() });
  assert.equal(bare.version, SAVE_VERSION);
  assert.equal(bare.location, null);
  assert.deepEqual(bare.defeated, []);
  assert.equal(bare.playTimeMs, 0);

  const full = read({
    version: 1,
    character: makeCharacter(),
    location: { areaId: "estrada", x: 40, y: 56 },
    defeated: ["estrada:lobos"],
    broken: ["estrada:barril-1"],
    story: "{}",
  });
  assert.deepEqual(full.location, { areaId: "estrada", x: 40, y: 56 });
  assert.ok(isDefeated(full, "estrada:lobos"));
  assert.deepEqual([...brokenInArea(full, "estrada")], ["barril-1"]);
  assert.equal(full.story, "{}");
});

test("pedaço mal formado do mundo não estraga o save: volta ao padrão", () => {
  const save = read({
    ...newGame(makeCharacter()),
    location: { areaId: "ruinas", x: "muito" },
    defeated: ["a:b", 7, "a:b", null],
    broken: "tudo",
    playTimeMs: -5,
    savedAt: "ontem",
  });
  assert.equal(save.location, null);
  assert.deepEqual(save.defeated, ["a:b"]);
  assert.deepEqual(save.broken, []);
  assert.equal(save.playTimeMs, 0);
  assert.equal(save.savedAt, 0);
});

test("vencidos e quebrados não se repetem, e os quebrados saem por área", () => {
  const save = newGame(makeCharacter());
  markDefeated(save, "estrada:lobos");
  markDefeated(save, "estrada:lobos");
  assert.deepEqual(save.defeated, ["estrada:lobos"]);
  assert.ok(!isDefeated(save, "ruinas:lobos"));

  markBroken(save, ["ruinas:caixote-1", "estrada:barril-1"]);
  markBroken(save, ["ruinas:caixote-1", "ruinas:barril-2"]);
  assert.deepEqual([...brokenInArea(save, "ruinas")].sort(), ["barril-2", "caixote-1"]);
  assert.deepEqual([...brokenInArea(save, "clareira")], []);
});

test("o resumo diz quem é, onde está e há quanto tempo joga", () => {
  const save = newGame(makeCharacter());
  assert.equal(summarizeSave(save).areaName, "—");

  save.location = { areaId: "clareira", x: 0, y: 0 };
  save.playTimeMs = 2 * 3_600_000 + 5 * 60_000 + 999;
  const summary = summarizeSave(save);
  assert.equal(summary.name, "Herói");
  assert.equal(summary.className, "Luminar");
  assert.equal(summary.level, 3);
  assert.match(summary.areaName, /^Clareira/);
  assert.equal(summary.playTime, "2h 05min");

  assert.equal(formatPlayTime(0), "0min");
  assert.equal(formatPlayTime(47 * 60_000), "47min");
});

test("save da versão 2 ganha um grupo vazio, e companheiro com a ficha estragada fica de fora", () => {
  const { companions: _none, ...old } = newGame(makeCharacter());
  assert.deepEqual(read({ ...old, version: 2 }).companions, []);

  const save = newGame(makeCharacter());
  const lish = joinParty(save.companions, "lish", 1)!;
  const read2 = read({
    ...save,
    companions: [...save.companions, { character: { name: "Sem ficha" }, present: true }, { character: lish, present: true }, "nada"],
  });
  assert.deepEqual(read2.companions, [{ character: lish, present: true }]);
});

test("o perfil guarda as Ordens destravadas, e o que não é um perfil vira um vazio", () => {
  const profile = emptyProfile();
  assert.deepEqual(availableOrders(profile), [PROTAGONIST.characterClass]);
  assert.equal(unlockOrder(profile, "rachador"), true);
  assert.equal(unlockOrder(profile, "rachador"), false);
  // A Ordem que ela já tem não se destrava.
  assert.equal(unlockOrder(profile, PROTAGONIST.characterClass), false);
  assert.deepEqual(availableOrders(parseProfile(JSON.stringify(profile))), [PROTAGONIST.characterClass, "rachador"]);

  for (const raw of [null, "{quebrado", "[]", { orders: "todas" }, 7]) assert.deepEqual(parseProfile(raw), emptyProfile());
  assert.deepEqual(parseProfile({ orders: ["bardo", "luminar", "luminar", PROTAGONIST.characterClass] }), { orders: ["luminar"] });
});
