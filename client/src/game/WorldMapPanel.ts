import * as Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { splashKey } from "./splashes";
import { addBodyText, addPanel, addTitleText } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const MARGIN = 40;
/** A tecla que abriu o mapa não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

/**
 * O mapa do mundo, por cima do mundo parado: a ilustração `mundo` (ver
 * art/manifest.json), inteira na tela. Só mostra; o jogo se passa num canto
 * dele, em Xerumbetyba. Sem a ilustração, avisa que ela ainda não existe.
 *
 * Esc, M ou Enter fecham.
 */
export class WorldMapPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    private readonly onClose: () => void,
  ) {
    this.objects.push(addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.85).setOrigin(0)));
    const key = splashKey("mundo");
    if (scene.textures.exists(key)) {
      const image = addHud(scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, key));
      image.setScale(Math.min((GAME_WIDTH - MARGIN * 2) / image.width, (GAME_HEIGHT - MARGIN * 2 - 30) / image.height));
      this.objects.push(image);
    } else {
      this.objects.push(
        addHud(addPanel(scene, GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 - 90, 600, 180)),
        addHud(addTitleText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "O MAPA", { fontSize: "30px" }).setOrigin(0.5)),
        addHud(
          addBodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, "Ninguém desenhou o mundo ainda.", {
            fontSize: "20px",
            color: TEXT_COLORS.inkDim,
          }).setOrigin(0.5),
        ),
      );
    }
    this.objects.push(
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 22, "Esc: fechar", { fontSize: "16px", color: TEXT_COLORS.inkDim }).setOrigin(0.5),
      ),
    );
    this.openedAt = scene.time.now;
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of this.objects) object.destroy();
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "Escape" || event.code === "KeyM" || event.code === "Enter") this.onClose();
  }
}
