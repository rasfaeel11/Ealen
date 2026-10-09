import * as Phaser from "phaser";
import type { StoryClock } from "@ealen/shared";
import { COLORS, GAME_WIDTH, TEXT_COLORS } from "./config";
import { addBodyText } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const BAR_WIDTH = 260;
const BAR_HEIGHT = 10;
const TOP = 12;
const BAR_Y = TOP + 26;
/** Quanto do alto da tela o relógio ocupa: o que vier embaixo dele começa daqui. */
export const CLOCK_BAR_BOTTOM = BAR_Y + BAR_HEIGHT + 10;

const COLOR_TIME = 0x6fa8dc;
/** Do último quinto em diante a barra muda de cor: o tempo está acabando. */
const LATE = 0.8;

/**
 * O relógio da história no alto da tela, no meio: o nome dele, uma barra que
 * enche e a conta em números. Só desenha o que recebe — quem faz o tempo
 * andar é a história (ver StoryClock em shared/story/memory.ts). Sem relógio,
 * some.
 */
export class ClockBar {
  private readonly label: Phaser.GameObjects.Text;
  private readonly count: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, addHud: AddHud) {
    const center = GAME_WIDTH / 2;
    this.label = addHud(
      addBodyText(scene, center, TOP, "", { fontSize: "17px", color: TEXT_COLORS.gold }).setOrigin(0.5, 0).setShadow(0, 2, "#000000", 4),
    );
    this.bar = addHud(scene.add.graphics());
    this.count = addHud(
      addBodyText(scene, center + BAR_WIDTH / 2 + 12, BAR_Y + BAR_HEIGHT / 2, "", { fontSize: "15px", color: TEXT_COLORS.inkDim })
        .setOrigin(0, 0.5)
        .setShadow(0, 2, "#000000", 4),
    );
    this.set(null);
  }

  /** Se há um relógio na tela agora. */
  get visible(): boolean {
    return this.label.visible;
  }

  set(clock: StoryClock | null): void {
    for (const object of [this.label, this.bar, this.count]) object.setVisible(clock !== null);
    if (!clock) return;

    const left = GAME_WIDTH / 2 - BAR_WIDTH / 2;
    const filled = clock.limit > 0 ? clock.value / clock.limit : 1;
    this.label.setText(clock.label);
    this.count.setText(`${clock.value}/${clock.limit}`);
    this.bar
      .clear()
      .fillStyle(COLORS.bg, 0.8)
      .fillRect(left, BAR_Y, BAR_WIDTH, BAR_HEIGHT)
      .fillStyle(filled >= LATE ? COLORS.hpLow : COLOR_TIME, 1)
      .fillRect(left, BAR_Y, Math.round(BAR_WIDTH * filled), BAR_HEIGHT)
      .lineStyle(1, COLORS.gold, 0.9)
      .strokeRect(left - 0.5, BAR_Y - 0.5, BAR_WIDTH + 1, BAR_HEIGHT + 1);
  }

  destroy(): void {
    for (const object of [this.label, this.bar, this.count]) object.destroy();
  }
}
