import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EncounterType } from "@ealen/shared";

export interface MysticNodeData extends Record<string, unknown> {
  label: string;
  encounterType: EncounterType;
  /** Nome da criatura do nó, quando o encontro é de combate. */
  encounterName?: string;
  encounterLevel?: number;
  isCurrent: boolean;
  isReachable: boolean;
}

const ENCOUNTER_LABEL: Record<EncounterType, string> = {
  combat: "Combate",
  dialogue: "Diálogo",
  lore: "Lenda",
  none: "",
};

const ENCOUNTER_MARK: Record<EncounterType, string> = {
  combat: "✶",
  dialogue: "❝",
  lore: "❖",
  none: "·",
};

function MysticNode({ data }: NodeProps) {
  const { label, encounterType, encounterName, encounterLevel, isCurrent, isReachable } = data as MysticNodeData;
  const clickable = isReachable && !isCurrent;

  return (
    <div
      className={[
        "w-48 px-3 py-2.5 text-center font-cinzel text-xs tracking-wide transition-all",
        isCurrent
          ? "battle-frame cursor-default text-codex-goldBright"
          : clickable
            ? "battle-frame cursor-pointer text-codex-ink hover:bg-codex-gold/10 hover:text-codex-goldBright"
            : "battle-frame-dim cursor-not-allowed text-codex-inkDim opacity-45",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} className="!border-codex-gold !bg-codex-bg" />

      <div className="text-codex-gold/70">{ENCOUNTER_MARK[encounterType]}</div>
      <div className="mt-0.5 leading-snug">{label}</div>

      {encounterType !== "none" && (
        <div className="mt-1 font-garamond text-[10px] italic tracking-wider opacity-80">
          {encounterName ? `${encounterName}${encounterLevel ? ` · Nv ${encounterLevel}` : ""}` : ENCOUNTER_LABEL[encounterType]}
        </div>
      )}

      {isCurrent && (
        <div className="mt-1 font-garamond text-[10px] uppercase tracking-widest">você está aqui</div>
      )}

      <Handle type="source" position={Position.Right} className="!border-codex-gold !bg-codex-bg" />
    </div>
  );
}

export default MysticNode;
