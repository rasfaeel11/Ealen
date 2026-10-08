import * as Phaser from "phaser";
import type { DialogueBeat, DialogueChoice, DialogueStep, StoryEvent } from "@ealen/shared";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import { addBodyText, addPanel, addTitleText } from "../ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const BOX_WIDTH = 920;
const BOX_HEIGHT = 250;
const BOX_X = (GAME_WIDTH - BOX_WIDTH) / 2;
const BOX_Y = GAME_HEIGHT - BOX_HEIGHT - 24;
const PADDING = 28;
const TEXT_Y = BOX_Y + 58;
const CHOICE_LINE_HEIGHT = 30;
/** A tecla que abriu a conversa não pode ser a mesma que passa a primeira fala. */
const INPUT_GRACE_MS = 200;

const ATTRIBUTE_LABEL = (attribute: string) => attribute[0].toUpperCase() + attribute.slice(1);

/** Um acontecimento da história, em uma linha pra quem joga. */
function describeEvent(event: StoryEvent): { text: string; color: string } {
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
          ? `+${event.amount} de XP. Subiu para o nível ${event.levelUp.newLevel}!`
          : `+${event.amount} de XP.`,
        color: TEXT_COLORS.goldBright,
      };
  }
}

function choiceLabel(choice: DialogueChoice, position: number): string {
  const check = choice.check
    ? `[${ATTRIBUTE_LABEL(choice.check.attribute)} ${choice.check.difficulty} · ${Math.round(choice.check.chance * 100)}%] `
    : "";
  return `${position + 1}. ${check}${choice.text}`;
}

/**
 * A caixa de diálogo: quem fala em cima, a fala no meio, as escolhas
 * embaixo. Mostra uma coisa por vez — fala, narração ou acontecimento — e só
 * oferece as escolhas depois da última. Não sabe nada de história: recebe um
 * trecho pronto (`DialogueStep`) e devolve o que foi escolhido.
 *
 * Espaço, Enter ou clique passam a fala; 1-9, setas + Enter ou clique
 * escolhem.
 */
export class DialogueBox {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private choices: DialogueChoice[] = [];
  private focused = 0;
  private readonly openedAt: number;
  /** O que a próxima tecla de "seguir" faz; null enquanto as escolhas estão na tela. */
  private onAdvance: (() => void) | null = null;
  private onChoose: ((index: number) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
  ) {
    this.panel = addHud(addPanel(scene, BOX_X, BOX_Y, BOX_WIDTH, BOX_HEIGHT));
    this.speaker = addHud(addTitleText(scene, BOX_X + PADDING, BOX_Y + 18, "", { fontSize: "24px" }));
    this.body = addHud(
      addBodyText(scene, BOX_X + PADDING, TEXT_Y, "", {
        fontSize: "22px",
        lineSpacing: 6,
        wordWrap: { width: BOX_WIDTH - PADDING * 2 },
      }),
    );
    this.hint = addHud(
      addBodyText(scene, BOX_X + BOX_WIDTH - PADDING, BOX_Y + BOX_HEIGHT - 34, "Espaço ▸", {
        fontSize: "16px",
        color: TEXT_COLORS.inkDim,
      }).setOrigin(1, 0),
    );
    this.openedAt = scene.time.now;

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
      this.showBeat(beat);
      await new Promise<void>((resolve) => (this.onAdvance = resolve));
      this.onAdvance = null;
    }
    if (step.choices.length === 0) return null;

    this.showChoices(step.choices, step.beats.length === 0);
    const index = await new Promise<number>((resolve) => (this.onChoose = resolve));
    this.onChoose = null;
    this.clearChoices();
    return index;
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.clearChoices();
    for (const object of [this.panel, this.speaker, this.body, this.hint]) object.destroy();
  }

  private showBeat(beat: DialogueBeat): void {
    this.hint.setVisible(true);
    if (beat.kind === "line") {
      this.speaker.setText(beat.speaker ?? "");
      // Narração vem em itálico e mais apagada: dá pra ver de longe que ninguém está falando.
      this.body
        .setText(beat.text)
        .setFontStyle(beat.speaker ? "normal" : "italic")
        .setColor(beat.speaker ? TEXT_COLORS.ink : TEXT_COLORS.inkDim);
      return;
    }
    const { text, color } = describeEvent(beat.event);
    this.speaker.setText("");
    this.body.setText(text).setFontStyle("normal").setColor(color);
  }

  /** As escolhas entram embaixo da última fala — ou no lugar dela, se o trecho não trouxe fala nenhuma. */
  private showChoices(choices: DialogueChoice[], alone: boolean): void {
    this.hint.setVisible(false);
    if (alone) {
      this.speaker.setText("");
      this.body.setText("");
    }
    this.choices = choices;
    this.focused = 0;

    const top = Math.max(TEXT_Y + (alone ? 0 : this.body.height + 14), BOX_Y + BOX_HEIGHT - 20 - choices.length * CHOICE_LINE_HEIGHT);
    this.choiceTexts = choices.map((choice, position) => {
      const text = this.addHud(
        addBodyText(this.scene, BOX_X + PADDING, top + position * CHOICE_LINE_HEIGHT, "", { fontSize: "20px" }),
      );
      text.setInteractive({ useHandCursor: true });
      text.on(Phaser.Input.Events.POINTER_OVER, () => this.focus(position));
      text.on(Phaser.Input.Events.POINTER_DOWN, () => this.pick(position));
      return text;
    });
    this.focus(0);
  }

  private clearChoices(): void {
    for (const text of this.choiceTexts) text.destroy();
    this.choiceTexts = [];
    this.choices = [];
  }

  private focus(position: number): void {
    this.focused = position;
    this.choiceTexts.forEach((text, i) => {
      const focused = i === position;
      text.setText(`${focused ? "▸ " : "   "}${choiceLabel(this.choices[i], i)}`);
      text.setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
    });
  }

  private pick(position: number): void {
    const choice = this.choices[position];
    if (choice && this.ready()) this.onChoose?.(choice.index);
  }

  private ready(): boolean {
    return this.scene.time.now - this.openedAt >= INPUT_GRACE_MS;
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.ready()) return;
    const confirm = event.code === "Space" || event.code === "Enter" || event.code === "NumpadEnter" || event.code === "KeyE";

    if (this.onAdvance) {
      if (confirm) this.onAdvance();
      return;
    }
    if (!this.onChoose) return;

    const count = this.choices.length;
    if (event.code === "ArrowUp" || event.code === "KeyW") this.focus((this.focused + count - 1) % count);
    else if (event.code === "ArrowDown" || event.code === "KeyS") this.focus((this.focused + 1) % count);
    else if (confirm) this.pick(this.focused);
    else if (event.code.startsWith("Digit")) this.pick(Number(event.code.slice(5)) - 1);
  }

  private onPointerDown(): void {
    // Clique em qualquer lugar passa a fala. Escolha se faz clicando NELA (ver showChoices).
    if (this.ready()) this.onAdvance?.();
  }
}
