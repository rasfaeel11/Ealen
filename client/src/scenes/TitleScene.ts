import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { firstEmptySlot, lastPlayedSlot, readSlots } from "../game/save";
import { GameSession } from "../game/session";
import { playMusic } from "../game/audio";
import { SoundPanel } from "../game/SoundPanel";
import { Menu, addBodyText, addTitleText } from "../game/ui";
import type { SaveSlotsData } from "./SaveSlotsScene";

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

    const slots = readSlots();
    const lastSlot = lastPlayedSlot(slots);
    const last = lastSlot === null ? null : slots[lastSlot];
    const save = last?.status === "ok" ? last.save : null;

    playMusic("title");
    let sound: SoundPanel | undefined;
    const menu: Menu = new Menu(
      this,
      centerX - 110,
      420,
      [
        {
          label: save ? `Continuar — ${save.character.name}, nível ${save.character.level}` : "Continuar",
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
            this.scene.start(SCENES.prologue);
          },
        },
        {
          label: "Jogos salvos",
          onSelect: () => this.scene.start(SCENES.saves),
        },
        {
          label: "Som",
          onSelect: () => {
            // Com o painel aberto, o menu de baixo espera.
            menu.setActive(false);
            sound = new SoundPanel(this, (object) => object, () => {
              sound?.destroy();
              sound = undefined;
              menu.setActive(true);
            });
          },
        },
      ],
      { lineHeight: 44, fontSize: 28 },
    );

    addBodyText(this, centerX, GAME_HEIGHT - 40, "Setas e Enter, ou o mouse.", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);
  }
}
