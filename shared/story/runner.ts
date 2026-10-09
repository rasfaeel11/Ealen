import { Story } from "inkjs";
import { addItemToInventory, findInventorySlot } from "../inventoryEffects";
import { applyXpGain } from "../leveling";
import { findItemTemplate } from "../mock/items";
import { isInParty, isOrder, joinParty, leaveParty, presentCompanions, type PartyMember } from "../party";
import { AREAS } from "../world/areas";
import type { RngHolder } from "../tactics/rng";
import type { Character } from "../types/character";
import type { CharacterClass } from "../types/characterClass";
import type { ConsumableItem } from "../types/inventory";
import type { LevelUpResult } from "../types/levelUp";
import { checkChance, isAttribute, rollCheck, type CheckResult, type SkillCheck } from "./checks";
import {
  emptyMemory,
  forgetRecent,
  isClockCost,
  isNoted,
  noteEntry,
  packStory,
  recallEntries,
  startClock,
  tickClock,
  unpackStory,
  type ClockCost,
  type JournalEntry,
  type StoryClock,
  type StoryMemory,
} from "./memory";

/**
 * A história do jogo, rodando.
 *
 * Toda conversa é um trecho (um "knot") de UMA história em Ink, compilada de
 * client/story. Uma história só, e não um arquivo por personagem, porque
 * assim o estado dela inteiro — as variáveis (as "flags" do jogo), quantas
 * vezes cada trecho já foi lido, que escolhas de uma vez só já foram gastas
 * — é uma coisa única, que se salva e se carrega de uma vez (`save`). Com
 * ele vão o diário de pistas e o relógio (ver ./memory.ts), que também são
 * da história.
 *
 * Como o motor de combate, isto não desenha nada: `start` e `choose`
 * devolvem o que há pra mostrar (falas, o que aconteceu, as escolhas) e a
 * caixa de diálogo do client reproduz.
 *
 * O texto fala com o jogo por funções que o Ink chama (declaradas com
 * EXTERNAL em client/story/main.ink):
 *
 *   attr("len")         o atributo do personagem
 *   order(), people()   a Ordem e o Povo dele ("luminar", "althirim"...)
 *   level()
 *   has_item("id")
 *   defeated("area:grupo")   se aquele grupo de inimigos já foi vencido
 *   check("ul", 13)     rola um teste AGORA, no meio do texto, e diz se passou
 *   passed()            se passou o teste da escolha que acabou de ser feita
 *   give_item("id")     põe um item na mochila
 *   take_item("id")     tira um da mochila; diz se havia o que tirar
 *   grant_xp(30)
 *   start_fight("grupo")     quando a conversa acabar, luta com esse grupo
 *                            de inimigos da área em que se está
 *   travel("area", "ponto")  quando a conversa acabar, leva o personagem a
 *                            esse ponto de chegada dessa área
 *   join_party("lish")       põe um companheiro no grupo (as chaves estão
 *                            em COMPANIONS, ../party.ts)
 *   leave_party("lish")      tira do grupo; a ficha dele fica guardada
 *   in_party("lish")         se ele está no grupo agora
 *   unlock_order("rachador") destrava uma Ordem pros próximos jogos novos
 *   note("id", "texto")      anota uma pista no diário (de novo com o mesmo
 *                            id, troca o texto em vez de duplicar)
 *   noted("id")              se a pista está no diário, e legível
 *   forget(3)                apaga as 3 anotações mais recentes; ficam em
 *                            branco no lugar delas
 *   recall("id")             devolve uma anotação apagada; recall_all(), todas
 *   clock_start("Vazante", 0, 12)   põe um relógio na tela, de 0 a 12
 *   clock_tick(2)            faz o tempo andar (negativo volta)
 *   clock(), clock_left()    quanto já passou, e quanto falta
 *   clock_cost("rest", 2)    quanto descansar ("rest") ou lutar ("fight")
 *                            gasta do relógio sem o texto mandar
 *   clock_stop()             tira o relógio da tela
 *
 * `start_fight` e `travel` não interrompem o texto: viram acontecimentos
 * (`fight`, `travel`) que a cena cumpre depois da última fala — ver `aftermath`.
 *
 * Uma escolha com a etiqueta `# check: len 14` é um teste anunciado: a caixa
 * mostra a chance antes, o dado rola quando ela é escolhida, e o texto
 * pergunta o resultado com `passed()`.
 *
 * Uma fala no formato `Nome: texto` sai com `speaker` preenchido; o resto é
 * narração.
 */

/** O que a história pode ler e mexer no jogo. */
export interface StoryHost {
  /** Lido pelos testes e pelo texto; MUTADO por give_item, take_item e grant_xp. */
  character: Character;
  /** Quem já andou com o personagem. MUTADO por join_party, leave_party e grant_xp. */
  companions: PartyMember[];
  rng: RngHolder;
  /** Se o grupo de inimigos "área:grupo" já foi vencido. */
  isDefeated: (key: string) => boolean;
}

/** O que aconteceu no jogo por causa do texto — pra caixa de diálogo anunciar. */
export type StoryEvent =
  | ({ type: "check" } & CheckResult)
  /** `kept` falso = a mochila estava cheia e o item se perdeu. */
  | { type: "item"; item: ConsumableItem; kept: boolean }
  | { type: "itemTaken"; item: ConsumableItem }
  | { type: "xp"; amount: number; levelUp: LevelUpResult }
  /** A conversa termina em luta com este grupo de inimigos da área atual. */
  | { type: "fight"; group: string }
  /** A conversa termina com o personagem levado a outro lugar. */
  | { type: "travel"; area: string; spawn: string }
  | { type: "joined"; name: string }
  | { type: "left"; name: string }
  /** Uma Ordem destravada pros próximos jogos novos. Quem guarda isso é o perfil do jogador, não o save. */
  | { type: "unlock"; order: CharacterClass }
  /** Uma pista anotada no diário (ou reescrita). */
  | { type: "noted"; entry: JournalEntry }
  /** Anotações apagadas do diário, da mais recente pra mais antiga. */
  | { type: "forgot"; entries: JournalEntry[] }
  /** Anotações apagadas que voltaram. */
  | { type: "recalled"; entries: JournalEntry[] }
  /** O relógio mudou: como ficou, ou null se saiu da tela. Não se anuncia na caixa — a barra mostra. */
  | { type: "clock"; clock: StoryClock | null };

/** O que uma conversa deixa pra cena fazer quando a última fala passar. */
export interface Aftermath {
  fight?: string;
  travel?: { area: string; spawn: string };
  /** Ordens que o texto destravou, pra cena gravar no perfil do jogador. */
  unlocks: CharacterClass[];
}

/**
 * O que os trechos de uma conversa pedem pra depois dela. Pedido repetido,
 * vale o último; luta e viagem juntas, a luta vem primeiro e a viagem só
 * acontece se ela for vencida.
 */
export function aftermath(steps: readonly DialogueStep[]): Aftermath {
  const result: Aftermath = { unlocks: [] };
  for (const step of steps) {
    for (const beat of step.beats) {
      if (beat.kind !== "event") continue;
      if (beat.event.type === "fight") result.fight = beat.event.group;
      else if (beat.event.type === "travel") result.travel = { area: beat.event.area, spawn: beat.event.spawn };
      else if (beat.event.type === "unlock") result.unlocks.push(beat.event.order);
    }
  }
  return result;
}

/** Uma coisa por vez na caixa: uma fala (ou narração), ou um acontecimento. */
export type DialogueBeat = { kind: "line"; speaker?: string; text: string } | { kind: "event"; event: StoryEvent };

export interface DialogueChoice {
  /** O que entregar a `choose`. */
  index: number;
  text: string;
  /** Presente quando escolher isto rola um teste. */
  check?: SkillCheck & { chance: number };
}

/** Um trecho da conversa: o que mostrar, em ordem, e as escolhas no fim. Sem escolhas, a conversa acabou. */
export interface DialogueStep {
  beats: DialogueBeat[];
  choices: DialogueChoice[];
}

const SPEAKER_LINE = /^([\p{L}][\p{L}\p{M}' -]{0,29}):\s+(.+)$/u;
const CHECK_TAG = /^check:\s*(\w+)\s+(\d+)$/;

function parseCheck(tags: string[] | null): SkillCheck | undefined {
  for (const tag of tags ?? []) {
    const match = CHECK_TAG.exec(tag.trim());
    if (match && isAttribute(match[1])) return { attribute: match[1], difficulty: Number(match[2]) };
  }
  return undefined;
}

export class StoryRunner {
  private readonly story: Story;
  /** O que as funções chamadas pelo texto fizeram desde a última fala. */
  private pending: StoryEvent[] = [];
  private lastCheckPassed = false;
  /** O diário e o relógio: o que a história guarda fora das variáveis do Ink. */
  private memory: StoryMemory = emptyMemory();

  /**
   * `json` é a história compilada; `saved`, o que `save` devolveu numa
   * sessão anterior. Um estado salvo que a história atual não aceita mais
   * (ela mudou muito desde então) é descartado: começa-se do zero.
   */
  constructor(
    json: string,
    private readonly host: StoryHost,
    saved?: string | null,
  ) {
    this.story = new Story(json);
    this.story.onError = (message, type) => {
      // 0 = autor, 1 = aviso, 2 = erro. Aviso não derruba a conversa.
      if (type !== 1) throw new Error(`Erro na história: ${message}`);
    };
    this.bind();

    if (saved) {
      const { ink, memory } = unpackStory(saved);
      try {
        this.story.state.LoadJson(ink);
        this.memory = memory;
      } catch {
        this.story.ResetState();
      }
    }
  }

  private bind(): void {
    const { story, host } = this;
    const check = (attribute: unknown, difficulty: unknown): boolean => {
      if (!isAttribute(attribute)) throw new Error(`A história testa um atributo que não existe: "${String(attribute)}"`);
      const result = rollCheck(host.rng, host.character, { attribute, difficulty: Number(difficulty) });
      this.pending.push({ type: "check", ...result });
      return result.success;
    };

    // Só leitura: o Ink pode chamar adiantado, enquanto monta a linha.
    story.BindExternalFunction("attr", (name: unknown) => (isAttribute(name) ? host.character.attributes[name] : 0), true);
    story.BindExternalFunction("order", () => host.character.characterClass, true);
    story.BindExternalFunction("people", () => host.character.race, true);
    story.BindExternalFunction("level", () => host.character.level, true);
    story.BindExternalFunction("has_item", (id: string) => (findInventorySlot(host.character, id)?.quantity ?? 0) > 0, true);
    story.BindExternalFunction("defeated", (key: string) => host.isDefeated(key), true);
    story.BindExternalFunction("passed", () => this.lastCheckPassed, true);
    story.BindExternalFunction("in_party", (key: string) => isInParty(host.companions, String(key)), true);
    story.BindExternalFunction("noted", (id: string) => isNoted(this.memory.journal, String(id)), true);
    story.BindExternalFunction("clock", () => this.memory.clock?.value ?? 0, true);
    story.BindExternalFunction("clock_left", () => (this.memory.clock ? this.memory.clock.limit - this.memory.clock.value : 0), true);

    // Mexem no jogo ou gastam o dado: só na hora em que o texto chega nelas.
    story.BindExternalFunction("check", check);
    story.BindExternalFunction("give_item", (id: string) => {
      const item = findItemTemplate(id);
      if (!item) throw new Error(`A história dá um item que não existe: "${id}"`);
      this.pending.push({ type: "item", item, kept: addItemToInventory(host.character, item) });
    });
    story.BindExternalFunction("take_item", (id: string) => {
      const item = findItemTemplate(id);
      if (!item) throw new Error(`A história pede um item que não existe: "${id}"`);
      const { inventory } = host.character;
      const slot = findInventorySlot(host.character, id);
      if (!inventory || !slot || slot.quantity <= 0) return false;

      // Uma unidade inteira da pilha, não uma carga: o item muda de mão.
      slot.quantity -= 1;
      if (slot.quantity <= 0) {
        inventory.slots = inventory.slots.filter((other) => other !== slot);
      } else {
        slot.item.data.usesRemaining = slot.item.data.maxUses;
      }
      this.pending.push({ type: "itemTaken", item });
      return true;
    });
    story.BindExternalFunction("grant_xp", (amount: number) => {
      // O grupo inteiro aprende junto; o que a caixa anuncia é o que houve com o personagem.
      for (const companion of presentCompanions(host.companions)) applyXpGain(companion, amount);
      this.pending.push({ type: "xp", amount, levelUp: applyXpGain(host.character, amount) });
    });
    story.BindExternalFunction("join_party", (key: string) => {
      const joined = joinParty(host.companions, String(key), host.character.level);
      if (joined) this.pending.push({ type: "joined", name: joined.name });
    });
    story.BindExternalFunction("leave_party", (key: string) => {
      const left = leaveParty(host.companions, String(key));
      if (left) this.pending.push({ type: "left", name: left.name });
    });
    story.BindExternalFunction("unlock_order", (order: string) => {
      if (!isOrder(order)) throw new Error(`A história destrava uma Ordem que não existe: "${String(order)}"`);
      this.pending.push({ type: "unlock", order });
    });
    story.BindExternalFunction("note", (id: string, text: string) => {
      const entry = noteEntry(this.memory.journal, String(id), String(text));
      if (entry) this.pending.push({ type: "noted", entry: { ...entry } });
    });
    story.BindExternalFunction("forget", (count: number) => {
      const entries = forgetRecent(this.memory.journal, Number(count));
      if (entries.length > 0) this.pending.push({ type: "forgot", entries: entries.map((entry) => ({ ...entry })) });
    });
    const recall = (id?: string) => {
      const entries = recallEntries(this.memory.journal, id);
      if (entries.length > 0) this.pending.push({ type: "recalled", entries: entries.map((entry) => ({ ...entry })) });
    };
    story.BindExternalFunction("recall", (id: string) => recall(String(id)));
    story.BindExternalFunction("recall_all", () => recall());
    story.BindExternalFunction("clock_start", (label: string, value: number, limit: number) => {
      if (!(Number(limit) > 0)) throw new Error(`A história põe um relógio sem tamanho: "${String(label)}" vai até ${String(limit)}`);
      this.memory.clock = startClock(String(label), Number(value), Number(limit));
      this.announceClock();
    });
    story.BindExternalFunction("clock_stop", () => {
      if (!this.memory.clock) return;
      this.memory.clock = null;
      this.announceClock();
    });
    story.BindExternalFunction("clock_tick", (amount: number) => {
      if (this.memory.clock && tickClock(this.memory.clock, Number(amount))) this.announceClock();
    });
    story.BindExternalFunction("clock_cost", (what: string, amount: number) => {
      if (!isClockCost(what)) throw new Error(`A história cobra do relógio uma coisa que não existe: "${String(what)}"`);
      if (this.memory.clock) this.memory.clock.costs[what] = Math.max(0, Math.floor(Number(amount)));
    });
    story.BindExternalFunction("start_fight", (group: string) => {
      this.pending.push({ type: "fight", group: String(group) });
    });
    story.BindExternalFunction("travel", (area: string, spawn: string) => {
      if (!AREAS[area]) throw new Error(`A história leva a uma área que não existe: "${area}"`);
      this.pending.push({ type: "travel", area, spawn: String(spawn) });
    });
  }

  /** Se a história tem um trecho com este nome. */
  hasKnot(name: string): boolean {
    return this.story.KnotContainerWithName(name) !== null;
  }

  /**
   * Se o trecho `knot` já foi lido alguma vez (nesta sessão ou no save). É o
   * que gasta um gatilho de uma vez só. Só funciona em história compilada
   * contando todas as visitas — é como client/scripts/compileStory.ts compila.
   */
  visited(knot: string): boolean {
    return this.hasKnot(knot) && (this.story.state.VisitCountAtPathString(knot) ?? 0) > 0;
  }

  /** Começa a conversa do trecho `knot`. */
  start(knot: string): DialogueStep {
    if (!this.hasKnot(knot)) throw new Error(`A história não tem o trecho "${knot}"`);
    this.pending = [];
    this.story.ChoosePathString(knot);
    return this.advance([]);
  }

  /** Faz a escolha de índice `index` do último trecho devolvido, rolando o teste dela se houver. */
  choose(index: number): DialogueStep {
    const choice = this.story.currentChoices[index];
    if (!choice) throw new Error(`Escolha ${index} não existe`);

    const beats: DialogueBeat[] = [];
    const check = parseCheck(choice.tags);
    if (check) {
      const result = rollCheck(this.host.rng, this.host.character, check);
      this.lastCheckPassed = result.success;
      beats.push({ kind: "event", event: { type: "check", ...result } });
    }

    this.story.ChooseChoiceIndex(index);
    return this.advance(beats);
  }

  /** Lê a história até a próxima escolha (ou o fim), juntando falas e acontecimentos na ordem. */
  private advance(beats: DialogueBeat[]): DialogueStep {
    const flush = () => {
      for (const event of this.pending) beats.push({ kind: "event", event });
      this.pending = [];
    };

    while (this.story.canContinue) {
      const text = (this.story.Continue() ?? "").trim();
      // O que o texto fez pra chegar nesta fala vem antes dela: o teste, depois o que ele rendeu.
      flush();
      if (text === "") continue;

      const match = SPEAKER_LINE.exec(text);
      beats.push(match ? { kind: "line", speaker: match[1], text: match[2] } : { kind: "line", text });
    }
    flush();

    const choices = this.story.currentChoices.map((choice): DialogueChoice => {
      const check = parseCheck(choice.tags);
      return {
        index: choice.index,
        text: choice.text.trim(),
        check: check && { ...check, chance: checkChance(this.host.character, check) },
      };
    });
    return { beats, choices };
  }

  /** O valor de uma variável da história (uma "flag"). Undefined se ela não declara nenhuma com esse nome. */
  flag(name: string): boolean | number | string | undefined {
    if (!this.story.variablesState.GlobalVariableExistsWithName(name)) return undefined;
    const value: unknown = this.story.variablesState.$(name);
    return typeof value === "boolean" || typeof value === "number" || typeof value === "string" ? value : undefined;
  }

  /** Muda uma variável que a história declara (com VAR). É como o jogo conta algo a ela. */
  setFlag(name: string, value: boolean | number | string): void {
    this.story.variablesState.$(name, value);
  }

  private announceClock(): void {
    this.pending.push({ type: "clock", clock: this.memory.clock && structuredClone(this.memory.clock) });
  }

  /** O diário, na ordem em que foi escrito. As anotações apagadas vêm junto, marcadas (`lost`). */
  journal(): readonly JournalEntry[] {
    return this.memory.journal;
  }

  /** O relógio que está correndo, se há um. */
  clock(): StoryClock | null {
    return this.memory.clock;
  }

  /**
   * O jogo avisa que aconteceu algo que gasta tempo sem o texto mandar: um
   * descanso, uma luta. Devolve se o relógio andou.
   */
  spend(what: ClockCost): boolean {
    const { clock } = this.memory;
    return clock !== null && tickClock(clock, clock.costs[what]);
  }

  /** O estado inteiro da história — o do Ink, o diário e o relógio — pra guardar no save. */
  save(): string {
    return packStory(this.story.state.ToJson(), this.memory);
  }
}
