import * as Phaser from "phaser";
import { COLORS, FONT_BODY, FONT_TITLE, TEXT_COLORS } from "./config";

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Texto de corpo (Spectral). `resolution: 2` mantém a letra nítida quando o canvas é ampliado. */
export function addBodyText(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_BODY,
    fontSize: "20px",
    color: TEXT_COLORS.ink,
    resolution: 2,
    ...style,
  });
}

/** Texto de título (Cinzel, dourado). */
export function addTitleText(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_TITLE,
    fontStyle: "bold",
    fontSize: "28px",
    color: TEXT_COLORS.gold,
    resolution: 2,
    ...style,
  });
}

/** Moldura do códice: painel escuro com borda dourada dupla e cantos retos. */
export function addPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, dim = false): Phaser.GameObjects.Graphics {
  return drawPanel(scene.add.graphics(), x, y, width, height, dim);
}

/** Desenha a moldura em `g`, no lugar do que houvesse nele: é como um painel muda de tamanho sem sair da ordem de desenho. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, dim = false): Phaser.GameObjects.Graphics {
  g.clear();
  g.fillStyle(COLORS.panel, 1);
  g.fillRect(x, y, width, height);
  g.lineStyle(2, dim ? COLORS.border : COLORS.gold, 1);
  g.strokeRect(x, y, width, height);
  g.lineStyle(1, dim ? COLORS.border : COLORS.gold, 0.4);
  g.strokeRect(x + 5, y + 5, width - 10, height - 10);
  return g;
}

export interface MenuOption {
  label: string;
  disabled?: boolean;
  onSelect: () => void;
  /** Chamado quando o cursor para em cima da opção (ex: pra mostrar uma descrição). */
  onFocus?: () => void;
}

export interface MenuConfig {
  lineHeight?: number;
  fontSize?: number;
  /** Esc / Backspace. */
  onCancel?: () => void;
  /** Recebe cada linha criada — pra cena que separa câmeras dizer qual delas desenha o menu. */
  adopt?: (item: Phaser.GameObjects.Text) => void;
}

/**
 * Lista vertical de opções, navegável por teclado (setas/W-S, Enter/Espaço)
 * e por mouse. Uma cena pode ter várias; só as ativas e visíveis respondem.
 */
export class Menu {
  private items: Phaser.GameObjects.Text[] = [];
  private options: MenuOption[] = [];
  private index = 0;
  private active = true;
  private visible = true;
  private readonly lineHeight: number;
  private readonly fontSize: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    options: MenuOption[],
    private readonly config: MenuConfig = {},
  ) {
    this.lineHeight = config.lineHeight ?? 30;
    this.fontSize = config.fontSize ?? 22;

    scene.input.keyboard?.on("keydown", this.onKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.setOptions(options);
  }

  setOptions(options: MenuOption[]): void {
    for (const item of this.items) item.destroy();
    this.options = options;

    this.items = options.map((option, i) => {
      const item = addBodyText(this.scene, this.x, this.y + i * this.lineHeight, option.label, {
        fontSize: `${this.fontSize}px`,
      });
      item.setVisible(this.visible);
      this.config.adopt?.(item);
      if (!option.disabled) {
        item.setInteractive({ useHandCursor: true });
        item.on(Phaser.Input.Events.POINTER_OVER, () => {
          if (this.active) this.focus(i);
        });
        item.on(Phaser.Input.Events.POINTER_DOWN, () => {
          if (!this.active) return;
          this.focus(i);
          this.choose();
        });
      }
      return item;
    });

    const firstEnabled = options.findIndex((option) => !option.disabled);
    this.focus(firstEnabled === -1 ? 0 : firstEnabled);
  }

  /** Põe o cursor na opção `index`, se ela existe e pode ser escolhida. */
  focusOn(index: number): void {
    if (this.options[index] && !this.options[index].disabled) this.focus(index);
  }

  /** Menu inativo continua na tela (apagado), mas não responde. */
  setActive(active: boolean): void {
    this.active = active;
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const item of this.items) item.setVisible(visible);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const item of this.items) item.destroy();
    this.items = [];
  }

  private focus(index: number): void {
    this.index = index;
    this.refresh();
    if (this.active && this.visible) this.options[index]?.onFocus?.();
  }

  private refresh(): void {
    this.items.forEach((item, i) => {
      const option = this.options[i];
      const focused = i === this.index && !option.disabled;
      item.setText(`${focused ? "▸ " : "   "}${option.label}`);
      item.setColor(option.disabled ? TEXT_COLORS.inkDim : focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
      item.setAlpha(this.active ? (option.disabled ? 0.5 : 1) : 0.35);
    });
  }

  private move(step: number): void {
    const count = this.options.length;
    for (let i = 1; i <= count; i++) {
      const next = (this.index + step * i + count * i) % count;
      if (!this.options[next].disabled) {
        this.focus(next);
        return;
      }
    }
  }

  private choose(): void {
    const option = this.options[this.index];
    if (option && !option.disabled) option.onSelect();
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.active || !this.visible || this.options.length === 0) return;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.move(-1);
        break;
      case "ArrowDown":
      case "KeyS":
        this.move(1);
        break;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        this.choose();
        break;
      case "Escape":
      case "Backspace":
        this.config.onCancel?.();
        break;
    }
  }
}
