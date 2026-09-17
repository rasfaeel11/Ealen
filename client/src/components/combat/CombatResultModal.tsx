import { motion } from "framer-motion";
import type { ConsumableItem } from "@ealen/shared";

interface CombatResultModalProps {
  victory: boolean;
  enemyName: string;
  totalDamage: number;
  xpGained: number;
  /** Itens que a criatura deixou cair e já entraram na mochila. */
  loot: ConsumableItem[];
  onContinue: () => void;
}

function CombatResultModal({ victory, enemyName, totalDamage, xpGained, loot, onContinue }: CombatResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`battle-frame relative w-full max-w-sm overflow-hidden p-6 text-center ${
          victory ? "" : "border-red-900/70"
        }`}
      >
        {victory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 0.35, scale: 2.2 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-codex-goldBright blur-3xl"
          />
        )}

        <h2
          className={`relative font-cinzel text-2xl tracking-wide ${
            victory ? "text-codex-goldBright" : "text-red-400"
          }`}
        >
          {victory ? "Vitória" : "Derrota"}
        </h2>
        <p className="relative mt-2 font-garamond text-sm text-codex-inkDim">
          {victory
            ? `${enemyName} deixa de ressoar. O trecho do mundo continua de pé.`
            : "Suas frequências se dispersam. Talys segue sem você, por ora."}
        </p>

        <div className="relative mt-5 space-y-1 border-t border-codex-border pt-4 font-garamond text-sm text-codex-ink">
          <p>Dano total causado: {totalDamage}</p>
          {victory && <p>XP ganho: {xpGained}</p>}
        </div>

        {victory && loot.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="relative mt-4 border border-codex-gold/50 bg-black/25 p-3 text-left"
          >
            <p className="font-cinzel text-[0.6rem] uppercase tracking-[0.25em] text-codex-goldBright">
              Recolhido do chão
            </p>
            <ul className="mt-2 space-y-1.5">
              {loot.map((item) => (
                <li key={item.id}>
                  <p className="font-cinzel text-xs text-codex-ink">{item.name}</p>
                  <p className="font-garamond text-[11px] leading-snug text-codex-inkDim">{item.description}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <button
          onClick={onContinue}
          className="battle-frame relative mt-6 px-5 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Voltar ao mapa
        </button>
      </motion.div>
    </div>
  );
}

export default CombatResultModal;
