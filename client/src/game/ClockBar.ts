import * as Phaser from "phaser";
import type { StoryClock } from "@jogo/shared";
import { COLORS, GAME_WIDTH, TEXT_COLORS } from "./config";
import { addBodyText, addPanel, drawBar, type AddHud } from "./ui";

const WIDTH = 190;
const HEIGHT = 46;
const LEFT = GAME_WIDTH - WIDTH - 10;
const TOP = 10;
const BAR_HEIGHT = 8;
/** Quanto do alto da coluna da direita o relógio ocupa: o que vier embaixo dele começa daqui. */
export const CLOCK_BAR_BOTTOM = TOP + HEIGHT + 8;
/** Onde a coluna da direita começa, sem relógio na tela. */
export const RIGHT_COLUMN_TOP = TOP;
export const RIGHT_COLUMN_LEFT = LEFT;
export const RIGHT_COLUMN_WIDTH = WIDTH;

/** Do último quinto em diante a barra muda de cor: o tempo está acabando. */
const LATE = 0.8;

/**
 * O relógio da história, no alto da coluna da direita: o nome dele, a conta e
 * uma barra que enche. Só desenha o que recebe — quem faz o tempo andar é a
 * história (ver StoryClock em shared/story/memory.ts). Sem relógio, some.
 */
export class ClockBar {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly count: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, addHud: AddHud) {
    this.frame = addHud(addPanel(scene, LEFT, TOP, WIDTH, HEIGHT, true));
    this.label = addHud(addBodyText(scene, LEFT + 12, TOP + 7, "", { fontSize: "14px", color: TEXT_COLORS.gold }));
    this.count = addHud(addBodyText(scene, LEFT + WIDTH - 12, TOP + 7, "", { fontSize: "14px", color: TEXT_COLORS.inkDim }).setOrigin(1, 0));
    this.bar = addHud(scene.add.graphics());
    this.set(null);
  }

  /** Se há um relógio na tela agora. */
  get visible(): boolean {
    return this.label.visible;
  }

  set(clock: StoryClock | null): void {
    for (const object of [this.frame, this.label, this.bar, this.count]) object.setVisible(clock !== null);
    if (!clock) return;

    const filled = clock.limit > 0 ? clock.value / clock.limit : 1;
    this.label.setText(clock.label);
    this.count.setText(`${clock.value}/${clock.limit}`);
    this.bar.clear();
    drawBar(this.bar, LEFT + 12, TOP + 29, WIDTH - 24, BAR_HEIGHT, filled, filled >= LATE ? COLORS.hpLow : COLORS.guard);
  }

  destroy(): void {
    for (const object of [this.frame, this.label, this.bar, this.count]) object.destroy();
  }
}
