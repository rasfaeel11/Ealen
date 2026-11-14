import * as Phaser from "phaser";
import type { MapActor } from "../MapActor";

/**
 * Os efeitos da luta que se VEEM: o círculo de quem recita, a força que sai
 * da página, o choque onde ela bate, o corte da espada, a cura subindo. Tudo
 * desenhado na hora, no tamanho do mapa (quadrado de 16 pixels, câmera com
 * zoom), sem arte nova. Quem decide QUANDO é o CombatController, lendo os
 * eventos do motor; aqui só se desenha.
 */

type PixelPos = { x: number; y: number };
type AddWorld = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

/** Por cima de quem está de pé, abaixo das barras de vida (o mesmo FX_DEPTH do controller). */
const DEPTH = 1_500_000;

/** O círculo que fica aos pés de quem está recitando, até a magia sair ou quebrar. */
export interface CastCircle {
  destroy(shatter?: boolean): void;
}

export class CombatFx {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addWorld: AddWorld,
  ) {}

  private gfx(depth = DEPTH): Phaser.GameObjects.Graphics {
    return this.addWorld(this.scene.add.graphics().setDepth(depth));
  }

  private glow(x: number, y: number, radius: number, color: number, alpha: number): Phaser.GameObjects.Arc {
    return this.addWorld(this.scene.add.circle(x, y, radius, color, alpha).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  /**
   * O círculo da recitação: dois anéis no chão com as marcas do texto girando,
   * uma luz que pulsa e fagulhas subindo. Segue o ator se ele for empurrado.
   */
  castCircle(actor: MapActor, color: number): CastCircle {
    const { scene } = this;
    const ring = this.gfx();
    const light = this.glow(actor.pos.x, actor.pos.y - 6, 9, color, 0.18);
    const pulse = scene.tweens.add({ targets: light, alpha: { from: 0.1, to: 0.32 }, scale: { from: 0.85, to: 1.15 }, duration: 520, yoyo: true, repeat: -1 });
    let angle = 0;
    const draw = () => {
      const { x, y } = actor.pos;
      ring.clear();
      ring.setDepth(y - 0.3);
      ring.lineStyle(1.5, color, 0.95).strokeEllipse(x, y - 1, 26, 10);
      ring.lineStyle(1, color, 0.6).strokeEllipse(x, y - 1, 18, 7);
      // As marcas do texto: tracinhos que correm entre os dois anéis.
      for (let i = 0; i < 10; i++) {
        const a = angle + (Math.PI * 2 * i) / 10;
        const ox = Math.cos(a);
        const oy = Math.sin(a);
        ring.lineStyle(1, 0xffffff, 0.85).lineBetween(x + ox * 9.5, y - 1 + oy * 3.7, x + ox * 12.5, y - 1 + oy * 4.8);
      }
      light.setPosition(x, y - 6);
    };
    draw();
    const spin = scene.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        angle += 0.12;
        draw();
      },
    });
    const motes = scene.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const { x, y } = actor.pos;
        const a = Math.random() * Math.PI * 2;
        const mote = this.addWorld(scene.add.rectangle(x + Math.cos(a) * 11, y - 1 + Math.sin(a) * 4, 1.5, 1.5, color).setDepth(DEPTH));
        mote.setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: mote, y: mote.y - 14 - Math.random() * 8, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => mote.destroy() });
      },
    });
    return {
      destroy: (shatter = false) => {
        spin.remove();
        motes.remove();
        pulse.stop();
        if (shatter) {
          // O texto quebrou: o anel estoura em cacos cinzentos.
          const { x, y } = actor.pos;
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI * 2 * i) / 10;
            const shard = this.addWorld(scene.add.rectangle(x + Math.cos(a) * 12, y - 1 + Math.sin(a) * 4.5, 2, 1, 0x9a9a9a).setDepth(DEPTH));
            scene.tweens.add({
              targets: shard,
              x: shard.x + Math.cos(a) * 10,
              y: shard.y + Math.sin(a) * 4 + 6,
              angle: 180,
              alpha: { from: 1, to: 0 },
              duration: 420,
              onComplete: () => shard.destroy(),
            });
          }
          ring.destroy();
          light.destroy();
          return;
        }
        scene.tweens.add({ targets: [ring, light], alpha: 0, duration: 180, onComplete: () => (ring.destroy(), light.destroy()) });
      },
    };
  }

  /** A força juntando na mão de quem lê: fagulhas que vêm de fora pro centro, e a luz crescendo. */
  async chargeUp(at: PixelPos, color: number, ms = 260): Promise<void> {
    const { scene } = this;
    const light = this.glow(at.x, at.y, 3, color, 0.5);
    scene.tweens.add({ targets: light, scale: { from: 0.5, to: 2.6 }, alpha: { from: 0.3, to: 0.7 }, duration: ms, ease: "Quad.easeIn" });
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
      const spark = this.addWorld(scene.add.rectangle(at.x + Math.cos(a) * 18, at.y + Math.sin(a) * 12, 2, 2, 0xffffff).setDepth(DEPTH));
      spark.setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: spark, x: at.x, y: at.y, alpha: { from: 0.4, to: 1 }, duration: ms, ease: "Quad.easeIn", onComplete: () => spark.destroy() });
    }
    await this.wait(ms);
    scene.tweens.add({ targets: light, alpha: 0, scale: 3.4, duration: 160, onComplete: () => light.destroy() });
  }

  /** Uma bola de força (ou de luz) que vai de `from` a `to`, deixando rastro. */
  async bolt(from: PixelPos, to: PixelPos, color: number, ms?: number, size = 1): Promise<void> {
    const { scene } = this;
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const duration = ms ?? Math.max(140, Math.min(380, span * 4));
    const halo = this.glow(from.x, from.y, 6 * size, color, 0.45);
    const core = this.glow(from.x, from.y, 2.6 * size, 0xffffff, 1);
    const trail = scene.time.addEvent({
      delay: 22,
      loop: true,
      callback: () => {
        const puff = this.glow(core.x, core.y, 3.5 * size, color, 0.5);
        scene.tweens.add({ targets: puff, scale: 0.2, alpha: 0, duration: 260, onComplete: () => puff.destroy() });
      },
    });
    await new Promise<void>((resolve) =>
      scene.tweens.add({
        targets: [halo, core],
        x: to.x,
        y: to.y,
        duration,
        ease: "Quad.easeIn",
        onComplete: () => resolve(),
      }),
    );
    trail.remove();
    halo.destroy();
    core.destroy();
  }

  /** Onde a força bate: um clarão, um anel que se abre no chão e raios pra fora. */
  shockwave(at: PixelPos, color: number, power = 1): void {
    const { scene } = this;
    const flash = this.glow(at.x, at.y, 7 * power, 0xffffff, 0.9);
    scene.tweens.add({ targets: flash, scale: { from: 0.6, to: 2.4 }, alpha: 0, duration: 260, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
    const ring = this.addWorld(scene.add.ellipse(at.x, at.y + 6, 16 * power, 7 * power).setStrokeStyle(2, color, 1).setDepth(DEPTH));
    scene.tweens.add({ targets: ring, scale: { from: 0.4, to: 2.6 }, alpha: { from: 1, to: 0 }, duration: 480, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    const rays = this.gfx().setPosition(at.x, at.y);
    rays.lineStyle(1.5, color, 1);
    const count = 10;
    const twist = Math.random() * Math.PI;
    for (let i = 0; i < count; i++) {
      const a = twist + (Math.PI * 2 * i) / count;
      rays.lineBetween(Math.cos(a) * 5 * power, Math.sin(a) * 5 * power, Math.cos(a) * 14 * power, Math.sin(a) * 14 * power);
    }
    scene.tweens.add({ targets: rays, scale: { from: 0.5, to: 1.5 }, alpha: { from: 1, to: 0 }, duration: 320, ease: "Cubic.easeOut", onComplete: () => rays.destroy() });
  }

  /** As linhas do puxão: setas de força correndo do alvo até quem puxa. */
  pullLines(from: PixelPos, to: PixelPos, color: number): void {
    const { scene } = this;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 55, () => {
        const chevron = this.gfx().setPosition(from.x, from.y).setRotation(angle);
        chevron.lineStyle(2, color, 1);
        chevron.lineBetween(-3, -4, 2, 0);
        chevron.lineBetween(2, 0, -3, 4);
        scene.tweens.add({ targets: chevron, x: to.x, y: to.y, alpha: { from: 1, to: 0.2 }, duration: 320, ease: "Quad.easeIn", onComplete: () => chevron.destroy() });
      });
    }
  }

  /** A cura subindo: fagulhas verdes que sobem do chão em volta de quem recebe. */
  motes(at: PixelPos, color: number, count = 12): void {
    const { scene } = this;
    const ring = this.addWorld(scene.add.ellipse(at.x, at.y - 1, 18, 7).setStrokeStyle(1.5, color, 1).setDepth(DEPTH));
    scene.tweens.add({ targets: ring, scale: { from: 0.4, to: 1.6 }, alpha: { from: 1, to: 0 }, duration: 600, onComplete: () => ring.destroy() });
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * 40, () => {
        const x = at.x + (Math.random() - 0.5) * 16;
        const mote = this.glow(x, at.y - Math.random() * 4, 1.4, color, 1);
        scene.tweens.add({ targets: mote, y: mote.y - 18 - Math.random() * 10, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => mote.destroy() });
      });
    }
  }

  /** A guarda: uma casca de luz que se fecha em volta de quem se defende. */
  shield(actor: MapActor, color: number): void {
    const { scene } = this;
    const { x, y } = actor.pos;
    const bubble = this.gfx().setPosition(x, y - 8);
    bubble.lineStyle(1.5, color, 1).strokeEllipse(0, 0, 22, 26);
    bubble.fillStyle(color, 0.15).fillEllipse(0, 0, 22, 26);
    scene.tweens.add({ targets: bubble, scale: { from: 1.5, to: 1 }, alpha: { from: 0, to: 1 }, duration: 180, ease: "Back.easeOut" });
    scene.tweens.add({ targets: bubble, alpha: 0, delay: 420, duration: 300, onComplete: () => bubble.destroy() });
  }

  /** O corte: uma meia-lua branca que varre na frente de quem leva, com a borda dourada. */
  slash(at: PixelPos, angle: number, heavy = false): void {
    const { scene } = this;
    const radius = heavy ? 15 : 12;
    const blade = this.gfx().setPosition(at.x, at.y).setRotation(angle + Math.PI);
    const sweep = 1.2;
    const crescent = (g: Phaser.GameObjects.Graphics, outer: number, inner: number, color: number, alpha: number) => {
      g.fillStyle(color, alpha);
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = -sweep + (2 * sweep * i) / 12;
        const r = outer;
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let i = 12; i >= 0; i--) {
        const a = -sweep + (2 * sweep * i) / 12;
        // A lâmina é grossa no meio e fina nas pontas.
        const r = inner + (outer - inner) * (1 - Math.cos(a / sweep * (Math.PI / 2)) ** 2) * 0.2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fillPath();
    };
    crescent(blade, radius + 2, radius - 3, 0xe8c66a, 0.8);
    crescent(blade, radius, radius - 2.5, 0xffffff, 1);
    blade.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: blade, rotation: { from: blade.rotation - 0.7, to: blade.rotation + 0.5 }, duration: 130, ease: "Cubic.easeOut" });
    scene.tweens.add({ targets: blade, alpha: 0, scale: 1.15, delay: 110, duration: 220, onComplete: () => blade.destroy() });
  }

  /** A estocada: uma risca longa até o alvo, com o brilho da ponta. */
  thrust(from: PixelPos, to: PixelPos): void {
    const { scene } = this;
    const line = this.gfx();
    line.lineStyle(3, 0xe8c66a, 0.7).lineBetween(from.x, from.y, to.x, to.y);
    line.lineStyle(1.5, 0xffffff, 1).lineBetween(from.x, from.y, to.x, to.y);
    line.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: line, alpha: 0, duration: 260, ease: "Cubic.easeIn", onComplete: () => line.destroy() });
    const tip = this.glow(to.x, to.y, 3, 0xffffff, 1);
    scene.tweens.add({ targets: tip, scale: { from: 0.4, to: 2 }, alpha: 0, duration: 240, onComplete: () => tip.destroy() });
  }

  /** A pancada: um anel duro e uma estrela no ponto em que chega. */
  bash(at: PixelPos): void {
    const { scene } = this;
    const ring = this.gfx().setPosition(at.x, at.y);
    ring.lineStyle(2.5, 0xffffff, 1).strokeCircle(0, 0, 6);
    scene.tweens.add({ targets: ring, scale: { from: 0.4, to: 1.8 }, alpha: { from: 1, to: 0 }, duration: 260, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    const star = this.gfx().setPosition(at.x, at.y);
    star.lineStyle(1.5, 0xe8c66a, 1);
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      star.lineBetween(0, 0, Math.cos(a) * 8, Math.sin(a) * 8);
    }
    scene.tweens.add({ targets: star, angle: 45, alpha: { from: 1, to: 0 }, duration: 260, onComplete: () => star.destroy() });
  }

  /** Um virote: uma risca curta que voa até o alvo. */
  async arrow(from: PixelPos, to: PixelPos): Promise<void> {
    const { scene } = this;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const shaft = this.gfx().setPosition(from.x, from.y).setRotation(angle);
    shaft.lineStyle(1.5, 0xd8c8a0, 1).lineBetween(-5, 0, 3, 0);
    shaft.fillStyle(0xffffff, 1).fillRect(3, -1, 2, 2);
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    await new Promise<void>((resolve) =>
      scene.tweens.add({ targets: shaft, x: to.x, y: to.y, duration: Math.max(90, span * 2.2), onComplete: () => resolve() }),
    );
    shaft.destroy();
  }
}
