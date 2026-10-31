import assert from "node:assert/strict";
import test from "node:test";
import { applyDifficulty } from "../difficulty";
import type { Unit } from "../types";

const unit = (team: "party" | "enemy", hp: number, invulnerable = false) => ({ team, maxHp: hp, currentHp: hp, invulnerable }) as unknown as Unit;

test("no normal ninguém muda", () => {
  const enemy = unit("enemy", 40);
  applyDifficulty([enemy], "normal");
  assert.equal(enemy.maxHp, 40);
});

test("a dificuldade mexe na vida do outro lado, e deixa o grupo como está", () => {
  const friend = unit("party", 40);
  const easy = unit("enemy", 40);
  const hard = unit("enemy", 40);
  applyDifficulty([friend, easy], "facil");
  applyDifficulty([hard], "dificil");
  assert.equal(friend.maxHp, 40);
  assert.equal(easy.maxHp, 28);
  assert.equal(easy.currentHp, 28);
  assert.equal(hard.maxHp, 54);
  assert.equal(hard.currentHp, 54);
});

test("quem não tem vida pra perder não muda", () => {
  const beast = unit("enemy", 99, true);
  applyDifficulty([beast], "dificil");
  assert.equal(beast.maxHp, 99);
});
