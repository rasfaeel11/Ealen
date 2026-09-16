import { motion } from "framer-motion";
import type { Ability } from "@ealen/shared";

interface LevelUpModalProps {
  newLevel: number;
  newAbility?: Ability;
  onContinue: () => void;
}

function LevelUpModal({ newLevel, newAbility, onContinue }: LevelUpModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm overflow-hidden rounded-sm border border-codex-goldBright bg-codex-panel p-6 text-center shadow-[0_0_60px_rgba(212,175,55,0.35)]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: 0.5, scale: 3 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-codex-goldBright blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.6, repeat: 1, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-codex-goldBright/20 via-transparent to-transparent"
        />

        <p className="relative font-cinzel text-xs uppercase tracking-[0.3em] text-codex-inkDim">
          As Primeiras Luzes se intensificam
        </p>
        <h2 className="relative mt-2 font-cinzel text-3xl tracking-wide text-codex-goldBright">
          Nível {newLevel}
        </h2>

        {newAbility && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative mt-5 rounded-sm border border-codex-gold/50 bg-black/20 p-4 text-left"
          >
            <p className="font-cinzel text-[0.65rem] uppercase tracking-[0.25em] text-codex-goldBright">
              Nova habilidade
            </p>
            <p className="mt-1 font-cinzel text-base text-codex-ink">{newAbility.name}</p>
            <p className="mt-1 font-garamond text-sm text-codex-inkDim">{newAbility.description}</p>
          </motion.div>
        )}

        <button
          onClick={onContinue}
          className="relative mt-6 rounded-sm border border-codex-gold/60 px-5 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Continuar
        </button>
      </motion.div>
    </div>
  );
}

export default LevelUpModal;
