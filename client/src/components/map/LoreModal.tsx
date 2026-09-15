import type { MapNode } from "@ealen/shared";

interface LoreModalProps {
  node: MapNode;
  onClose: () => void;
}

function LoreModal({ node, onClose }: LoreModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-sm border border-codex-gold/50 bg-codex-panel p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <h2 className="font-cinzel text-lg tracking-wide text-codex-goldBright">{node.name}</h2>
        <div className="my-3 h-px bg-gradient-to-r from-codex-gold/60 via-codex-gold/20 to-transparent" />
        <p className="font-garamond text-base leading-relaxed text-codex-ink">{node.description}</p>
        <button
          onClick={onClose}
          className="mt-6 rounded-sm border border-codex-gold/60 px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default LoreModal;
