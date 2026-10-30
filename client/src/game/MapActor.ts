import * as Phaser from "phaser";
import type { PixelPos } from "@jogo/shared";
import { COLORS } from "./config";
import { drySpriteKey, standingFrame, walkAnimKey, type Facing } from "./mapSprites";

/** A barra de vida fica por cima de tudo: não pode sumir atrás de uma árvore. */
const HP_BAR_DEPTH = 2_000_000;
const HP_BAR_WIDTH = 14;
/** Quanto o pedaço de vida recém-perdido fica aceso antes de escorrer. */
const HP_TRAIL_DELAY_MS = 250;
const HP_TRAIL_MS = 300;
/** Quanto do corpo fica abaixo da linha d'água quando submerso. */
const SUBMERGED_SHARE = 0.5;
const WATER_COLOR = 0x9fd8e8;
/** O sangue da marca: de quanto em quanto tempo pinga, e a que altura da cabeça fica o nariz. */
const DRIP_EVERY_MS = 1100;
const NOSE_FROM_TOP = 9;
const BLOOD_COLOR = 0xa8202a;

/** Onde o corpo está em relação à água: só o bicho de rio muda disso. */
export type Immersion = "none" | "submerged" | "beached";

/**
 * Alguém de pé no mapa: o sprite, a sombra e (em combate) a barra de vida
 * e o anel de "é a vez dele".
 * A posição é a dos PÉS, e é ela que decide quem desenha na frente de quem
 * — a mesma ordenação por Y das camadas "de pé" do mapa.
 *
 * O tamanho vem do quadro da folha: quem é maior que o quadrado (o Ykuruã)
 * ganha sombra, anel e barra do tamanho dele.
 */
export class MapActor {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly turnRing: Phaser.GameObjects.Ellipse;
  /** A água em volta de quem está submerso: o que se vê do resto do corpo. */
  private readonly ripple: Phaser.GameObjects.Ellipse;
  /** A gota de sangue que pinga do nariz de quem carrega a marca da mana. */
  private readonly drop: Phaser.GameObjects.Graphics;
  private readonly barWidth: number;
  /** Fração da vida na barra, e o rastro (o que ela era antes do último golpe). */
  private hp?: { ratio: number; trail: number };
  private hpTween?: Phaser.Tweens.Tween;
  private facing: Facing = "down";
  private feet: PixelPos;
  /** A folha em uso: a do personagem, ou a seca dele. */
  private sheet: string;
  private immersion: Immersion = "none";
  /** Quantos pixels do corpo ficam abaixo dos pés (o que a água esconde). */
  private sink = 0;
  private bleeding?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spriteKey: string,
    pos: PixelPos,
  ) {
    this.sheet = spriteKey;
    this.sprite = scene.add.sprite(0, 0, spriteKey, standingFrame(this.facing)).setOrigin(0.5, 1);
    const width = this.sprite.width;
    this.barWidth = Math.max(HP_BAR_WIDTH, Math.round(width * 0.5));
    this.shadow = scene.add.ellipse(0, 0, Math.max(12, width * 0.75), Math.max(5, width * 0.2), 0x000000, 0.3);
    this.turnRing = scene.add.ellipse(0, 0, Math.max(16, width * 0.8), Math.max(7, width * 0.25)).setVisible(false);
    scene.tweens.add({ targets: this.turnRing, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    this.ripple = scene.add.ellipse(0, 0, width * 0.95, 7).setStrokeStyle(1, WATER_COLOR, 0.8).setVisible(false);
    scene.tweens.add({ targets: this.ripple, scaleX: { from: 0.92, to: 1.06 }, alpha: { from: 0.9, to: 0.5 }, duration: 900, yoyo: true, repeat: -1 });
    this.drop = scene.add.graphics().fillStyle(BLOOD_COLOR, 1).fillRect(0, 0, 1, 2).setVisible(false);
    this.hpBar = scene.add.graphics().setDepth(HP_BAR_DEPTH);
    this.feet = { ...pos };
    this.place(pos);
  }

  /** Tudo que este ator pôs na cena (pra câmera da interface ignorar). */
  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.shadow, this.turnRing, this.ripple, this.sprite, this.drop, this.hpBar];
  }

  get pos(): PixelPos {
    return { ...this.feet };
  }

  /** Onde fica a cabeça — de onde sobem os números de dano. Submerso, é o alto do que está fora da água. */
  get top(): PixelPos {
    return { x: this.feet.x, y: this.feet.y - (this.sprite.height - this.sink) };
  }

  /** O que a câmera segue. */
  get followTarget(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  place(pos: PixelPos): void {
    this.feet = { ...pos };
    this.sprite.setPosition(pos.x, pos.y + this.sink).setDepth(pos.y);
    this.shadow.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.5);
    this.turnRing.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.4);
    // A água fica na frente do corpo: é a linha que o corta.
    this.ripple.setPosition(pos.x, pos.y).setDepth(pos.y + 0.1);
    this.hpBar.setPosition(pos.x, this.top.y - 4);
  }

  face(facing: Facing): void {
    this.facing = facing;
    if (!this.sprite.anims.isPlaying) this.sprite.setFrame(standingFrame(facing));
  }

  /** Vira pra um ponto do mapa. No empate entre os eixos, prefere o horizontal. */
  faceToward(target: PixelPos): void {
    const dx = target.x - this.feet.x;
    const dy = target.y - this.feet.y;
    if (dx === 0 && dy === 0) return;
    this.face(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  /** Agachado, esgueirando (ver shared/world/stealth.ts): mais baixo e mais apagado. */
  setSneaking(sneaking: boolean): void {
    this.sprite.setAlpha(sneaking ? 0.6 : 1).setScale(1, sneaking ? 0.88 : 1);
  }

  setWalking(walking: boolean): void {
    if (walking) {
      this.sprite.anims.play(walkAnimKey(this.sheet, this.facing), true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(standingFrame(this.facing));
    }
  }

  /**
   * Põe o corpo na água ou fora dela. Submerso, metade dele some abaixo da
   * linha d'água (a ondulação marca onde ela corta) e não há sombra; em seco,
   * a folha troca pela seca, de couro rachado, quando existe.
   */
  setImmersion(immersion: Immersion): void {
    if (immersion === this.immersion) return;
    this.immersion = immersion;

    const dry = drySpriteKey(this.spriteKey);
    const sheet = immersion === "beached" && this.scene.textures.exists(dry) ? dry : this.spriteKey;
    if (sheet !== this.sheet) {
      const walking = this.sprite.anims.isPlaying;
      this.sheet = sheet;
      this.sprite.setTexture(sheet, standingFrame(this.facing));
      if (walking) this.sprite.anims.play(walkAnimKey(sheet, this.facing));
    }

    const { width, height } = this.sprite;
    this.sink = immersion === "submerged" ? Math.round(height * SUBMERGED_SHARE) : 0;
    if (this.sink > 0) this.sprite.setCrop(0, 0, width, height - this.sink);
    else this.sprite.setCrop();
    this.shadow.setVisible(this.sink === 0);
    this.ripple.setVisible(this.sink > 0);
    this.place(this.feet);
  }

  /** Liga (ou desliga) o sangue pingando do nariz: a marca da mana gasta de uma vez. */
  setBleeding(bleeding: boolean): void {
    if (!bleeding) {
      this.bleeding?.remove();
      this.bleeding = undefined;
      return;
    }
    if (this.bleeding) return;
    this.drip();
    this.bleeding = this.scene.time.addEvent({ delay: DRIP_EVERY_MS, loop: true, callback: () => this.drip() });
  }

  private drip(): void {
    // De costas, o nariz não aparece.
    if (this.facing === "up" || !this.sprite.visible) return;
    const side = this.facing === "left" ? -2 : this.facing === "right" ? 2 : 0;
    const at = { x: this.feet.x + side, y: this.top.y + NOSE_FROM_TOP };
    this.scene.tweens.killTweensOf(this.drop);
    this.drop.setPosition(at.x, at.y).setDepth(this.feet.y + 0.2).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: this.drop,
      y: at.y + 6,
      alpha: 0,
      duration: 650,
      ease: "Quad.easeIn",
      onComplete: () => this.drop.setVisible(false),
    });
  }

  /**
   * Mostra a barra de vida com este valor. Vida perdida não some na hora:
   * o pedaço fica aceso um instante e escorre — dá pra ver o tamanho do golpe.
   */
  setHp(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    const hp = (this.hp = { ratio, trail: Math.max(ratio, this.hp?.trail ?? ratio) });
    this.hpTween?.stop();
    this.hpTween = undefined;
    this.drawHp();

    if (hp.trail > ratio) {
      this.hpTween = this.scene.tweens.add({
        targets: hp,
        trail: ratio,
        delay: HP_TRAIL_DELAY_MS,
        duration: HP_TRAIL_MS,
        onUpdate: () => this.drawHp(),
      });
    }
  }

  private drawHp(): void {
    const { hp, barWidth } = this;
    this.hpBar.clear();
    if (!hp) return;

    this.hpBar.fillStyle(0x000000, 0.8);
    this.hpBar.fillRect(-barWidth / 2 - 1, -1, barWidth + 2, 4);
    this.hpBar.fillStyle(0xffffff, 0.9);
    this.hpBar.fillRect(-barWidth / 2, 0, Math.ceil(barWidth * hp.trail), 2);
    this.hpBar.fillStyle(hp.ratio > 0.3 ? COLORS.hp : COLORS.hpLow, 1);
    this.hpBar.fillRect(-barWidth / 2, 0, Math.ceil(barWidth * hp.ratio), 2);
  }

  hideHp(): void {
    this.hpTween?.stop();
    this.hpTween = undefined;
    this.hp = undefined;
    this.hpBar.clear();
  }

  /** Acende (ou apaga) o anel no chão de quem está na vez. */
  setTurn(active: boolean, color = 0xffffff): void {
    this.turnRing.setVisible(active).setStrokeStyle(1, color, 0.9);
  }

  /** Clarão breve no sprite (levou dano, foi curado...). */
  flash(color: number, duration = 110): void {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(duration, () => this.sprite.clearTint());
  }

  /** Cai: clareia, achata contra o chão e some. */
  collapse(duration: number): Promise<void> {
    this.hideHp();
    this.setTurn(false);
    this.setBleeding(false);
    this.sprite.setTintFill(0xffffff);
    this.scene.tweens.killTweensOf(this.ripple);
    this.scene.tweens.add({ targets: [this.shadow, this.ripple], alpha: 0, duration });
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: 1.35,
        scaleY: 0.2,
        duration,
        ease: "Cubic.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  /** Desfaz `collapse`: quem caiu numa luta vencida está de pé de novo. */
  rise(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.shadow]);
    this.sprite.clearTint().setAlpha(1).setScale(1);
    this.shadow.setAlpha(1);
  }

  destroy(): void {
    this.hpTween?.stop();
    this.bleeding?.remove();
    this.scene.tweens.killTweensOf([this.turnRing, this.sprite, this.shadow, this.ripple, this.drop]);
    this.sprite.destroy();
    this.shadow.destroy();
    this.turnRing.destroy();
    this.ripple.destroy();
    this.drop.destroy();
    this.hpBar.destroy();
  }
}
