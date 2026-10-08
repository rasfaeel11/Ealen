import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  MOCK_MAP_NODES,
  RACE_INFO,
  createStartingAttributes,
  createStartingInventory,
  newGame,
  startingMaxHp,
  type Character,
  type CharacterClass,
  type Race,
} from "@ealen/shared";
import { GAME_HEIGHT, REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { randomCharacterName } from "../game/nameGenerator";
import { firstEmptySlot, readSlots } from "../game/save";
import { GameSession } from "../game/session";
import { addBodyText, addPanel, addTitleText } from "../game/ui";

const RACES = Object.keys(RACE_INFO) as Race[];
const CLASSES = Object.keys(CLASS_INFO) as CharacterClass[];

/** Id fixo: o jogo tem um personagem por save, e só precisa diferir dos ids das criaturas. */
const HERO_ID = "hero";

const PORTRAIT_X = 60;
const PORTRAIT_Y = 110;
const PORTRAIT_WIDTH = 600;
const INFO_X = 710;

type Row = "race" | "class" | "name" | "confirm";
const ROWS: Row[] = ["race", "class", "name", "confirm"];
const ROW_Y: Record<Row, number> = { race: 500, class: 544, name: 588, confirm: 650 };

function portraitKey(characterClass: CharacterClass): string {
  return `portrait:${characterClass}`;
}

/**
 * Criação de personagem: Povo, Ordem e nome. Cima/baixo escolhe a linha,
 * esquerda/direita troca o valor, Enter na última linha começa o jogo.
 */
export default class ClassSelectScene extends Phaser.Scene {
  private raceIndex = 0;
  private classIndex = 0;
  private rowIndex = 1;
  private heroName = "";

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
    for (const characterClass of CLASSES) {
      if (!this.textures.exists(portraitKey(characterClass))) {
        this.load.image(portraitKey(characterClass), `portraits/${characterClass}.jpg`);
      }
    }
  }

  create(): void {
    this.children.removeAll(true);
    this.raceIndex = 0;
    this.classIndex = 0;
    this.rowIndex = 1;
    this.heroName = randomCharacterName(RACES[0]);

    addTitleText(this, 60, 40, "Quem atravessa as Portas de Tirán?", { fontSize: "34px" });

    this.portrait = this.add.image(PORTRAIT_X, PORTRAIT_Y, portraitKey(CLASSES[0])).setOrigin(0);
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

  /** Troca o valor da linha em foco. No nome, qualquer direção sorteia outro. */
  private change(step: number): void {
    const row = ROWS[this.rowIndex];
    if (row === "race") {
      this.raceIndex = (this.raceIndex + step + RACES.length) % RACES.length;
      // O nome é do Povo: trocou o Povo, o nome antigo deixa de fazer sentido.
      this.heroName = randomCharacterName(RACES[this.raceIndex]);
    } else if (row === "class") {
      this.classIndex = (this.classIndex + step + CLASSES.length) % CLASSES.length;
    } else if (row === "name") {
      this.heroName = randomCharacterName(RACES[this.raceIndex]);
    }
    this.refresh();
  }

  private refresh(): void {
    const race = RACES[this.raceIndex];
    const characterClass = CLASSES[this.classIndex];
    const info = CLASS_INFO[characterClass];
    const raceInfo = RACE_INFO[race];
    const attributes = createStartingAttributes(race, characterClass);

    this.portrait.setTexture(portraitKey(characterClass));
    this.className.setText(info.name);
    this.classTitle.setText(`${info.title} · ${info.role}`);
    this.classCreed.setText(`“${info.creed}”`);
    this.raceLine.setText(`${raceInfo.name} — ${raceInfo.temperament}.\n${raceInfo.homeland}.`);
    this.attributeLine.setText(
      `HP ${startingMaxHp(attributes)}   ` + ATTRIBUTE_KEYS.map((key) => `${key.toUpperCase()} ${attributes[key]}`).join("   "),
    );

    const labels: Record<Row, string> = {
      race: `Povo     ◂ ${raceInfo.name} ▸`,
      class: `Ordem   ◂ ${info.name} ▸`,
      name: `Nome    ◂ ${this.heroName} ▸`,
      confirm: "Começar a jornada",
    };
    ROWS.forEach((row, index) => {
      const focused = index === this.rowIndex;
      this.rowTexts[row].setText(`${focused ? "▸ " : "   "}${labels[row]}`);
      this.rowTexts[row].setColor(focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
    });
  }

  private confirm(): void {
    const race = RACES[this.raceIndex];
    const characterClass = CLASSES[this.classIndex];
    const attributes = createStartingAttributes(race, characterClass);
    const maxHp = startingMaxHp(attributes);

    const character: Character = {
      id: HERO_ID,
      name: this.heroName,
      race,
      characterClass,
      level: 1,
      xp: 0,
      attributes,
      currentHp: maxHp,
      maxHp,
      currentNodeId: MOCK_MAP_NODES[0].id,
      inventory: createStartingInventory(),
    };

    // O espaço vem de quem abriu o jogo novo (título ou lista de saves); sem isso, o primeiro livre.
    const chosen = this.registry.get(REGISTRY_NEW_GAME_SLOT) as number | undefined;
    const session = new GameSession(chosen ?? firstEmptySlot(readSlots()) ?? 0, newGame(character));
    session.commit();
    this.registry.remove(REGISTRY_NEW_GAME_SLOT);
    this.registry.set(REGISTRY_SESSION, session);
    this.scene.start(SCENES.world);
  }
}
