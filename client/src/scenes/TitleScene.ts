import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_CHARACTER, SCENES, TEXT_COLORS } from "../game/config";
import { loadSave } from "../game/save";
import { Menu, addBodyText, addTitleText } from "../game/ui";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.title);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    addTitleText(this, centerX, 210, "EÄLEN", { fontSize: "112px" }).setOrigin(0.5);
    addBodyText(this, centerX, 300, "O Canto das Primeiras Luzes", {
      fontSize: "30px",
      fontStyle: "italic",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);

    const save = loadSave();

    new Menu(
      this,
      centerX - 110,
      420,
      [
        {
          label: save ? `Continuar — ${save.name}, nível ${save.level}` : "Continuar",
          disabled: !save,
          onSelect: () => {
            this.registry.set(REGISTRY_CHARACTER, save);
            this.scene.start(SCENES.arena);
          },
        },
        { label: "Novo jogo", onSelect: () => this.scene.start(SCENES.prologue) },
      ],
      { lineHeight: 44, fontSize: 28 },
    );

    addBodyText(this, centerX, GAME_HEIGHT - 40, "Setas e Enter, ou o mouse.", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);
  }
}
