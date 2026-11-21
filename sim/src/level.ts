/**
 * O nível descrito em JSON (docs/arquitetura.md, "Conteúdo"). Greybox: caixas estáticas, água, spawns e
 * objetos soltos. Medidas em metros, Y para cima; `pos` é o centro, `size` a medida inteira.
 */
export type Vec3 = [number, number, number];

export interface Block { id: string; pos: Vec3; size: Vec3; kind: 'ground' | 'wall' | 'ramp' | 'ledge'; rotY?: number }
export interface Water { id: string; pos: Vec3; size: Vec3; depth: number }
export interface Prop { id: string; kind: 'crate' | 'barrel' | 'dummy'; pos: Vec3; mass: number }
export interface Spawn { id: string; pos: Vec3; facing: number }

export interface Level { id: string; name: string; blocks: Block[]; water: Water[]; props: Prop[]; spawns: Spawn[] }

export function parseLevel(raw: unknown): Level {
  const l = raw as Partial<Level>;
  for (const key of ['id', 'name', 'blocks', 'water', 'props', 'spawns'] as const) {
    if (l[key] === undefined) throw new Error(`level: falta o campo "${key}"`);
  }
  const lv = l as Level;
  if (!lv.spawns.some((s) => s.id === 'player')) throw new Error(`level ${lv.id}: falta o spawn "player"`);
  const ids = new Set<string>();
  for (const it of [...lv.blocks, ...lv.water, ...lv.props, ...lv.spawns]) {
    if (ids.has(it.id)) throw new Error(`level ${lv.id}: id repetido "${it.id}"`);
    ids.add(it.id);
  }
  for (const p of lv.props) if (!(p.mass > 0)) throw new Error(`level ${lv.id}: ${p.id} sem massa`);
  return lv;
}
