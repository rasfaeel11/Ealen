import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_KEYS, DEFAULT_SETTINGS, isReservedKey, keyName, parseSettings, rebound } from "../../src/game/settings";
import { widthForWindow } from "../../src/game/config";

test("sem nada guardado, ou com lixo guardado, as opções ficam no padrão", () => {
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings({ animSpeed: "rápido", voice: 3, keys: "nada" }), DEFAULT_SETTINGS);
});

test("o que foi guardado volta, e o que não foi fica no padrão", () => {
  const read = parseSettings({ voice: false, difficulty: "dificil", keys: { sheet: { code: "KeyP", keyCode: 80 } } });
  assert.equal(read.voice, false);
  assert.equal(read.difficulty, "dificil");
  assert.equal(read.keys.sheet.code, "KeyP");
  assert.equal(read.keys.bag.code, DEFAULT_KEYS.bag.code);
  assert.equal(read.zoom, DEFAULT_SETTINGS.zoom);
});

test("uma tecla de função fixa guardada à mão não entra", () => {
  const read = parseSettings({ keys: { sheet: { code: "Escape", keyCode: 27 } } });
  assert.equal(read.keys.sheet.code, DEFAULT_KEYS.sheet.code);
  assert.ok(isReservedKey("Escape"));
  assert.ok(isReservedKey("Digit4"));
  assert.ok(!isReservedKey("KeyP"));
});

test("trocar pra uma tecla livre só muda aquela ação", () => {
  const keys = rebound(DEFAULT_KEYS, "sheet", { code: "KeyP", keyCode: 80 });
  assert.equal(keys.sheet.code, "KeyP");
  assert.equal(keys.bag.code, DEFAULT_KEYS.bag.code);
});

test("trocar pra uma tecla que já tem dono troca as duas: ninguém fica sem tecla, nem duas ações na mesma", () => {
  const keys = rebound(DEFAULT_KEYS, "sheet", DEFAULT_KEYS.bag);
  assert.equal(keys.sheet.code, DEFAULT_KEYS.bag.code);
  assert.equal(keys.bag.code, DEFAULT_KEYS.sheet.code);
  const codes = Object.values(keys).map((binding) => binding.code);
  assert.equal(new Set(codes).size, codes.length);
});

test("o nome da tecla na tela", () => {
  assert.equal(keyName("KeyQ"), "Q");
  assert.equal(keyName("ShiftLeft"), "Shift");
});

test("a largura interna enche a janela, entre 16:9 e o limite", () => {
  assert.equal(widthForWindow(1920, 1080), 1280);
  assert.equal(widthForWindow(1920, 900), 1536);
  assert.equal(widthForWindow(1024, 768), 1280);
  assert.equal(widthForWindow(3440, 1000), 1728);
});
