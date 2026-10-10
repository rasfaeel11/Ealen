import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  GIFTS,
  STATUSES,
  SUPPORTS,
  abilitiesFor,
  castOf,
  fieldUseRefusal,
  styleLabel,
  supportOf,
  useItemInField,
  xpToNextLevel,
  type Attributes,
  type Character,
  type FieldUseRefusal,
  type Race,
  type StatusId,
} from "@ealen/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { addBodyText, addPanel, addTitleText } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const WIDTH = 1080;
const HEIGHT = 610;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const PADDING = 36;
const TOP = Y + 96;
const MEMBERS_X = X + PADDING;
const SHEET_X = X + 230;
const SHEET_WIDTH = 430;
const PACK_X = X + 680;
const PACK_WIDTH = WIDTH - 680 - PADDING;
const LINE = 28;
/** A tecla que abriu o painel não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

const RACE_NAME: Record<Race, string> = { althirim: "Althirim", miraven: "Miraven", taharim: "Taharim", kelbar: "Kelbar" };
/** O que cada atributo governa, em uma palavra (a tabela está em AGENTS.md). */
const ATTRIBUTE_ROLE: Record<keyof Attributes, string> = {
  dain: "Força",
  eir: "Ressonância",
  nath: "Vitalidade",
  il: "Percepção",
  or: "Densidade",
  len: "Voz",
  ul: "Mistério",
};
const COST_LABEL = { action: "ação", bonus: "bônus" } as const;
const REFUSAL: Record<FieldUseRefusal, (name: string) => string> = {
  item_unavailable: () => "Não há mais disso na mochila.",
  only_in_combat: () => "Isto só serve no meio de uma luta.",
  no_effect: (name) => `${name} não precisa disso agora.`,
};

type Column = "members" | "pack";

/**
 * A ficha do grupo e a mochila, por cima do mundo parado. À esquerda quem
 * anda junto; no meio a ficha de quem está escolhido (o que ele é, o estilo,
 * os atributos, o que sabe fazer, o que a história pôs nele); à direita a
 * mochila — que é uma só, a de Halmira — de onde se usa um item EM quem está
 * escolhido. Só o que cura se usa fora de luta, e a regra é de shared/
 * (`fieldUseRefusal`): o painel só pergunta e mostra.
 *
 * ↑/↓ (ou W/S) andam na coluna; ←/→ (ou A/D, Tab) trocam de coluna; Enter usa
 * o item; Esc ou C fecham.
 */
export class PartyPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private drawn: Phaser.GameObjects.GameObject[] = [];
  private column: Column = "members";
  private member = 0;
  private item = 0;
  private message = "";
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    /** Halmira primeiro (a mochila é a dela), depois quem anda com ela. */
    private readonly party: readonly Character[],
    /** O que a história pôs em cada um e dura entre lutas, pelo id da ficha. */
    private readonly afflictions: Record<string, readonly StatusId[]>,
    /** Um item foi usado: a ficha e a mochila mudaram. */
    private readonly onChange: () => void,
    private readonly onClose: () => void,
  ) {
    this.frame.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
      addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 48, "GRUPO", { fontSize: "32px" }).setOrigin(0.5)),
    );
    this.openedAt = scene.time.now;
    this.draw();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of [...this.frame, ...this.drawn]) object.destroy();
    this.drawn = [];
  }

  private get hero(): Character {
    return this.party[0];
  }

  private get slots() {
    return this.hero.inventory?.slots ?? [];
  }

  private text(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
    const object = this.addHud(addBodyText(this.scene, x, y, text, { fontSize: "19px", ...style }));
    this.drawn.push(object);
    return object;
  }

  private heading(x: number, y: number, text: string): void {
    this.drawn.push(this.addHud(addTitleText(this.scene, x, y, text, { fontSize: "17px" })));
  }

  private draw(): void {
    for (const object of this.drawn) object.destroy();
    this.drawn = [];
    this.item = Math.max(0, Math.min(this.slots.length - 1, this.item));

    this.drawMembers();
    this.drawSheet(this.party[this.member]);
    this.drawPack();

    this.text(GAME_WIDTH / 2, Y + HEIGHT - 70, this.message, { color: TEXT_COLORS.goldBright }).setOrigin(0.5, 0);
    const use = this.column === "pack" && this.slots.length > 0 ? `Enter: usar em ${this.party[this.member].name}  ·  ` : "";
    this.text(GAME_WIDTH / 2, Y + HEIGHT - 38, `↑/↓: escolher  ·  ←/→: grupo ou mochila  ·  ${use}Esc: fechar`, {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5, 0);
  }

  private drawMembers(): void {
    this.heading(MEMBERS_X, TOP - 30, "QUEM ANDA JUNTO");
    this.party.forEach((character, index) => {
      const chosen = index === this.member;
      const focused = chosen && this.column === "members";
      this.text(MEMBERS_X, TOP + index * (LINE + 4), `${chosen ? "▸ " : "   "}${character.name}`, {
        fontSize: "21px",
        color: focused ? TEXT_COLORS.goldBright : chosen ? TEXT_COLORS.gold : TEXT_COLORS.ink,
      });
    });
  }

  private drawSheet(character: Character): void {
    const cast = castOf(character);
    const support = supportOf(character);
    const style = styleLabel({ style: cast?.style?.id, grade: cast?.style?.grade });
    let y = TOP - 30;
    const line = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}) => {
      const object = this.text(SHEET_X, y, text, { wordWrap: { width: SHEET_WIDTH }, ...style });
      y += Math.max(LINE, object.height + 6);
    };

    this.heading(SHEET_X, y, character.name.toUpperCase());
    y += LINE;
    line([RACE_NAME[character.race], CLASS_INFO[character.characterClass].name, style].filter(Boolean).join("  ·  "), {
      fontSize: "18px",
      color: TEXT_COLORS.gold,
    });
    line(`Nível ${character.level}  ·  XP ${character.xp}/${xpToNextLevel(character.level)}`);
    if (support) {
      // Quem acompanha sem lutar não tem vida que importe mostrar: tem o que ele faz na luta dos outros.
      line(`Não luta. ${SUPPORTS[support].name}: ${SUPPORTS[support].flavor}`, { color: TEXT_COLORS.inkDim, fontStyle: "italic" });
    } else {
      const low = character.currentHp <= character.maxHp / 3;
      line(`Vida ${character.currentHp}/${character.maxHp}`, { color: low ? TEXT_COLORS.danger : TEXT_COLORS.hp });
    }
    for (const status of this.afflictions[character.id] ?? []) {
      line(`${STATUSES[status].name} — fica até alguém cuidar`, { color: TEXT_COLORS.danger });
    }

    y += 10;
    this.heading(SHEET_X, y, "ATRIBUTOS");
    y += LINE;
    ATTRIBUTE_KEYS.forEach((key, index) => {
      // Duas colunas: sete linhas não cabem ao lado do resto.
      const x = SHEET_X + (index % 2) * (SHEET_WIDTH / 2);
      const row = y + Math.floor(index / 2) * (LINE - 2);
      this.text(x, row, `${key[0].toUpperCase()}${key.slice(1)}`, { color: TEXT_COLORS.gold });
      this.text(x + 50, row, String(character.attributes[key]));
      this.text(x + 84, row, ATTRIBUTE_ROLE[key], { fontSize: "16px", color: TEXT_COLORS.inkDim }).setY(row + 3);
    });
    y += Math.ceil(ATTRIBUTE_KEYS.length / 2) * (LINE - 2) + 10;

    if (support) return;
    this.heading(SHEET_X, y, "O QUE SABE FAZER");
    y += LINE;
    const abilities = [...abilitiesFor(character), ...(cast?.gifts ?? []).map((gift) => GIFTS[gift])];
    for (const ability of abilities) {
      const limit = "limit" in ability && ability.limit !== undefined ? `, ${ability.limit}x por luta` : "";
      line(`${ability.name}  (${COST_LABEL[ability.cost]}${limit})`, { fontSize: "18px" });
      y -= 4;
    }
  }

  private drawPack(): void {
    const { slots } = this;
    const max = this.hero.inventory?.maxSlots;
    this.heading(PACK_X, TOP - 30, max === undefined ? "MOCHILA" : `MOCHILA  ${slots.length}/${max}`);
    if (slots.length === 0) {
      this.text(PACK_X, TOP, "Vazia.", { fontStyle: "italic", color: TEXT_COLORS.inkDim });
      return;
    }

    const target = this.party[this.member];
    slots.forEach((slot, index) => {
      const focused = index === this.item && this.column === "pack";
      // O que não dá pra usar agora, em quem está escolhido, fica apagado.
      const usable = !supportOf(target) && fieldUseRefusal(this.hero, slot.item.id, target) === undefined;
      const charges = slot.item.data.maxUses > 1 ? `  (${slot.item.data.usesRemaining}/${slot.item.data.maxUses})` : "";
      this.text(PACK_X, TOP + index * LINE, `${focused ? "▸ " : "   "}${slot.item.name}  x${slot.quantity}${charges}`, {
        color: focused ? TEXT_COLORS.goldBright : usable ? TEXT_COLORS.item : TEXT_COLORS.inkDim,
      });
    });

    const shown = slots[this.item];
    const y = Math.max(TOP + slots.length * LINE + 14, Y + HEIGHT - 240);
    this.text(PACK_X, y, shown.item.description, {
      fontSize: "16px",
      fontStyle: "italic",
      color: TEXT_COLORS.inkDim,
      lineSpacing: 3,
      wordWrap: { width: PACK_WIDTH },
    });
  }

  /** Usa o item escolhido em quem está escolhido, se a regra deixar; senão, diz por que não. */
  private use(): void {
    const slot = this.slots[this.item];
    const target = this.party[this.member];
    if (!slot) return;
    if (supportOf(target)) {
      this.message = `${target.name} não luta: não há o que curar.`;
      return;
    }

    const { name } = slot.item;
    const result = useItemInField(this.hero, slot.item.id, target);
    if (!result.ok) {
      this.message = REFUSAL[result.reason](target.name);
      return;
    }
    this.message = `${name}: ${target.name} recupera ${result.healed} de vida.`;
    this.onChange();
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    const { code } = event;
    if (code === "Escape" || code === "KeyC") {
      this.onClose();
      return;
    }

    const step = code === "ArrowUp" || code === "KeyW" ? -1 : code === "ArrowDown" || code === "KeyS" ? 1 : 0;
    if (step !== 0) {
      if (this.column === "members") this.member = (this.member + step + this.party.length) % this.party.length;
      else if (this.slots.length > 0) this.item = (this.item + step + this.slots.length) % this.slots.length;
      this.message = "";
    } else if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Tab"].includes(code)) {
      event.preventDefault();
      this.column = this.column === "members" ? "pack" : "members";
    } else if ((code === "Enter" || code === "NumpadEnter" || code === "Space") && this.column === "pack") {
      this.use();
    } else {
      return;
    }
    this.draw();
  }
}
