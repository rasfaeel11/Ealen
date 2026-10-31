import * as Phaser from "phaser";
import { sfx } from "../audio";
import {
  ATTRIBUTE_NAMES,
  faceOf,
  type Attributes,
  type DialogueBeat,
  type DialogueChoice,
  type DialogueStep,
  type StoryEvent,
} from "@jogo/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import { addBodyText, addTitleText, drawDiamond } from "../ui";
import { PORTRAIT_WIDTH, portraitFor } from "./portraits";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

/** A faixa vai de lado a lado, e o texto fica numa coluna no meio dela. */
const BAND_HEIGHT = 236;
const BAND_TOP = GAME_HEIGHT - BAND_HEIGHT;
/** O escuro sobe além da faixa, sumindo aos poucos, pra o mapa não terminar numa linha. */
const FADE_HEIGHT = 70;
const TEXT_X = 150;
const TEXT_WIDTH = 980;
const SPEAKER_Y = BAND_TOP + 18;
const TEXT_Y = BAND_TOP + 56;
const CHOICE_GAP = 4;
const CHOICE_PAD = 6;
/** O busto encosta na borda de baixo da tela, à esquerda, e entra na faixa por cima. */
const PORTRAIT_X = 40;
/** Com busto na tela, o texto começa depois dele. */
const PORTRAIT_LEFT = PORTRAIT_X + PORTRAIT_WIDTH + 20;
/** O busto que entra vem deste tanto à esquerda, aparecendo. */
const PORTRAIT_SLIDE = 60;
const PORTRAIT_IN_MS = 220;
const PORTRAIT_OUT_MS = 160;
/** Quem saiu da vez fica nesta cor: narração e acontecimento escurecem o busto de quem falava. */
const PORTRAIT_DIM = 0x5a5a5a;
/** A tecla que abriu a conversa não pode ser a mesma que passa a primeira fala. */
const INPUT_GRACE_MS = 200;

const ATTRIBUTE_LABEL = (attribute: keyof Attributes) => ATTRIBUTE_NAMES[attribute];

/**
 * Um acontecimento da história, em uma linha pra quem joga. Null é o que não
 * se anuncia: a luta e a viagem que o texto pede acontecem sozinhas, depois
 * da conversa.
 */
function describeEvent(event: StoryEvent): { text: string; color: string } | null {
  switch (event.type) {
    case "check": {
      const roll =
        event.natural === 20 ? "20 natural" : event.natural === 1 ? "1 natural" : `${event.total} contra ${event.difficulty}`;
      return {
        text: `Teste de ${ATTRIBUTE_LABEL(event.attribute)}: ${roll} — ${event.success ? "passou" : "falhou"}.`,
        color: event.success ? TEXT_COLORS.goldBright : TEXT_COLORS.danger,
      };
    }
    case "item":
      return event.kept
        ? { text: `Recebeu: ${event.item.name}.`, color: TEXT_COLORS.item }
        : { text: `${event.item.name} não coube na mochila.`, color: TEXT_COLORS.danger };
    case "xp":
      return {
        text: event.levelUp.leveledUp
          ? `+${event.amount} de XP. Subiu para o nível ${event.levelUp.newLevel}!${
              event.levelUp.learned?.length ? ` Aprendeu ${event.levelUp.learned.map((ability) => ability.name).join(" e ")}.` : ""
            }`
          : `+${event.amount} de XP.`,
        color: TEXT_COLORS.goldBright,
      };
    case "coins":
      return event.amount >= 0
        ? { text: `Recebeu ${event.amount} de ${event.coin}. Na bolsa: ${event.left}.`, color: TEXT_COLORS.item }
        : { text: `Pagou ${-event.amount} de ${event.coin}. Na bolsa: ${event.left}.`, color: TEXT_COLORS.item };
    case "mageRose":
      return {
        text: `Endyru chegou ao ${event.level}.${event.learned.length ? ` Aprendeu ${event.learned.join(" e ")}.` : ""}`,
        color: TEXT_COLORS.goldBright,
      };
    case "auraRose":
      return { text: `${event.name} chegou ao ${event.level}. ${event.style}.`, color: TEXT_COLORS.goldBright };
    case "itemTaken":
      return { text: `Entregou: ${event.item.name}.`, color: TEXT_COLORS.item };
    case "joined":
      return { text: `${event.name} agora anda com você.`, color: TEXT_COLORS.goldBright };
    case "left":
      return { text: `${event.name} deixa o grupo.`, color: TEXT_COLORS.inkDim };
    case "noted":
      return { text: `Anotado no diário: ${event.entry.text}`, color: TEXT_COLORS.item };
    case "afflicted":
      return event.cured
        ? { text: `${event.name} não tem mais: ${event.status}.`, color: TEXT_COLORS.goldBright }
        : { text: `${event.name}: ${event.status}. Fica até alguém cuidar.`, color: TEXT_COLORS.danger };
    case "fight":
    case "travel":
    // O relógio não se anuncia: a barra no alto da tela mostra.
    case "clock":
      return null;
  }
}

function isShown(beat: DialogueBeat): boolean {
  return beat.kind === "line" || describeEvent(beat.event) !== null;
}

/** Um trecho sem nada pra pôr na tela: nenhuma fala, nenhum acontecimento anunciado, nenhuma escolha. */
export function isSilent(step: DialogueStep): boolean {
  return step.choices.length === 0 && !step.beats.some(isShown);
}

/** Uma escolha na tela: a faixa, o número, o selo do teste (se tem) e o texto. */
interface ChoiceRow {
  band: Phaser.GameObjects.Rectangle;
  number: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Text;
  text: Phaser.GameObjects.Text;
}

/**
 * A conversa: uma faixa escura no pé da tela, de lado a lado, com quem fala em
 * cima, a fala no meio, as escolhas embaixo, e o busto de quem fala à esquerda
 * (ver portraits.ts). Mostra uma coisa por vez — fala, narração ou
 * acontecimento — e só oferece as escolhas depois da última. Não sabe nada de
 * história: recebe um trecho pronto (`DialogueStep`) e devolve o que foi escolhido.
 *
 * Espaço, Enter ou clique passam a fala; 1-9, setas + Enter ou clique
 * escolhem.
 */
export class DialogueBox {
  private readonly panel: Phaser.GameObjects.Graphics;
  /** Quanto a faixa cresceu pra cima pra caber a fala mais as escolhas. */
  private lift = 0;
  private readonly speaker: Phaser.GameObjects.Text;
  /** O busto de quem tem a vez, e o de quem acabou de sair dela (escurecendo e sumindo). */
  private portrait: Phaser.GameObjects.Image;
  private leaving: Phaser.GameObjects.Image;
  /** De quem é o busto na tela (aceso ou escuro), ou null sem busto. */
  private portraitSpeaker: string | null = null;
  /** Onde o texto começa e até onde vai: anda pra direita pra não ficar embaixo do busto. */
  private textLeft = TEXT_X;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private rows: ChoiceRow[] = [];
  private choices: DialogueChoice[] = [];
  private focused = 0;
  private readonly openedAt: number;
  /** O que a próxima tecla de "seguir" faz; null enquanto as escolhas estão na tela. */
  private onAdvance: (() => void) | null = null;
  private onChoose: ((index: number) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    /**
     * Avisado de cada acontecimento na hora em que a conversa chega nele,
     * anunciado na caixa ou não. Se devolver uma função, ela é chamada quando
     * o jogador passa adiante: é como algo fica na tela só enquanto a caixa
     * fala daquilo (o diário se apagando).
     */
    private readonly onEvent?: (event: StoryEvent) => (() => void) | void,
  ) {
    this.panel = addHud(scene.add.graphics());
    const bust = () => addHud(scene.add.image(PORTRAIT_X, GAME_HEIGHT, "__DEFAULT").setOrigin(0, 1).setVisible(false));
    this.leaving = bust();
    this.portrait = bust();
    this.speaker = addHud(addTitleText(scene, TEXT_X, SPEAKER_Y, "", { fontSize: "22px", color: TEXT_COLORS.goldBright }));
    this.body = addHud(
      addBodyText(scene, TEXT_X, TEXT_Y, "", {
        fontSize: "21px",
        lineSpacing: 6,
        wordWrap: { width: TEXT_WIDTH },
      }),
    );
    this.hint = addHud(
      addBodyText(scene, GAME_WIDTH - 40, GAME_HEIGHT - 30, "Espaço ▸", {
        fontSize: "15px",
        color: TEXT_COLORS.gold,
      }).setOrigin(1, 0),
    );
    this.openedAt = scene.time.now;
    this.drawBand();

    scene.input.keyboard?.on("keydown", this.onKey, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  /**
   * Mostra um trecho da conversa, do começo ao fim. A promessa resolve com o
   * índice da escolha feita, ou com null quando o trecho não tem escolhas (a
   * conversa acabou) e o jogador passou a última fala.
   */
  async play(step: DialogueStep): Promise<number | null> {
    for (const beat of step.beats) {
      const done = beat.kind === "event" ? this.onEvent?.(beat.event) : undefined;
      if (isShown(beat)) {
        this.showBeat(beat);
        await new Promise<void>((resolve) => (this.onAdvance = resolve));
        this.onAdvance = null;
      }
      done?.();
    }
    if (step.choices.length === 0) return null;

    this.showChoices(step.choices, !step.beats.some(isShown));
    const index = await new Promise<number>((resolve) => (this.onChoose = resolve));
    this.onChoose = null;
    this.clearChoices();
    return index;
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.clearChoices();
    this.scene.tweens.killTweensOf([this.portrait, this.leaving]);
    for (const object of [this.panel, this.portrait, this.leaving, this.speaker, this.body, this.hint]) object.destroy();
  }

  /** A faixa: escuro cheio embaixo, sumindo pra cima, com um fio dourado onde o texto começa. */
  private drawBand(): void {
    const top = BAND_TOP - this.lift;
    const g = this.panel;
    g.clear();
    g.fillGradientStyle(COLORS.panelDeep, COLORS.panelDeep, COLORS.panelDeep, COLORS.panelDeep, 0, 0, 0.97, 0.97);
    g.fillRect(0, top - FADE_HEIGHT, GAME_WIDTH, FADE_HEIGHT);
    g.fillStyle(COLORS.panelDeep, 0.97);
    g.fillRect(0, top, GAME_WIDTH, GAME_HEIGHT - top);
    g.lineStyle(1, COLORS.gold, 0.5);
    g.lineBetween(0, top, GAME_WIDTH, top);
    drawDiamond(g, GAME_WIDTH / 2, top, 4);
  }

  private showBeat(beat: DialogueBeat): void {
    this.hint.setVisible(true);
    if (beat.kind === "line") {
      this.showPortrait(beat.speaker ?? null, faceOf(beat));
      this.speaker.setText(beat.speaker ?? "");
      // Narração vem em itálico e mais apagada: dá pra ver de longe que ninguém está falando.
      this.body
        .setText(beat.text)
        .setFontStyle(beat.speaker ? "normal" : "italic")
        .setColor(beat.speaker ? TEXT_COLORS.ink : TEXT_COLORS.inkDim);
      this.fitBody();
      return;
    }
    const { text, color } = describeEvent(beat.event) ?? { text: "", color: TEXT_COLORS.ink };
    sfx("notice");
    this.showPortrait(null);
    this.speaker.setText("");
    this.body.setText(text).setFontStyle("normal").setColor(color);
    this.fitBody();
  }

  /** Fala comprida: a faixa cresce o que faltar pra caber. */
  private fitBody(): void {
    const needed = TEXT_Y - BAND_TOP + this.body.height + 44;
    this.setLift(Math.max(0, needed - BAND_HEIGHT));
  }

  /** As escolhas entram embaixo da última fala — ou no lugar dela, se o trecho não trouxe fala nenhuma. */
  private showChoices(choices: DialogueChoice[], alone: boolean): void {
    this.hint.setVisible(false);
    if (alone) {
      this.showPortrait(null);
      this.speaker.setText("");
      this.body.setText("");
    }
    this.choices = choices;
    this.focused = 0;

    const width = GAME_WIDTH - this.textLeft - 40;
    this.rows = choices.map((choice, position) => {
      const number = this.addHud(addTitleText(this.scene, 0, 0, `${position + 1}`, { fontSize: "15px", color: TEXT_COLORS.gold }).setOrigin(0.5));
      const badge = choice.check
        ? this.addHud(
            addBodyText(
              this.scene,
              0,
              0,
              `${ATTRIBUTE_LABEL(choice.check.attribute)} ${choice.check.difficulty} · ${Math.round(choice.check.chance * 100)}%`,
              { fontSize: "14px", color: TEXT_COLORS.goldBright, backgroundColor: "rgba(201, 161, 90, 0.2)", padding: { x: 6, y: 2 } },
            ).setOrigin(0, 0),
          )
        : undefined;
      const indent = 30 + (badge ? badge.width + 8 : 0);
      const text = this.addHud(
        addBodyText(this.scene, 0, 0, choice.text, { fontSize: "19px", lineSpacing: 2, wordWrap: { width: width - indent - 10 } }),
      );
      const band = this.addHud(this.scene.add.rectangle(0, 0, width, text.height + CHOICE_PAD * 2, COLORS.gold, 0).setOrigin(0));
      // A faixa fica atrás do que vai escrito nela.
      for (const object of [number, ...(badge ? [badge] : []), text]) this.scene.children.moveAbove(object as never, band as never);
      band.setInteractive({ useHandCursor: true });
      band.on(Phaser.Input.Events.POINTER_OVER, () => this.focus(position));
      band.on(Phaser.Input.Events.POINTER_DOWN, () => this.pick(position));
      return { band, number, badge, text };
    });

    // Fala comprida com muitas escolhas não cabe na faixa: ela cresce pra cima o que faltar.
    const listHeight = this.rows.reduce((sum, row) => sum + row.band.height + CHOICE_GAP, 0);
    const speech = alone ? 0 : this.body.height + 14;
    const needed = TEXT_Y - BAND_TOP + speech + listHeight + 18;
    this.setLift(Math.max(0, needed - BAND_HEIGHT));

    let y = TEXT_Y - this.lift + speech;
    for (const row of this.rows) {
      row.band.setPosition(this.textLeft, y);
      row.number.setPosition(this.textLeft + 15, y + CHOICE_PAD + 12);
      let x = this.textLeft + 30;
      if (row.badge) {
        row.badge.setPosition(x, y + CHOICE_PAD + 2);
        x += row.badge.width + 8;
      }
      row.text.setPosition(x, y + CHOICE_PAD);
      y += row.band.height + CHOICE_GAP;
    }
    this.focus(0);
  }

  /**
   * Põe o busto de quem fala e leva o texto pro lado que sobra. Quem continua
   * falando fica parado; quem chega entra deslizando, e o busto de quem falava
   * escurece e some. Narração e acontecimento (`null`) não tiram ninguém: o
   * busto de quem falava só escurece. Quem fala sem retrato fala sem busto.
   * `face` é o rosto que a fala pede (`# rosto:`): quem continua falando com
   * outro rosto troca o quadro ali mesmo, sem sair.
   */
  private showPortrait(speaker: string | null, face?: string): void {
    if (speaker === null) {
      if (this.portraitSpeaker !== null) this.portrait.setTint(PORTRAIT_DIM);
      return;
    }
    const key = portraitFor(this.scene, speaker, face);
    if (speaker === this.portraitSpeaker) {
      if (this.portrait.texture.key !== key) this.portrait.setTexture(key).setDisplaySize(PORTRAIT_WIDTH, this.portraitHeight(key));
      this.portrait.clearTint();
      return;
    }

    if (this.portraitSpeaker !== null) this.dismissPortrait();
    const shown = this.scene.textures.exists(key);
    this.portraitSpeaker = shown ? speaker : null;
    if (shown) {
      this.scene.tweens.killTweensOf(this.portrait);
      this.portrait
        .setTexture(key)
        .setDisplaySize(PORTRAIT_WIDTH, this.portraitHeight(key))
        .clearTint()
        .setVisible(true)
        .setAlpha(0)
        .setX(PORTRAIT_X - PORTRAIT_SLIDE);
      this.scene.tweens.add({ targets: this.portrait, x: PORTRAIT_X, alpha: 1, duration: PORTRAIT_IN_MS, ease: "Cubic.Out" });
    }

    this.textLeft = shown ? PORTRAIT_LEFT : TEXT_X;
    this.speaker.setX(this.textLeft);
    this.body.setX(this.textLeft).setWordWrapWidth(GAME_WIDTH - this.textLeft - (shown ? 60 : TEXT_X));
  }

  /** O busto na tela passa pra quem sai: escurece e some, e o lugar fica livre pro próximo. */
  private dismissPortrait(): void {
    [this.portrait, this.leaving] = [this.leaving, this.portrait];
    this.portraitSpeaker = null;
    const leaving = this.leaving;
    this.scene.tweens.killTweensOf(leaving);
    leaving.setTint(PORTRAIT_DIM);
    // O que chega tem de ficar na frente do que sai.
    this.portrait.setDepth(leaving.depth);
    this.scene.children.moveAbove(this.portrait, leaving);
    this.scene.tweens.add({
      targets: leaving,
      alpha: 0,
      duration: PORTRAIT_OUT_MS,
      onComplete: () => leaving.setVisible(false),
    });
  }

  /** A altura na tela, mantendo a proporção da arte na largura do busto. */
  private portraitHeight(key: string): number {
    const source = this.scene.textures.get(key).getSourceImage();
    return (PORTRAIT_WIDTH * source.height) / source.width;
  }

  private clearChoices(): void {
    for (const { band, number, badge, text } of this.rows) {
      band.destroy();
      number.destroy();
      badge?.destroy();
      text.destroy();
    }
    this.rows = [];
    this.choices = [];
    this.setLift(0);
  }

  /** Estica a faixa `lift` pixels pra cima, levando junto o nome e a fala. */
  private setLift(lift: number): void {
    if (lift === this.lift) return;
    this.lift = lift;
    this.drawBand();
    this.speaker.setY(SPEAKER_Y - lift);
    this.body.setY(TEXT_Y - lift);
  }

  private focus(position: number): void {
    this.focused = position;
    this.rows.forEach(({ band, number, text }, i) => {
      const focused = i === position;
      band.setFillStyle(COLORS.gold, focused ? 0.16 : 0);
      band.setStrokeStyle(1, COLORS.gold, focused ? 0.5 : 0);
      number.setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.gold);
      text.setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
    });
  }

  private pick(position: number): void {
    const choice = this.choices[position];
    if (!choice || !this.ready() || !this.onChoose) return;
    sfx("uiSelect");
    this.onChoose(choice.index);
  }

  private ready(): boolean {
    return this.scene.time.now - this.openedAt >= INPUT_GRACE_MS;
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.ready()) return;
    const confirm = event.code === "Space" || event.code === "Enter" || event.code === "NumpadEnter" || event.code === "KeyE";

    if (this.onAdvance) {
      if (confirm) this.advance();
      return;
    }
    if (!this.onChoose) return;

    const count = this.choices.length;
    if (event.code === "ArrowUp" || event.code === "KeyW") this.step(count - 1);
    else if (event.code === "ArrowDown" || event.code === "KeyS") this.step(1);
    else if (confirm) this.pick(this.focused);
    else if (event.code.startsWith("Digit")) this.pick(Number(event.code.slice(5)) - 1);
  }

  /** O cursor das escolhas anda `by` posições, dando a volta. */
  private step(by: number): void {
    const count = this.choices.length;
    if (count > 1) sfx("uiMove");
    this.focus((this.focused + by) % count);
  }

  private advance(): void {
    if (!this.onAdvance) return;
    sfx("advance");
    this.onAdvance();
  }

  private onPointerDown(): void {
    // Clique em qualquer lugar passa a fala. Escolha se faz clicando NELA (ver showChoices).
    if (this.ready()) this.advance();
  }
}
