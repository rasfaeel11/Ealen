import * as Phaser from "phaser";
import {
  BELT_SLOTS,
  ITEM_REACH,
  describePurse,
  fights,
  sortInventory,
  storedGear,
  usableOutside,
  type Character,
  type ConsumableItem,
  type DiscardResult,
  type EquipmentItem,
  type FieldItemError,
  type FieldItemResult,
  type PassResult,
} from "@jogo/shared";
import { SLOT_LABEL, describeEquipment } from "./SheetPanel";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { isAction, keyLabel } from "./settings";
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
    case "throw": {
      const fire = effect.surface ? " e deixa o chão pegando fogo" : "";
      return `Só na luta: jogado num inimigo a até ${ITEM_REACH} quadrados, quebra em cima, ${effect.dice.count}d${effect.dice.sides} de dano${fire}.`;
    }
  }
}

export interface BagHost {
  /** A dona da mochila — que é a do grupo inteiro. */
  owner: Character;
  /** Quem pode receber um item: a protagonista primeiro, depois quem anda com ela. */
  members: Character[];
  /** `holder` usa o item em `target`, agora (ver useItemOutside em shared/world/field.ts). */
  onUse: (holder: Character, itemId: string, target: Character) => FieldItemResult;
  /** Passa um item de uma pessoa pra outra (ver passItem em shared/inventoryEffects.ts). */
  onPass: (from: Character, to: Character, itemId: string) => PassResult;
  /** Joga fora uma unidade do que `holder` leva (ver discardItem). */
  onDiscard: (holder: Character, itemId: string) => DiscardResult;
  /** Arrumou a mochila ou o cinto de alguém (ver sortInventory): é só guardar. */
  onSorted: () => void;
  onSheet: () => void;
  onClose: () => void;
}

/**
 * A mochila do grupo e o cinto de cada um, abertos por cima do mundo parado: uma
 * grade de encaixes, o que cada coisa é e faz, usar em alguém (o que cura) e
 * passar pra outra pessoa. Na luta, cada um só usa o que leva: a protagonista,
 * a mochila; os outros, o cinto. A regra é de shared/world/field.ts.
 * Depois dos itens da mochila vêm as peças que ninguém veste (o guardado do
 * grupo, ver shared/equipment.ts): aparecem aqui, e vestem-se pela ficha.
 *
 * Setas (ou WASD) andam na grade; Enter escolhe (usar, passar, jogar fora);
 * O arruma; Tab troca de pessoa; C vai pra ficha; Esc ou I fecham.
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
  /** De quem é o que está na tela, entre quem luta. */
  private holderIndex = 0;

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
        addBodyText(scene, X + WIDTH - 30, Y + HEIGHT - 42, `Setas: item  ·  Enter: escolher  ·  O: arrumar  ·  Tab: de quem  ·  ${keyLabel("sheet")}: ficha  ·  Esc: fechar`, {
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

  private get fighters(): Character[] {
    return this.host.members.filter(fights);
  }

  private get holder(): Character {
    return this.fighters[this.holderIndex] ?? this.host.owner;
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
    const { holder } = this;
    const own = holder === this.host.owner;
    const inventory = holder.inventory;
    const slots = [...(inventory?.slots ?? [])].sort((a, b) => a.slotIndex - b.slotIndex);
    this.heading.setText(own ? `MOCHILA  ${slots.length}/${inventory?.maxSlots ?? 0}` : `CINTO DE ${holder.name.toUpperCase()}  ${slots.length}/${inventory?.maxSlots ?? BELT_SLOTS}`);
    this.purse.setText(describePurse(this.host.owner));
    // Depois dos itens, as peças que ninguém veste (o guardado do grupo): aparecem aqui, vestem-se pela ficha.
    const stored = own ? storedGear(this.host.owner) : [];
    const pieces = [...new Map(stored.map((piece) => [piece.id, piece])).values()];
    if (slots.length === 0 && pieces.length === 0) {
      this.showDetail(
        undefined,
        "",
        own ? "Nada na mochila.\n\nO que os vencidos carregavam sem usar fica pra quem vence." : `${holder.name} não leva nada.\n\nNa luta, cada um só usa o que leva. Tab volta pra mochila.`,
      );
    }

    const options: GridOption[] = [
      ...slots.map(({ item, quantity }): GridOption => {
        const charges = item.data.maxUses > 1 ? `Usos: ${item.data.usesRemaining}/${item.data.maxUses}\n` : "";
        const where = item.key
          ? "Item-chave: não se gasta nem se joga fora."
          : usableOutside(item)
            ? "Enter ou clique: usar agora, passar pra alguém ou jogar fora."
            : "Só serve numa luta. Enter ou clique: passar pra alguém ou jogar fora.";
        const icon = itemIcon(item.id);
        return {
          icon,
          count: quantity,
          onFocus: () =>
            this.showDetail(icon, item.name, `${RARITY[item.rarity]}\n\n${item.description}\n\n${describeEffect(item)}\n${charges}\n${where}`),
          onSelect: () => this.chooseTarget(item, icon),
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
              `Guardada  ·  ${SLOT_LABEL[piece.data.slot].toLowerCase()}\n\n${piece.description}\n\n${describeEquipment(piece)}\n\nEnter ou clique: vestir pela ficha, ou jogar fora.`,
            ),
          onSelect: () => this.choosePiece(piece, icon),
        };
      }),
    ];
    this.grid.setCapacity(own ? Number.POSITIVE_INFINITY : (inventory?.maxSlots ?? BELT_SLOTS));
    this.grid.setActive(true);
    this.grid.setOptions(options, focus);
  }

  /** A coluna da direita ganha a lista do grupo: em quem o item vai, ou pra quem ele passa. */
  private chooseTarget(item: ConsumableItem, icon: IconName): void {
    const back = this.grid.focusIndex;
    const { holder } = this;
    const others = this.fighters.filter((other) => other !== holder);
    this.grid.setActive(false);
    this.showDetail(icon, item.name, describeEffect(item));
    const options: MenuOption[] = [
      ...(usableOutside(item) ? this.fighters : []).map((target) => ({
        label: `Usar em ${target.name}  ${target.currentHp}/${target.maxHp}`,
        disabled: target.currentHp >= target.maxHp,
        onSelect: () => {
          const result = this.host.onUse(holder, item.id, target);
          this.defer(() => this.listItems(back));
          this.say(result.ok ? `${target.name}: ${result.description}` : REFUSAL[result.reason]);
        },
      })),
      ...(item.key ? [] : others).map((other) => ({
        label: other === this.host.owner ? "Devolver à mochila" : `Passar pra ${other.name}`,
        onSelect: () => {
          const result = this.host.onPass(holder, other, item.id);
          this.defer(() => this.listItems(back));
          this.say(result === "ok" ? `${item.name}: agora com ${other.name}.` : result === "full" ? `${other.name} não tem onde levar mais nada.` : REFUSAL.item_unavailable);
        },
      })),
      ...(item.key ? [] : [{ label: "Jogar fora", onSelect: () => this.defer(() => this.confirmDiscard(item.id, item.name, icon, back)) }]),
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

  /** Uma peça guardada: vestir (pela ficha) ou jogar fora. */
  private choosePiece(piece: EquipmentItem, icon: IconName): void {
    const back = this.grid.focusIndex;
    this.grid.setActive(false);
    this.openMenu(
      [
        { label: "Vestir pela ficha", onSelect: () => this.host.onSheet() },
        ...(piece.key ? [] : [{ label: "Jogar fora", onSelect: () => this.defer(() => this.confirmDiscard(piece.id, piece.name, icon, back)) }]),
        { label: "Voltar", onSelect: () => this.defer(() => this.listItems(back)) },
      ],
      back,
    );
  }

  /** Jogar fora pede um sim: o que sai da mochila não volta. */
  private confirmDiscard(itemId: string, name: string, icon: IconName, back: number): void {
    const { holder } = this;
    this.grid.setActive(false);
    this.showDetail(icon, name, `Jogar fora um ${name}? Não volta.`);
    this.openMenu(
      [
        {
          label: "Sim, jogar fora",
          onSelect: () => {
            const result = this.host.onDiscard(holder, itemId);
            this.defer(() => this.listItems(back));
            this.say(result === "ok" ? `${name}: ficou pra trás.` : result === "key" ? "Isso a história ainda pede." : REFUSAL.item_unavailable);
          },
        },
        { label: "Não", onSelect: () => this.defer(() => this.listItems(back)) },
      ],
      back,
    );
  }

  /** A coluna da direita vira uma lista de escolhas. */
  private openMenu(options: MenuOption[], back: number): void {
    this.menu?.destroy();
    this.menu = new Menu(this.scene, DETAIL_X, TOP + 190, options, {
      lineHeight: LINE,
      fontSize: 18,
      width: DETAIL_WIDTH,
      onCancel: () => this.defer(() => this.listItems(back)),
      adopt: (object) => this.addHud(object),
    });
  }

  /** `O`: arruma a mochila (ou o cinto) de quem está na tela. */
  private sort(): void {
    if (!sortInventory(this.holder)) {
      this.say("Já está arrumado.");
      return;
    }
    this.host.onSorted();
    this.listItems();
    this.say("Arrumado.");
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
    if (isAction(event, "bag")) this.host.onClose();
    else if (isAction(event, "sheet")) this.host.onSheet();
    else if (event.code === "KeyO" && !this.menu) this.sort();
    else if (event.code === "Tab" && !this.menu && this.fighters.length > 1) {
      event.preventDefault();
      this.holderIndex = (this.holderIndex + 1) % this.fighters.length;
      this.listItems();
    }
  }
}
