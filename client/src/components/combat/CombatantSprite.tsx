import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CombatFlash, Floater, RollBadge } from "./battleTypes";

interface CombatantSpriteProps {
  /** Símbolo que representa o combatente (ver client/src/lib/glyphs.ts). */
  glyph: string;
  /** Retrato em pixel art (ver client/src/lib/portraits.ts). Sem isso, cai pro glyph. */
  portrait?: string | null;
  /** false enquanto o inimigo ainda não foi revelado — mostra uma silhueta. */
  known: boolean;
  dead: boolean;
  flash: CombatFlash | null;
  floaters: Floater[];
  rollBadge: RollBadge | null;
  /** true enquanto este lado está executando o passo de ataque atual. */
  attacking?: boolean;
  /** "enemy" cai pra trás ao morrer; "player" cai pra frente. */
  side: "player" | "enemy";
}

const ROLL_TICK_MS = 55;
const ROLL_DURATION_MS = 600;

const FLASH_TINT: Record<CombatFlash, string> = {
  hit: "bg-red-600/60",
  miss: "bg-neutral-500/30",
  critical: "bg-codex-goldBright/70",
  fumble: "bg-neutral-800/70",
  block: "bg-sky-500/50",
  item: "bg-violet-500/50",
  guard: "bg-sky-400/30",
};

const FLASH_MARK: Partial<Record<CombatFlash, string>> = {
  critical: "✦",
  fumble: "✖",
  block: "🛡",
  item: "❖",
  guard: "🛡",
};

/**
 * O "retrato" de um combatente: um quadro com o símbolo dele dentro, com a
 * plataforma losangular embaixo. Tudo que acontece com a unidade (rolagem,
 * flash de acerto, número de dano subindo, queda na morte) acontece neste
 * quadrado — a caixa de status fica separada, como nos RPGs de turno.
 */
function CombatantSprite({
  glyph,
  portrait,
  known,
  dead,
  flash,
  floaters,
  rollBadge,
  attacking = false,
  side,
}: CombatantSpriteProps) {
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

  return (
    <div className="relative flex flex-col items-center">
      {/* Números de dano/cura subindo. Ancorados no meio do quadro porque a
          animação sobe 42px — saindo da borda de cima, o número escaparia da
          arena e apareceria por cima do cabeçalho. */}
      <div className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2">
        <AnimatePresence>
          {floaters.map((floater) => (
            <motion.span
              key={floater.id}
              initial={{ opacity: 0, y: 0, scale: floater.critical ? 0.6 : 1 }}
              animate={{ opacity: 1, y: -42, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-cinzel font-bold ${
                floater.critical
                  ? "text-3xl text-codex-goldBright drop-shadow-[0_0_10px_rgba(232,196,122,0.95)]"
                  : `text-xl ${floater.positive ? "text-emerald-400" : "text-red-400"}`
              }`}
            >
              {floater.positive ? "+" : "-"}
              {floater.amount}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* d20 da ação atual */}
      <AnimatePresence>
        {displayRoll !== null && (
          <motion.div
            key="roll"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            className="battle-frame absolute -top-4 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center font-cinzel text-base text-codex-goldBright"
          >
            {displayRoll}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={
          dead
            ? { opacity: 0, y: 34, rotate: side === "enemy" ? 22 : -22 }
            : { opacity: 1, y: 0, rotate: 0 }
        }
        transition={{ duration: 0.85, ease: "easeIn" }}
        className="battle-frame relative flex h-28 w-28 items-center justify-center overflow-hidden sm:h-32 sm:w-32"
      >
        {/* sprite: balança em pé como um idle de RPG antigo; avança na direção
            do oponente durante o próprio golpe de ataque. */}
        <motion.div
          animate={
            attacking
              ? { x: side === "player" ? [0, 26, 0] : [0, -26, 0], y: 0 }
              : { x: 0, y: [0, -5, 0] }
          }
          transition={
            attacking
              ? { duration: 0.4, ease: "easeOut" }
              : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          }
          className="flex h-full w-full items-center justify-center"
        >
          {known && portrait ? (
            <img
              src={portrait}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-cover [image-rendering:pixelated]"
            />
          ) : (
            <span
              className={`select-none font-cinzel text-5xl leading-none sm:text-6xl ${
                known ? "text-codex-goldBright" : "text-codex-border"
              }`}
            >
              {known ? glyph : "?"}
            </span>
          )}
        </motion.div>

        <AnimatePresence>
          {flash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: flash === "critical" ? 0.35 : 0.2 }}
              className={`pointer-events-none absolute inset-0 flex items-center justify-center text-4xl ${FLASH_TINT[flash]} ${
                flash === "fumble" ? "grayscale" : ""
              }`}
            >
              {FLASH_MARK[flash]}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* plataforma */}
      <div className="mt-1 h-2 w-24 rotate-0 border-t-2 border-codex-gold/30 bg-codex-gold/5 sm:w-28" />
    </div>
  );
}

export default CombatantSprite;
