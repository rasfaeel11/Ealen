import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENES, TEXT_COLORS } from "../game/config";
import { PROLOGUE_PAGES } from "../game/prologue";
import { addBodyText, addTitleText } from "../game/ui";

const TEXT_WIDTH = 760;

/** O prólogo, uma página por vez. Qualquer tecla ou clique avança; Esc pula. */
export default class PrologueScene extends Phaser.Scene {
  private pageIndex = 0;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.prologue);
  }

  create(): void {
    this.pageIndex = 0;
    const centerX = GAME_WIDTH / 2;

    this.title = addTitleText(this, centerX, 190, "", { fontSize: "44px" }).setOrigin(0.5);
    this.body = addBodyText(this, centerX, 270, "", {
      fontSize: "26px",
      align: "center",
      lineSpacing: 10,
      wordWrap: { width: TEXT_WIDTH },
    }).setOrigin(0.5, 0);
    this.counter = addBodyText(this, centerX, GAME_HEIGHT - 40, "", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);

    this.showPage();

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.code === "Escape") this.scene.start(SCENES.classSelect);
      else this.advance();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.advance());
  }

  private showPage(): void {
    const page = PROLOGUE_PAGES[this.pageIndex];
    this.title.setText(page.title);
    this.body.setText(page.paragraphs.join("\n\n"));
    this.counter.setText(`${this.pageIndex + 1} / ${PROLOGUE_PAGES.length} — qualquer tecla continua, Esc pula`);

    this.cameras.main.fadeIn(400, 20, 17, 16);
  }

  private advance(): void {
    if (this.pageIndex >= PROLOGUE_PAGES.length - 1) {
      this.scene.start(SCENES.classSelect);
      return;
    }
    this.pageIndex += 1;
    this.showPage();
  }
}
