import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface CombatLogProps {
  lines: string[];
}

function CombatLog({ lines }: CombatLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="battle-frame flex h-full flex-col">
      <h2 className="border-b border-codex-border px-4 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright">
        Crônica do combate
      </h2>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
        {lines.length === 0 && (
          <p className="font-garamond text-sm italic text-codex-inkDim">O confronto ainda não começou.</p>
        )}
        {lines.map((line, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-garamond text-sm leading-snug text-codex-ink"
          >
            {line}
          </motion.p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default CombatLog;
