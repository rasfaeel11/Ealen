import * as Phaser from "phaser";
import type { PixelPos } from "@ealen/shared";
import { COLORS } from "./config";
import { standingFrame, walkAnimKey, type Facing } from "./mapSprites";

/** A barra de vida fica por cima de tudo: não pode sumir atrás de uma árvore. */
const HP_BAR_DEPTH = 2_000_000;
const HP_BAR_WIDTH = 14;

/**
 * Alguém de pé no mapa: o sprite, a sombra e (em combate) a barra de vida.
 * A posição é a dos PÉS, e é ela que decide quem desenha na frente de quem
 * — a mesma ordenação por Y das camadas "de pé" do mapa.
 */
export class MapActor {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private facing: Facing = "down";

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spriteKey: string,
    pos: PixelPos,
  ) {
    this.shadow = scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.3);
    this.sprite = scene.add.sprite(0, 0, spriteKey, standingFrame(this.facing)).setOrigin(0.5, 1);
    this.hpBar = scene.add.graphics().setDepth(HP_BAR_DEPTH);
    this.place(pos);
  }

  /** Tudo que este ator pôs na cena (pra câmera da interface ignorar). */
  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.shadow, this.sprite, this.hpBar];
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

  /** Mostra a barra de vida com este valor. */
  setHp(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.8);
    this.hpBar.fillRect(-HP_BAR_WIDTH / 2 - 1, -1, HP_BAR_WIDTH + 2, 4);
    this.hpBar.fillStyle(ratio > 0.3 ? COLORS.hp : COLORS.hpLow, 1);
    this.hpBar.fillRect(-HP_BAR_WIDTH / 2, 0, Math.ceil(HP_BAR_WIDTH * ratio), 2);
  }

  hideHp(): void {
    this.hpBar.clear();
  }

  /** Clarão breve no sprite (levou dano, foi curado...). */
  flash(color: number): void {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(110, () => this.sprite.clearTint());
  }

  /** Some aos poucos (morreu). */
  fadeOut(duration: number): Promise<void> {
    this.hpBar.clear();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: [this.sprite, this.shadow],
        alpha: 0,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.hpBar.destroy();
  }
}
