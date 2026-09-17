import { AnimatePresence, motion } from "framer-motion";

interface MessageBoxProps {
  /** A fala atual. Trocar o texto re-anima a caixa. */
  message: string;
  /** Linha secundária opcional (efeito numérico da Arte em destaque). */
  detail?: string | null;
}

/**
 * A caixa de texto da batalha: uma fala por vez, como num RPG de turno
 * clássico. É aqui que o combate é narrado enquanto a animação acontece, e
 * é aqui que a descrição de uma Arte aparece quando o jogador passa o cursor
 * por ela — a caixa nunca fica vazia, sempre está dizendo alguma coisa.
 */
function MessageBox({ message, detail }: MessageBoxProps) {
  return (
    <div className="battle-frame flex min-h-[5.5rem] flex-col justify-center px-5 py-3">
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="font-garamond text-base leading-snug text-codex-ink sm:text-lg"
        >
          {message}
        </motion.p>
      </AnimatePresence>

      {detail && (
        <p className="mt-1.5 font-cinzel text-[10px] uppercase tracking-widest text-codex-gold">{detail}</p>
      )}
    </div>
  );
}

export default MessageBox;
