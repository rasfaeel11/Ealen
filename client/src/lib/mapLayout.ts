import type { MapNode } from "@ealen/shared";

export interface NodePosition {
  x: number;
  y: number;
}

const LAYER_SPACING_X = 260;
const NODE_SPACING_Y = 140;

/**
 * MapNode não carrega coordenadas — faz um layout em camadas (BFS a partir
 * de `rootId`), posicionando cada nó pela sua distância do nó raiz. Nós
 * inalcançáveis a partir da raiz são empilhados numa camada extra ao final.
 */
export function computeLayeredLayout(nodes: MapNode[], rootId: string): Record<string, NodePosition> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = new Map<string, number>();
  const queue: string[] = [];

  if (byId.has(rootId)) {
    depth.set(rootId, 0);
    queue.push(rootId);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depth.get(currentId)!;
    const node = byId.get(currentId);
    if (!node) continue;

    for (const neighborId of node.connections) {
      if (depth.has(neighborId)) continue;
      depth.set(neighborId, currentDepth + 1);
      queue.push(neighborId);
    }
  }

  const unreachableDepth = Math.max(0, ...depth.values()) + 1;
  const layers = new Map<number, string[]>();

  for (const node of nodes) {
    const nodeDepth = depth.get(node.id) ?? unreachableDepth;
    const layer = layers.get(nodeDepth) ?? [];
    layer.push(node.id);
    layers.set(nodeDepth, layer);
  }

  const positions: Record<string, NodePosition> = {};
  for (const [layerDepth, nodeIds] of layers) {
    const offset = ((nodeIds.length - 1) * NODE_SPACING_Y) / 2;
    nodeIds.forEach((nodeId, index) => {
      positions[nodeId] = {
        x: layerDepth * LAYER_SPACING_X,
        y: index * NODE_SPACING_Y - offset,
      };
    });
  }

  return positions;
}
