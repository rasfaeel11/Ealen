import { useState } from "react";
import { Link } from "react-router-dom";
import type { CharacterClass, Race } from "@ealen/shared";
import {
  ATTRIBUTE_KEYS,
  BESTIARY,
  CLASS_COMBAT_ARTS,
  CLASS_INFO,
  CLASS_PRINCIPLE,
  MOCK_ABILITIES,
  MOCK_ITEMS,
  PRINCIPLE_INFO,
  RACE_INFO,
  RACE_MODIFIERS,
  STANCE_MECHANICS,
  STANCE_ORDER,
  bestiaryByLevel,
  findItemTemplate,
} from "@ealen/shared";
import { CLASS_GLYPH, PRINCIPLE_GLYPH } from "../lib/glyphs";

type Tab = "mundo" | "ordens" | "bestiario" | "itens";

const TABS: { id: Tab; label: string }[] = [
  { id: "mundo", label: "O Mundo" },
  { id: "ordens", label: "As Ordens" },
  { id: "bestiario", label: "Bestiário" },
  { id: "itens", label: "Itens" },
];

const CLASS_ORDER: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

const ATTRIBUTE_LABELS: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  dain: "Dain · Força",
  eir: "Eir · Ressonância",
  nath: "Nath · Vitalidade",
  il: "Il · Percepção",
  or: "Or · Densidade",
  len: "Len · Som",
  ul: "Ul · Mistério",
};

const ATTRIBUTE_GOVERNS: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  dain: "Dano corpo-a-corpo.",
  eir: "Dano e cura mágica.",
  nath: "HP máximo.",
  il: "Precisão e chance de crítico.",
  or: "Defesa e poder de bloqueio.",
  len: "Persuasão e diálogo.",
  ul: "Lore e enigmas.",
};

const RARITY_LABEL: Record<(typeof MOCK_ITEMS)[number]["rarity"], string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  sacred: "Sagrado",
};

const RARITY_BORDER: Record<(typeof MOCK_ITEMS)[number]["rarity"], string> = {
  common: "border-codex-border",
  uncommon: "border-emerald-700/60",
  rare: "border-sky-700/60",
  sacred: "border-codex-goldBright",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-cinzel text-xs uppercase tracking-[0.3em] text-codex-goldBright">{title}</h2>
      <div className="my-3 h-px bg-gradient-to-r from-codex-gold/60 via-codex-gold/15 to-transparent" />
      {children}
    </section>
  );
}

/**
 * O Códice: a referência consultável do jogo. Existe porque um mundo em que
 * "Or" governa bloqueio e "Sombrílico" manipula o não-observado não cabe num
 * tooltip — mas também não pode obrigar o jogador a ler tudo de uma vez.
 * Tudo aqui é derivado dos dados reais em /shared, nunca duplicado à mão.
 */
function CodexPage() {
  const [tab, setTab] = useState<Tab>("mundo");

  return (
    <div className="min-h-screen bg-codex-bg text-codex-ink">
      <header className="sticky top-0 z-10 border-b border-codex-border/70 bg-codex-bg/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <h1 className="font-cinzel text-base tracking-[0.2em] text-codex-goldBright">CÓDICE DE TALYS</h1>
          <Link to="/" className="font-garamond text-xs text-codex-inkDim hover:text-codex-ink">
            Voltar
          </Link>
        </div>
        <div className="mx-auto mt-3 flex max-w-4xl flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className={`px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-widest transition-colors ${
                tab === entry.id
                  ? "battle-frame text-codex-goldBright"
                  : "battle-frame-dim text-codex-inkDim hover:text-codex-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {tab === "mundo" && (
          <>
            <Section title="Onde você está">
              <p className="font-garamond text-base leading-relaxed text-codex-ink">
                O planeta se chama <strong className="text-codex-goldBright">Talys</strong> — uma casca fina de
                matéria estável que sobrou perto do ponto onde a realidade se rompeu pela primeira vez. Perto o
                bastante da Ruptura para que as constantes possam ser tocadas; longe o bastante para que a matéria
                ainda se segure junta.
              </p>
              <p className="mt-3 font-garamond text-base leading-relaxed text-codex-ink">
                <strong className="text-codex-goldBright">Eälen</strong> não é o nome do mundo: é a vibração
                original da Primeira Ruptura, ainda se propagando. Aqui, magia não é exceção à física — é
                interpretação dela.
              </p>
            </Section>

            <Section title="Os Princípios Fundamentais">
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(PRINCIPLE_INFO) as (keyof typeof PRINCIPLE_INFO)[]).map((key) => {
                  const principle = PRINCIPLE_INFO[key];
                  return (
                    <article key={key} className="battle-frame-dim p-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-cinzel text-lg text-codex-gold">{PRINCIPLE_GLYPH[key]}</span>
                        <h3 className="font-cinzel text-sm tracking-wide text-codex-goldBright">{principle.name}</h3>
                      </div>
                      <p className="mt-2 font-garamond text-sm leading-snug text-codex-ink">{principle.summary}</p>
                      <p className="mt-2 font-garamond text-[11px] italic leading-snug text-codex-inkDim">
                        {principle.physics}
                      </p>
                    </article>
                  );
                })}
              </div>
            </Section>

            <Section title="Os quatro Povos">
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(RACE_INFO) as Race[]).map((race) => {
                  const info = RACE_INFO[race];
                  const modifiers = RACE_MODIFIERS[race];
                  return (
                    <article key={race} className="battle-frame-dim p-4">
                      <h3 className="font-cinzel text-sm tracking-wide text-codex-goldBright">{info.name}</h3>
                      <p className="mt-1 font-garamond text-[11px] uppercase tracking-wider text-codex-inkDim">
                        {info.homeland}
                      </p>
                      <p className="mt-2 font-garamond text-sm italic leading-snug text-codex-ink">
                        &ldquo;{info.creed}&rdquo;
                      </p>
                      <p className="mt-2 font-cinzel text-[10px] tracking-wider text-codex-gold">
                        {ATTRIBUTE_KEYS.filter((key) => modifiers[key] !== undefined)
                          .map((key) => `${key.toUpperCase()} ${modifiers[key]! > 0 ? "+" : ""}${modifiers[key]}`)
                          .join("  ·  ")}
                      </p>
                    </article>
                  );
                })}
              </div>
            </Section>

            <Section title="Tirán — as sete runas">
              <div className="grid gap-2 sm:grid-cols-2">
                {ATTRIBUTE_KEYS.map((key) => (
                  <div key={key} className="flex items-baseline justify-between gap-3 border-b border-codex-border/50 py-2">
                    <span className="font-cinzel text-xs tracking-wide text-codex-goldBright">
                      {ATTRIBUTE_LABELS[key]}
                    </span>
                    <span className="font-garamond text-xs text-codex-inkDim">{ATTRIBUTE_GOVERNS[key]}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === "ordens" && (
          <>
            <p className="mb-8 font-garamond text-sm leading-relaxed text-codex-inkDim">
              Toda Ordem tem as mesmas cinco posturas de combate. O que muda é o que elas <em>são</em> — e três
              delas não curam, porque nenhum dos Princípios que manipulam restaura um sistema ao estado anterior.
            </p>

            {CLASS_ORDER.map((characterClass) => {
              const info = CLASS_INFO[characterClass];
              const principle = PRINCIPLE_INFO[CLASS_PRINCIPLE[characterClass]];
              const arts = CLASS_COMBAT_ARTS[characterClass];
              const abilities = MOCK_ABILITIES.filter((ability) => ability.characterClass === characterClass);

              return (
                <article key={characterClass} className="battle-frame-dim mb-4 p-5">
                  <div className="flex items-start gap-4">
                    <span className="font-cinzel text-3xl leading-none text-codex-gold">
                      {CLASS_GLYPH[characterClass]}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-cinzel text-base tracking-wide text-codex-goldBright">{info.name}</h3>
                      <p className="font-garamond text-xs text-codex-inkDim">
                        {info.title} · {info.role} · Princípio: {principle.name}
                      </p>
                      <p className="mt-2 font-garamond text-sm italic text-codex-ink">&ldquo;{info.creed}&rdquo;</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {STANCE_ORDER.map((stance) => {
                      const art = arts[stance];
                      return (
                        <div
                          key={stance}
                          className={`border border-codex-border/60 p-3 ${art ? "" : "opacity-40"}`}
                        >
                          <p className="font-cinzel text-xs text-codex-goldBright">{art ? art.name : "— sem cura —"}</p>
                          <p className="mt-1 font-garamond text-[11px] leading-snug text-codex-ink">
                            {art ? art.flavor : "Este Princípio não devolve nada ao estado anterior."}
                          </p>
                          <p className="mt-1 font-cinzel text-[9px] uppercase tracking-widest text-codex-inkDim">
                            {STANCE_MECHANICS[stance]}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {abilities.length > 0 && (
                    <div className="mt-4 border-t border-codex-border/60 pt-3">
                      <p className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-codex-inkDim">
                        Habilidades por nível
                      </p>
                      <ul className="mt-2 space-y-2">
                        {abilities.map((ability) => (
                          <li key={ability.id}>
                            <p className="font-cinzel text-xs text-codex-ink">
                              Nv {ability.unlockLevel} · {ability.name}
                            </p>
                            <p className="font-garamond text-[11px] leading-snug text-codex-inkDim">
                              {ability.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </>
        )}

        {tab === "bestiario" && (
          <>
            <p className="mb-8 font-garamond text-sm leading-relaxed text-codex-inkDim">
              Nada em Talys é monstro por natureza. Tudo que ataca você é um Princípio operando sem ninguém no
              controle.
            </p>

            {bestiaryByLevel().map((entry) => {
              const principle = PRINCIPLE_INFO[entry.principle];
              const arts = Object.values(entry.template.arts ?? {});

              return (
                <article key={entry.template.id} className="battle-frame-dim mb-4 p-5">
                  <div className="flex items-start gap-4">
                    <span className="font-cinzel text-3xl leading-none text-codex-gold">{entry.glyph}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-cinzel text-base tracking-wide text-codex-goldBright">
                          {entry.template.name}
                        </h3>
                        <p className="font-cinzel text-[10px] uppercase tracking-widest text-codex-inkDim">
                          Nv {entry.template.level} · {entry.template.maxHp} HP · {principle.name}
                        </p>
                      </div>
                      <p className="mt-1 font-garamond text-sm text-codex-ink">{entry.summary}</p>
                      <p className="mt-2 font-garamond text-[13px] leading-relaxed text-codex-inkDim">{entry.lore}</p>

                      {arts.length > 0 && (
                        <p className="mt-3 font-cinzel text-[10px] tracking-wider text-codex-gold">
                          {arts.join("  ·  ")}
                        </p>
                      )}

                      {entry.drops.length > 0 && (
                        <p className="mt-2 font-garamond text-[11px] text-codex-inkDim">
                          Pode deixar:{" "}
                          {entry.drops
                            .map((drop) => {
                              const item = findItemTemplate(drop.itemId);
                              return `${item?.name ?? drop.itemId} (${Math.round(drop.chance * 100)}%)`;
                            })
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            <p className="font-garamond text-xs italic text-codex-inkDim">
              {Object.keys(BESTIARY).length} criaturas catalogadas.
            </p>
          </>
        )}

        {tab === "itens" && (
          <>
            <p className="mb-8 font-garamond text-sm leading-relaxed text-codex-inkDim">
              Consumíveis recolhidos ao longo da jornada — cada um é um Princípio engarrafado, e todos caem de
              alguma criatura do bestiário.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_ITEMS.map((item) => (
                <article key={item.id} className={`border bg-black/20 p-4 ${RARITY_BORDER[item.rarity]}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-cinzel text-sm tracking-wide text-codex-goldBright">{item.name}</h3>
                    <span className="font-cinzel text-[9px] uppercase tracking-widest text-codex-inkDim">
                      {RARITY_LABEL[item.rarity]}
                    </span>
                  </div>
                  <p className="mt-2 font-garamond text-[13px] leading-snug text-codex-ink">{item.description}</p>
                  <p className="mt-2 font-cinzel text-[10px] uppercase tracking-wider text-codex-gold">
                    {describeEffect(item)}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** Efeito mecânico de um consumível, em uma linha. */
function describeEffect(item: (typeof MOCK_ITEMS)[number]): string {
  const { effect, maxUses } = item.data;
  const charges = maxUses > 1 ? ` · ${maxUses} cargas` : "";

  switch (effect.kind) {
    case "heal_hp":
      return `Cura ${effect.amount} HP${charges}`;
    case "buff_stat":
      return `+${effect.bonus} de ${effect.stat.toUpperCase()} por ${effect.durationTurns} turnos${charges}`;
    case "cure_status":
      return `Remove status negativos e restaura 5 HP${charges}`;
    case "focus_charge":
      return `Garante crítico no próximo golpe${charges}`;
  }
}

export default CodexPage;
