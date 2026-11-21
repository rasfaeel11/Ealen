// A simulação. Regra pura: sem three.js, sem DOM, sem Math.random, sem Date.now (AGENTS §4).
export { TICK, TICK_RATE } from './time.ts';
export { createRng, type Rng } from './rng.ts';
export { parseLevel, type Level, type Block } from './level.ts';
