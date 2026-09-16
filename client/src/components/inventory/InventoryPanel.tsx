import { motion } from "framer-motion";
import type { ConsumableEffect, ConsumableItem, Inventory } from "@ealen/shared";

interface InventoryPanelProps {
  inventory: Inventory<ConsumableItem> | undefined;
  onClose: () => void;
  /** Presente = os itens ficam clicáveis ("Usar"). Ausente = só inspeção. */
  onUseItem?: (itemId: string) => void;
  usingItemId?: string | null;
  title?: string;
  /** Filtra quais itens mostram o botão "Usar" (ex: no mapa, só cura faz sentido). Default: todos. */
  isItemUsable?: (item: ConsumableItem) => boolean;
}

const EFFECT_ICONS: Record<ConsumableEffect["kind"], string> = {
  heal_hp: "❤",
  buff_stat: "🛡",
  cure_status: "✨",
  focus_charge: "👁",
};

const RARITY_BORDER: Record<ConsumableItem["rarity"], string> = {
  common: "border-codex-border",
  uncommon: "border-emerald-700/60",
  rare: "border-sky-700/60",
  sacred: "border-codex-goldBright",
};

function InventoryPanel({
  inventory,
  onClose,
  onUseItem,
  usingItemId,
  title = "Mochila de Viagem",
  isItemUsable = () => true,
}: InventoryPanelProps) {
  const slots = inventory?.slots ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-sm border border-codex-gold/50 bg-codex-panel p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-4 flex items-center justify-between border-b border-codex-border pb-3">
          <h2 className="font-cinzel text-lg tracking-wide text-codex-goldBright">{title}</h2>
          <button onClick={onClose} className="font-garamond text-xs text-codex-inkDim hover:text-codex-ink">
            Fechar
          </button>
        </div>

        {slots.length === 0 ? (
          <p className="py-8 text-center font-garamond text-sm italic text-codex-inkDim">A mochila está vazia.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((slot) => (
              <div
                key={slot.slotIndex}
                title={slot.item.description}
                className={`rounded-sm border ${RARITY_BORDER[slot.item.rarity]} bg-black/20 p-3 text-left`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl leading-none">{EFFECT_ICONS[slot.item.data.effect.kind]}</span>
                  <span className="font-cinzel text-xs text-codex-goldBright">x{slot.quantity}</span>
                </div>
                <p className="mt-2 font-cinzel text-xs tracking-wide text-codex-ink">{slot.item.name}</p>
                <p className="mt-1 font-garamond text-[11px] text-codex-inkDim">{slot.item.description}</p>

                {onUseItem && isItemUsable(slot.item) && (
                  <button
                    onClick={() => onUseItem(slot.item.id)}
                    disabled={usingItemId === slot.item.id}
                    className="mt-2 w-full rounded-sm border border-codex-gold/50 py-1 font-cinzel text-[10px] tracking-wide text-codex-goldBright hover:bg-codex-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {usingItemId === slot.item.id ? "Usando..." : "Usar"}
                  </button>
                )}
                {onUseItem && !isItemUsable(slot.item) && (
                  <p className="mt-2 text-center font-garamond text-[10px] italic text-codex-inkDim">Só em combate</p>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default InventoryPanel;
