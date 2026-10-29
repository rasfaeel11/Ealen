import * as Phaser from "phaser";
import { engravable, engravingSlots, type Ability, type Character } from "@jogo/shared";
import { describeAbility } from "./combat/CombatController";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { Menu, addBodyText, addPanel, addTitleText, type MenuOption } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const WIDTH = 940;
const HEIGHT = 580;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TOP = Y + 96;
const LIST_X = X + 40;
const DETAIL_X = X + 440;
const DETAIL_WIDTH = WIDTH - (DETAIL_X - X) - 40;
const LINE = 34;
/** A tecla que abriu o painel não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

export interface EngraveHost {
  /** Quem conjura e tem onde gravar, a protagonista primeiro. */
  casters: Character[];
  /** Grava a magia `abilityId` em `caster` (ver engrave em shared/world/field.ts). */
  onEngrave: (caster: Character, abilityId: string) => boolean;
  onClose: () => void;
}

/**
 * O descanso de quem conjura: escrever ANTES, num objeto ou num círculo no
 * chão, as magias que na luta vão sair na hora, sem o tempo de recitar. Uma
 * por gravação, até o nível de mago; cada uma serve uma vez. A regra é de
 * shared/world/field.ts.
 *
 * ↑/↓ escolhem a magia; Enter grava; ←/→ trocam de quem grava; Esc fecha.
 */
export class EngravePanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private menu?: Menu;
  private readonly title: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly openedAt: number;
  private index = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: EngraveHost,
  ) {
    this.frame.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
    );
    this.title = addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 48, "", { fontSize: "32px" }).setOrigin(0.5));
    this.detail = addHud(
      addBodyText(scene, DETAIL_X, TOP, "", { fontSize: "18px", lineSpacing: 5, wordWrap: { width: DETAIL_WIDTH } }),
    );
    this.frame.push(
      this.title,
      this.detail,
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 34, "↑/↓: magia  ·  Enter: gravar  ·  ←/→: quem grava  ·  Esc: pronto", {
          fontSize: "16px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );
    this.openedAt = scene.time.now;
    this.show();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.menu?.destroy();
    for (const object of this.frame) object.destroy();
  }

  private show(): void {
    const caster = this.host.casters[this.index];
    const slots = engravingSlots(caster);
    const engraved = caster.engraved ?? [];
    const full = engraved.length >= slots;
    const spells = engravable(caster);
    this.title.setText(`GRAVAR  ·  ${caster.name}  ${engraved.length}/${slots}`);

    const kept = engraved.map((id) => spells.find((spell) => spell.id === id)?.name ?? id);
    const summary = [
      "Escrito antes, num objeto ou num círculo no chão: na luta sai na hora, sem o tempo de recitar. Cada gravação serve uma vez; a mana se paga ao ativar.",
      "",
      kept.length > 0 ? `Gravadas: ${kept.join(", ")}.` : "Nada gravado.",
    ].join("\n");
    this.detail.setText(summary);

    const describe = (spell: Ability) => () => this.detail.setText(`${spell.name}\n\n${spell.flavor}\n\n${describeAbility(spell)}\n\n${summary}`);
    const options: MenuOption[] = [
      ...spells.map((spell) => ({
        label: `${spell.name}  ·  ${spell.mana} mana`,
        disabled: full,
        onFocus: describe(spell),
        onSelect: () => {
          if (this.host.onEngrave(caster, spell.id)) this.show();
        },
      })),
      { label: "Pronto", onSelect: () => this.host.onClose() },
    ];
    this.menu?.destroy();
    this.menu = new Menu(this.scene, LIST_X, TOP, options, {
      lineHeight: LINE,
      fontSize: 20,
      onCancel: () => this.host.onClose(),
      adopt: (item) => this.addHud(item),
    });
    if (full) this.menu.focusOn(options.length - 1);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS || this.host.casters.length < 2) return;
    const step = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    this.index = (this.index + step + this.host.casters.length) % this.host.casters.length;
    this.show();
  }
}
