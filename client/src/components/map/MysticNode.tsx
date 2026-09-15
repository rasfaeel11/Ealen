import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EncounterType } from "@ealen/shared";

export interface MysticNodeData extends Record<string, unknown> {
  label: string;
  encounterType: EncounterType;
  isCurrent: boolean;
  isReachable: boolean;
}

const ENCOUNTER_LABEL: Record<EncounterType, string> = {
  combat: "Combate",
  dialogue: "Diálogo",
  lore: "Lenda",
  none: "",
};

function MysticNode({ data }: NodeProps) {
  const { label, encounterType, isCurrent, isReachable } = data as MysticNodeData;
  const clickable = isReachable && !isCurrent;

  return (
    <div
      className={[
        "w-44 rounded-sm border px-3 py-2.5 text-center shadow-[0_0_18px_rgba(0,0,0,0.5)] transition-all",
        "font-cinzel text-xs tracking-wide",
        isCurrent
          ? "cursor-default border-codex-goldBright bg-codex-panel text-codex-goldBright shadow-[0_0_22px_rgba(232,196,122,0.35)]"
          : clickable
            ? "cursor-pointer border-codex-gold/60 bg-codex-panel text-codex-ink hover:border-codex-goldBright hover:text-codex-goldBright"
            : "cursor-not-allowed border-codex-border/60 bg-codex-panel/60 text-codex-inkDim opacity-40",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} className="!border-codex-gold !bg-codex-bg" />
      <div className="leading-snug">{label}</div>
      {encounterType !== "none" && (
        <div className="mt-1 text-[10px] font-garamond italic tracking-wider opacity-80">
          {ENCOUNTER_LABEL[encounterType]}
        </div>
      )}
      {isCurrent && <div className="mt-1 text-[10px] font-garamond uppercase tracking-widest">você está aqui</div>}
      <Handle type="source" position={Position.Right} className="!border-codex-gold !bg-codex-bg" />
    </div>
  );
}

export default MysticNode;
