import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { maxBreath } from "../../breath";
import { createProtagonist, joinParty, raiseToLevel, type PartyMember } from "../../party";
import { SKILL_TREES, branchesFor, findSkill, skillPoints, tweakAbility } from "../../skillTree";
import { unitFromCharacter } from "../../tactics/units";
import type { Ability } from "../../tactics/types";
import { engravingSlots, learnSkill, sheetAbilities } from "../index";

/** A árvore de habilidades (ver ../../skillTree.ts). */

function hero(level: number) {
  const character = createProtagonist();
  raiseToLevel(character, level);
  return character;
}

function companion(key: string, level: number) {
  const members: PartyMember[] = [];
  const character = joinParty(members, key, level);
  assert.ok(character);
  return character;
}

const pull = (abilities: Ability[]) => abilities.find((ability) => ability.id === "atracao_repulsao.quick_attack");

test("cada nível depois do primeiro dá um ponto, e cada nó gasta um", () => {
  const character = hero(3);
  assert.equal(skillPoints(character), 2);
  assert.equal(learnSkill(character, "ar.puxao_longe"), undefined);
  assert.equal(skillPoints(character), 1);
  assert.equal(learnSkill(character, "ar.puxao_longe"), "known");
  assert.equal(learnSkill(character, "ar.empurrao_certo"), undefined);
  assert.equal(learnSkill(character, "ar.leitura_calma"), "points");
  assert.equal(learnSkill(character, "nada"), "unknown");
});

test("dentro do ramo, cada nó pede o anterior e o nível dele", () => {
  const character = hero(2);
  assert.equal(learnSkill(character, "ar.puxao_fundo"), "previous");
  assert.equal(learnSkill(character, "ar.puxao_longe"), undefined);
  raiseToLevel(character, 3);
  assert.equal(learnSkill(character, "ar.puxao_fundo"), undefined);
});

test("o que é do Círculo espera o Círculo", () => {
  const character = hero(6);
  learnSkill(character, "ar.puxao_longe");
  learnSkill(character, "ar.puxao_fundo");
  assert.equal(learnSkill(character, "ar.desarmar_firme"), "mage");
  character.mageLevel = 4;
  assert.equal(learnSkill(character, "ar.desarmar_firme"), undefined);
});

test("o nó melhora a habilidade, na ficha e na luta", () => {
  const character = hero(3);
  const before = pull(sheetAbilities(character));
  assert.ok(before);
  learnSkill(character, "ar.puxao_longe");
  learnSkill(character, "ar.puxao_fundo");
  const after = pull(sheetAbilities(character));
  assert.equal(after?.range, before.range + 1);
  const distance = (ability?: Ability) => ability?.effects.find((effect) => effect.kind === "push");
  assert.deepEqual(distance(after), { kind: "push", distance: -3 });
  const unit = unitFromCharacter(character, { team: "party", pos: { x: 0, y: 0 } });
  assert.equal(pull(unit.abilities)?.range, before.range + 1);
});

test("o corpo: vida na hora, Fôlego, passo e gravação", () => {
  const sword = companion("jarupa", 4);
  const hp = sword.maxHp;
  const breath = maxBreath(sword);
  const speed = unitFromCharacter(sword, { team: "party", pos: { x: 0, y: 0 } }).speed;
  assert.equal(learnSkill(sword, "es.couro_grosso"), undefined);
  assert.equal(sword.maxHp, hp + 4);
  learnSkill(sword, "es.folego_longo");
  assert.equal(maxBreath(sword), breath + 2);
  learnSkill(sword, "es.pe_leve");
  assert.equal(unitFromCharacter(sword, { team: "party", pos: { x: 0, y: 0 } }).speed, speed + 1);

  const mage = hero(4);
  const slots = engravingSlots(mage);
  learnSkill(mage, "ar.leitura_calma");
  learnSkill(mage, "ar.folego_de_estudante");
  learnSkill(mage, "ar.mais_um_texto");
  assert.equal(engravingSlots(mage), slots + 1);
});

test("o ramo da escola é só de quem é dela", () => {
  const jarupa = companion("jarupa", 3);
  const xandui = companion("xandui", 3);
  assert.equal(learnSkill(jarupa, "es.bote_longo"), "school");
  assert.equal(learnSkill(xandui, "es.bote_longo"), undefined);
  const hold = sheetAbilities(xandui).find((ability) => ability.id === "gift.hold_the_lunge");
  assert.deepEqual(hold?.effects, [{ kind: "status", statusId: "held", turns: 3 }]);
  assert.deepEqual(
    branchesFor("espadachim", "gryskar").map((b) => b.id),
    ["lamina", "corpo", "gryskar"],
  );
});

test("o custo nunca cai abaixo de 1, e a recarga zerada some", () => {
  const ability: Ability = { id: "x", name: "x", flavor: "", cost: "action", range: 1, targets: "enemy", effects: [], mana: 1, cooldown: 1 };
  const out = tweakAbility(ability, { mana: -3, cooldown: -1 });
  assert.equal(out.mana, 1);
  assert.equal(out.cooldown, undefined);
});

test("todo nó tem id único e mora no ramo que diz", () => {
  const ids = Object.values(SKILL_TREES).flatMap((branches) => branches.flatMap((b) => b.nodes.map((node) => node.id)));
  assert.equal(new Set(ids).size, ids.length);
  for (const branches of Object.values(SKILL_TREES)) {
    for (const b of branches) for (const node of b.nodes) assert.equal(findSkill(node.id)?.branch, b.id);
  }
});
