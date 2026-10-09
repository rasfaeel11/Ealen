import * as Phaser from "phaser";
import { activeUnit, isAlive, type Encounter } from "@ealen/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import { addBodyText, addPanel, addTitleText } from "../ui";

/** Uma opção da barra de ações: mover, uma habilidade, um item ou encerrar o turno. */
export interface ActionButton {
  label: string;
  /** "Ação", "Bônus"... mostrado depois do nome. */
  tag?: string;
  enabled: boolean;
  selected?: boolean;
  onClick: () => void;
}

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
export type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const BAR_HEIGHT = 132;
const BAR_X = 20;
const BAR_Y = GAME_HEIGHT - BAR_HEIGHT - 16;
const BAR_PADDING = 20;
const BUTTON_LINE_HEIGHT = 28;
const BUTTON_GAP = 26;
const LOG_LINES = 7;
const BOX_STYLE = { backgroundColor: "rgba(20, 17, 16, 0.82)", padding: { x: 12, y: 10 } };

/**
 * A interface do combate: ordem dos turnos, registro do que aconteceu, a
 * barra de ações e o painel de resultado. Vive em coordenadas de TELA (a
 * câmera da interface não tem zoom) e não sabe nada de regra — recebe o
 * que mostrar e avisa o que foi clicado.
 */
export class CombatHud {
  private readonly turnOrder: Phaser.GameObjects.Text;
  private readonly logText: Phaser.GameObjects.Text;
  private readonly goals: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly resources: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly warning: Phaser.GameObjects.Text;
  private buttonTexts: Phaser.GameObjects.Text[] = [];
  private buttons: ActionButton[] = [];
  private logLines: string[] = [];
  private readonly resultObjects: Phaser.GameObjects.GameObject[] = [];
  private hasGoals = false;
  /** Falso enquanto a história fala no meio da luta (ver setVisible). */
  private shown = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    /** Onde começa a caixa dos objetivos: mais embaixo quando o relógio da história ocupa o alto da tela. */
    goalsTop = 20,
  ) {
    this.turnOrder = addHud(addBodyText(scene, 20, 20, "", { fontSize: "17px", lineSpacing: 4, ...BOX_STYLE }));
    this.logText = addHud(
      addBodyText(scene, GAME_WIDTH - 20, 20, "", {
        fontSize: "16px",
        lineSpacing: 4,
        color: TEXT_COLORS.inkDim,
        wordWrap: { width: 400 },
        ...BOX_STYLE,
      }).setOrigin(1, 0),
    );

    this.goals = addHud(
      addBodyText(scene, GAME_WIDTH / 2, goalsTop, "", {
        fontSize: "18px",
        lineSpacing: 4,
        align: "center",
        color: TEXT_COLORS.goldBright,
        // Cabe entre a ordem dos turnos e o registro.
        wordWrap: { width: 520 },
        ...BOX_STYLE,
      })
        .setOrigin(0.5, 0)
        .setVisible(false),
    );

    this.bar = addHud(addPanel(scene, BAR_X, BAR_Y, GAME_WIDTH - BAR_X * 2, BAR_HEIGHT, true));
    this.resources = addHud(
      addBodyText(scene, BAR_X + BAR_PADDING, BAR_Y + 12, "", { fontSize: "17px", color: TEXT_COLORS.gold }),
    );
    this.detail = addHud(
      addBodyText(scene, BAR_X + BAR_PADDING, BAR_Y + BAR_HEIGHT - 32, "", {
        fontSize: "16px",
        fontStyle: "italic",
        color: TEXT_COLORS.inkDim,
      }),
    );
    this.warning = addHud(
      addBodyText(scene, GAME_WIDTH / 2, BAR_Y - 30, "", { fontSize: "20px", color: TEXT_COLORS.danger })
        .setOrigin(0.5)
        .setShadow(0, 2, "#000000", 4)
        .setAlpha(0),
    );
  }

  /** Lista de quem luta, na ordem de iniciativa, com a vez marcada. */
  setTurnOrder(encounter: Encounter): void {
    const active = activeUnit(encounter);
    const lines = encounter.order.map((id) => {
      const unit = encounter.units.find((candidate) => candidate.id === id)!;
      const marker = unit === active ? "▸ " : "   ";
      if (!isAlive(unit)) return `${marker}${unit.name}   caiu`;
      // Quem não tem vida pra perder não tem número pra mostrar.
      return unit.invulnerable ? `${marker}${unit.name}   —` : `${marker}${unit.name}   ${unit.currentHp}/${unit.maxHp}`;
    });
    this.turnOrder.setText([`Rodada ${encounter.round}`, ...lines].join("\n"));
  }

  /** Os objetivos da luta em aberto, no alto da tela. Sem nenhum, a caixa some. */
  setGoals(lines: string[]): void {
    this.hasGoals = lines.length > 0;
    this.goals.setText(lines.map((line) => `◆ ${line}`).join("\n")).setVisible(this.hasGoals && this.shown);
  }

  /** Troca as opções da barra. As nove primeiras ganham as teclas 1 a 9. */
  setActions(buttons: ActionButton[], resources: string): void {
    for (const text of this.buttonTexts) text.destroy();
    this.buttons = buttons;
    this.resources.setText(resources);

    const left = BAR_X + BAR_PADDING;
    const right = GAME_WIDTH - BAR_X - BAR_PADDING;
    let x = left;
    let y = BAR_Y + 40;

    this.buttonTexts = buttons.map((button, index) => {
      const hotkey = index < 9 ? `[${index + 1}] ` : "";
      const label = `${hotkey}${button.label}${button.tag ? ` · ${button.tag}` : ""}`;
      const text = this.addHud(
        addBodyText(this.scene, 0, 0, label, {
          fontSize: "18px",
          color: !button.enabled ? TEXT_COLORS.inkDim : button.selected ? TEXT_COLORS.goldBright : TEXT_COLORS.ink,
        }),
      );
      text.setAlpha(button.enabled ? 1 : 0.5);

      if (x + text.width > right && x > left) {
        x = left;
        y += BUTTON_LINE_HEIGHT;
      }
      text.setPosition(x, y);
      x += text.width + BUTTON_GAP;

      if (button.enabled) {
        text.setInteractive({ useHandCursor: true });
        text.on(Phaser.Input.Events.POINTER_DOWN, () => button.onClick());
      }
      return text;
    });
  }

  /** Aciona a opção de número `index` (0 = a primeira), como se tivesse sido clicada. */
  press(index: number): void {
    const button = this.buttons[index];
    if (button?.enabled) button.onClick();
  }

  /** A linha de explicação embaixo das opções. */
  setDetail(text: string): void {
    this.detail.setText(text);
  }

  log(line: string): void {
    this.logLines = [...this.logLines, line].slice(-LOG_LINES);
    this.logText.setText(this.logLines.join("\n"));
  }

  /** Aviso que aparece e some (comando recusado). */
  warn(text: string): void {
    this.warning.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.warning);
    this.scene.tweens.add({ targets: this.warning, alpha: 0, delay: 900, duration: 500 });
  }

  /** Número ou palavra que sobe e some a partir de um ponto da TELA. */
  float(x: number, y: number, text: string, color: string, size = 26): void {
    const label = this.addHud(
      addTitleText(this.scene, x, y, text, {
        fontSize: `${size}px`,
        color,
        stroke: "#141110",
        strokeThickness: 5,
      }).setOrigin(0.5),
    );
    // Nasce maior e assenta: o número "bate" antes de subir.
    this.scene.tweens.add({ targets: label, scale: { from: 1.6, to: 1 }, duration: 160, ease: "Back.easeOut" });
    this.scene.tweens.add({
      targets: label,
      y: y - 54,
      alpha: 0,
      duration: 950,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  /** Painel de fim de luta. A promessa resolve quando o jogador confirma (Enter, Espaço ou clique). */
  showResult(title: string, lines: string[], titleColor: string): Promise<void> {
    const centerX = GAME_WIDTH / 2;
    this.resultObjects.push(
      this.addHud(this.scene.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.7)),
      this.addHud(addPanel(this.scene, centerX - 280, 170, 560, 360)),
      this.addHud(addTitleText(this.scene, centerX, 215, title, { fontSize: "48px", color: titleColor }).setOrigin(0.5)),
      this.addHud(
        addBodyText(this.scene, centerX, 270, lines.join("\n"), {
          fontSize: "22px",
          align: "center",
          lineSpacing: 8,
          wordWrap: { width: 500 },
        }).setOrigin(0.5, 0),
      ),
      this.addHud(
        addBodyText(this.scene, centerX, 486, "Enter pra continuar", {
          fontSize: "18px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );

    return new Promise((resolve) => {
      const keyboard = this.scene.input.keyboard!;
      const confirm = () => {
        keyboard.off("keydown-ENTER", confirm);
        keyboard.off("keydown-SPACE", confirm);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, confirm);
        resolve();
      };
      // Um instante de folga: o clique ou a tecla que deu o golpe final não fecha o painel.
      this.scene.time.delayedCall(350, () => {
        keyboard.on("keydown-ENTER", confirm);
        keyboard.on("keydown-SPACE", confirm);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, confirm);
      });
    });
  }

  /** Tira a interface da frente (e a devolve) enquanto a história fala no meio da luta. */
  setVisible(visible: boolean): void {
    this.shown = visible;
    for (const object of [this.turnOrder, this.logText, this.bar, this.resources, this.detail, this.warning, ...this.buttonTexts]) {
      object.setVisible(visible);
    }
    this.goals.setVisible(visible && this.hasGoals);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.warning);
    for (const object of [
      this.turnOrder,
      this.logText,
      this.goals,
      this.bar,
      this.resources,
      this.detail,
      this.warning,
      ...this.buttonTexts,
      ...this.resultObjects,
    ]) {
      object.destroy();
    }
  }
}
