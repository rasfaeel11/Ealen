import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { attributePoints, autoRaise, raiseAttribute } from "../../leveling";
import { createProtagonist, joinParty, raiseToLevel, type PartyMember } from "../../party";

/** Os pontos de atributo (ver ../../leveling.ts). */

test("cada nível depois do primeiro dá um ponto de atributo, e pôr um gasta um", () => {
  const character = createProtagonist();
  assert.equal(attributePoints(character), 0);
  assert.equal(raiseAttribute(character, "olho"), false);
  raiseToLevel(character, 3);
  assert.equal(attributePoints(character), 2);
  const olho = character.attributes.olho;
  assert.equal(raiseAttribute(character, "olho"), true);
  assert.equal(character.attributes.olho, olho + 1);
  assert.deepEqual(character.raised, { olho: 1 });
  assert.equal(attributePoints(character), 1);
});

test("o ponto em Vigor dá vida na hora", () => {
  const character = createProtagonist();
  raiseToLevel(character, 2);
  const { maxHp, currentHp } = character;
  raiseAttribute(character, "vigor");
  assert.equal(character.maxHp, maxHp + 3);
  assert.equal(character.currentHp, currentHp + 3);
});

test("quem escolhe sozinho reveza entre os atributos da classe", () => {
  const members: PartyMember[] = [];
  const jarupa = joinParty(members, "jarupa", 4);
  assert.ok(jarupa);
  assert.deepEqual(autoRaise(jarupa), ["forca", "olho", "forca"]);
  assert.equal(attributePoints(jarupa), 0);
  assert.deepEqual(autoRaise(jarupa), []);
});
