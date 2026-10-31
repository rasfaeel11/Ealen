import * as Phaser from "phaser";
import {
  describePurse,
  fights,
  storedGear,
  usableOutside,
  type Character,
  type ConsumableItem,
  type FieldItemError,
  type FieldItemResult,
} from "@jogo/shared";
import { SLOT_LABEL, describeEquipment } from "./SheetPanel";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { gearIcon, iconKey, itemIcon, type IconName } from "./icons";
import { Menu, SlotGrid, addBodyText, addCloseButton, addHeading, addModalDim, addPanel, addTitleText, type AddHud, type GridOption, type MenuOption } from "./ui";

const WIDTH = 1040;
const HEIGHT = 600;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TOP = Y + 78;
const GRID_X = X + 34;
const COLS = 6;
/** A mochila leva 12 itens; o resto dos encaixes é do que fica guardado. */
const ROWS = 4;
const SLOT = 78;
const GAP = 6;
const DETAIL_X = GRID_X + COLS * (SLOT + GAP) + 20;
const DETAIL_WIDTH = X + WIDTH - DETAIL_X - 30;
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
 * A mochila do grupo, aberta por cima do mundo parado: uma grade de encaixes,
 * o que cada coisa é e faz, e — pro que cura — usar em alguém ali mesmo. O que
 * só serve numa luta aparece, mas fica pra ela. A regra é de shared/world/field.ts.
 * Depois dos itens vêm as peças que ninguém veste (o guardado do grupo, ver
 * shared/equipment.ts): aparecem aqui, e vestem-se pela ficha.
 *
 * Setas (ou WASD) andam na grade; Enter usa; C vai pra ficha; Esc ou I fecham.
 */
export class BagPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private readonly grid: SlotGrid;
  private menu?: Menu;
  private readonly heading: ReturnType<typeof addHeading>;
  private readonly purse: Phaser.GameObjects.Text;
  private readonly detailIcon: Phaser.GameObjects.Image;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly notice: Phaser.GameObjects.Text;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: BagHost,
  ) {
    this.frame.push(addHud(addModalDim(scene)), addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)));
    this.heading = addHeading(scene, GAME_WIDTH / 2, Y + 38, "MOCHILA", WIDTH - 200, 28);
    this.purse = addHud(addBodyText(scene, GRID_X + 24, Y + HEIGHT - 42, "", { fontSize: "16px", color: TEXT_COLORS.goldBright }).setOrigin(0, 0.5));
    this.detailIcon = addHud(scene.add.image(DETAIL_X + 36, TOP + 36, iconKey("bag")).setDisplaySize(64, 64).setVisible(false));
    this.detailName = addHud(
      addTitleText(scene, DETAIL_X + 82, TOP + 36, "", { fontSize: "18px", color: TEXT_COLORS.goldBright, wordWrap: { width: DETAIL_WIDTH - 82 } }).setOrigin(0, 0.5),
    );
    this.detail = addHud(addBodyText(scene, DETAIL_X, TOP + 84, "", { fontSize: "16px", lineSpacing: 4, wordWrap: { width: DETAIL_WIDTH } }));
    this.notice = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 66, "", { fontSize: "17px", color: TEXT_COLORS.goldBright }).setOrigin(0.5).setShadow(0, 2, "#000000", 4),
    );
    this.frame.push(
      addHud(this.heading.rule),
      addHud(this.heading.label),
      this.purse,
      addHud(scene.add.image(GRID_X + 10, Y + HEIGHT - 42, iconKey("coin")).setDisplaySize(18, 18)),
      this.detailIcon,
      this.detailName,
      this.detail,
      this.notice,
      addHud(
        addBodyText(scene, X + WIDTH - 30, Y + HEIGHT - 42, "Setas: item  ·  Enter: usar  ·  C: ficha  ·  Esc: fechar", {
          fontSize: "14px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(1, 0.5),
      ),
      addHud(addCloseButton(scene, X + WIDTH - 28, Y + 28, () => this.host.onClose())),
    );
    this.grid = new SlotGrid(scene, GRID_X, TOP, {
      cols: COLS,
      rows: ROWS,
      size: SLOT,
      gap: GAP,
      onCancel: () => this.host.onClose(),
      adopt: (root) => addHud(root),
    });
    this.openedAt = scene.time.now;
    this.listItems();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.menu?.destroy();
    this.grid.destroy();
    for (const object of this.frame) object.destroy();
  }

  /** O que aparece à direita: o ícone, o nome e o que a coisa é. */
  private showDetail(icon: IconName | undefined, name: string, text: string): void {
    this.detailIcon.setVisible(icon !== undefined);
    if (icon) this.detailIcon.setTexture(iconKey(icon)).setDisplaySize(64, 64);
    this.detailName.setText(name);
    this.detail.setText(text);
  }

  private listItems(focus = 0): void {
    this.menu?.destroy();
    this.menu = undefined;
    const inventory = this.host.owner.inventory;
    const slots = [...(inventory?.slots ?? [])].sort((a, b) => a.slotIndex - b.slotIndex);
    this.heading.setText(`MOCHILA  ${slots.length}/${inventory?.maxSlots ?? 0}`);
    this.purse.setText(describePurse(this.host.owner));
    // Depois dos itens, as peças que ninguém veste (o guardado do grupo): aparecem aqui, vestem-se pela ficha.
    const stored = storedGear(this.host.owner);
    const pieces = [...new Map(stored.map((piece) => [piece.id, piece])).values()];
    if (slots.length === 0 && pieces.length === 0) {
      this.showDetail(undefined, "", "Nada na mochila.\n\nO que os vencidos carregavam sem usar fica pra quem vence.");
    }

    const options: GridOption[] = [
      ...slots.map(({ item, quantity }): GridOption => {
        const charges = item.data.maxUses > 1 ? `Usos: ${item.data.usesRemaining}/${item.data.maxUses}\n` : "";
        const where = usableOutside(item) ? "Enter ou clique: usar agora em alguém do grupo." : REFUSAL.only_in_fight;
        const icon = itemIcon(item.id);
        return {
          icon,
          count: quantity,
          onFocus: () =>
            this.showDetail(icon, item.name, `${RARITY[item.rarity]}\n\n${item.description}\n\n${describeEffect(item)}\n${charges}\n${where}`),
          onSelect: () => (usableOutside(item) ? this.chooseTarget(item, icon) : this.say(REFUSAL.only_in_fight)),
        };
      }),
      ...pieces.map((piece): GridOption => {
        const count = stored.filter((other) => other.id === piece.id).length;
        const icon = gearIcon(piece);
        return {
          icon,
          count,
          onFocus: () =>
            this.showDetail(
              icon,
              piece.name,
              `Guardada  ·  ${SLOT_LABEL[piece.data.slot].toLowerCase()}\n\n${piece.description}\n\n${describeEquipment(piece)}\n\nVeste-se pela ficha: Enter (ou C), depois E.`,
            ),
          onSelect: () => this.host.onSheet(),
        };
      }),
    ];
    this.grid.setActive(true);
    this.grid.setOptions(options, focus);
  }

  /** A coluna da direita ganha a lista do grupo: em quem o item vai. */
  private chooseTarget(item: ConsumableItem, icon: IconName): void {
    const back = this.grid.focusIndex;
    const targets = this.host.members.filter(fights);
    this.grid.setActive(false);
    this.showDetail(icon, item.name, `Em quem?\n\n${describeEffect(item)}`);
    const options: MenuOption[] = [
      ...targets.map((target) => ({
        label: `${target.name}  ${target.currentHp}/${target.maxHp}`,
        disabled: target.currentHp >= target.maxHp,
        onSelect: () => {
          const result = this.host.onUse(item.id, target);
          this.defer(() => this.listItems(back));
          this.say(result.ok ? `${target.name}: ${result.description}` : REFUSAL[result.reason]);
        },
      })),
      { label: "Voltar", onSelect: () => this.defer(() => this.listItems(back)) },
    ];
    this.menu = new Menu(this.scene, DETAIL_X, TOP + 190, options, {
      lineHeight: LINE,
      fontSize: 18,
      width: DETAIL_WIDTH,
      onCancel: () => this.defer(() => this.listItems(back)),
      adopt: (object) => this.addHud(object),
    });
  }

  /** No quadro seguinte: a opção clicada ainda está no meio do próprio evento, e a troca a destrói. */
  private defer(action: () => void): void {
    this.menu?.setActive(false);
    this.scene.time.delayedCall(0, action);
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
