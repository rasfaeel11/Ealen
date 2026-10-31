import * as Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { beginNewGame } from "../game/newGame";
import { firstEmptySlot, lastPlayedSlot, readSlots } from "../game/save";
import { GameSession } from "../game/session";
import { takeResumeSlot } from "../game/viewport";
import { playMusic } from "../game/audio";
import { splashKey } from "../game/splashes";
import { OptionsPanel } from "../game/OptionsPanel";
import { setPadMode } from "../game/gamepad";
import { Menu, addBodyText, addTitleText, drawDiamond } from "../game/ui";
import type { SaveSlotsData } from "./SaveSlotsScene";

/** A coluna do menu, à esquerda, sobre a ilustração. */
const COLUMN_WIDTH = 500;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.title);
  }

  create(): void {
    const centerX = COLUMN_WIDTH / 2;

    // A ilustração do título, quando existe (ver art/manifest.json), inteira na tela.
    // Enquanto a do título não existe, fica a primeira que houver.
    const art = ["titulo", "baixios", "oryndu", "mundo"].map(splashKey).find((key) => this.textures.exists(key));
    if (art) {
      const image = this.add.image(GAME_WIDTH / 2 + COLUMN_WIDTH / 3, GAME_HEIGHT / 2, art);
      image.setScale(Math.max(GAME_WIDTH / image.width, GAME_HEIGHT / image.height));
    }
    // A coluna escura de onde o menu sai, sumindo pra direita em cima da ilustração.
    const column = this.add.graphics();
    column.fillStyle(COLORS.panelDeep, 0.94);
    column.fillRect(0, 0, COLUMN_WIDTH, GAME_HEIGHT);
    column.fillGradientStyle(COLORS.panelDeep, COLORS.panelDeep, COLORS.panelDeep, COLORS.panelDeep, 0.94, 0, 0.94, 0);
    column.fillRect(COLUMN_WIDTH, 0, 240, GAME_HEIGHT);

    // Título provisório (ver AGENTS.md).
    addTitleText(this, centerX, 150, "TRÊS NA\nESTRADA", {
      fontSize: "62px",
      color: TEXT_COLORS.goldBright,
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5);
    const rule = this.add.graphics();
    rule.lineStyle(1, COLORS.gold, 0.7);
    rule.lineBetween(centerX - 150, 244, centerX + 150, 244);
    drawDiamond(rule, centerX, 244, 5);

    const slots = readSlots();
    const lastSlot = lastPlayedSlot(slots);
    const last = lastSlot === null ? null : slots[lastSlot];
    const save = last?.status === "ok" ? last.save : null;

    // A janela mudou de formato no meio do jogo e a página recarregou: volta pra onde estava, sem passar pelo menu.
    const resume = takeResumeSlot();
    const resumed = resume === null ? null : slots[resume];
    if (resume !== null && resumed?.status === "ok") {
      this.registry.set(REGISTRY_SESSION, new GameSession(resume, resumed.save));
      this.scene.start(SCENES.world);
      return;
    }

    playMusic("title");
    setPadMode("menu");
    let options: OptionsPanel | undefined;
    const menu: Menu = new Menu(
      this,
      50,
      300,
      [
        {
          label: save ? `Continuar  ·  ${save.character.name}, nível ${save.character.level}` : "Continuar",
          disabled: !save,
          onSelect: () => {
            this.registry.set(REGISTRY_SESSION, new GameSession(lastSlot!, save!));
            this.scene.start(SCENES.world);
          },
        },
        {
          label: "Novo jogo",
          onSelect: () => {
            const slot = firstEmptySlot(slots);
            if (slot === null) {
              // Sem espaço livre, quem escolhe o que sobrescrever é o jogador.
              this.scene.start(SCENES.saves, {
                notice: "Todos os espaços estão ocupados. Escolha um pra recomeçar, ou apague um.",
              } satisfies SaveSlotsData);
              return;
            }
            this.registry.set(REGISTRY_NEW_GAME_SLOT, slot);
            beginNewGame(this);
          },
        },
        {
          label: "Jogos salvos",
          onSelect: () => this.scene.start(SCENES.saves),
        },
        {
          label: "Opções",
          onSelect: () => {
            // Com o painel aberto, o menu de baixo espera.
            menu.setActive(false);
            options = new OptionsPanel(this, (object) => object, () => {
              options?.destroy();
              options = undefined;
              menu.setActive(true);
            });
          },
        },
      ],
      { lineHeight: 50, fontSize: 24, width: COLUMN_WIDTH - 100 },
    );

    addBodyText(this, centerX, GAME_HEIGHT - 40, "Setas e Enter, ou o mouse.", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);
  }
}
