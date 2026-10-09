import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  PROTAGONIST,
  RACE_INFO,
  availableOrders,
  createStartingAttributes,
  startingMaxHp,
  type CharacterClass,
} from "@ealen/shared";
import { GAME_HEIGHT, SCENES, TEXT_COLORS } from "../game/config";
import { beginNewGame } from "../game/newGame";
import { readProfile } from "../game/profile";
import { addBodyText, addPanel, addTitleText } from "../game/ui";

const PORTRAIT_X = 60;
const PORTRAIT_Y = 110;
const PORTRAIT_WIDTH = 600;
const INFO_X = 710;

type Row = "class" | "confirm";
const ROWS: Row[] = ["class", "confirm"];
const ROW_Y: Record<Row, number> = { class: 544, confirm: 610 };

function portraitKey(characterClass: CharacterClass): string {
  return `portrait:${characterClass}`;
}

/**
 * A Ordem de Halmira num jogo novo. Não é criação de personagem — quem joga é
 * sempre ela —, e a tela só aparece pra quem já destravou alguma Ordem além
 * da dela (ver game/profile.ts): é o que um jogo terminado deixa pro seguinte.
 * Cima/baixo escolhe a linha, esquerda/direita troca a Ordem, Enter na última
 * linha começa o jogo.
 */
export default class ClassSelectScene extends Phaser.Scene {
  private orders: CharacterClass[] = [];
  private classIndex = 0;
  private rowIndex = 0;

  private portrait!: Phaser.GameObjects.Image;
  private className!: Phaser.GameObjects.Text;
  private classTitle!: Phaser.GameObjects.Text;
  private classCreed!: Phaser.GameObjects.Text;
  private raceLine!: Phaser.GameObjects.Text;
  private attributeLine!: Phaser.GameObjects.Text;
  private rowTexts!: Record<Row, Phaser.GameObjects.Text>;

  constructor() {
    super(SCENES.classSelect);
  }

  preload(): void {
    addBodyText(this, 60, GAME_HEIGHT - 50, "Carregando retratos…", { color: TEXT_COLORS.inkDim });
    this.orders = availableOrders(readProfile());
    for (const characterClass of this.orders) {
      if (!this.textures.exists(portraitKey(characterClass))) {
        this.load.image(portraitKey(characterClass), `portraits/${characterClass}.jpg`);
      }
    }
  }

  create(): void {
    this.children.removeAll(true);
    this.classIndex = 0;
    this.rowIndex = 0;

    addTitleText(this, 60, 40, `Com que Ordem ${PROTAGONIST.name} desce desta vez?`, { fontSize: "34px" });

    this.portrait = this.add.image(PORTRAIT_X, PORTRAIT_Y, portraitKey(this.orders[0])).setOrigin(0);
    this.portrait.setScale(PORTRAIT_WIDTH / this.portrait.width);
    // A moldura vem depois do retrato de propósito: é só contorno, por cima dele.
    const frame = this.add.graphics();
    frame.lineStyle(2, 0xc9a15a, 1);
    frame.strokeRect(PORTRAIT_X, PORTRAIT_Y, PORTRAIT_WIDTH, this.portrait.displayHeight);

    addPanel(this, INFO_X - 20, PORTRAIT_Y, 530, 340, true);
    this.className = addTitleText(this, INFO_X, PORTRAIT_Y + 18, "", { fontSize: "32px" });
    this.classTitle = addBodyText(this, INFO_X, PORTRAIT_Y + 62, "", { color: TEXT_COLORS.inkDim });
    this.classCreed = addBodyText(this, INFO_X, PORTRAIT_Y + 100, "", {
      fontStyle: "italic",
      wordWrap: { width: 490 },
    });
    this.raceLine = addBodyText(this, INFO_X, PORTRAIT_Y + 190, "", {
      fontSize: "18px",
      color: TEXT_COLORS.inkDim,
      wordWrap: { width: 490 },
    });
    this.attributeLine = addBodyText(this, INFO_X, PORTRAIT_Y + 270, "", {
      fontSize: "18px",
      wordWrap: { width: 490 },
    });

    this.rowTexts = {} as Record<Row, Phaser.GameObjects.Text>;
    ROWS.forEach((row, index) => {
      const text = addBodyText(this, 60, ROW_Y[row], "", { fontSize: "24px" }).setInteractive({ useHandCursor: true });
      text.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.rowIndex = index;
        this.refresh();
      });
      // Clique na metade esquerda do texto volta um valor; na direita, avança.
      text.on(Phaser.Input.Events.POINTER_DOWN, (_pointer: Phaser.Input.Pointer, localX: number) => {
        this.rowIndex = index;
        if (row === "confirm") this.confirm();
        else this.change(localX < text.width / 2 ? -1 : 1);
      });
      this.rowTexts[row] = text;
    });

    addBodyText(this, 60, GAME_HEIGHT - 30, "↑↓ escolhe a linha · ←→ troca · Enter confirma · Esc volta", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0, 0.5);

    this.input.keyboard?.on("keydown", this.onKey, this);
    this.refresh();
  }

  private onKey(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.rowIndex = (this.rowIndex + ROWS.length - 1) % ROWS.length;
        this.refresh();
        break;
      case "ArrowDown":
      case "KeyS":
        this.rowIndex = (this.rowIndex + 1) % ROWS.length;
        this.refresh();
        break;
      case "ArrowLeft":
      case "KeyA":
        this.change(-1);
        break;
      case "ArrowRight":
      case "KeyD":
        this.change(1);
        break;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        if (ROWS[this.rowIndex] === "confirm") this.confirm();
        else this.change(1);
        break;
      case "Escape":
        this.scene.start(SCENES.title);
        break;
    }
  }

  /** Troca a Ordem, se a linha em foco for a dela. */
  private change(step: number): void {
    if (ROWS[this.rowIndex] !== "class") return;
    this.classIndex = (this.classIndex + step + this.orders.length) % this.orders.length;
    this.refresh();
  }

  private refresh(): void {
    const { race } = PROTAGONIST;
    const characterClass = this.orders[this.classIndex];
    const info = CLASS_INFO[characterClass];
    const raceInfo = RACE_INFO[race];
    const attributes = createStartingAttributes(race, characterClass);

    this.portrait.setTexture(portraitKey(characterClass));
    this.className.setText(info.name);
    this.classTitle.setText(`${info.title} · ${info.role}`);
    this.classCreed.setText(`“${info.creed}”`);
    this.raceLine.setText(`${PROTAGONIST.name}, ${raceInfo.name} — ${raceInfo.temperament}.\n${raceInfo.homeland}.`);
    this.attributeLine.setText(
      `HP ${startingMaxHp(attributes)}   ` + ATTRIBUTE_KEYS.map((key) => `${key.toUpperCase()} ${attributes[key]}`).join("   "),
    );

    const labels: Record<Row, string> = {
      class: `Ordem   ◂ ${info.name} ▸`,
      confirm: "Começar a jornada",
    };
    ROWS.forEach((row, index) => {
      const focused = index === this.rowIndex;
      this.rowTexts[row].setText(`${focused ? "▸ " : "   "}${labels[row]}`);
      this.rowTexts[row].setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
    });
  }

  private confirm(): void {
    beginNewGame(this, this.orders[this.classIndex]);
  }
}
