import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, useAnimation } from "framer-motion";
import type { CombatAction, ConsumableItem, EncounterSummary, LevelUpResult } from "@ealen/shared";
import { CLASS_COMBAT_ARTS, STANCE_MECHANICS, type CombatStance } from "@ealen/shared";
import { apiFetch } from "../lib/api";
import { CLASS_GLYPH } from "../lib/glyphs";
import { useGameSession } from "../hooks/useGameSession";
import { groupCombatEvents, narrateStep, stepDurationMs, sleep, type AnimStep } from "../lib/combatSteps";
import type { CombatFlash, Floater, RollBadge } from "../components/combat/battleTypes";
import CombatantSprite from "../components/combat/CombatantSprite";
import StatusBox from "../components/combat/StatusBox";
import MessageBox from "../components/combat/MessageBox";
import ActionMenu from "../components/combat/ActionMenu";
import CombatLog from "../components/combat/CombatLog";
import CombatResultModal from "../components/combat/CombatResultModal";
import LevelUpModal from "../components/combat/LevelUpModal";
import InventoryPanel from "../components/inventory/InventoryPanel";

type Side = "character" | "enemy";

interface ResultState {
  victory: boolean;
  totalDamage: number;
  xpGained: number;
  loot: ConsumableItem[];
}

const IDLE_MESSAGE = "O que você faz?";
/** Fração da duração de um passo gasta na primeira fala ("Fulano usa X!"). */
const ANNOUNCE_SHARE = 0.45;
/** Duração fixa da animação do d20 antes de o resultado do ataque aparecer. */
const ROLL_MS = 600;

function CombatPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { character, needsCharacter, loading, resolveCombatAction } = useGameSession();

  const [error, setError] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<EncounterSummary | null>(null);

  const [characterHp, setCharacterHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);

  const [message, setMessage] = useState("Preparando o confronto...");
  const [highlight, setHighlight] = useState<CombatStance | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  const [resolving, setResolving] = useState(false);
  const [combatEnded, setCombatEnded] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpResult | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [usingItemId, setUsingItemId] = useState<string | null>(null);

  const [rollBadges, setRollBadges] = useState<Partial<Record<Side, RollBadge>>>({});
  const [flashes, setFlashes] = useState<Partial<Record<Side, CombatFlash>>>({});
  const [floaters, setFloaters] = useState<Record<Side, Floater[]>>({ character: [], enemy: [] });
  const [statusIcons, setStatusIcons] = useState<Record<Side, string[]>>({ character: [], enemy: [] });
  const [deadSides, setDeadSides] = useState<Set<Side>>(new Set());

  const totalDamageRef = useRef(0);
  const rollNonceRef = useRef(0);
  const pendingLevelUpRef = useRef<LevelUpResult | null>(null);
  const hpInitializedRef = useRef(false);
  const screenShake = useAnimation();

  // Só usamos o currentHp do personagem da sessão pra semear a barra na
  // entrada do combate — a animação de dano/cura controla o valor local
  // a partir daí, turno a turno.
  useEffect(() => {
    if (character && !hpInitializedRef.current) {
      setCharacterHp(character.currentHp);
      hpInitializedRef.current = true;
    }
  }, [character]);

  // Quem está esperando neste nó. Sem isso a primeira ação seria escolhida
  // às cegas, contra um retrato vazio.
  useEffect(() => {
    if (!nodeId) return;
    let active = true;

    apiFetch<EncounterSummary>(`/api/combat/${nodeId}/encounter`)
      .then((data) => {
        if (!active) return;
        setEncounter(data);
        setEnemyHp(data.maxHp);
        setMessage(`${data.name} bloqueia o caminho! ${data.summary}`);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível identificar o encontro");
      });

    return () => {
      active = false;
    };
  }, [nodeId]);

  const nameOf = useCallback(
    (id: string) => {
      if (character && id === character.id) return character.name;
      if (encounter && id === encounter.id) return encounter.name;
      return "???";
    },
    [character, encounter],
  );

  function sideOf(id: string): Side {
    return character && id === character.id ? "character" : "enemy";
  }

  function spawnFloater(side: Side, amount: number, positive: boolean, critical = false) {
    const id = `${side}-${Date.now()}-${Math.random()}`;
    setFloaters((prev) => ({ ...prev, [side]: [...prev[side], { id, amount, positive, critical }] }));
    setTimeout(() => {
      setFloaters((prev) => ({ ...prev, [side]: prev[side].filter((f) => f.id !== id) }));
    }, 850);
  }

  /**
   * Anima um passo e narra as falas dele em sequência na caixa de mensagem.
   * Num ataque, a primeira fala ("Fulano usa Peso do Mundo!") acompanha a
   * rolagem do d20 e a segunda entra junto com o impacto — é o casamento
   * entre texto e animação que dá o ritmo de um combate por turnos.
   */
  async function playStep(step: AnimStep, enemyId: string, xpGained: number, loot: ConsumableItem[]) {
    const lines = narrateStep(step, nameOf);
    setLog((prev) => [...prev, ...lines]);
    setMessage(lines[0]);

    const duration = stepDurationMs(step);

    if (step.kind === "attack") {
      const actorSide = sideOf(step.actorId);
      const targetSide = sideOf(step.targetId);

      rollNonceRef.current += 1;
      setRollBadges((prev) => ({ ...prev, [actorSide]: { value: step.roll, nonce: rollNonceRef.current } }));
      await sleep(ROLL_MS);

      if (lines[1]) setMessage(lines[1]);

      if (step.fumble) {
        setFlashes((prev) => ({ ...prev, [actorSide]: "fumble" }));
      } else if (step.critical) {
        setFlashes((prev) => ({ ...prev, [targetSide]: "critical" }));
        void screenShake.start({ x: [0, -12, 12, -8, 8, -4, 4, 0], transition: { duration: 0.5 } });
      } else if (step.blocked) {
        setFlashes((prev) => ({ ...prev, [targetSide]: "block" }));
      } else {
        setFlashes((prev) => ({ ...prev, [targetSide]: step.hit ? "hit" : "miss" }));
      }

      if (step.hit && step.damage !== undefined && step.remainingHp !== undefined) {
        spawnFloater(targetSide, step.damage, false, step.critical);
        if (targetSide === "character") setCharacterHp(step.remainingHp);
        else setEnemyHp(step.remainingHp);
        if (step.targetId === enemyId) totalDamageRef.current += step.damage;
      }

      await sleep(Math.max(300, duration - ROLL_MS));
      setFlashes((prev) => ({ ...prev, [actorSide]: undefined, [targetSide]: undefined }));
      setRollBadges((prev) => ({ ...prev, [actorSide]: undefined }));
      return;
    }

    const announceMs = lines.length > 1 ? Math.round(duration * ANNOUNCE_SHARE) : duration;

    if (step.kind === "guard") {
      const side = sideOf(step.actorId);
      await sleep(announceMs);
      if (lines[1]) setMessage(lines[1]);
      setFlashes((prev) => ({ ...prev, [side]: "guard" }));
      setStatusIcons((prev) => ({ ...prev, [side]: [...prev[side], step.status] }));
      await sleep(duration - announceMs);
      setFlashes((prev) => ({ ...prev, [side]: undefined }));
      return;
    }

    if (step.kind === "status") {
      const side = sideOf(step.targetId);
      setStatusIcons((prev) => ({ ...prev, [side]: [...prev[side], step.status] }));
      await sleep(duration);
      return;
    }

    if (step.kind === "heal") {
      const side = sideOf(step.targetId);
      await sleep(announceMs);
      if (lines[1]) setMessage(lines[1]);
      spawnFloater(side, step.amount, true);
      if (side === "character") setCharacterHp(step.remainingHp);
      else setEnemyHp(step.remainingHp);
      await sleep(duration - announceMs);
      return;
    }

    if (step.kind === "item") {
      const side = sideOf(step.actorId);
      setFlashes((prev) => ({ ...prev, [side]: "item" }));
      await sleep(announceMs);
      if (lines[1]) setMessage(lines[1]);
      await sleep(duration - announceMs);
      setFlashes((prev) => ({ ...prev, [side]: undefined }));
      return;
    }

    if (step.kind === "death") {
      setDeadSides((prev) => new Set(prev).add(sideOf(step.actorId)));
      await sleep(duration);
      return;
    }

    if (step.kind === "victory") {
      const victory = character ? step.winnerId === character.id : false;
      setResult({
        victory,
        totalDamage: totalDamageRef.current,
        xpGained: victory ? xpGained : 0,
        loot: victory ? loot : [],
      });
      setCombatEnded(true);
      await sleep(duration);
      return;
    }

    await sleep(duration);
  }

  async function handleAction(action: CombatAction, itemId?: string) {
    if (!character || !nodeId || resolving || combatEnded) return;

    setResolving(true);
    setHighlight(null);
    setError(null);
    setStatusIcons({ character: [], enemy: [] });

    try {
      const response = await resolveCombatAction(nodeId, action, itemId);

      if (!encounter) {
        setEnemyHp(response.enemyState.currentHp);
      }

      pendingLevelUpRef.current = response.levelUp.leveledUp ? response.levelUp : null;

      const steps = groupCombatEvents(response.events, character.id, response.enemyState.id);
      for (const step of steps) {
        await playStep(step, response.enemyState.id, response.xpGained, response.loot ?? []);
      }

      setCharacterHp(response.characterState.currentHp);
      setEnemyHp(response.enemyState.currentHp);
      if (!response.events.some((event) => event.type === "victory")) {
        setMessage(IDLE_MESSAGE);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível resolver o combate");
      setMessage(IDLE_MESSAGE);
    } finally {
      setResolving(false);
      setUsingItemId(null);
    }
  }

  async function handleUseItem(itemId: string) {
    setUsingItemId(itemId);
    setShowInventory(false);
    await handleAction("use_item", itemId);
  }

  if (!loading && needsCharacter) {
    return <Navigate to="/prologo" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-codex-bg font-cinzel text-sm tracking-wide text-codex-inkDim">
        Invocando o confronto...
      </div>
    );
  }

  if (error && !character) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-codex-bg px-4 text-center text-codex-ink">
        <p className="font-garamond text-sm text-red-300">{error}</p>
        <button
          onClick={() => navigate("/map")}
          className="battle-frame px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Voltar ao mapa
        </button>
      </div>
    );
  }

  if (!character) return null;

  // Com o cursor sobre uma Arte, a caixa descreve o que ela é (e o rodapé, o
  // que ela faz em números). Sem cursor, a caixa volta a narrar a batalha.
  const highlightedArt = highlight ? CLASS_COMBAT_ARTS[character.characterClass][highlight] : null;
  const showingArt = !resolving && !combatEnded && highlightedArt !== null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-codex-bg text-codex-ink">
      <header className="flex shrink-0 items-center justify-between border-b border-codex-border/70 px-5 py-2.5">
        <h1 className="font-cinzel text-sm tracking-[0.2em] text-codex-goldBright">COMBATE</h1>
        <button
          onClick={() => setShowLog((prev) => !prev)}
          className="font-cinzel text-[10px] uppercase tracking-widest text-codex-inkDim hover:text-codex-goldBright"
        >
          {showLog ? "Fechar crônica" : "Crônica"}
        </button>
      </header>

      {error && (
        <div className="shrink-0 border-b border-red-900/50 bg-red-950/40 px-5 py-2 font-garamond text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <motion.div animate={screenShake} className="battle-arena relative min-h-0 flex-1 p-4 sm:p-6">
          <div className="relative mx-auto flex h-full max-w-3xl flex-col justify-between">
            {/* inimigo: status à esquerda, retrato à direita */}
            <div className="flex items-start justify-between gap-4">
              <StatusBox
                name={encounter?.name ?? "Inimigo"}
                level={encounter?.level ?? null}
                hp={enemyHp}
                maxHp={encounter?.maxHp ?? 1}
                known={encounter !== null}
                showHpNumbers={false}
                statusIcons={statusIcons.enemy}
                align="left"
              />
              <CombatantSprite
                glyph={encounter?.glyph ?? "?"}
                known={encounter !== null}
                dead={deadSides.has("enemy")}
                flash={flashes.enemy ?? null}
                floaters={floaters.enemy}
                rollBadge={rollBadges.enemy ?? null}
                side="enemy"
              />
            </div>

            {/* jogador: retrato à esquerda, status à direita */}
            <div className="flex items-end justify-between gap-4">
              <CombatantSprite
                glyph={CLASS_GLYPH[character.characterClass]}
                known
                dead={deadSides.has("character")}
                flash={flashes.character ?? null}
                floaters={floaters.character}
                rollBadge={rollBadges.character ?? null}
                side="player"
              />
              <StatusBox
                name={character.name}
                level={character.level}
                hp={characterHp}
                maxHp={character.maxHp}
                known
                showHpNumbers
                statusIcons={statusIcons.character}
                align="right"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid shrink-0 grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-[1fr_20rem]">
          <MessageBox
            message={showingArt ? highlightedArt.flavor : message}
            detail={showingArt && highlight ? STANCE_MECHANICS[highlight] : null}
          />
          <ActionMenu
            characterClass={character.characterClass}
            disabled={resolving || combatEnded}
            onChoose={(stance) => handleAction(stance)}
            onOpenBag={() => setShowInventory(true)}
            onHighlight={setHighlight}
          />
        </div>
      </div>

      {showLog && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={() => setShowLog(false)}>
          <div className="h-full w-full max-w-sm p-3" onClick={(event) => event.stopPropagation()}>
            <CombatLog lines={log} />
          </div>
        </div>
      )}

      {showInventory && (
        <InventoryPanel
          inventory={character.inventory}
          onClose={() => setShowInventory(false)}
          onUseItem={handleUseItem}
          usingItemId={usingItemId}
          title="Mochila"
        />
      )}

      {result && (
        <CombatResultModal
          victory={result.victory}
          enemyName={encounter?.name ?? "A criatura"}
          totalDamage={result.totalDamage}
          xpGained={result.xpGained}
          loot={result.loot}
          onContinue={() => {
            setResult(null);
            if (pendingLevelUpRef.current) {
              setLevelUp(pendingLevelUpRef.current);
              pendingLevelUpRef.current = null;
            } else {
              navigate("/map");
            }
          }}
        />
      )}

      {levelUp?.leveledUp && (
        <LevelUpModal
          newLevel={levelUp.newLevel ?? character.level}
          newAbility={levelUp.newAbility}
          onContinue={() => navigate("/map")}
        />
      )}
    </div>
  );
}

export default CombatPage;
