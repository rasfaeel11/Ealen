import assert from "node:assert/strict";
import { test } from "node:test";
import "./catalog";
import { HERO_ID, companionId } from "../../party";
import { fightCues } from "../encounters";
import type { AreaCue, AreaEnemy, AreaMap } from "../tiledMap";

/**
 * O roteiro que chega ao motor: uma deixa que espera a queda de quem NÃO está
 * na luta fica de fora — não dispararia nunca.
 */

const MAP = { props: [] } as unknown as AreaMap;
const FOE = { id: "t1", name: "Imitador", creature: "encounter-teste-imitador", group: "primos", x: 0, y: 0 } as unknown as AreaEnemy;

function down(id: string, who: string): AreaCue {
  return { id, group: "primos", when: { kind: "down", who }, ends: "stop" };
}

test("a deixa que espera um companheiro cair só vale se ele está lutando", () => {
  const cues = [down("jarupa_cai", "party:jarupa"), down("imitador_cai", "Imitador"), down("ela_cai", "hero")];
  const ids = (party: string[]) => fightCues(MAP, cues, [FOE], party).map((cue) => cue.id);

  // Jarupã no grupo e na luta: a deixa dele entra, com o id da unidade.
  assert.deepEqual(ids([HERO_ID, companionId("jarupa")]), ["jarupa_cai", "imitador_cai", "ela_cai"]);
  assert.deepEqual(fightCues(MAP, cues, [FOE], [HERO_ID, companionId("jarupa")])[0].when, { kind: "down", unit: companionId("jarupa") });

  // Jarupã fora do grupo (ou só Oryndu acompanhando, que não luta): a deixa não vai pro motor.
  assert.deepEqual(ids([HERO_ID]), ["imitador_cai", "ela_cai"]);
  // E o inimigo que não entrou nesta luta também não.
  assert.deepEqual(fightCues(MAP, cues, [], [HERO_ID]).map((cue) => cue.id), ["ela_cai"]);
});
