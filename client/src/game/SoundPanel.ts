import * as Phaser from "phaser";
import { setVolume, sfx, volumes, type VolumeKind } from "./audio";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { addBodyText, addPanel, addTitleText } from "./ui";

type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const WIDTH = 520;
const HEIGHT = 330;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const ROW_HEIGHT = 52;
/** O volume anda de dez em dez. */
const STEPS = 10;
/** A tecla (ou o clique) que abriu o painel não é uma tecla dentro dele. */
const INPUT_GRACE_MS = 120;

const ROWS: { kind: VolumeKind; label: string }[] = [
  { kind: "master", label: "Geral" },
  { kind: "music", label: "Música" },
  { kind: "sfx", label: "Efeitos" },
];

/**
 * Os três volumes do jogo (ver `audio.ts`), por cima do que estiver aberto.
 * ↑/↓ escolhem a linha, ←/→ mexem no volume (ou clicar nas setas dela);
 * Esc ou Enter fecham. O que se muda vale na hora e fica guardado.
 */
export class SoundPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly rows: { label: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Text }[] = [];
  private index = 0;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    private readonly onClose: () => void,
  ) {
    this.objects.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
      addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 48, "SOM", { fontSize: "32px" }).setOrigin(0.5)),
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 36, "↑/↓: escolher  ·  ←/→: volume  ·  Esc: fechar", {
          fontSize: "16px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );

    ROWS.forEach((row, i) => {
      const y = Y + 104 + i * ROW_HEIGHT;
      const label = addHud(addBodyText(scene, X + 50, y, "", { fontSize: "24px" }));
      const bar = addHud(addBodyText(scene, X + 300, y, "", { fontSize: "24px" }));
      const arrow = (x: number, text: string, step: number) => {
        const button = addHud(addBodyText(scene, x, y, text, { fontSize: "24px", color: TEXT_COLORS.gold }));
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.index = i;
          this.change(step);
        });
        return button;
      };
      this.rows.push({ label, bar });
      this.objects.push(label, bar, arrow(X + 200, "◂", -1), arrow(X + 440, "▸", 1));
    });

    this.openedAt = scene.time.now;
    this.show();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of this.objects) object.destroy();
  }

  private show(): void {
    const levels = volumes();
    this.rows.forEach(({ label, bar }, i) => {
      const focused = i === this.index;
      const filled = Math.round(levels[ROWS[i].kind] * STEPS);
      label.setText(`${focused ? "▸ " : "   "}${ROWS[i].label}`).setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
      bar.setText(`${filled * 10}%`).setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
    });
  }

  private change(step: number): void {
    const { kind } = ROWS[this.index];
    const now = Math.round(volumes()[kind] * STEPS);
    const next = Math.max(0, Math.min(STEPS, now + step));
    if (next !== now) setVolume(kind, next / STEPS);
    this.show();
    // O efeito de exemplo sai já no volume novo: é ouvindo que se acerta.
    sfx(kind === "music" ? "uiMove" : "uiSelect");
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    switch (event.code) {
      case "Escape":
      case "Backspace":
      case "Enter":
      case "NumpadEnter":
      case "Space":
        sfx("uiCancel");
        this.onClose();
        return;
      case "ArrowUp":
      case "KeyW":
        this.index = (this.index + ROWS.length - 1) % ROWS.length;
        sfx("uiMove");
        break;
      case "ArrowDown":
      case "KeyS":
        this.index = (this.index + 1) % ROWS.length;
        sfx("uiMove");
        break;
      case "ArrowLeft":
      case "KeyA":
        this.change(-1);
        return;
      case "ArrowRight":
      case "KeyD":
        this.change(1);
        return;
      default:
        return;
    }
    this.show();
  }
}
