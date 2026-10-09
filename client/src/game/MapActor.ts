import * as Phaser from "phaser";
import type { PixelPos } from "@ealen/shared";
import { COLORS } from "./config";
import { standingFrame, walkAnimKey, type Facing } from "./mapSprites";

/** A barra de vida fica por cima de tudo: não pode sumir atrás de uma árvore. */
const HP_BAR_DEPTH = 2_000_000;
const HP_BAR_WIDTH = 14;
/** Quanto o pedaço de vida recém-perdido fica aceso antes de escorrer. */
const HP_TRAIL_DELAY_MS = 250;
const HP_TRAIL_MS = 300;

/**
 * Alguém de pé no mapa: o sprite, a sombra e (em combate) a barra de vida
 * e o anel de "é a vez dele".
 * A posição é a dos PÉS, e é ela que decide quem desenha na frente de quem
 * — a mesma ordenação por Y das camadas "de pé" do mapa.
 */
export class MapActor {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly turnRing: Phaser.GameObjects.Ellipse;
  /** Fração da vida na barra, e o rastro (o que ela era antes do último golpe). */
  private hp?: { ratio: number; trail: number };
  private hpTween?: Phaser.Tweens.Tween;
  private facing: Facing = "down";

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spriteKey: string,
    pos: PixelPos,
  ) {
    this.shadow = scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.3);
    this.turnRing = scene.add.ellipse(0, 0, 16, 7).setVisible(false);
    scene.tweens.add({ targets: this.turnRing, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    this.sprite = scene.add.sprite(0, 0, spriteKey, standingFrame(this.facing)).setOrigin(0.5, 1);
    this.hpBar = scene.add.graphics().setDepth(HP_BAR_DEPTH);
    this.place(pos);
  }

  /** Tudo que este ator pôs na cena (pra câmera da interface ignorar). */
  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.shadow, this.turnRing, this.sprite, this.hpBar];
  }

  get pos(): PixelPos {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Onde fica a cabeça — de onde sobem os números de dano. */
  get top(): PixelPos {
    return { x: this.sprite.x, y: this.sprite.y - this.sprite.height };
  }

  /** O que a câmera segue. */
  get followTarget(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  place(pos: PixelPos): void {
    this.sprite.setPosition(pos.x, pos.y).setDepth(pos.y);
    this.shadow.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.5);
    this.turnRing.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.4);
    this.hpBar.setPosition(pos.x, pos.y - this.sprite.height - 4);
  }

  face(facing: Facing): void {
    this.facing = facing;
    if (!this.sprite.anims.isPlaying) this.sprite.setFrame(standingFrame(facing));
  }

  /** Vira pra um ponto do mapa. No empate entre os eixos, prefere o horizontal. */
  faceToward(target: PixelPos): void {
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    if (dx === 0 && dy === 0) return;
    this.face(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  setWalking(walking: boolean): void {
    if (walking) {
      this.sprite.anims.play(walkAnimKey(this.spriteKey, this.facing), true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(standingFrame(this.facing));
    }
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
    const { hp } = this;
    this.hpBar.clear();
    if (!hp) return;

    this.hpBar.fillStyle(0x000000, 0.8);
    this.hpBar.fillRect(-HP_BAR_WIDTH / 2 - 1, -1, HP_BAR_WIDTH + 2, 4);
    this.hpBar.fillStyle(0xffffff, 0.9);
    this.hpBar.fillRect(-HP_BAR_WIDTH / 2, 0, Math.ceil(HP_BAR_WIDTH * hp.trail), 2);
    this.hpBar.fillStyle(hp.ratio > 0.3 ? COLORS.hp : COLORS.hpLow, 1);
    this.hpBar.fillRect(-HP_BAR_WIDTH / 2, 0, Math.ceil(HP_BAR_WIDTH * hp.ratio), 2);
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
    this.sprite.setTintFill(0xffffff);
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration });
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
    this.scene.tweens.killTweensOf([this.turnRing, this.sprite, this.shadow]);
    this.sprite.destroy();
    this.shadow.destroy();
    this.turnRing.destroy();
    this.hpBar.destroy();
  }
}
