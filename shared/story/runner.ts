import { Story } from "inkjs";
import { addItemToInventory, findInventorySlot } from "../inventoryEffects";
import { applyXpGain } from "../leveling";
import { findItemTemplate } from "../mock/items";
import type { RngHolder } from "../tactics/rng";
import type { Character } from "../types/character";
import type { ConsumableItem } from "../types/inventory";
import type { LevelUpResult } from "../types/levelUp";
import { checkChance, isAttribute, rollCheck, type CheckResult, type SkillCheck } from "./checks";

/**
 * A história do jogo, rodando.
 *
 * Toda conversa é um trecho (um "knot") de UMA história em Ink, compilada de
 * client/story. Uma história só, e não um arquivo por personagem, porque
 * assim o estado dela inteiro — as variáveis (as "flags" do jogo), quantas
 * vezes cada trecho já foi lido, que escolhas de uma vez só já foram gastas
 * — é uma coisa única, que se salva e se carrega de uma vez (`save`).
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
 *   grant_xp(30)
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
  /** Lido pelos testes e pelo texto; MUTADO por give_item e grant_xp. */
  character: Character;
  rng: RngHolder;
  /** Se o grupo de inimigos "área:grupo" já foi vencido. */
  isDefeated: (key: string) => boolean;
}

/** O que aconteceu no jogo por causa do texto — pra caixa de diálogo anunciar. */
export type StoryEvent =
  | ({ type: "check" } & CheckResult)
  /** `kept` falso = a mochila estava cheia e o item se perdeu. */
  | { type: "item"; item: ConsumableItem; kept: boolean }
  | { type: "xp"; amount: number; levelUp: LevelUpResult };

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
      try {
        this.story.state.LoadJson(saved);
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

    // Mexem no jogo ou gastam o dado: só na hora em que o texto chega nelas.
    story.BindExternalFunction("check", check);
    story.BindExternalFunction("give_item", (id: string) => {
      const item = findItemTemplate(id);
      if (!item) throw new Error(`A história dá um item que não existe: "${id}"`);
      this.pending.push({ type: "item", item, kept: addItemToInventory(host.character, item) });
    });
    story.BindExternalFunction("grant_xp", (amount: number) => {
      this.pending.push({ type: "xp", amount, levelUp: applyXpGain(host.character, amount) });
    });
  }

  /** Se a história tem um trecho com este nome. */
  hasKnot(name: string): boolean {
    return this.story.KnotContainerWithName(name) !== null;
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

  /** O estado inteiro da história, pra guardar no save. */
  save(): string {
    return this.story.state.ToJson();
  }
}
