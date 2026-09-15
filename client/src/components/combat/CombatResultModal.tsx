import { motion } from "framer-motion";

interface CombatResultModalProps {
  victory: boolean;
  totalDamage: number;
  xpGained: number;
  onContinue: () => void;
}

function CombatResultModal({ victory, totalDamage, xpGained, onContinue }: CombatResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`relative w-full max-w-sm overflow-hidden rounded-sm border p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.7)] ${
          victory ? "border-codex-goldBright bg-codex-panel" : "border-red-900/60 bg-codex-panel"
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
          {victory ? "As Primeiras Luzes reconhecem seu feito." : "As sombras de Eälen prevaleceram desta vez."}
        </p>

        <div className="relative mt-5 space-y-1 border-t border-codex-border pt-4 font-garamond text-sm text-codex-ink">
          <p>Dano total causado: {totalDamage}</p>
          {victory && <p>XP ganho: {xpGained}</p>}
        </div>

        <button
          onClick={onContinue}
          className="relative mt-6 rounded-sm border border-codex-gold/60 px-5 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Voltar ao mapa
        </button>
      </motion.div>
    </div>
  );
}

export default CombatResultModal;
