import assert from "node:assert/strict";
import { test } from "node:test";
import { Compiler } from "inkjs/full";
import type { Character } from "../../types/character";
import { StoryRunner, checkChance, rollCheck, type DialogueBeat, type StoryHost } from "../index";

const EXTERNALS = `
EXTERNAL attr(name)
EXTERNAL order()
EXTERNAL people()
EXTERNAL level()
EXTERNAL has_item(id)
EXTERNAL defeated(group)
EXTERNAL check(name, difficulty)
EXTERNAL passed()
EXTERNAL give_item(id)
EXTERNAL grant_xp(amount)
`;

function compile(ink: string): string {
  return new Compiler(EXTERNALS + ink).Compile().ToJson() as string;
}

function makeHost(overrides: Partial<Character["attributes"]> = {}, defeated: string[] = []): StoryHost {
  return {
    character: {
      id: "hero",
      name: "Herói",
      race: "althirim",
      characterClass: "luminar",
      level: 1,
      xp: 0,
      attributes: { dain: 5, eir: 5, nath: 5, il: 5, or: 5, len: 5, ul: 5, ...overrides },
      currentHp: 30,
      maxHp: 30,
      currentNodeId: "",
    },
    rng: { rngState: 2 },
    isDefeated: (key) => defeated.includes(key),
  };
}

function lines(beats: DialogueBeat[]): string[] {
  return beats.flatMap((beat) => (beat.kind === "line" ? [beat.speaker ? `${beat.speaker}> ${beat.text}` : beat.text] : []));
}

const GUARD = compile(`
VAR portao_aberto = false

=== guarda ===
{guarda == 1: Um homem barra o portão.}
Guarda: Alto lá{order() == "luminar":, portador de luz}.
{defeated("estrada:lobos"): Guarda: Ouvi dizer que a estrada está limpa.}
+ [Pedir passagem. # check: len 14]
    {passed():
        ~ portao_aberto = true
        Guarda: Passa.
    - else:
        Guarda: Hoje não.
    }
    -> END
* [Oferecer ajuda.]
    Guarda: Fica com isto, então.
    ~ give_item("item-pao-de-cinza")
    ~ grant_xp(10)
    -> END
+ [Ir embora.]
    -> END
`);

test("uma fala 'Nome: texto' sai com quem fala; o resto é narração; e o texto lê o personagem e o mundo", () => {
  const runner = new StoryRunner(GUARD, makeHost({}, ["estrada:lobos"]));
  const step = runner.start("guarda");

  assert.deepEqual(lines(step.beats), [
    "Um homem barra o portão.",
    "Guarda> Alto lá, portador de luz.",
    "Guarda> Ouvi dizer que a estrada está limpa.",
  ]);
  assert.deepEqual(
    step.choices.map((choice) => choice.text),
    ["Pedir passagem.", "Oferecer ajuda.", "Ir embora."],
  );

  const other = makeHost();
  other.character.characterClass = "rachador";
  assert.deepEqual(lines(new StoryRunner(GUARD, other).start("guarda").beats), [
    "Um homem barra o portão.",
    "Guarda> Alto lá.",
  ]);
});

test("a escolha com teste mostra a chance, rola ao ser feita, e o texto segue o resultado", () => {
  for (const [len, passes, line] of [
    [100, true, "Guarda> Passa."],
    [-100, false, "Guarda> Hoje não."],
  ] as const) {
    const host = makeHost({ len });
    const runner = new StoryRunner(GUARD, host);
    const [ask, help] = runner.start("guarda").choices;

    assert.deepEqual({ attribute: ask.check?.attribute, difficulty: ask.check?.difficulty }, { attribute: "len", difficulty: 14 });
    assert.equal(ask.check?.chance, passes ? 0.95 : 0.05);
    assert.equal(help.check, undefined);

    const step = runner.choose(ask.index);
    const [first] = step.beats;
    assert.ok(first.kind === "event" && first.event.type === "check");
    // O dado está fixo (seed 2) e não é 1 nem 20: quem decide é o atributo.
    assert.equal(first.event.success, passes);
    assert.deepEqual(lines(step.beats), [line]);
    assert.deepEqual(step.choices, []);
    assert.equal(runner.flag("portao_aberto"), passes);
  }
});

test("a chance prometida é a que o dado entrega", () => {
  const { character } = makeHost({ len: 5 });
  const check = { attribute: "len", difficulty: 14 } as const;

  let passed = 0;
  const rng = { rngState: 99 };
  for (let i = 0; i < 4000; i++) if (rollCheck(rng, character, check).success) passed++;
  assert.equal(checkChance(character, check), 0.6);
  assert.ok(Math.abs(passed / 4000 - 0.6) < 0.03, `passou ${passed / 4000}`);
});

test("dar item e XP muda o personagem e vira acontecimento, na ordem em que o texto os dá", () => {
  const host = makeHost();
  const runner = new StoryRunner(GUARD, host);
  const step = runner.choose(runner.start("guarda").choices[1].index);

  assert.deepEqual(
    step.beats.map((beat) => (beat.kind === "line" ? "line" : beat.event.type)),
    ["line", "item", "xp"],
  );
  assert.equal(host.character.inventory?.slots[0].item.id, "item-pao-de-cinza");
  assert.equal(host.character.xp, 10);
});

test("o estado salvo leva as flags, as visitas e as escolhas já gastas pra próxima sessão", () => {
  const host = makeHost({ len: 100 });
  const first = new StoryRunner(GUARD, host);
  first.choose(first.start("guarda").choices[1].index);
  first.choose(first.start("guarda").choices[0].index);
  assert.equal(first.flag("portao_aberto"), true);

  const second = new StoryRunner(GUARD, host, first.save());
  assert.equal(second.flag("portao_aberto"), true);
  const step = second.start("guarda");
  // Terceira visita: sem a narração de chegada, e sem a oferta de ajuda (era de uma vez só).
  assert.deepEqual(lines(step.beats), ["Guarda> Alto lá, portador de luz."]);
  assert.deepEqual(
    step.choices.map((choice) => choice.text),
    ["Pedir passagem.", "Ir embora."],
  );
});

test("um teste no meio do texto rola na hora, e o resultado vem antes da fala que ele decide", () => {
  const json = compile(`
=== altar ===
Há um altar.
{check("ul", 12): Você reconhece o símbolo. | Não lhe diz nada.}
-> END
`);
  const step = new StoryRunner(json, makeHost({ ul: 100 })).start("altar");
  assert.deepEqual(
    step.beats.map((beat) => (beat.kind === "line" ? beat.text : beat.event.type)),
    ["Há um altar.", "check", "Você reconhece o símbolo."],
  );
});

test("o jogo lê e escreve as flags; trecho que não existe e save estragado não passam em silêncio", () => {
  const runner = new StoryRunner(GUARD, makeHost());
  assert.equal(runner.hasKnot("guarda"), true);
  assert.equal(runner.hasKnot("ninguem"), false);
  assert.throws(() => runner.start("ninguem"));

  assert.equal(runner.flag("portao_aberto"), false);
  runner.setFlag("portao_aberto", true);
  assert.equal(runner.flag("portao_aberto"), true);
  assert.equal(runner.flag("nao_existe"), undefined);

  // Um save que a história não entende é jogado fora: começa-se do zero, sem travar o jogo.
  const fresh = new StoryRunner(GUARD, makeHost(), "{isto não é um save}");
  assert.equal(fresh.flag("portao_aberto"), false);
  assert.equal(lines(fresh.start("guarda").beats)[0], "Um homem barra o portão.");
});
