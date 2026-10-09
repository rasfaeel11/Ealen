import * as Phaser from "phaser";
import {
  fights,
  usableOutside,
  type Character,
  type ConsumableItem,
  type FieldItemError,
  type FieldItemResult,
} from "@ealen/shared";
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
/** A tecla que abriu a mochila não pode ser a mesma que a fecha. */
const INPUT_GRACE_MS = 200;

const RARITY: Record<ConsumableItem["rarity"], string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  sacred: "Sagrado",
};

const REFUSAL: Record<FieldItemError, string> = {
  item_unavailable: "Esse item não está mais na mochila.",
  only_in_fight: "Só serve dentro de uma luta.",
  no_effect: "Não faria nada agora.",
};

/** O que o item faz, em números. */
function describeEffect(item: ConsumableItem): string {
  const { effect } = item.data;
  switch (effect.kind) {
    case "heal_hp":
      return `Restaura ${effect.amount} de vida.`;
    case "cure_status":
      return "Purifica e restaura 5 de vida. Numa luta, tira as condições que atrapalham.";
    case "buff_stat":
      return `+${effect.bonus} ${effect.stat.toUpperCase()} por ${effect.durationTurns} turnos.`;
    case "focus_charge":
      return "O próximo golpe é crítico.";
  }
}

export interface BagHost {
  /** A dona da mochila — que é a do grupo inteiro. */
  owner: Character;
  /** Quem pode receber um item: a protagonista primeiro, depois quem anda com ela. */
  members: Character[];
  /** Usa o item em `target`, agora (ver useItemOutside em shared/world/field.ts). */
  onUse: (itemId: string, target: Character) => FieldItemResult;
  onSheet: () => void;
  onClose: () => void;
}

/**
 * A mochila do grupo, aberta por cima do mundo parado: o que há nela, o que
 * cada coisa é e faz, e — pro que cura — usar em alguém ali mesmo. O que só
 * serve numa luta aparece, mas fica pra ela. A regra é de shared/world/field.ts.
 *
 * ↑/↓ escolhem o item; Enter usa; C vai pra ficha; Esc ou I fecham.
 */
export class BagPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private menu?: Menu;
  private readonly title: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly notice: Phaser.GameObjects.Text;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: BagHost,
  ) {
    this.frame.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
    );
    this.title = addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 48, "", { fontSize: "32px" }).setOrigin(0.5));
    this.detail = addHud(
      addBodyText(scene, DETAIL_X, TOP, "", { fontSize: "18px", lineSpacing: 5, wordWrap: { width: DETAIL_WIDTH } }),
    );
    this.notice = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 66, "", { fontSize: "18px", color: TEXT_COLORS.goldBright }).setOrigin(0.5),
    );
    this.frame.push(
      this.title,
      this.detail,
      this.notice,
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 34, "↑/↓: item  ·  Enter: usar  ·  C: ficha  ·  Esc: fechar", {
          fontSize: "16px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );
    this.openedAt = scene.time.now;
    this.listItems();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.menu?.destroy();
    for (const object of this.frame) object.destroy();
  }

  private setMenu(options: MenuOption[], onCancel: () => void): void {
    this.menu?.destroy();
    this.menu = new Menu(this.scene, LIST_X, TOP, options, {
      lineHeight: LINE,
      fontSize: 20,
      onCancel,
      adopt: (item) => this.addHud(item),
    });
  }

  private listItems(): void {
    const inventory = this.host.owner.inventory;
    const slots = [...(inventory?.slots ?? [])].sort((a, b) => a.slotIndex - b.slotIndex);
    this.title.setText(`MOCHILA  ${slots.length}/${inventory?.maxSlots ?? 0}`);
    if (slots.length === 0) this.detail.setText("Nada na mochila.\n\nO que os vencidos carregavam sem usar fica pra quem vence.");

    this.setMenu(
      slots.map(({ item, quantity }) => {
        const charges = item.data.maxUses > 1 ? `  (${item.data.usesRemaining}/${item.data.maxUses} usos)` : "";
        const where = usableOutside(item) ? "Enter: usar agora em alguém do grupo." : REFUSAL.only_in_fight;
        return {
          label: `${item.name}  x${quantity}${charges}`,
          onFocus: () => this.detail.setText(`${RARITY[item.rarity]}\n\n${item.description}\n\n${describeEffect(item)}\n\n${where}`),
          onSelect: () => (usableOutside(item) ? this.chooseTarget(item) : this.say(REFUSAL.only_in_fight)),
        };
      }),
      () => this.host.onClose(),
    );
  }

  /** A lista de itens vira a do grupo: em quem o item vai. */
  private chooseTarget(item: ConsumableItem): void {
    const targets = this.host.members.filter(fights);
    this.detail.setText(`${item.name}: em quem?\n\n${describeEffect(item)}`);
    this.setMenu(
      [
        ...targets.map((target) => ({
          label: `${target.name}  ${target.currentHp}/${target.maxHp}`,
          disabled: target.currentHp >= target.maxHp,
          onSelect: () => {
            const result = this.host.onUse(item.id, target);
            this.listItems();
            this.say(result.ok ? `${target.name}: ${result.description}` : REFUSAL[result.reason]);
          },
        })),
        { label: "Voltar", onSelect: () => this.listItems() },
      ],
      () => this.listItems(),
    );
  }

  private say(text: string): void {
    this.notice.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.notice);
    this.scene.tweens.add({ targets: this.notice, alpha: 0, delay: 2200, duration: 500 });
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "KeyI") this.host.onClose();
    else if (event.code === "KeyC") this.host.onSheet();
  }
}
