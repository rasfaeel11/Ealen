import assert from "node:assert/strict";
import { test } from "node:test";
import { Compiler, CompilerOptions } from "inkjs/full";
import type { Character } from "../../types/character";
import {
  StoryRunner,
  aftermath,
  chargeSavedClock,
  checkChance,
  clockCondition,
  rollCheck,
  unpackStory,
  type DialogueBeat,
  type StoryEvent,
  type StoryHost,
} from "../index";

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
EXTERNAL take_item(id)
EXTERNAL grant_xp(amount)
EXTERNAL start_fight(group)
EXTERNAL travel(area, spawn)
EXTERNAL join_party(who)
EXTERNAL leave_party(who)
EXTERNAL in_party(who)
EXTERNAL unlock_order(id)
EXTERNAL note(id, text)
EXTERNAL noted(id)
EXTERNAL forget(count)
EXTERNAL recall(id)
EXTERNAL recall_all()
EXTERNAL clock_start(label, value, limit)
EXTERNAL clock_tick(amount)
EXTERNAL clock()
EXTERNAL clock_left()
EXTERNAL clock_cost(what, amount)
EXTERNAL clock_stop()
EXTERNAL afflict(who, status)
EXTERNAL cure(who, status)
EXTERNAL afflicted(who, status)
`;

/** Como o jogo compila (client/scripts/compileStory.ts): contando as visitas de todo trecho. */
function compile(ink: string): string {
  return new Compiler(EXTERNALS + ink, new CompilerOptions(null, [], true)).Compile().ToJson() as string;
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
    companions: [],
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

test("a história tira item da mochila, e só segue o ramo de quem tinha o que dar", () => {
  const json = compile(`
=== pedagio ===
{take_item("item-pao-de-cinza"): Guarda: Serve. Passa. | Guarda: De mãos vazias não passa.}
-> END
`);
  const empty = new StoryRunner(json, makeHost()).start("pedagio");
  assert.deepEqual(empty.beats.map((beat) => (beat.kind === "line" ? beat.text : beat.event.type)), ["De mãos vazias não passa."]);

  const giver = makeHost();
  const give = compile(`
=== dar ===
~ give_item("item-pao-de-cinza")
~ give_item("item-pao-de-cinza")
-> END
`);
  new StoryRunner(give, giver).start("dar");
  assert.equal(giver.character.inventory?.slots[0].quantity, 2);

  const paid = new StoryRunner(json, giver).start("pedagio");
  assert.deepEqual(paid.beats.map((beat) => (beat.kind === "line" ? beat.text : beat.event.type)), ["itemTaken", "Serve. Passa."]);
  assert.equal(giver.character.inventory?.slots[0].quantity, 1);

  new StoryRunner(json, giver).start("pedagio");
  assert.deepEqual(giver.character.inventory?.slots, []);
  assert.throws(() => new StoryRunner(compile(`
=== x ===
{take_item("item-que-nao-existe"): a | b}
-> END
`), makeHost()).start("x"));
});

test("luta e viagem pedidas pelo texto não cortam a fala: viram o que a cena faz depois da conversa", () => {
  const json = compile(`
=== chefe ===
Chefe: Ninguém passa.
~ start_fight("guardas")
+ [Recuar.]
    ~ travel("clareira", "default")
    Você recua.
    -> END
+ [Avançar.]
    Chefe: Então venha.
    -> END
`);
  const runner = new StoryRunner(json, makeHost());
  const first = runner.start("chefe");
  assert.deepEqual(aftermath([first]), { fight: "guardas", unlocks: [] });
  // O pedido não tira a fala nem as escolhas de onde estavam.
  assert.deepEqual(lines(first.beats), ["Chefe> Ninguém passa."]);
  assert.equal(first.choices.length, 2);

  const retreat = runner.choose(first.choices[0].index);
  assert.deepEqual(aftermath([first, retreat]), { fight: "guardas", travel: { area: "clareira", spawn: "default" }, unlocks: [] });
  assert.deepEqual(aftermath([]), { unlocks: [] });

  assert.throws(() => new StoryRunner(compile(`
=== x ===
~ travel("lugar-nenhum", "default")
-> END
`), makeHost()).start("x"));
});

test("a história lembra que trechos já foram lidos, e leva isso no save", () => {
  const json = compile(`
=== chegada ===
Você chega.
-> END
=== outra ===
Outra cena.
-> END
`);
  const runner = new StoryRunner(json, makeHost());
  assert.equal(runner.visited("chegada"), false);
  runner.start("chegada");
  assert.equal(runner.visited("chegada"), true);
  assert.equal(runner.visited("outra"), false);
  assert.equal(runner.visited("nao_existe"), false);

  const later = new StoryRunner(json, makeHost(), runner.save());
  assert.equal(later.visited("chegada"), true);
  assert.equal(later.visited("outra"), false);
});

const COMPANY = compile(`
=== encontro ===
{in_party("lish"): Lish: Ainda estou aqui. | Lish: Eu vou com você.}
~ join_party("lish")
~ join_party("lish")
~ grant_xp(120)
-> END

=== despedida ===
~ leave_party("lish")
~ leave_party("lish")
{in_party("lish"): Ele fica. | Ele vai embora.}
-> END

=== epilogo ===
~ unlock_order("rachador")
-> END

=== erro ===
~ join_party("ninguem")
-> END
`);

test("join_party põe o companheiro no grupo, no nível do personagem; o XP da história é do grupo inteiro", () => {
  const host = makeHost();
  host.character.level = 3;
  const runner = new StoryRunner(COMPANY, host);

  const step = runner.start("encontro");
  assert.deepEqual(lines(step.beats), ["Lish> Eu vou com você."]);
  // Chamado duas vezes, entra uma só.
  assert.deepEqual(
    step.beats.flatMap((beat) => (beat.kind === "event" ? [beat.event.type] : [])),
    ["joined", "xp"],
  );
  const [lish] = host.companions;
  assert.equal(host.companions.length, 1);
  assert.equal(lish.present, true);
  assert.equal(lish.character.name, "Lish");
  assert.equal(lish.character.inventory, undefined);
  // Entrou no nível 3 e os 120 de XP são dele também.
  assert.equal(lish.character.level, 3);
  assert.equal(lish.character.xp, 120);
  assert.equal(host.character.xp, 120);
  assert.deepEqual(lines(runner.start("encontro").beats), ["Lish> Ainda estou aqui."]);
});

test("leave_party tira do grupo e guarda a ficha: quem volta, volta como era", () => {
  const host = makeHost();
  const runner = new StoryRunner(COMPANY, host);
  runner.start("encontro");
  const sheet = host.companions[0].character;
  sheet.currentHp = 7;

  const step = runner.start("despedida");
  assert.deepEqual(lines(step.beats), ["Ele vai embora."]);
  assert.deepEqual(
    step.beats.flatMap((beat) => (beat.kind === "event" ? [beat.event] : [])),
    [{ type: "left", name: "Lish" }],
  );
  assert.equal(host.companions[0].present, false);

  runner.start("encontro");
  assert.equal(host.companions.length, 1);
  assert.equal(host.companions[0].character, sheet);
  assert.equal(host.companions[0].present, true);
});

test("unlock_order vira um pedido pra cena, e companheiro que não existe é erro de quem escreveu", () => {
  const runner = new StoryRunner(COMPANY, makeHost());
  assert.deepEqual(aftermath([runner.start("epilogo")]).unlocks, ["rachador"]);
  assert.throws(() => runner.start("erro"), /ninguem/);
});

// --- Diário e relógio -------------------------------------------------------

function eventsIn(beats: DialogueBeat[]): StoryEvent[] {
  return beats.flatMap((beat) => (beat.kind === "event" ? [beat.event] : []));
}

const NOTES = compile(`
=== pistas ===
~ note("rede", "A Companhia paga por rede vazia.")
~ note("nomes", "A avó diz os nomes à mesa.")
~ note("chao", "O chão do arquivo é redondo.")
~ note("jarras", "As jarras estão viradas pra dentro.")
Quatro coisas vistas.
-> END

=== de_novo ===
~ note("rede", "A Companhia paga por rede vazia.")
~ note("nomes", "A avó diz os nomes à mesa, na ordem em que morreram.")
Uma delas, vista melhor.
-> END

=== coletor ===
~ forget(2)
{noted("rede"): A rede você ainda lembra.}
{noted("jarras"): As jarras também. | As jarras, não.}
-> END

=== cera ===
~ recall("jarras")
-> END

=== tudo ===
~ recall_all()
-> END

=== mais_do_que_ha ===
~ forget(99)
-> END
`);

test("note escreve no diário na ordem, sem duplicar: o mesmo id troca o texto", () => {
  const runner = new StoryRunner(NOTES, makeHost());
  const first = runner.start("pistas");
  assert.deepEqual(
    eventsIn(first.beats).map((event) => event.type === "noted" && event.entry.id),
    ["rede", "nomes", "chao", "jarras"],
  );
  assert.deepEqual(runner.journal().map((entry) => entry.id), ["rede", "nomes", "chao", "jarras"]);

  // A mesma pista com o mesmo texto não é notícia; com texto novo, troca no lugar.
  const again = eventsIn(runner.start("de_novo").beats);
  assert.equal(again.length, 1);
  assert.deepEqual(again[0], { type: "noted", entry: { id: "nomes", text: "A avó diz os nomes à mesa, na ordem em que morreram." } });
  assert.deepEqual(runner.journal().map((entry) => entry.id), ["rede", "nomes", "chao", "jarras"]);
});

test("forget apaga só o que é recente e deixa o espaço; recall devolve uma, recall_all devolve o resto", () => {
  const runner = new StoryRunner(NOTES, makeHost());
  runner.start("pistas");

  const taken = runner.start("coletor");
  assert.deepEqual(eventsIn(taken.beats), [
    {
      type: "forgot",
      entries: [
        { id: "jarras", text: "As jarras estão viradas pra dentro.", lost: true },
        { id: "chao", text: "O chão do arquivo é redondo.", lost: true },
      ],
    },
  ]);
  assert.deepEqual(lines(taken.beats), ["A rede você ainda lembra.", "As jarras, não."]);
  // As apagadas continuam no lugar delas, em branco.
  assert.deepEqual(runner.journal().map((entry) => [entry.id, entry.lost === true]), [
    ["rede", false],
    ["nomes", false],
    ["chao", true],
    ["jarras", true],
  ]);

  assert.deepEqual(eventsIn(runner.start("cera").beats), [
    { type: "recalled", entries: [{ id: "jarras", text: "As jarras estão viradas pra dentro." }] },
  ]);
  // Devolver o que não está apagado não é notícia.
  assert.deepEqual(eventsIn(runner.start("cera").beats), []);
  assert.deepEqual(eventsIn(runner.start("tudo").beats), [
    { type: "recalled", entries: [{ id: "chao", text: "O chão do arquivo é redondo." }] },
  ]);
  assert.ok(runner.journal().every((entry) => !entry.lost));

  // Pedir mais do que há leva tudo, e só.
  const all = eventsIn(runner.start("mais_do_que_ha").beats);
  assert.equal(all.length === 1 && all[0].type === "forgot" && all[0].entries.length, 4);
});

const TIDE = compile(`
VAR porta_coberta = false

=== desce ===
~ clock_start("Vazante", 0, 10)
~ clock_cost("rest", 3)
~ clock_cost("fight", 2)
~ clock_cost("round", 1)
A água recua.
-> END

=== sala ===
~ clock_tick(4)
{clock() >= 8: A água já cobriu esta porta. | Faltam {clock_left()} pra água voltar.}
-> END

=== sobe ===
~ clock_stop()
-> END

=== sem_tamanho ===
~ clock_start("Nada", 0, 0)
-> END

=== cobra_errado ===
~ clock_cost("sono", 1)
-> END
`);

test("o relógio corre pelo texto, para no limite, e o texto lê quanto passou e quanto falta", () => {
  const runner = new StoryRunner(TIDE, makeHost());
  assert.equal(runner.clock(), null);

  // Pôr o relógio na tela é a notícia; dizer o que gasta tempo, não.
  assert.deepEqual(eventsIn(runner.start("desce").beats), [
    { type: "clock", clock: { label: "Vazante", value: 0, limit: 10, costs: { rest: 0, fight: 0, round: 0 } } },
  ]);
  assert.deepEqual(runner.clock(), { label: "Vazante", value: 0, limit: 10, costs: { rest: 3, fight: 2, round: 1 } });

  assert.deepEqual(lines(runner.start("sala").beats), ["Faltam 6 pra água voltar."]);
  assert.deepEqual(lines(runner.start("sala").beats), ["A água já cobriu esta porta."]);
  // Daqui não passa: 8 + 4 fica em 10.
  const last = runner.start("sala");
  assert.equal(runner.clock()!.value, 10);
  assert.equal(eventsIn(last.beats).length, 1);
  assert.equal(eventsIn(runner.start("sala").beats).length, 0, "relógio parado no limite não é notícia");

  assert.deepEqual(eventsIn(runner.start("sobe").beats), [{ type: "clock", clock: null }]);
  assert.equal(runner.clock(), null);
  assert.throws(() => runner.start("sem_tamanho"));
});

test("descansar, lutar e cada rodada de luta gastam o que a história disse que gastam — e nada, sem relógio", () => {
  const runner = new StoryRunner(TIDE, makeHost());
  assert.equal(runner.spend("rest"), false);
  assert.equal(runner.spend("round"), false);

  runner.start("desce");
  assert.equal(runner.spend("rest"), true);
  assert.equal(runner.spend("fight"), true);
  assert.equal(runner.clock()!.value, 5);
  // Uma rodada que vira no meio da luta: o tempo anda sozinho, sem o texto mandar.
  assert.equal(runner.spend("round"), true);
  assert.equal(runner.spend("round"), true);
  assert.equal(runner.clock()!.value, 7);
  runner.spend("rest");
  assert.equal(runner.clock()!.value, 10);
  assert.equal(runner.spend("fight"), false, "no limite o tempo não anda mais");
  assert.equal(runner.spend("round"), false);
  assert.throws(() => runner.start("cobra_errado"));
});

test("a condição clock:N de um objeto do mapa vale quando o relógio já chegou em N", () => {
  const runner = new StoryRunner(TIDE, makeHost());
  assert.equal(clockCondition("clock:4", runner.clock()), false);
  runner.start("desce");
  runner.start("sala");
  assert.equal(clockCondition("clock:4", runner.clock()), true);
  assert.equal(clockCondition("clock:5", runner.clock()), false);
  // Não é pergunta de relógio: quem responde é outro.
  assert.equal(clockCondition("porta_coberta", runner.clock()), undefined);
  assert.equal(clockCondition("clock:cedo", runner.clock()), undefined);
});

test("diário e relógio vão no save junto com a história, e um save de antes deles abre com os dois vazios", () => {
  const before = new StoryRunner(NOTES + "", makeHost());
  before.start("pistas");
  before.start("coletor");
  const reopened = new StoryRunner(NOTES, makeHost(), before.save());
  assert.deepEqual(reopened.journal(), before.journal());
  assert.equal(reopened.visited("pistas"), true);

  const tide = new StoryRunner(TIDE, makeHost());
  tide.start("desce");
  tide.start("sala");
  const saved = tide.save();
  assert.deepEqual(new StoryRunner(TIDE, makeHost(), saved).clock(), tide.clock());

  // Uma luta perdida gasta o tempo no que estava gravado, sem abrir a história — e o resto do save não muda.
  const charged = chargeSavedClock(saved, "fight")!;
  const after = new StoryRunner(TIDE, makeHost(), charged);
  assert.equal(after.clock()!.value, 6);
  assert.equal(after.visited("sala"), true);
  assert.equal(chargeSavedClock(null, "fight"), null);
  // E as rodadas que ela durou, uma por uma: perdida na rodada 4, viraram 3.
  assert.equal(new StoryRunner(TIDE, makeHost(), chargeSavedClock(saved, "round", 3)!).clock()!.value, 7);
  assert.equal(new StoryRunner(TIDE, makeHost(), chargeSavedClock(charged, "round", 3)!).clock()!.value, 9);
  assert.equal(new StoryRunner(TIDE, makeHost(), chargeSavedClock(saved, "round", 40)!).clock()!.value, 10, "não passa do limite");
  assert.equal(chargeSavedClock(saved, "round", 0), saved, "luta que caiu na primeira rodada não gastou rodada nenhuma");

  // Um relógio gravado antes de a rodada custar abre sem cobrá-la.
  const { ink: sameInk, memory } = unpackStory(saved);
  const older = JSON.stringify({
    ealen: 1,
    ink: JSON.parse(sameInk),
    journal: [],
    clock: { ...memory.clock, costs: { rest: 3, fight: 2 } },
  });
  assert.deepEqual(new StoryRunner(TIDE, makeHost(), older).clock()!.costs, { rest: 3, fight: 2, round: 0 });
  assert.equal(chargeSavedClock(older, "round", 3), older);

  // O formato antigo: só o estado do Ink. Abre igual, sem diário nem relógio.
  const old = unpackStory(saved).ink;
  assert.notEqual(old, saved);
  const legacy = new StoryRunner(TIDE, makeHost(), old);
  assert.equal(legacy.visited("sala"), true);
  assert.deepEqual(legacy.journal(), []);
  assert.equal(legacy.clock(), null);
  assert.equal(chargeSavedClock(old, "fight"), old);
});

const ARM = compile(`
=== queda ===
~ afflict("lish", "wounded_arm")
~ afflict("lish", "wounded_arm")
{afflicted("lish", "wounded_arm"): O braço de Lish não fecha mais direito.}
{afflicted("hero", "wounded_arm"): O seu também. | O seu, sim.}
-> END

=== cura ===
~ cure("lish", "wounded_arm")
~ cure("hero", "wounded_arm")
-> END

=== ninguem ===
~ afflict("taevel", "wounded_arm")
-> END

=== nada ===
~ afflict("hero", "azar")
-> END
`);

test("afflict põe em alguém uma condição que dura entre lutas, vai no save, e cure tira", () => {
  const runner = new StoryRunner(ARM, makeHost());
  const fall = runner.start("queda");
  // Pôr de novo o que já está não é notícia.
  assert.deepEqual(eventsIn(fall.beats), [{ type: "afflicted", name: "lish", status: "Braço ferido" }]);
  assert.deepEqual(lines(fall.beats), ["O braço de Lish não fecha mais direito.", "O seu, sim."]);
  assert.deepEqual(runner.afflictions(), { "companion:lish": ["wounded_arm"] });

  const reopened = new StoryRunner(ARM, makeHost(), runner.save());
  assert.deepEqual(reopened.afflictions(), { "companion:lish": ["wounded_arm"] });

  // Só o que havia pra tirar vira notícia.
  assert.deepEqual(eventsIn(reopened.start("cura").beats), [{ type: "afflicted", name: "lish", status: "Braço ferido", cured: true }]);
  assert.deepEqual(reopened.afflictions(), {});

  assert.throws(() => runner.start("ninguem"));
  assert.throws(() => runner.start("nada"));
});
