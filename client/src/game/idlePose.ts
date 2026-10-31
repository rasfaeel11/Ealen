/**
 * Como alguém fica de pé e respira, tirado da própria folha de caminhada.
 *
 * A folha só tem passos: o "parado" de perfil é uma passada, de pernas
 * abertas, e parar nele deixa o boneco congelado no meio do passo. Daqui sai a
 * pose de pé (o quadro mais assentado da linha, com as pernas fechadas se
 * preciso) e os quadros que mexem nela: o tronco que desce ao soltar o ar e o
 * corpo que pende pros lados. É tudo pixel inteiro, então continua pixel art,
 * e toda folha nova já entra com isso. Sem Phaser aqui: é conta sobre os pixels.
 */

export interface Cell {
  width: number;
  height: number;
  /** RGBA, linha a linha (o formato do ImageData). */
  data: Uint8ClampedArray;
}

/** Até onde vai o tronco, a partir dos pés, em parte da altura do corpo: dali pra baixo a respiração não mexe. */
const WAIST_SHARE = 0.42;
/** Onde as pernas começam a abrir. */
const HIP_SHARE = 0.3;
/** O que conta como pé, em parte da altura do quadro. */
const FEET_SHARE = 0.16;
/** Abertura dos pés de quem está parado, em parte da largura do quadro. */
const STANCE_SHARE = 0.3;
/** O joelho: é dele pra cima que o corpo pende. */
const KNEE_SHARE = 0.18;

/** Quanto o tronco desce em cada quadro da respiração, em pixels de um quadro de 48. */
export const BREATH_DEPTHS = [0, 1, 2, 3] as const;
/** Quanto o corpo pende em cada quadro, em pixels de um quadro de 48. */
export const SWAY_SHIFTS = [-2, -1, 1, 2] as const;
/** Quantos quadros cada direção tem na textura de quem está parado. */
export const IDLE_COLUMNS = BREATH_DEPTHS.length + SWAY_SHIFTS.length;

function blank(cell: Cell): Cell {
  return { width: cell.width, height: cell.height, data: new Uint8ClampedArray(cell.data.length) };
}

function alphaAt(cell: Cell, x: number, y: number): number {
  return cell.data[(y * cell.width + x) * 4 + 3];
}

/** Copia um trecho de linha de `from`, deslocado, sem passar por cima com vazio. */
function stamp(from: Cell, to: Cell, y: number, toY: number, startX: number, endX: number, shift: number): void {
  if (toY < 0 || toY >= to.height) return;
  for (let x = startX; x < endX; x++) {
    const toX = x + shift;
    if (toX < 0 || toX >= to.width || alphaAt(from, x, y) === 0) continue;
    const source = (y * from.width + x) * 4;
    to.data.set(from.data.subarray(source, source + 4), (toY * to.width + toX) * 4);
  }
}

/** A linha de cima e a de baixo do corpo. Quadro vazio não tem. */
function bodyOf(cell: Cell): { top: number; bottom: number } | undefined {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      if (alphaAt(cell, x, y) === 0) continue;
      if (top < 0) top = y;
      bottom = y;
      break;
    }
  }
  return top < 0 ? undefined : { top, bottom };
}

/** Onde os pés estão: da primeira à última coluna, e a linha mais baixa de cada metade. */
function feetOf(cell: Cell, bottom: number): { left: number; right: number; gap: number } {
  const from = bottom - Math.round(cell.height * FEET_SHARE) + 1;
  let left = cell.width;
  let right = -1;
  for (let y = from; y <= bottom; y++) {
    for (let x = 0; x < cell.width; x++) {
      if (alphaAt(cell, x, y) === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  const middle = (left + right + 1) >> 1;
  let lowLeft = from;
  let lowRight = from;
  for (let y = from; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (alphaAt(cell, x, y) === 0) continue;
      if (x < middle) lowLeft = y;
      else lowRight = y;
    }
  }
  return { left, right, gap: Math.abs(lowLeft - lowRight) };
}

/**
 * Fecha as pernas: as metades de baixo do corpo andam uma pra outra, cada vez
 * mais perto do chão, até os pés ficarem na abertura de quem está de pé. Uma
 * perna passa na frente da outra, como no perfil de verdade.
 */
export function closeLegs(cell: Cell): Cell {
  const body = bodyOf(cell);
  if (!body) return cell;
  const { left, right } = feetOf(cell, body.bottom);
  const reach = (right - left + 1 - Math.round(cell.width * STANCE_SHARE)) / 2;
  if (reach <= 0) return cell;

  const hip = body.bottom - Math.round((body.bottom - body.top + 1) * HIP_SHARE);
  const middle = (left + right + 1) >> 1;
  const closed = blank(cell);
  for (let y = 0; y < cell.height; y++) {
    const shift = y <= hip ? 0 : Math.round((reach * (y - hip)) / (body.bottom - hip));
    stamp(cell, closed, y, y, 0, middle, shift);
    stamp(cell, closed, y, y, middle, cell.width, -shift);
  }
  return closed;
}

/** Desce o corpo inteiro até `bottom`: os quadros de passagem vêm um pixel no ar. */
function grounded(cell: Cell, bottom: number): Cell {
  const body = bodyOf(cell);
  if (!body || body.bottom === bottom) return cell;
  const moved = blank(cell);
  for (let y = 0; y < cell.height; y++) stamp(cell, moved, y, y + bottom - body.bottom, 0, cell.width, 0);
  return moved;
}

/**
 * A pose de pé de uma direção, dados os quadros de caminhada dela. De perfil
 * vale o quadro de pés mais juntos; de frente ou de costas, o de pés mais
 * nivelados. No empate, o primeiro. `legs`: só quem anda em duas pernas tem o
 * que fechar (o bicho de rio é um monte de lodo).
 */
export function standingPose(steps: Cell[], profile: boolean, legs = true): Cell {
  if (!legs) return steps[0];
  const bodies = steps.map(bodyOf);
  let best = 0;
  let bestScore = Infinity;
  steps.forEach((step, index) => {
    const body = bodies[index];
    if (!body) return;
    const feet = feetOf(step, body.bottom);
    const score = profile ? feet.right - feet.left : feet.gap;
    if (score < bestScore) {
      best = index;
      bestScore = score;
    }
  });
  const ground = Math.max(...bodies.map((body) => body?.bottom ?? 0));
  const settled = grounded(steps[best], ground);
  return profile ? closeLegs(settled) : settled;
}

/** O tronco `depth` pixels abaixo, com as pernas no lugar: a respiração. A cintura some um pouco, em vez de o corpo esticar. */
export function breathed(stand: Cell, depth: number): Cell {
  const body = bodyOf(stand);
  if (!body || depth === 0) return stand;
  const waist = body.bottom - Math.round((body.bottom - body.top + 1) * WAIST_SHARE);
  const moved = blank(stand);
  for (let y = waist; y < stand.height; y++) stamp(stand, moved, y, y, 0, stand.width, 0);
  // As linhas que o tronco vai cobrir saem antes: onde ele é vazado, não pode aparecer o que estava ali.
  for (let y = waist - 1 + depth; y >= waist; y--) moved.data.fill(0, y * stand.width * 4, (y + 1) * stand.width * 4);
  for (let y = 0; y < waist; y++) stamp(stand, moved, y, y + depth, 0, stand.width, 0);
  return moved;
}

/** O corpo pendendo `shift` pixels pro lado, dos joelhos pra cima: os pés não saem do chão. */
export function swayed(stand: Cell, shift: number): Cell {
  const body = bodyOf(stand);
  if (!body || shift === 0) return stand;
  const knee = body.bottom - Math.round((body.bottom - body.top + 1) * KNEE_SHARE);
  const moved = blank(stand);
  for (let y = 0; y < stand.height; y++) {
    const lean = y >= knee ? 0 : Math.round((shift * (knee - y)) / (knee - body.top));
    stamp(stand, moved, y, y, 0, stand.width, lean);
  }
  return moved;
}

/** Os quadros de quem está parado: primeiro a respiração (o de índice 0 é a pose), depois o corpo pendendo. */
export function idleColumns(stand: Cell): Cell[] {
  const unit = stand.height / 48;
  return [
    ...BREATH_DEPTHS.map((depth) => breathed(stand, Math.round(depth * unit))),
    ...SWAY_SHIFTS.map((shift) => swayed(stand, Math.sign(shift) * Math.max(1, Math.round(Math.abs(shift) * unit)))),
  ];
}
