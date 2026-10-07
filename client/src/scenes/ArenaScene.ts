import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  BESTIARY,
  CLASS_INFO,
  RACE_INFO,
  xpToNextLevel,
  type Character,
} from "@ealen/shared";
import { REGISTRY_CHARACTER, SCENES, TEXT_COLORS } from "../game/config";
import { writeSave } from "../game/save";
import { Menu, addBodyText, addPanel, addTitleText, type MenuOption } from "../game/ui";

/**
 * Arena de teste — NÃO é parte do jogo final. É o andaime que fica no lugar
 * do mapa e da história enquanto eles não existem: mostra a ficha do
 * personagem e deixa escolher qualquer criatura do bestiário pra lutar, que
 * é o que basta pra desenvolver e balancear a cena de combate.
 */
export default class ArenaScene extends Phaser.Scene {
  private sheet!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.arena);
  }

  create(): void {
    const character = this.registry.get(REGISTRY_CHARACTER) as Character | undefined;
    if (!character) {
      this.scene.start(SCENES.title);
      return;
    }

    addTitleText(this, 60, 36, "Arena de teste", { fontSize: "34px" });
    addBodyText(this, 60, 82, "Andaime de desenvolvimento: o mapa e a história entram aqui depois.", {
      fontSize: "18px",
      color: TEXT_COLORS.inkDim,
    });

    addPanel(this, 60, 130, 480, 540, true);
    this.sheet = addBodyText(this, 84, 150, "", { fontSize: "19px", lineSpacing: 6, wordWrap: { width: 430 } });
    this.renderSheet(character);

    addPanel(this, 580, 130, 640, 540);
    this.hint = addBodyText(this, 604, 520, "", {
      fontSize: "18px",
      fontStyle: "italic",
      color: TEXT_COLORS.inkDim,
      wordWrap: { width: 590 },
    });

    const encounterIds = Object.keys(BESTIARY).sort((a, b) => BESTIARY[a].template.level - BESTIARY[b].template.level);

    const options: MenuOption[] = encounterIds.map((encounterId) => {
      const entry = BESTIARY[encounterId];
      return {
        label: `${entry.template.name} — nível ${entry.template.level}`,
        onSelect: () => this.scene.start(SCENES.battle, { encounterId }),
        onFocus: () => this.hint.setText(entry.summary),
      };
    });
    options.push(
      {
        label: "Descansar",
        onSelect: () => {
          character.currentHp = character.maxHp;
          writeSave(character);
          this.renderSheet(character);
        },
        onFocus: () => this.hint.setText("Recupera todo o HP."),
      },
      {
        label: "Voltar ao mapa",
        onSelect: () => this.scene.start(SCENES.world),
        onFocus: () => this.hint.setText("Volta pra onde você estava."),
      },
      {
        label: "Voltar ao título",
        onSelect: () => this.scene.start(SCENES.title),
        onFocus: () => this.hint.setText("O progresso já está salvo."),
      },
    );

    new Menu(this, 604, 152, options, { lineHeight: 38, fontSize: 24 });
  }

  private renderSheet(character: Character): void {
    const info = CLASS_INFO[character.characterClass];
    const items = character.inventory?.slots ?? [];

    this.sheet.setText(
      [
        character.name,
        `${RACE_INFO[character.race].name} · ${info.name}`,
        "",
        `Nível ${character.level}   XP ${character.xp} / ${xpToNextLevel(character.level)}`,
        `HP ${character.currentHp} / ${character.maxHp}`,
        "",
        ATTRIBUTE_KEYS.map((key) => `${key.toUpperCase()} ${character.attributes[key]}`).join("   "),
        "",
        "Mochila",
        ...(items.length > 0 ? items.map((slot) => `  ${slot.item.name} ×${slot.quantity}`) : ["  (vazia)"]),
      ].join("\n"),
    );
  }
}
