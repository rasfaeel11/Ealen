import { AnimatePresence, motion } from "framer-motion";

interface StatusBoxProps {
  name: string;
  level: number | null;
  hp: number;
  maxHp: number;
  /** false = inimigo ainda não revelado: esconde nome, nível e números. */
  known: boolean;
  /** Mostra os números de HP (sempre no seu combatente, nunca no inimigo). */
  showHpNumbers: boolean;
  statusIcons: string[];
  align: "left" | "right";
}

/**
 * Caixa de status de um combatente: nome, nível e barra de vida, dentro de
 * um quadro de borda dupla. A barra troca de cor conforme o HP cai (dourado
 * → âmbar → vermelho), que é a leitura mais rápida que existe num combate de
 * turno: dá pra saber se dá tempo de atacar mais uma vez sem ler número
 * nenhum.
 */
function StatusBox({ name, level, hp, maxHp, known, showHpNumbers, statusIcons, align }: StatusBoxProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const barColor = pct > 50 ? "bg-codex-gold" : pct > 20 ? "bg-amber-500" : "bg-red-600";

  return (
    <div className={`battle-frame w-60 px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`flex items-baseline gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="font-cinzel text-sm tracking-wide text-codex-goldBright">{known ? name : "???"}</span>
        {known && level !== null && (
          <span className="font-cinzel text-[11px] text-codex-inkDim">Nv {level}</span>
        )}
      </div>

      <div className={`mt-2 flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="font-cinzel text-[10px] tracking-widest text-codex-inkDim">HP</span>
        <div className="h-3 flex-1 border border-codex-border bg-black/60 p-[2px]">
          <motion.div
            animate={{ width: `${known ? pct : 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full ${known ? barColor : "bg-codex-border"}`}
          />
        </div>
      </div>

      {known && showHpNumbers && (
        <p className="mt-1 font-cinzel text-[11px] text-codex-ink">
          {Math.max(0, hp)} / {maxHp}
        </p>
      )}

      {statusIcons.length > 0 && (
        <div className={`mt-1.5 flex flex-wrap gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <AnimatePresence>
            {statusIcons.map((status, index) => (
              <motion.span
                key={`${status}-${index}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="border border-codex-gold/50 bg-black/40 px-1.5 py-[1px] font-cinzel text-[9px] uppercase tracking-wider text-codex-gold"
              >
                {status}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default StatusBox;
