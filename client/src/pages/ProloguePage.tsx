import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useGameSession } from "../hooks/useGameSession";
import { PROLOGUE_PAGES } from "../lib/prologue";

/**
 * Abertura do jogo: cinco páginas curtas que situam o jogador em Talys antes
 * de ele escolher povo e Ordem. Sem isso, "Eir", "Tirán" e "Sombrílico" são
 * só palavras bonitas numa tela de criação de personagem.
 *
 * É pulável e re-lível: quem já jogou não precisa reler, e quem esqueceu o
 * mundo consegue voltar aqui pelo menu inicial.
 */
function ProloguePage() {
  const navigate = useNavigate();
  const { character } = useGameSession();
  const [index, setIndex] = useState(0);

  const page = PROLOGUE_PAGES[index];
  const isLast = index === PROLOGUE_PAGES.length - 1;

  // Quem já tem personagem está relendo o prólogo — volta pro mapa, não pra
  // criação (que redirecionaria de novo e piscaria a tela).
  function finish() {
    navigate(character ? "/map" : "/character/new");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-codex-bg px-4 py-10 text-codex-ink">
      <div className="battle-frame relative w-full max-w-2xl overflow-hidden px-7 py-9 sm:px-10">
        <span className="pointer-events-none absolute -right-6 -top-8 select-none font-cinzel text-[10rem] leading-none text-codex-gold/5">
          {page.glyph}
        </span>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="relative"
          >
            <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-codex-inkDim">
              {index + 1} de {PROLOGUE_PAGES.length}
            </p>
            <h1 className="mt-2 font-cinzel text-2xl tracking-wide text-codex-goldBright sm:text-3xl">
              {page.title}
            </h1>
            <div className="my-4 h-px bg-gradient-to-r from-codex-gold/70 via-codex-gold/20 to-transparent" />

            <div className="space-y-4">
              {page.paragraphs.map((paragraph, i) => (
                <p key={i} className="font-garamond text-lg leading-relaxed text-codex-ink sm:text-xl">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-8 flex items-center justify-between gap-4">
          <button
            onClick={finish}
            className="font-garamond text-sm text-codex-inkDim hover:text-codex-ink"
          >
            {character ? "Voltar ao mapa" : "Pular e forjar meu destino"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {PROLOGUE_PAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 ${i === index ? "bg-codex-goldBright" : "bg-codex-border"}`}
                />
              ))}
            </div>

            {index > 0 && (
              <button
                onClick={() => setIndex((prev) => prev - 1)}
                className="battle-frame-dim px-3 py-1.5 font-cinzel text-xs uppercase tracking-widest text-codex-inkDim hover:text-codex-ink"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setIndex((prev) => prev + 1))}
              className="battle-frame px-4 py-1.5 font-cinzel text-xs uppercase tracking-widest text-codex-goldBright hover:bg-codex-gold/10"
            >
              {isLast ? (character ? "Concluir" : "Forjar meu destino") : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProloguePage;
