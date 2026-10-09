import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  applyCommand,
  basicCommand,
  findUnit,
  gridFromAscii,
  isAlive,
  isOver,
  standProp,
  startEncounter,
  type Cue,
  type Encounter,
  type Pos,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run } from "./helpers";

/** Monta uma luta com roteiro a partir de um desenho; `c` é um caixote, de id "caixote". */
function scripted(
  rows: string[],
  cues: Cue[],
  place: (at: (marker: string) => Pos) => Unit[],
  seed = 1,
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  const props = (markers.c ?? []).map((pos) => standProp(grid, "caixote", "crate", pos));
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), props, cues, seed });
}

/** Dois que não se alcançam: A (do jogador) age primeiro, E depois. */
const apart = (at: (marker: string) => Pos) => [
  makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
  makeUnit("E", "enemy", at("E")),
];

/** Todo mundo passa a vez até a rodada `round` começar (ou a luta acabar). Devolve o que aconteceu. */
function passUntilRound(encounter: Encounter, round: number): TacticalEvent[] {
  const log: TacticalEvent[] = [];
  while (!isOver(encounter) && encounter.round < round) {
    log.push(...run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id }));
  }
  return log;
}

/** A IA de linha de base joga pelos dois lados até a luta acabar. */
function playOut(encounter: Encounter): TacticalEvent[] {
  const log: TacticalEvent[] = [];
  for (let i = 0; i < 3000 && !isOver(encounter); i++) log.push(...run(encounter, basicCommand(encounter)));
  return log;
}

test("a deixa de rodada dispara quando a rodada começa, uma vez só, e a luta segue", () => {
  const { encounter, events } = scripted(["A.........E"], [{ id: "aviso", when: { kind: "round", round: 3 } }], apart);
  assert.equal(eventsOf(events, "cue").length, 0);

  const log = passUntilRound(encounter, 3);
  // Depois de a rodada abrir, antes de a vez de alguém começar.
  const types = log.map((event) => event.type);
  assert.deepEqual(types.slice(types.lastIndexOf("roundStarted")), ["roundStarted", "cue", "turnStarted"]);
  assert.deepEqual(eventsOf(log, "cue"), [{ type: "cue", id: "aviso" }]);

  assert.equal(isOver(encounter), false);
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.equal(eventsOf(passUntilRound(encounter, 6), "cue").length, 0);
  assert.deepEqual(encounter.cues, []);
});

test("a deixa da rodada 1 dispara na abertura da luta", () => {
  const { encounter, events } = scripted(["A.........E"], [{ id: "abre", when: { kind: "round", round: 1 } }], apart);
  assert.deepEqual(eventsOf(events, "cue"), [{ type: "cue", id: "abre" }]);
  assert.equal(activeUnit(encounter)!.id, "A");
});

test("uma deixa que para a luta a encerra sem vencedor, com os dois lados de pé", () => {
  const { encounter } = scripted(
    ["A.........E"],
    [{ id: "basta", when: { kind: "round", round: 2 }, ends: "stop" }],
    apart,
  );
  const log = passUntilRound(encounter, 9);

  assert.equal(encounter.round, 2);
  assert.equal(encounter.stopped, true);
  assert.equal(encounter.winner, undefined);
  assert.ok(isOver(encounter));
  assert.deepEqual(log.slice(-2), [{ type: "cue", id: "basta" }, { type: "battleEnded" }]);
  // Ninguém chegou a começar a vez na rodada em que ela parou.
  assert.equal(eventsOf(log, "turnStarted").at(-1)!.unit, "E");
  assert.equal(activeUnit(encounter), undefined);
  assert.deepEqual(applyCommand(encounter, { type: "endTurn", unitId: "A" }), { ok: false, reason: "battle_over" });
});

test("a queda de um alvo marcado dá a vitória, com o resto do grupo dele de pé", () => {
  const { encounter } = scripted(
    ["AE.........F"],
    [{ id: "alvo", when: { kind: "down", unit: "E" }, ends: "win" }],
    (at) => [
      makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 30 }, currentHp: 500, maxHp: 500 }),
      makeUnit("E", "enemy", at("E"), { currentHp: 1 }),
      makeUnit("F", "enemy", at("F"), { currentHp: 500, maxHp: 500 }),
    ],
  );
  const log = playOut(encounter);

  assert.equal(encounter.winner, "party");
  assert.equal(encounter.stopped, undefined);
  assert.ok(isAlive(findUnit(encounter, "F")!));
  assert.deepEqual(log.slice(-3), [
    { type: "death", unit: "E" },
    { type: "cue", id: "alvo" },
    { type: "battleEnded", winner: "party" },
  ]);
});

test("a deixa de derrota acontece no lugar dela: o grupo cai e a luta para, sem vencedor", () => {
  const { encounter } = scripted(
    ["AE"],
    // Sem `ends`: a de derrota sempre encerra, parando a luta.
    [
      { id: "caiu", when: { kind: "down", unit: "A" } },
      { id: "poupada", when: { kind: "defeat" } },
    ],
    (at) => [
      makeUnit("A", "party", at("A"), { currentHp: 1 }),
      makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST, dain: 30 }, currentHp: 500, maxHp: 500 }),
    ],
  );
  const log = playOut(encounter);

  assert.equal(isAlive(findUnit(encounter, "A")!), false);
  assert.equal(encounter.winner, undefined);
  assert.equal(encounter.stopped, true);
  // As duas disparam juntas, na ordem em que foram declaradas.
  assert.deepEqual(log.slice(-3), [{ type: "cue", id: "caiu" }, { type: "cue", id: "poupada" }, { type: "battleEnded" }]);
});

test("a primeira deixa que encerra a luta encerra: a que vinha depois não dispara", () => {
  const { encounter } = scripted(
    ["AE"],
    [
      { id: "primeira", when: { kind: "defeat" }, ends: "win" },
      { id: "segunda", when: { kind: "down", unit: "A" } },
    ],
    (at) => [
      makeUnit("A", "party", at("A"), { currentHp: 1 }),
      makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST, dain: 30 }, currentHp: 500, maxHp: 500 }),
    ],
  );
  const log = playOut(encounter);

  assert.equal(encounter.winner, "party");
  assert.deepEqual(eventsOf(log, "cue"), [{ type: "cue", id: "primeira" }]);
  assert.deepEqual(encounter.cues.map((cue) => cue.id), ["segunda"]);
});

test("quebrar o destrutível marcado dispara a deixa dele", () => {
  const { encounter } = scripted(
    ["A...cE"],
    [{ id: "quebrou", when: { kind: "broken", prop: "caixote" }, ends: "win" }],
    (at) => [
      makeUnit("A", "party", at("A"), { characterClass: "rachador", attributes: { il: FIRST } }),
      makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
    ],
  );

  const log: TacticalEvent[] = [];
  for (let turn = 0; turn < 6 && !isOver(encounter); turn++) {
    log.push(...run(encounter, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: { x: 4, y: 0 } }));
    if (isOver(encounter)) break;
    run(encounter, { type: "endTurn", unitId: "A" });
    run(encounter, { type: "endTurn", unitId: "E" });
  }

  assert.equal(encounter.winner, "party");
  assert.deepEqual(
    log.slice(-3).map((event) => event.type),
    ["propDestroyed", "cue", "battleEnded"],
  );
});

test("deixa que espera quem não está na luta não dispara nunca, e a luta acaba pelas regras", () => {
  const { encounter } = scripted(
    ["AE"],
    [
      { id: "ausente", when: { kind: "down", unit: "ninguém" }, ends: "stop" },
      { id: "sem-caixote", when: { kind: "broken", prop: "caixote" }, ends: "stop" },
    ],
    (at) => [
      makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 30 }, currentHp: 500, maxHp: 500 }),
      makeUnit("E", "enemy", at("E"), { currentHp: 1 }),
    ],
  );
  const log = playOut(encounter);

  assert.equal(encounter.winner, "party");
  assert.equal(eventsOf(log, "cue").length, 0);
  assert.deepEqual(log.at(-1), { type: "battleEnded", winner: "party" });
});

test("o roteiro é dado da luta: a cópia continua com as mesmas deixas e dá no mesmo", () => {
  const { encounter } = scripted(["A.........E"], [{ id: "basta", when: { kind: "round", round: 3 }, ends: "stop" }], apart);
  passUntilRound(encounter, 2);

  const copy = structuredClone(encounter);
  assert.deepEqual(passUntilRound(copy, 9), passUntilRound(encounter, 9));
  assert.equal(copy.stopped, true);
});
