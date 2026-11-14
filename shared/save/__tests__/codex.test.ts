import assert from "node:assert/strict";
import { test } from "node:test";
import { codexCreatures, codexPeople, emptyCodex, noteFight, notePerson, readCodex } from "../../codex";
import { createProtagonist } from "../../party";
import { newGame, parseSave, serializeSave } from "../gameSave";

test("o códice anota quem o grupo enfrentou, quantas vezes e onde, e quem caiu", () => {
  const codex = emptyCodex();
  noteFight(codex, "ymonha", ["encounter-guarda-do-pedagio", "encounter-guarda-do-pedagio", "encounter-besteiro-do-pedagio"], ["encounter-guarda-do-pedagio", "encounter-guarda-do-pedagio"]);
  noteFight(codex, "floresta", ["encounter-guarda-do-pedagio", "encounter-que-nao-existe"], []);
  assert.deepEqual(codex.creatures["encounter-guarda-do-pedagio"], { met: 2, beaten: 2, areas: ["ymonha", "floresta"] });
  assert.deepEqual(codex.creatures["encounter-besteiro-do-pedagio"], { met: 1, beaten: 0, areas: ["ymonha"] });
  assert.equal(codex.creatures["encounter-que-nao-existe"], undefined, "o que não está no bestiário não entra");

  const [guarda] = codexCreatures(codex);
  assert.equal(guarda.name, "Guarda do pedágio");
  assert.equal(guarda.weapon, "Chuço");
  assert.deepEqual(guarda.arts.slice(0, 2), ["Ponta do Chuço", "Chuçada"], "os golpes, com os nomes do registro da luta");
  assert.deepEqual(guarda.areas, ["O Ymonhã, no castelo de pedágio", "A floresta entre as bacias"]);
});

test("o códice anota quem falou e onde, menos quem conta a história", () => {
  const codex = emptyCodex();
  notePerson(codex, "Endyru", "ymonha", "Endyru");
  notePerson(codex, "Sargento do pedágio", "ymonha", "Endyru");
  notePerson(codex, "Sargento do pedágio", "ymonha", "Endyru");
  notePerson(codex, "Oryndu", "ymonha", "Endyru");
  notePerson(codex, "Oryndu", "baixios", "Endyru");
  assert.deepEqual(codexPeople(codex), [
    { name: "Sargento do pedágio", areas: ["O Ymonhã, no castelo de pedágio"] },
    { name: "Oryndu", areas: ["O Ymonhã, no castelo de pedágio", "Os baixios"] },
  ]);
});

test("o códice vai e volta no save, e o save de antes começa com ele vazio", () => {
  const save = newGame(createProtagonist());
  noteFight(save.codex, "ymonha", ["encounter-guarda-do-pedagio"], ["encounter-guarda-do-pedagio"]);
  notePerson(save.codex, "Mercador", "ymonha", save.character.name);
  const parsed = parseSave(serializeSave(save));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.save.codex, save.codex);

  const old = JSON.parse(serializeSave(save));
  delete old.codex;
  const before = parseSave(JSON.stringify(old));
  assert.ok(before.ok);
  assert.deepEqual(before.save.codex, emptyCodex());

  assert.deepEqual(readCodex({ creatures: { "encounter-guarda-do-pedagio": { met: -1, beaten: "x", areas: ["ymonha", "lugar-nenhum"] } } }).creatures["encounter-guarda-do-pedagio"], {
    met: 0,
    beaten: 0,
    areas: ["ymonha"],
  });
});
