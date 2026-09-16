import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface Floater {
  id: string;
  amount: number;
  positive: boolean;
  critical?: boolean;
}

export interface RollBadge {
  value: number;
  nonce: number;
}

export type CombatFlash = "hit" | "miss" | "critical" | "fumble" | "block" | "item";

interface CombatantCardProps {
  name: string;
  subtitle: string;
  hp: number;
  maxHp: number;
  known: boolean;
  dead: boolean;
  rollBadge: RollBadge | null;
  flash: CombatFlash | null;
  floaters: Floater[];
  statusIcons: string[];
  align: "left" | "right";
}

const ROLL_TICK_MS = 55;
const ROLL_DURATION_MS = 600;

const FLASH_STYLES: Record<CombatFlash, string> = {
  hit: "bg-red-600",
  miss: "bg-neutral-400",
  critical: "bg-codex-goldBright",
  fumble: "bg-neutral-700 grayscale",
  block: "bg-sky-500",
  item: "bg-violet-500",
};

const FLASH_ICONS: Partial<Record<CombatFlash, string>> = {
  critical: "✦",
  fumble: "💔",
  block: "🛡",
  item: "❖",
};

function CombatantCard({ name, subtitle, hp, maxHp, known, dead, rollBadge, flash, floaters, statusIcons, align }: CombatantCardProps) {
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);

  useEffect(() => {
    if (!rollBadge) {
      setDisplayRoll(null);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= ROLL_DURATION_MS) {
        setDisplayRoll(rollBadge.value);
        clearInterval(interval);
        return;
      }
      setDisplayRoll(1 + Math.floor(Math.random() * 20));
    }, ROLL_TICK_MS);
    return () => clearInterval(interval);
  }, [rollBadge]);

  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

  return (
    <motion.div
      animate={dead ? { rotate: align === "left" ? -20 : 20, opacity: 0, y: 40 } : { rotate: 0, opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeIn" }}
      className={`relative w-64 rounded-sm border border-codex-border bg-codex-panel p-4 shadow-[0_0_24px_rgba(0,0,0,0.5)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {/* flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: flash === "critical" ? 0.6 : 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: flash === "critical" ? 0.4 : 0.25 }}
            className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm text-4xl ${FLASH_STYLES[flash]}`}
          >
            {FLASH_ICONS[flash]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating damage/heal numbers */}
      <div className={`pointer-events-none absolute top-2 ${align === "right" ? "right-4" : "left-4"}`}>
        <AnimatePresence>
          {floaters.map((floater) => (
            <motion.span
              key={floater.id}
              initial={{ opacity: 0, y: 0, scale: floater.critical ? 0.6 : 1 }}
              animate={{ opacity: 1, y: -36, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute font-cinzel font-bold ${
                floater.critical
                  ? "text-2xl text-codex-goldBright drop-shadow-[0_0_8px_rgba(232,196,122,0.9)]"
                  : `text-lg ${floater.positive ? "text-emerald-400" : "text-red-400"}`
              }`}
            >
              {floater.positive ? "+" : "-"}
              {floater.amount}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* roll badge */}
      <AnimatePresence>
        {displayRoll !== null && (
          <motion.div
            key="roll"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute -top-3 ${align === "right" ? "right-4" : "left-4"} flex h-9 w-9 items-center justify-center rounded-sm border border-codex-goldBright bg-codex-bg font-cinzel text-sm text-codex-goldBright shadow-[0_0_10px_rgba(232,196,122,0.5)]`}
          >
            {displayRoll}
          </motion.div>
        )}
      </AnimatePresence>

      <h3 className="font-cinzel text-sm tracking-wide text-codex-goldBright">{known ? name : "???"}</h3>
      <p className="font-garamond text-xs text-codex-inkDim">{known ? subtitle : "Presença hostil à espreita..."}</p>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-codex-border bg-black/40">
        <motion.div
          animate={{ width: `${known ? hpPct : 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${known ? "bg-codex-gold" : "bg-codex-border"}`}
        />
      </div>
      {known && (
        <p className="mt-1 font-garamond text-[11px] text-codex-inkDim">
          {Math.max(0, hp)} / {maxHp} HP
        </p>
      )}

      <div className={`mt-2 flex gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
        <AnimatePresence>
          {statusIcons.map((status, index) => (
            <motion.span
              key={`${status}-${index}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-sm border border-codex-gold/50 bg-black/30 px-1.5 py-0.5 font-garamond text-[10px] italic text-codex-gold"
            >
              {status}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default CombatantCard;
