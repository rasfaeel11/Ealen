import * as Phaser from "phaser";
import {
  buyRefusal,
  buybackPrice,
  coinsOf,
  describePurse,
  findItem,
  itemCount,
  sellRefusal,
  stockLeft,
  type BuyRefusal,
  type Character,
  type SellRefusal,
  type Shop,
  type ShopLedger,
  type ShopWare,
} from "@jogo/shared";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { iconKey, itemIcon } from "./icons";
import { Menu, addBodyText, addCloseButton, addHeading, addModalDim, addPanel, addTitleText, type AddHud, type MenuOption } from "./ui";

const WIDTH = 900;
const HEIGHT = 540;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TOP = Y + 116;
const LIST_X = X + 40;
const LIST_WIDTH = 420;
const DETAIL_X = LIST_X + LIST_WIDTH + 30;
const DETAIL_WIDTH = X + WIDTH - DETAIL_X - 36;
const TABS_Y = Y + 84;
/** A tecla que abriu a loja não pode ser a mesma que a fecha. */
const INPUT_GRACE_MS = 200;

const BUY_REFUSAL: Record<BuyRefusal, string> = {
  unknown: "Isso ela não vende.",
  stock: "Acabou.",
  coins: "Falta dinheiro.",
  full: "Não cabe na mochila.",
};

const SELL_REFUSAL: Record<SellRefusal, string> = {
  not_bought: "Isso ela não compra.",
  none: "Não há o que vender.",
  key: "Isso não se vende.",
};

export interface ShopHost {
  shop: Shop;
  /** A dona da mochila e da bolsa. */
  owner: Character;
  /** O que cada loja já vendeu, MUTADO por quem compra e vende (é da história: ver StoryRunner.ledger). */
  ledger: ShopLedger;
  onBuy: (itemId: string) => BuyRefusal | undefined;
  onSell: (itemId: string) => SellRefusal | undefined;
  onClose: () => void;
}

/**
 * Uma loja aberta por cima do mundo parado (a regra é de shared/shop.ts): o que
 * ela vende, por quanto e quanto ainda tem; e, na outra aba, o que ela compra de
 * volta da mochila, pela metade. A bolsa fica embaixo.
 *
 * Tab (ou clique) troca entre comprar e vender; setas andam; Enter faz; Esc fecha.
 */
export class ShopPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private readonly tabLabels: Phaser.GameObjects.Text[] = [];
  private menu?: Menu;
  private readonly purse: Phaser.GameObjects.Text;
  private readonly detailIcon: Phaser.GameObjects.Image;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly notice: Phaser.GameObjects.Text;
  private readonly openedAt: number;
  private selling = false;
  /** A linha sob o cursor: é onde ele volta depois de comprar ou vender. */
  private focusAt = 0;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: ShopHost,
  ) {
    this.frame.push(addHud(addModalDim(scene)), addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)));
    const heading = addHeading(scene, GAME_WIDTH / 2, Y + 40, host.shop.seller.toUpperCase(), WIDTH - 200, 26);
    this.frame.push(addHud(heading.rule), addHud(heading.label), addHud(addCloseButton(scene, X + WIDTH - 26, Y + 26, () => this.host.onClose())));
    (host.shop.buys ? ["Comprar", "Vender"] : ["Comprar"]).forEach((name, i, all) => {
      const label = addHud(addBodyText(scene, GAME_WIDTH / 2 + (i - (all.length - 1) / 2) * 180, TABS_Y, name, { fontSize: "19px" }).setOrigin(0.5));
      label.setInteractive({ useHandCursor: true });
      label.on(Phaser.Input.Events.POINTER_DOWN, () => this.later(() => this.showTab(i === 1)));
      this.tabLabels.push(label);
      this.frame.push(label);
    });
    this.purse = addHud(addBodyText(scene, LIST_X + 24, Y + HEIGHT - 40, "", { fontSize: "16px", color: TEXT_COLORS.goldBright }).setOrigin(0, 0.5));
    this.detailIcon = addHud(scene.add.image(DETAIL_X + 32, TOP + 32, iconKey("bag")).setDisplaySize(56, 56).setVisible(false));
    this.detailName = addHud(
      addTitleText(scene, DETAIL_X + 72, TOP + 32, "", { fontSize: "18px", color: TEXT_COLORS.goldBright, wordWrap: { width: DETAIL_WIDTH - 72 } }).setOrigin(0, 0.5),
    );
    this.detail = addHud(addBodyText(scene, DETAIL_X, TOP + 76, "", { fontSize: "16px", lineSpacing: 4, wordWrap: { width: DETAIL_WIDTH } }));
    this.notice = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 76, "", { fontSize: "17px", color: TEXT_COLORS.goldBright }).setOrigin(0.5).setShadow(0, 2, "#000000", 4),
    );
    this.frame.push(
      this.purse,
      addHud(scene.add.image(LIST_X + 10, Y + HEIGHT - 40, iconKey("coin")).setDisplaySize(18, 18)),
      this.detailIcon,
      this.detailName,
      this.detail,
      this.notice,
      addHud(
        addBodyText(scene, X + WIDTH - 36, Y + HEIGHT - 40, `${host.shop.buys ? "Tab: comprar ou vender  ·  " : ""}Enter: comprar ou vender  ·  Esc: fechar`, {
          fontSize: "14px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(1, 0.5),
      ),
    );
    this.openedAt = scene.time.now;
    this.showTab(false);
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.closed = true;
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.menu?.destroy();
    for (const object of this.frame) object.destroy();
  }

  /** No quadro seguinte: o que foi clicado ainda está no meio do próprio evento, e a troca o destrói. */
  private later(action: () => void): void {
    this.scene.time.delayedCall(0, () => {
      if (!this.closed) action();
    });
  }

  private showTab(selling: boolean, focus = 0): void {
    this.selling = selling;
    this.tabLabels.forEach((label, i) => label.setColor((i === 1) === selling ? TEXT_COLORS.goldBright : TEXT_COLORS.inkDim));
    this.purse.setText(`Na bolsa: ${describePurse(this.host.owner)}`);
    const options = this.host.shop.wares
      .flatMap((ware) => (selling ? this.sellOption(ware) : [this.buyOption(ware)]))
      .map((option, i): MenuOption => ({
        ...option,
        onFocus: () => {
          this.focusAt = i;
          option.onFocus?.();
        },
      }));
    this.menu?.destroy();
    this.menu = undefined;
    if (options.length === 0) {
      this.describe(undefined, selling ? "Nada na mochila que ela compre." : "Ela não tem nada pra vender.");
      return;
    }
    this.menu = new Menu(this.scene, LIST_X, TOP, options, {
      lineHeight: 34,
      fontSize: 18,
      width: LIST_WIDTH,
      onCancel: () => this.host.onClose(),
      adopt: (item) => this.addHud(item),
    });
    this.menu.focusOn(Math.min(focus, options.length - 1));
  }

  private describe(ware: ShopWare | undefined, text: string): void {
    const item = ware && findItem(ware.itemId);
    this.detailIcon.setVisible(item !== undefined);
    if (item) this.detailIcon.setTexture(iconKey(itemIcon(item.id)));
    this.detailName.setText(item?.name ?? "");
    this.detail.setText(item ? `${item.description}\n\n${text}` : text);
  }

  private buyOption(ware: ShopWare): MenuOption {
    const { shop, owner, ledger } = this.host;
    const item = findItem(ware.itemId);
    const left = stockLeft(shop, ware, ledger);
    const refusal = buyRefusal(shop, owner, ware.itemId, ledger);
    const stock = left === Infinity ? "" : left === 0 ? "  ·  acabou" : `  ·  ${left} na banca`;
    return {
      label: `${item?.name ?? ware.itemId}  ·  ${ware.price} de ${ware.coin}${stock}`,
      disabled: refusal !== undefined && refusal !== "full",
      onFocus: () => {
        const has = itemCount(owner, ware.itemId);
        this.describe(
          ware,
          `${ware.price} de ${ware.coin}. ${refusal ? BUY_REFUSAL[refusal] : "Enter: comprar um."}${has > 0 ? `\nNa mochila: ${has}.` : ""}`,
        );
      },
      onSelect: () => this.later(() => this.buy(ware)),
    };
  }

  private sellOption(ware: ShopWare): MenuOption[] {
    const { shop, owner } = this.host;
    const has = itemCount(owner, ware.itemId);
    if (has < 1) return [];
    const item = findItem(ware.itemId);
    const price = buybackPrice(ware);
    const refusal = sellRefusal(shop, owner, ware.itemId);
    return [
      {
        label: `${item?.name ?? ware.itemId}  ·  ${price} de ${ware.coin}  ·  tem ${has}`,
        disabled: refusal !== undefined,
        onFocus: () => this.describe(ware, `Ela paga ${price} de ${ware.coin}. ${refusal ? SELL_REFUSAL[refusal] : "Enter: vender um."}`),
        onSelect: () => this.later(() => this.sell(ware)),
      },
    ];
  }

  private buy(ware: ShopWare): void {
    const focus = this.focusAt;
    const refusal = this.host.onBuy(ware.itemId);
    this.showTab(false, focus);
    if (refusal) {
      this.say(BUY_REFUSAL[refusal]);
      return;
    }
    this.say(ware.line ? `${this.host.shop.seller}: ${ware.line}` : `Comprou: ${findItem(ware.itemId)?.name ?? ware.itemId}.`);
  }

  private sell(ware: ShopWare): void {
    const focus = this.focusAt;
    const refusal = this.host.onSell(ware.itemId);
    this.showTab(true, focus);
    this.say(refusal ? SELL_REFUSAL[refusal] : `Vendeu: ${findItem(ware.itemId)?.name ?? ware.itemId}. Na bolsa: ${coinsOf(this.host.owner, ware.coin)} de ${ware.coin}.`);
  }

  private say(text: string): void {
    this.notice.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.notice);
    this.scene.tweens.add({ targets: this.notice, alpha: 0, delay: 2200, duration: 500 });
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "Tab" && this.host.shop.buys) {
      event.preventDefault();
      this.later(() => this.showTab(!this.selling));
    } else if (event.code === "Escape" && !this.menu) this.host.onClose();
  }
}

