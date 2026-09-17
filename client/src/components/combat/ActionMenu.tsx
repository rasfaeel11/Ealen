import type { CharacterClass } from "@ealen/shared";
import { CLASS_COMBAT_ARTS, STANCE_ORDER, type CombatStance } from "@ealen/shared";

interface ActionMenuProps {
  characterClass: CharacterClass;
  disabled: boolean;
  onChoose: (stance: CombatStance) => void;
  onOpenBag: () => void;
  /** Avisa qual Arte está sob o cursor, pra caixa de mensagem descrevê-la. */
  onHighlight: (stance: CombatStance | null) => void;
}

/**
 * O menu de ações da batalha: uma grade de botões quadrados com o NOME da
 * Arte, não com o efeito. "Peso do Mundo" e "Fome do Vazio" dizem mais sobre
 * quem você escolheu ser do que "ataque pesado" — e o efeito numérico
 * aparece na caixa de mensagem assim que o cursor passa por cima.
 *
 * Posturas que a Ordem não tem (a cura de um Guardião, por exemplo) ficam
 * visíveis mas travadas: é informação sobre a classe, não um botão faltando.
 */
function ActionMenu({ characterClass, disabled, onChoose, onOpenBag, onHighlight }: ActionMenuProps) {
  const arts = CLASS_COMBAT_ARTS[characterClass];

  return (
    <div className="grid grid-cols-2 gap-2" onMouseLeave={() => onHighlight(null)}>
      {STANCE_ORDER.map((stance) => {
        const art = arts[stance];
        const unavailable = art === null;

        return (
          <button
            key={stance}
            type="button"
            disabled={disabled || unavailable}
            onClick={() => onChoose(stance)}
            onMouseEnter={() => onHighlight(unavailable ? null : stance)}
            onFocus={() => onHighlight(unavailable ? null : stance)}
            className={[
              "px-3 py-2 text-left font-cinzel text-[11px] leading-tight tracking-wide transition-colors sm:text-xs",
              unavailable
                ? "battle-frame-dim cursor-not-allowed text-codex-inkDim/50"
                : "battle-frame text-codex-goldBright hover:bg-codex-gold/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
            ].join(" ")}
            title={unavailable ? "Esta Ordem não manipula um Princípio capaz de restaurar." : undefined}
          >
            {art ? art.name : "—"}
          </button>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={onOpenBag}
        onMouseEnter={() => onHighlight(null)}
        className="battle-frame px-3 py-2 text-left font-cinzel text-[11px] tracking-wide text-violet-300 transition-colors hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:text-xs"
      >
        Mochila
      </button>
    </div>
  );
}

export default ActionMenu;
