import assert from "node:assert/strict";
import { test } from "node:test";
import {
  abilityTargets,
  activeUnit,
  applyCommand,
  attackEdge,
  attackTotals,
  findUnit,
  gridFromAscii,
  planTurn,
  startEncounter,
  auraName,
  proficiency,
  styleLabel,
  styleMatchup,
  unitFromCharacter,
  usesLeft,
  STYLE_TO_HIT,
  type Encounter,
  type EncounterSetup,
  type Pos,
  type StyleId,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * As escolas: o triângulo na rolagem de ataque, o traço de cada uma no golpe,
 * e o que veio junto — habilidade com limite e preço, condição que dura a
 * luta toda, e as manias da IA que leem o que os outros vêm fazendo.
 */

function stage(
  rows: string[],
  place: (at: (marker: string) => Pos) => Unit[],
  extra: Partial<EncounterSetup> = {},
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed: 11, ...extra });
}

const styled = (unit: Unit, style: StyleId, grade = 3): Unit => Object.assign(unit, { style, grade });
/** Aguenta qualquer coisa: as contas de dano não podem acabar com a luta. */
const TOUGH = { currentHp: 9000, maxHp: 9000 };
const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

/** O dano que `command` causa em `encounter`, e o que causaria se `change` fosse feito antes — com os MESMOS dados. */
function compare(encounter: Encounter, command: Parameters<typeof applyCommand>[1], change: (copy: Encounter) => void) {
  const copy = structuredClone(encounter);
  change(copy);
  const damage = (events: TacticalEvent[]) => eventsOf(events, "damage").reduce((sum, event) => sum + event.amount, 0);
  const real = run(encounter, command);
  return { events: real, damage: damage(real), other: damage(run(copy, command)) };
}

test("o triângulo fechado: Ipojy vence Gryskar, Gryskar vence Tsvirana, Tsvirana vence Ipojy; o Baluarte fica fora, igual empata", () => {
  assert.equal(styleMatchup("ipojy", "gryskar"), 1);
  assert.equal(styleMatchup("gryskar", "ipojy"), -1);
  assert.equal(styleMatchup("gryskar", "tsvirana"), 1);
  assert.equal(styleMatchup("tsvirana", "gryskar"), -1);
  assert.equal(styleMatchup("tsvirana", "ipojy"), 1);
  assert.equal(styleMatchup("ipojy", "tsvirana"), -1);
  for (const school of ["ipojy", "gryskar", "tsvirana"] as const) {
    assert.equal(styleMatchup(school, "baluarte"), 0);
    assert.equal(styleMatchup("baluarte", school), 0);
    assert.equal(styleMatchup(school, school), 0);
    assert.equal(styleMatchup(school, undefined), 0);
  }
  assert.equal(styleLabel({ style: "gryskar", grade: 3 }), "Gryskar III");
  assert.equal(styleLabel({ style: "ipojy", grade: 7 }), "Ipojy VII");
  // O Baluarte não é escola: não tem grau.
  assert.equal(styleLabel({ style: "baluarte", grade: 2 }), "Baluarte");
  assert.equal(styleLabel({}), "");
});

test("a proficiência vai de 1 a 7 e nunca passa do nível de aura", () => {
  assert.equal(proficiency(3, 2), 2);
  assert.equal(proficiency(2, 3), 2);
  assert.equal(proficiency(9), 7);
  assert.equal(proficiency(0, 4), 1);
  assert.equal(auraName(1), "Punho");
  assert.equal(auraName(2), "Fio");
  assert.equal(auraName(7), "Divindade");
  assert.equal(auraName(undefined), "");

  // Na luta, o grau já entra cortado pela aura.
  const capped = unitFromCharacter(makeCharacter("A"), { team: "party", pos: { x: 0, y: 0 }, style: { id: "ipojy", grade: 4 }, aura: 2 });
  assert.deepEqual([capped.style, capped.grade, capped.aura], ["ipojy", 2, 2]);
});

test("a vantagem de escola entra na rolagem de ataque, pros dois lados, e só entre inimigos", () => {
  const { encounter } = stage(["AE.B"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), "tsvirana"),
    styled(makeUnit("E", "enemy", at("E"), TOUGH), "ipojy"),
    styled(makeUnit("B", "party", at("B")), "ipojy"),
  ]);
  const [lish, guard, ally] = encounter.units;
  const strike = lish.abilities.find((ability) => ability.id === "guardiao.attack")!;

  const edge = attackEdge(encounter, lish, strike, guard);
  assert.equal(edge.style, 1);
  assert.equal(edge.toHit, STYLE_TO_HIT);
  assert.equal(attackEdge(encounter, guard, strike, lish).toHit, -STYLE_TO_HIT);
  assert.equal(attackEdge(encounter, lish, strike, ally).style, 0);

  const [roll] = eventsOf(run(encounter, { type: "ability", unitId: "A", abilityId: strike.id, target: guard.pos }), "attackRoll");
  assert.equal(roll.style, 1);
  assert.equal(roll.total, roll.natural + attackTotals(lish, strike, guard, edge).bonus);
});

test("Onda do Gryskar: cada golpe seguido no mesmo alvo soma no dano do próximo; errar zera", () => {
  const { encounter } = stage(["AE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), "gryskar"),
    makeUnit("E", "enemy", at("E"), TOUGH),
  ]);
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;

  let streak = 0;
  let waves = 0;
  let resets = 0;
  for (let turn = 0; turn < 40; turn++) {
    const { events, damage, other } = compare(
      encounter,
      { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos },
      (copy) => delete findUnit(copy, "A")!.style,
    );
    const [roll] = eventsOf(events, "attackRoll");
    const wave = eventsOf(events, "styleTrait");
    if (roll.outcome === "hit" || roll.outcome === "crit") {
      // Quatro golpes seguidos é o teto: daí em diante soma o mesmo.
      const bonus = Math.min(streak, 4);
      assert.deepEqual(wave, streak > 0 ? [{ type: "styleTrait", unit: "A", target: "E", trait: "wave", name: "Onda", hits: streak }] : []);
      assert.equal(damage - other, bonus * (roll.outcome === "crit" ? 2 : 1));
      if (streak > 0) waves += 1;
      streak += 1;
      assert.deepEqual(hero.streak, { target: "E", hits: streak });
    } else {
      if (streak > 0) resets += 1;
      streak = 0;
      assert.equal(hero.streak, undefined);
    }
    pass(encounter);
    // O inimigo só passa a vez: quem conta é ela.
    pass(encounter);
  }
  assert.ok(waves > 0 && resets > 0, "a luta deveria ter tido onda e erro");
});

test("Onda do Gryskar: trocar de alvo recomeça a conta, e área não é insistência", () => {
  const { encounter } = stage(["FAE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }), "gryskar"),
    makeUnit("E", "enemy", at("E"), TOUGH),
    makeUnit("F", "enemy", at("F"), TOUGH),
  ]);
  const hero = findUnit(encounter, "A")!;
  hero.streak = { target: "E", hits: 3 };
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "F")!.pos });
  const [roll] = eventsOf(events, "attackRoll");
  assert.equal(eventsOf(events, "styleTrait").length, 0);
  assert.deepEqual(hero.streak, roll.outcome === "fumble" ? undefined : { target: "F", hits: 1 });
});

test("Rachadura da Tsvirana: o dano dobra em quem acabou de repetir a ação do turno anterior", () => {
  const { encounter } = stage(["AE"], (at) => [
    styled(makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }), "tsvirana"),
    makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { or: 0 } }),
  ]);
  const enemy = findUnit(encounter, "E")!;
  enemy.habit = { last: "guardiao.attack", repeated: true, attackTurns: 2 };

  const { events, damage, other } = compare(
    encounter,
    { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos },
    (copy) => (findUnit(copy, "E")!.habit!.repeated = false),
  );
  const [roll] = eventsOf(events, "attackRoll");
  if (roll.outcome === "fumble") return;
  assert.deepEqual(eventsOf(events, "styleTrait"), [{ type: "styleTrait", unit: "A", target: "E", trait: "crack", name: "Rachadura" }]);
  assert.equal(damage, other * 2);
});

test("o motor anota o que cada um faz com a ação: repetir, variar e bater em seguida", () => {
  const { encounter } = stage(["A...E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const hero = findUnit(encounter, "A")!;
  // Lido por uma função: o deepEqual estreita o tipo de `hero.habit` e o TypeScript não vê o turno mudá-lo.
  const habit = () => hero.habit!;
  const turn = (abilityId?: string) => {
    if (abilityId) run(encounter, { type: "ability", unitId: "A", abilityId, target: hero.pos });
    pass(encounter);
    pass(encounter);
  };

  turn("guardiao.defend");
  assert.deepEqual(hero.habit, { last: "guardiao.defend", repeated: false, attackTurns: 0 });
  turn("guardiao.defend");
  assert.equal(habit().repeated, true);
  // Um turno sem ação não repete nada, e quebra a sequência.
  turn();
  assert.deepEqual(hero.habit, { last: undefined, repeated: false, attackTurns: 0 });
  turn("guardiao.defend");
  assert.equal(habit().repeated, false);

  // Golpe atrás de golpe conta os turnos seguidos batendo; a guarda zera.
  run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  const strike = () => {
    run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "E")!.pos });
    pass(encounter);
    pass(encounter);
  };
  findUnit(encounter, "E")!.currentHp = findUnit(encounter, "E")!.maxHp = 9000;
  strike();
  strike();
  assert.equal(habit().attackTurns, 2);
  assert.equal(habit().repeated, true);
  turn("guardiao.defend");
  assert.equal(habit().attackTurns, 0);
});

test("Muralha: o Baluarte de criatura tira um tanto fixo de cada golpe, depois da armadura", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }),
    styled(makeUnit("E", "enemy", at("E"), TOUGH), "baluarte"),
  ]);
  const { events, damage, other } = compare(
    encounter,
    { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "E")!.pos },
    (copy) => delete findUnit(copy, "E")!.style,
  );
  if (eventsOf(events, "attackRoll")[0].outcome === "fumble") return;
  assert.equal(other - damage, 2);
});

test("Contragolpe da Ipojy: quem a ataca e erra leva o golpe de volta, na reação dela, uma vez por rodada", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { ...TOUGH, attributes: { il: FIRST } }),
    // Couro de pedra: quase todo golpe nela erra.
    styled(makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { or: 200 } }), "ipojy"),
  ]);
  const enemy = findUnit(encounter, "E")!;

  let countered = 0;
  for (let turn = 0; turn < 20; turn++) {
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos });
    const [roll] = eventsOf(events, "attackRoll");
    const traits = eventsOf(events, "styleTrait");
    if (roll.outcome === "crit") {
      assert.deepEqual(traits, []);
    } else {
      countered += 1;
      assert.deepEqual(traits, [{ type: "styleTrait", unit: "E", target: "A", trait: "counter", name: "Contragolpe" }]);
      // O golpe de volta é uma reação, logo depois do aviso, e gasta a reação dela.
      const used = eventsOf(events, "abilityUsed");
      assert.deepEqual(
        used.map((event) => [event.unit, event.abilityId, event.reaction]),
        [
          ["A", "guardiao.attack", false],
          ["E", "guardiao.attack", true],
        ],
      );
      assert.ok(events.indexOf(traits[0]) < events.indexOf(used[1]));
      assert.equal(enemy.turn.reaction, false);

      // Sem reação, o segundo erro da rodada passa sem resposta.
      const again = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.quick_attack", target: enemy.pos });
      assert.deepEqual(eventsOf(again, "styleTrait"), []);
    }
    pass(encounter);
    pass(encounter);
  }
  assert.ok(countered > 0, "a luta deveria ter tido contragolpe");
});

test("Contragolpe da Ipojy: não alcança quem errou de longe, e não vem de quem não é da Espera", () => {
  const { encounter } = stage(["A..E", "F..."], (at) => [
    makeUnit("A", "party", at("A"), { ...TOUGH, attributes: { il: FIRST } }),
    styled(makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { or: 200 } }), "ipojy"),
    styled(makeUnit("F", "enemy", at("F"), { ...TOUGH, attributes: { or: 200 } }), "gryskar"),
  ]);
  // O puxão de três quadrados erra de longe: o golpe dela é de perto e não chega.
  const far = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.quick_attack", target: findUnit(encounter, "E")!.pos });
  if (eventsOf(far, "attackRoll")[0].outcome !== "crit") assert.deepEqual(eventsOf(far, "styleTrait"), []);
  assert.equal(findUnit(encounter, "E")!.turn.reaction, true);

  // Colado, mas noutra escola: errar não custa nada.
  const near = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: findUnit(encounter, "F")!.pos });
  assert.deepEqual(eventsOf(near, "styleTrait"), []);
});

test("Voto da Ipojy: quem é da Espera não abre a luta — só bate depois que alguém bateu", () => {
  const { encounter } = stage(["IE"], (at) => [
    styled(makeUnit("I", "party", at("I"), { ...TOUGH, attributes: { il: FIRST } }), "ipojy"),
    makeUnit("E", "enemy", at("E"), TOUGH),
  ]);
  const xandui = findUnit(encounter, "I")!;
  const enemy = findUnit(encounter, "E")!;
  const strike = xandui.abilities.find((ability) => ability.id === "guardiao.attack")!;
  const guard = xandui.abilities.find((ability) => ability.id === "guardiao.defend")!;

  // Ninguém bateu ainda: golpe nenhum tem alvo, e o motor recusa. Guardar-se não é golpe.
  assert.equal(encounter.opened, undefined);
  assert.deepEqual(abilityTargets(encounter, xandui, strike), []);
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "I", abilityId: strike.id, target: enemy.pos }), {
    ok: false,
    reason: "invalid_target",
  });
  assert.deepEqual(abilityTargets(encounter, xandui, guard), [xandui.pos]);
  pass(encounter);

  // O outro lado bate (acerte ou erre): a luta abriu, e agora ela responde.
  run(encounter, { type: "ability", unitId: "E", abilityId: "guardiao.attack", target: xandui.pos });
  assert.equal(encounter.opened, true);
  pass(encounter);
  assert.deepEqual(abilityTargets(encounter, xandui, strike), [enemy.pos]);
  run(encounter, { type: "ability", unitId: "I", abilityId: strike.id, target: enemy.pos });
});

test("Voto da Ipojy: não embosca — quem ainda está Surpreso não é alvo dela, nem depois do primeiro golpe", () => {
  const { encounter } = stage(
    ["AE", "I."],
    (at) => [
      makeUnit("A", "party", at("A"), { ...TOUGH, attributes: { il: FIRST } }),
      styled(makeUnit("I", "party", at("I"), { ...TOUGH, attributes: { il: 90 } }), "ipojy"),
      makeUnit("E", "enemy", at("E"), TOUGH),
    ],
    { surprised: "enemy" },
  );
  const xandui = findUnit(encounter, "I")!;
  const enemy = findUnit(encounter, "E")!;
  const strike = xandui.abilities.find((ability) => ability.id === "guardiao.attack")!;

  // Jarupã abre a luta; o inimigo ainda está pego de surpresa, e ela não bate em quem não esperava.
  run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: enemy.pos });
  assert.equal(encounter.opened, true);
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "I");
  assert.deepEqual(abilityTargets(encounter, xandui, strike), []);
  pass(encounter);

  // Passada a vez perdida do inimigo, ele já sabe que está numa luta.
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.ok(!enemy.statuses.some((status) => status.id === "surprised"));
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "I");
  assert.deepEqual(abilityTargets(encounter, xandui, strike), [enemy.pos]);
});

test("Voto da Ipojy: antes de a luta abrir, quem passa por ela não leva ataque de oportunidade", () => {
  const { encounter } = stage(["IA..."], (at) => [
    makeUnit("A", "party", at("A"), { ...TOUGH, attributes: { il: FIRST } }),
    styled(makeUnit("I", "enemy", at("I"), TOUGH), "ipojy"),
  ]);
  const away = run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  assert.deepEqual(eventsOf(away, "attackRoll"), []);
  // Aberta a luta, o mesmo passo custa o golpe.
  encounter.opened = true;
  run(encounter, { type: "move", unitId: "A", to: { x: 1, y: 0 } });
  const again = run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });
  assert.deepEqual(eventsOf(again, "attackRoll").map((event) => event.actor), ["I"]);
});

test("Voto da Ipojy: quem é da Espera não dá golpe de abertura — a luta começa sem ele", () => {
  const { encounter, events } = stage(
    ["I.E"],
    (at) => [
      styled(makeUnit("I", "party", at("I"), { attributes: { il: FIRST } }), "ipojy"),
      makeUnit("E", "enemy", at("E"), TOUGH),
    ],
    { surprised: "enemy", opening: { unitId: "I", abilityId: "guardiao.attack", target: { x: 2, y: 0 }, from: { x: 1, y: 0 } } },
  );
  assert.deepEqual(eventsOf(events, "abilityUsed"), []);
  assert.deepEqual(eventsOf(events, "moved"), []);
  assert.equal(encounter.opened, undefined);
  assert.deepEqual(findUnit(encounter, "I")!.pos, { x: 0, y: 0 });
});

test("Adiantar a Maré pega todo inimigo de pé, vale uma vez por luta e cobra o turno seguinte de quem a fez", () => {
  const { encounter } = stage(["A....E.F.G"], (at) => [
    unitFromCharacter(makeCharacter("A", { attributes: { il: FIRST } }), { team: "party", pos: at("A"), gifts: ["tide_pull"] }),
    makeUnit("E", "enemy", at("E"), { attributes: { il: 50 } }),
    makeUnit("F", "enemy", at("F"), { attributes: { il: 40 } }),
    makeUnit("G", "enemy", at("G"), { currentHp: 0 }),
  ]);
  const varel = findUnit(encounter, "A")!;
  const tide = varel.abilities.find((ability) => ability.id === "gift.tide_pull")!;
  assert.deepEqual(abilityTargets(encounter, varel, tide), [varel.pos]);
  assert.equal(usesLeft(varel, tide), 1);

  const events = run(encounter, { type: "ability", unitId: "A", abilityId: tide.id, target: varel.pos });
  assert.deepEqual(
    eventsOf(events, "statusApplied").map((event) => [event.target, event.statusId]),
    [
      ["E", "exposed"],
      ["F", "exposed"],
      ["A", "winded"],
    ],
  );
  assert.equal(usesLeft(varel, tide), 0);

  // Não há segunda vez, nem na rodada seguinte — e a vez seguinte dele se perde.
  const round = [...pass(encounter), ...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(round, "turnSkipped"), [{ type: "turnSkipped", unit: "A", name: "Sem fôlego" }]);
  assert.equal(activeUnit(encounter)!.id, "E");
  pass(encounter);
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: tide.id, target: varel.pos }), {
    ok: false,
    reason: "resource_spent",
  });
});

test("condição que já chega com alguém dura a luta toda, e a de braço ferido pesa na rolagem", () => {
  const { encounter, events } = stage(
    ["AE"],
    (at) => [makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), makeUnit("E", "enemy", at("E"), TOUGH)],
    { lasting: { A: ["wounded_arm"], ninguém: ["wounded_arm"] } },
  );
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;
  assert.deepEqual(eventsOf(events, "statusApplied").map((event) => [event.target, event.name]), [["A", "Braço ferido"]]);

  const strike = hero.abilities.find((ability) => ability.id === "guardiao.attack")!;
  const edge = attackEdge(encounter, hero, strike, enemy);
  const healthy = structuredClone(hero);
  healthy.statuses = [];
  assert.equal(attackTotals(hero, strike, enemy, edge).bonus, attackTotals(healthy, strike, enemy, edge).bonus - 2);

  for (let i = 0; i < 12; i++) pass(encounter);
  assert.deepEqual(hero.statuses.map((status) => status.id), ["wounded_arm"]);
});

test("quem só revida não bate em quem ainda não o provocou o bastante", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A")),
    Object.assign(makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST } }), { quirks: { retaliates: 3 } }),
  ]);
  const hero = findUnit(encounter, "A")!;
  const strikes = () => {
    const plan = planTurn(encounter);
    return [plan.action, plan.bonus].some((choice) => choice?.ability.effects.some((effect) => effect.kind === "damage"));
  };

  assert.equal(strikes(), false);
  hero.habit = { repeated: true, attackTurns: 2 };
  assert.equal(strikes(), false);
  hero.habit = { repeated: true, attackTurns: 3 };
  assert.equal(strikes(), true);
});

test("quem espelha repete o tipo da última ação de quem ele copia", () => {
  const { encounter } = stage(["AE"], (at) => [
    makeUnit("A", "party", at("A")),
    Object.assign(makeUnit("E", "enemy", at("E"), { characterClass: "sombrilico", attributes: { il: FIRST } }), { quirks: { mirrors: "A" } }),
  ]);
  const hero = findUnit(encounter, "A")!;

  hero.habit = { last: "guardiao.defend", repeated: false, attackTurns: 0 };
  assert.equal(planTurn(encounter).action?.ability.id, "sombrilico.defend");
  hero.habit = { last: "guardiao.heavy_attack", repeated: false, attackTurns: 1 };
  assert.equal(planTurn(encounter).action?.ability.id, "sombrilico.heavy_attack");
  // Sem nada pra copiar (ela ainda não agiu), luta como qualquer um.
  hero.habit = { last: undefined, repeated: false, attackTurns: 0 };
  assert.ok(planTurn(encounter).action);
});
