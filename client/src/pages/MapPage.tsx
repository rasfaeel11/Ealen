import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ReactFlow, Background, Controls, type Node, type Edge, type NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MapNode } from "@ealen/shared";
import { apiFetch } from "../lib/api";
import { useGameSession } from "../hooks/useGameSession";
import { computeLayeredLayout } from "../lib/mapLayout";
import MysticNode, { type MysticNodeData } from "../components/map/MysticNode";
import LoreModal from "../components/map/LoreModal";

const nodeTypes = { mystic: MysticNode };

function MapPage() {
  const navigate = useNavigate();
  const { character, needsCharacter, loading: sessionLoading, moveCharacter } = useGameSession();

  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [loreNode, setLoreNode] = useState<MapNode | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<MapNode[]>("/api/map/nodes")
      .then((data) => {
        if (active) setMapNodes(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar o mapa");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentNode = useMemo(
    () => mapNodes.find((node) => node.id === character?.currentNodeId),
    [mapNodes, character],
  );
  const reachableIds = useMemo(() => new Set(currentNode?.connections ?? []), [currentNode]);

  const positions = useMemo(
    () => computeLayeredLayout(mapNodes, character?.currentNodeId ?? mapNodes[0]?.id ?? ""),
    [mapNodes, character],
  );

  const flowNodes: Node[] = useMemo(
    () =>
      mapNodes.map((node) => {
        const isCurrent = node.id === character?.currentNodeId;
        const data: MysticNodeData = {
          label: node.name,
          encounterType: node.encounterType,
          isCurrent,
          isReachable: reachableIds.has(node.id),
        };
        return {
          id: node.id,
          type: "mystic",
          position: positions[node.id] ?? { x: 0, y: 0 },
          data,
          draggable: false,
          selectable: false,
        };
      }),
    [mapNodes, character, reachableIds, positions],
  );

  const flowEdges: Edge[] = useMemo(() => {
    const seen = new Set<string>();
    const edges: Edge[] = [];

    for (const node of mapNodes) {
      for (const targetId of node.connections) {
        const key = [node.id, targetId].sort().join("::");
        if (seen.has(key)) continue;
        seen.add(key);

        const posA = positions[node.id];
        const posB = positions[targetId];
        const [source, target] = (posA?.x ?? 0) <= (posB?.x ?? 0) ? [node.id, targetId] : [targetId, node.id];
        const isActive = source === character?.currentNodeId || target === character?.currentNodeId;

        edges.push({
          id: key,
          source,
          target,
          type: "smoothstep",
          style: {
            stroke: isActive ? "#e8c47a" : "rgba(201, 161, 90, 0.25)",
            strokeWidth: isActive ? 2 : 1,
          },
        });
      }
    }

    return edges;
  }, [mapNodes, positions, character]);

  const handleNodeClick: NodeMouseHandler = async (_event, node) => {
    if (!character || moving) return;

    const data = node.data as MysticNodeData;
    if (!data.isReachable || data.isCurrent) return;

    setMoving(true);
    setError(null);

    try {
      const result = await moveCharacter(node.id, mapNodes);

      if (result.node.encounterType === "combat") {
        navigate(`/combat/${result.node.id}`);
      } else if (result.node.encounterType === "lore") {
        setLoreNode(result.node);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível se mover");
    } finally {
      setMoving(false);
    }
  };

  if (!sessionLoading && needsCharacter) {
    return <Navigate to="/character/new" replace />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-codex-bg text-codex-ink">
      <header className="flex items-center justify-between border-b border-codex-border/70 px-6 py-4">
        <h1 className="font-cinzel text-lg tracking-wide text-codex-goldBright">Mapa de Eälen</h1>
        {character && (
          <p className="font-garamond text-sm text-codex-inkDim">
            {character.name} · Nível {character.level} · {currentNode?.name ?? "???"}
          </p>
        )}
      </header>

      {error && (
        <div className="border-b border-red-900/50 bg-red-950/40 px-6 py-2 font-garamond text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="relative flex-1">
        {(loading || sessionLoading) && (
          <div className="absolute inset-0 flex items-center justify-center font-cinzel text-sm tracking-wide text-codex-inkDim">
            Desenrolando o mapa...
          </div>
        )}

        {!loading && !sessionLoading && character && mapNodes.length > 0 && (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#3a2f22" gap={28} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {loreNode && <LoreModal node={loreNode} onClose={() => setLoreNode(null)} />}
    </div>
  );
}

export default MapPage;
