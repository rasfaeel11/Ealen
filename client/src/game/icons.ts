import * as Phaser from "phaser";
import type { Ability, EquipmentItem } from "@jogo/shared";

/**
 * Os ícones da interface: desenhados em canvas no boot, em ouro velho sobre
 * transparente, um por textura (`icon:<nome>`). São sinais, não ilustração —
 * mostram o que a ação faz, e nada do mundo que o cânone não tenha.
 *
 * Arte final de um ícone: basta carregar uma imagem com a mesma chave antes de
 * `registerIcons`, que o desenhado cede o lugar.
 */

const SIZE = 64;
type Ctx = CanvasRenderingContext2D;

function line(c: Ctx, ...points: [number, number][]): void {
  c.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.stroke();
}

function shape(c: Ctx, ...points: [number, number][]): void {
  c.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.closePath();
  c.fill();
}

function disc(c: Ctx, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function ring(c: Ctx, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
}

/** Uma seta de `from` a `to`, com a ponta em `to`. */
function arrow(c: Ctx, from: [number, number], to: [number, number], head = 9): void {
  line(c, from, to);
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const wing = (turn: number): [number, number] => [to[0] - Math.cos(angle + turn) * head, to[1] - Math.sin(angle + turn) * head];
  line(c, wing(0.6), to, wing(-0.6));
}

const DRAW: Record<string, (c: Ctx) => void> = {
  move(c) {
    // Uma bota.
    shape(c, [24, 10], [40, 10], [40, 36], [54, 44], [54, 54], [20, 54], [20, 40]);
    c.fillRect(20, 56, 34, 3);
  },
  sword(c) {
    c.save();
    c.translate(32, 32);
    c.rotate(Math.PI / 4);
    c.fillRect(-3.5, -24, 7, 34);
    shape(c, [-3.5, -24], [0, -32], [3.5, -24]);
    c.fillRect(-11, 10, 22, 4);
    c.fillRect(-2.5, 14, 5, 10);
    disc(c, 0, 26, 3.5);
    c.restore();
  },
  quick(c) {
    // Lâmina curta e os riscos da pressa.
    c.save();
    c.translate(36, 30);
    c.rotate(Math.PI / 4);
    c.fillRect(-3, -14, 6, 22);
    shape(c, [-3, -14], [0, -21], [3, -14]);
    c.fillRect(-8, 8, 16, 3.5);
    c.fillRect(-2, 11.5, 4, 8);
    c.restore();
    line(c, [8, 22], [20, 22]);
    line(c, [6, 34], [16, 34]);
    line(c, [10, 46], [22, 46]);
  },
  heavy(c) {
    // Lâmina larga que desce, e o chão que racha.
    shape(c, [24, 6], [40, 6], [42, 36], [32, 46], [22, 36]);
    c.fillRect(17, 2, 30, 4);
    line(c, [10, 54], [24, 48]);
    line(c, [54, 54], [40, 48]);
    line(c, [32, 52], [32, 60]);
  },
  staff(c) {
    c.lineWidth = 6;
    line(c, [14, 54], [46, 16]);
    c.lineWidth = 4;
    disc(c, 48, 14, 7);
    line(c, [22, 44], [30, 50]);
  },
  shield(c) {
    c.beginPath();
    c.moveTo(12, 12);
    c.lineTo(52, 12);
    c.quadraticCurveTo(52, 42, 32, 58);
    c.quadraticCurveTo(12, 42, 12, 12);
    c.closePath();
    c.fill();
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(30, 18, 4, 30);
    c.fillRect(19, 26, 26, 4);
    c.restore();
  },
  pull(c) {
    ring(c, 32, 32, 7);
    arrow(c, [6, 32], [20, 32]);
    arrow(c, [58, 32], [44, 32]);
    arrow(c, [32, 6], [32, 20]);
    arrow(c, [32, 58], [32, 44]);
  },
  push(c) {
    disc(c, 32, 32, 6);
    arrow(c, [18, 32], [5, 32]);
    arrow(c, [46, 32], [59, 32]);
    arrow(c, [32, 18], [32, 5]);
    arrow(c, [32, 46], [32, 59]);
  },
  throw(c) {
    c.beginPath();
    c.moveTo(10, 54);
    c.quadraticCurveTo(14, 12, 46, 14);
    c.stroke();
    shape(c, [40, 6], [56, 14], [40, 22]);
    disc(c, 14, 54, 7);
  },
  disarm(c) {
    // A espada que voa da mão: lâmina e um X.
    c.save();
    c.translate(38, 24);
    c.rotate(Math.PI / 3);
    c.fillRect(-3, -18, 6, 26);
    shape(c, [-3, -18], [0, -25], [3, -18]);
    c.fillRect(-9, 8, 18, 4);
    c.restore();
    c.lineWidth = 5;
    line(c, [8, 42], [24, 58]);
    line(c, [24, 42], [8, 58]);
  },
  heal(c) {
    // Uma gota, e a cruz dentro.
    c.beginPath();
    c.moveTo(32, 5);
    c.bezierCurveTo(40, 22, 52, 30, 52, 42);
    c.arc(32, 42, 20, 0, Math.PI);
    c.bezierCurveTo(12, 30, 24, 22, 32, 5);
    c.closePath();
    c.fill();
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(29, 30, 6, 22);
    c.fillRect(21, 38, 22, 6);
    c.restore();
  },
  shoulder(c) {
    // O ombro que entra: um arco cheio e o tranco.
    c.beginPath();
    c.arc(24, 36, 18, Math.PI * 0.55, Math.PI * 1.7);
    c.lineTo(24, 36);
    c.closePath();
    c.fill();
    arrow(c, [36, 26], [58, 26]);
    arrow(c, [36, 42], [54, 42]);
  },
  grip(c) {
    // Dois elos fechados.
    c.lineWidth = 6;
    ring(c, 24, 26, 13);
    ring(c, 40, 40, 13);
  },
  wave(c) {
    for (const y of [20, 34, 48]) {
      c.beginPath();
      c.moveTo(6, y);
      c.bezierCurveTo(16, y - 12, 22, y - 12, 32, y);
      c.bezierCurveTo(42, y + 12, 48, y + 12, 58, y);
      c.stroke();
    }
  },
  jar(c) {
    c.fillRect(22, 8, 20, 7);
    shape(c, [25, 15], [39, 15], [50, 28], [50, 48], [42, 58], [22, 58], [14, 48], [14, 28]);
  },
  bread(c) {
    c.beginPath();
    c.moveTo(8, 44);
    c.bezierCurveTo(6, 16, 58, 16, 56, 44);
    c.lineTo(52, 50);
    c.lineTo(12, 50);
    c.closePath();
    c.fill();
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 3;
    line(c, [20, 26], [24, 38]);
    line(c, [31, 24], [33, 38]);
    line(c, [42, 26], [42, 38]);
    c.restore();
  },
  hourglass(c) {
    c.fillRect(14, 6, 36, 5);
    c.fillRect(14, 53, 36, 5);
    shape(c, [18, 11], [46, 11], [34, 32], [46, 53], [18, 53], [30, 32]);
  },
  sheet(c) {
    disc(c, 32, 20, 12);
    c.beginPath();
    c.moveTo(10, 58);
    c.bezierCurveTo(10, 34, 54, 34, 54, 58);
    c.closePath();
    c.fill();
  },
  bag(c) {
    c.beginPath();
    c.moveTo(24, 16);
    c.bezierCurveTo(4, 30, 8, 58, 18, 58);
    c.lineTo(46, 58);
    c.bezierCurveTo(56, 58, 60, 30, 40, 16);
    c.closePath();
    c.fill();
    shape(c, [22, 6], [42, 6], [38, 15], [26, 15]);
  },
  book(c) {
    shape(c, [6, 14], [30, 20], [30, 56], [6, 50]);
    shape(c, [58, 14], [34, 20], [34, 56], [58, 50]);
  },
  map(c) {
    shape(c, [6, 14], [23, 8], [41, 14], [58, 8], [58, 50], [41, 56], [23, 50], [6, 56]);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 3;
    line(c, [14, 42], [24, 30], [34, 38], [44, 22]);
    line(c, [43, 40], [51, 48]);
    line(c, [51, 40], [43, 48]);
    c.restore();
  },
  camp(c) {
    // O fogo e as duas achas.
    c.beginPath();
    c.moveTo(32, 4);
    c.bezierCurveTo(36, 18, 50, 24, 46, 40);
    c.quadraticCurveTo(44, 48, 32, 48);
    c.quadraticCurveTo(20, 48, 18, 40);
    c.bezierCurveTo(16, 30, 26, 24, 32, 4);
    c.closePath();
    c.fill();
    c.lineWidth = 6;
    line(c, [10, 58], [54, 48]);
    line(c, [10, 48], [54, 58]);
  },
  sneak(c) {
    // O olho meio fechado.
    c.beginPath();
    c.moveTo(4, 32);
    c.quadraticCurveTo(32, 8, 60, 32);
    c.quadraticCurveTo(32, 50, 4, 32);
    c.closePath();
    c.stroke();
    disc(c, 32, 30, 8);
    c.lineWidth = 5;
    line(c, [6, 22], [58, 22]);
  },
  gear(c) {
    for (let i = 0; i < 8; i++) {
      c.save();
      c.translate(32, 32);
      c.rotate((Math.PI / 4) * i);
      c.fillRect(-5, -27, 10, 12);
      c.restore();
    }
    c.lineWidth = 9;
    ring(c, 32, 32, 14);
  },
  use(c) {
    // Uma alavanca.
    c.lineWidth = 6;
    line(c, [14, 52], [44, 14]);
    disc(c, 46, 12, 7);
    c.fillRect(6, 50, 40, 8);
  },
  spear(c) {
    c.lineWidth = 5;
    line(c, [10, 54], [42, 22]);
    shape(c, [38, 18], [56, 8], [46, 26]);
  },
  crossbow(c) {
    c.beginPath();
    c.moveTo(8, 30);
    c.quadraticCurveTo(32, 2, 56, 30);
    c.stroke();
    c.lineWidth = 6;
    line(c, [32, 12], [32, 58]);
    c.lineWidth = 2;
    line(c, [8, 30], [32, 40], [56, 30]);
  },
  armor(c) {
    shape(c, [18, 8], [26, 12], [32, 18], [38, 12], [46, 8], [58, 18], [50, 28], [46, 26], [46, 56], [18, 56], [18, 26], [14, 28], [6, 18]);
  },
  ring(c) {
    c.lineWidth = 7;
    ring(c, 32, 38, 16);
    shape(c, [26, 16], [32, 6], [38, 16], [32, 22]);
  },
  coin(c) {
    disc(c, 32, 32, 22);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 3;
    ring(c, 32, 32, 15);
    c.restore();
  },
  engrave(c) {
    // O círculo gravado: o anel e a figura que fecha nele.
    ring(c, 32, 32, 26);
    c.lineWidth = 3;
    const star = [0, 2, 4, 1, 3, 0].map((i): [number, number] => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      return [32 + Math.cos(angle) * 22, 32 + Math.sin(angle) * 22];
    });
    line(c, ...star);
  },
  // --- As peças novas (task 96): cada uma com o seu sinal, no lugar do emprestado. ---
  dash(c) {
    // A Disparada: duas setas cheias, uma atrás da outra.
    shape(c, [6, 16], [26, 32], [6, 48], [14, 32]);
    shape(c, [24, 12], [52, 32], [24, 52], [34, 32]);
    c.fillRect(48, 14, 6, 36);
  },
  help(c) {
    // O Ajudar: a mão aberta, de palma pra cima, e o sinal de mais sobre ela.
    c.fillRect(27, 4, 10, 26);
    c.fillRect(19, 12, 26, 10);
    c.beginPath();
    c.moveTo(4, 40);
    c.quadraticCurveTo(10, 36, 18, 42);
    c.lineTo(40, 42);
    c.quadraticCurveTo(46, 42, 46, 46);
    c.lineTo(30, 47);
    c.lineTo(54, 40);
    c.quadraticCurveTo(62, 40, 58, 46);
    c.lineTo(36, 58);
    c.lineTo(4, 58);
    c.closePath();
    c.fill();
  },
  deflect(c) {
    // O Desviar: a seta que vem, encontra a força, e passa ao lado.
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(4, 32);
    c.lineTo(24, 32);
    c.quadraticCurveTo(38, 32, 46, 14);
    c.stroke();
    shape(c, [40, 12], [52, 6], [50, 20]);
    c.lineWidth = 3;
    c.beginPath();
    c.arc(40, 40, 16, Math.PI * 0.9, Math.PI * 1.6);
    c.stroke();
    c.beginPath();
    c.arc(40, 40, 22, Math.PI * 0.9, Math.PI * 1.6);
    c.stroke();
  },
  anchor(c) {
    // O Puxar-se: o corpo vai até a parede, puxado pela própria força.
    c.fillRect(52, 6, 8, 52);
    disc(c, 14, 22, 7);
    shape(c, [8, 30], [20, 30], [22, 50], [6, 50]);
    c.lineWidth = 4;
    arrow(c, [26, 36], [48, 36], 10);
  },
  watch(c) {
    // O Vigiar: o olho aberto, de pupila fina.
    c.beginPath();
    c.moveTo(4, 32);
    c.quadraticCurveTo(32, 6, 60, 32);
    c.quadraticCurveTo(32, 58, 4, 32);
    c.closePath();
    c.stroke();
    disc(c, 32, 32, 11);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(30, 22, 4, 20);
    c.restore();
  },
  trip(c) {
    // O Derrubar: o pé que entra por baixo e o corpo que vai.
    disc(c, 40, 14, 7);
    c.lineWidth = 6;
    line(c, [38, 22], [26, 40]);
    line(c, [26, 40], [12, 36]);
    line(c, [26, 40], [36, 54]);
    c.lineWidth = 4;
    arrow(c, [54, 58], [44, 48], 7);
    c.fillRect(4, 58, 56, 3);
  },
  grab(c) {
    // O Agarrar: o punho fechado em cima do pulso do outro.
    c.lineWidth = 8;
    line(c, [4, 36], [60, 36]);
    shape(c, [18, 18], [42, 18], [48, 26], [48, 48], [40, 54], [20, 54], [14, 46], [14, 24]);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 2.5;
    line(c, [24, 20], [24, 34]);
    line(c, [32, 20], [32, 34]);
    line(c, [40, 20], [40, 34]);
    c.restore();
  },
  shove(c) {
    // O Empurrar: a palma aberta e o tranco pra frente.
    shape(c, [8, 18], [24, 18], [26, 50], [8, 50]);
    c.fillRect(24, 22, 8, 5);
    c.fillRect(24, 30, 9, 5);
    c.fillRect(24, 38, 8, 5);
    c.lineWidth = 5;
    arrow(c, [36, 32], [60, 32], 10);
  },
  ready(c) {
    // O Preparar: a lâmina de pé, e a ampulheta pequena ao lado.
    c.fillRect(16, 8, 7, 36);
    shape(c, [16, 8], [19.5, 2], [23, 8]);
    c.fillRect(8, 44, 23, 4);
    c.fillRect(17, 48, 5, 10);
    c.fillRect(36, 20, 22, 4);
    c.fillRect(36, 54, 22, 4);
    shape(c, [39, 24], [55, 24], [48, 39], [55, 54], [39, 54], [46, 39]);
  },
  lift(c) {
    // O Levantar: a mão que puxa quem está no chão.
    c.fillRect(4, 54, 56, 4);
    disc(c, 16, 44, 6);
    shape(c, [22, 46], [38, 40], [40, 48], [22, 52]);
    c.lineWidth = 6;
    line(c, [38, 42], [48, 22]);
    arrow(c, [52, 30], [52, 6], 8);
  },
  order_advance(c) {
    // Avançar: duas divisas pra frente.
    c.lineWidth = 7;
    line(c, [12, 34], [32, 18], [52, 34]);
    line(c, [12, 52], [32, 36], [52, 52]);
  },
  order_hold(c) {
    // Segurar posição: a estaca cravada no chão.
    c.fillRect(28, 6, 8, 44);
    shape(c, [28, 50], [36, 50], [32, 58]);
    c.fillRect(8, 56, 48, 4);
    shape(c, [36, 8], [56, 14], [36, 22]);
  },
  order_guard(c) {
    // Proteger: o escudo na frente de alguém.
    disc(c, 46, 16, 7);
    shape(c, [38, 26], [54, 26], [56, 56], [36, 56]);
    shape(c, [8, 12], [30, 12], [30, 34], [19, 54], [8, 34]);
  },
  order_focus(c) {
    // Mirar: a mira em cima de um só.
    c.lineWidth = 4;
    ring(c, 32, 32, 20);
    ring(c, 32, 32, 9);
    line(c, [32, 2], [32, 16]);
    line(c, [32, 48], [32, 62]);
    line(c, [2, 32], [16, 32]);
    line(c, [48, 32], [62, 32]);
  },
  heart(c) {
    // A vida (o corpo, nos nós da árvore).
    c.beginPath();
    c.moveTo(32, 56);
    c.bezierCurveTo(4, 36, 4, 10, 20, 10);
    c.bezierCurveTo(28, 10, 32, 18, 32, 20);
    c.bezierCurveTo(32, 18, 36, 10, 44, 10);
    c.bezierCurveTo(60, 10, 60, 36, 32, 56);
    c.closePath();
    c.fill();
  },
  close(c) {
    c.lineWidth = 7;
    line(c, [14, 14], [50, 50]);
    line(c, [50, 14], [14, 50]);
  },
  volume(c) {
    shape(c, [8, 24], [20, 24], [34, 12], [34, 52], [20, 40], [8, 40]);
    c.beginPath();
    c.arc(34, 32, 14, -0.8, 0.8);
    c.stroke();
    c.beginPath();
    c.arc(34, 32, 24, -0.8, 0.8);
    c.stroke();
  },
};

export type IconName = keyof typeof DRAW;

export function iconKey(name: IconName): string {
  return `icon:${name}`;
}

/** Desenha os ícones que ainda não têm textura. Chamado uma vez, no create da cena de boot. */
export function registerIcons(scene: Phaser.Scene): void {
  for (const [name, draw] of Object.entries(DRAW)) {
    const key = iconKey(name);
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, SIZE, SIZE);
    if (!texture) continue;
    const c = texture.getContext();
    const metal = c.createLinearGradient(0, 0, 0, SIZE);
    metal.addColorStop(0, "#f6e2ae");
    metal.addColorStop(0.55, "#d9b26a");
    metal.addColorStop(1, "#9c7a3e");
    c.fillStyle = metal;
    c.strokeStyle = metal;
    c.lineWidth = 4;
    c.lineCap = "round";
    c.lineJoin = "round";
    draw(c);
    texture.refresh();
  }
}

/** Pelo nome, que é o que o jogador vê: a mesma habilidade tem o mesmo ícone em quem a saiba. */
const ABILITY_ICON: Record<string, IconName> = {
  Puxão: "pull",
  Bordão: "staff",
  Empurrão: "push",
  Guarda: "shield",
  Cura: "heal",
  "Golpe Rápido": "quick",
  Golpe: "sword",
  "Golpe Pesado": "heavy",
  Desarmar: "disarm",
  Arremesso: "throw",
  Desviar: "deflect",
  "Puxar-se": "anchor",
  Ombrada: "shoulder",
  "Segurar o Bote": "grip",
  Disparada: "dash",
  Ajudar: "help",
  Vigiar: "watch",
  "Esconder-se": "sneak",
  // Os verbos do corpo (`combate` §3.2).
  Agarrar: "grab",
  Empurrar: "shove",
  Derrubar: "trip",
};

/** O ícone de uma habilidade: o dela pelo nome; sem nome conhecido, o que ela faz. */
export function abilityIcon(ability: Ability): IconName {
  const named = ABILITY_ICON[ability.name] ?? Object.entries(ABILITY_ICON).find(([name]) => ability.name.startsWith(name))?.[1];
  if (named) return named;
  if (ability.effects.some((effect) => effect.kind === "heal")) return "heal";
  if (ability.effects.some((effect) => effect.kind === "push")) return "push";
  if (ability.effects.some((effect) => effect.kind === "damage")) return "sword";
  return "engrave";
}

const ITEM_ICON: Record<string, IconName> = {
  "item-unguento-de-barqueiro": "jar",
  "item-pao-de-viagem": "bread",
  "item-pote-de-oleo": "throw",
  "item-estaca-de-ymboripe": "spear",
  "item-carta-de-mbyraku": "book",
  "item-copia-do-contrato": "book",
};

export function itemIcon(itemId: string): IconName {
  return ITEM_ICON[itemId] ?? "jar";
}

/** O ícone de uma peça: pelo que ela é, e o lugar pro resto. */
export function gearIcon(item: EquipmentItem): IconName {
  if (item.id.includes("bordao")) return "staff";
  if (item.id.includes("chuco")) return "spear";
  if (item.id.includes("besta")) return "crossbow";
  if (item.data.slot === "weapon") return "sword";
  return item.data.slot === "armor" ? "armor" : "ring";
}
