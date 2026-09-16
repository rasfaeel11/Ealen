import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { CombatAction, LevelUpResult } from "@ealen/shared";
import { CLASS_INFO } from "@ealen/shared";
import { useGameSession } from "../hooks/useGameSession";
import { groupCombatEvents, narrateStep, stepDurationMs, sleep, type AnimStep } from "../lib/combatSteps";
import CombatantCard, { type Floater, type RollBadge } from "../components/combat/CombatantCard";
import CombatLog from "../components/combat/CombatLog";
import CombatResultModal from "../components/combat/CombatResultModal";
import LevelUpModal from "../components/combat/LevelUpModal";

type Side = "character" | "enemy";

interface EnemyInfo {
  id: string;
  name: string;
  level: number;
  maxHp: number;
}

interface ResultState {
  victory: boolean;
  totalDamage: number;
  xpGained: number;
}

const ACTION_LABELS: Record<CombatAction, string> = {
  attack: "Atacar",
  defend: "Defender",
  heal: "Habilidade",
};

function CombatPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { character, needsCharacter, loading, resolveCombatAction } = useGameSession();

  const [error, setError] = useState<string | null>(null);

  const [characterHp, setCharacterHp] = useState(0);
  const [enemy, setEnemy] = useState<EnemyInfo | null>(null);
  const [enemyHp, setEnemyHp] = useState(0);

  const [log, setLog] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [combatEnded, setCombatEnded] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpResult | null>(null);

  const [rollBadges, setRollBadges] = useState<Partial<Record<Side, RollBadge>>>({});
  const [flashes, setFlashes] = useState<Partial<Record<Side, "hit" | "miss">>>({});
  const [floaters, setFloaters] = useState<Record<Side, Floater[]>>({ character: [], enemy: [] });
  const [statusIcons, setStatusIcons] = useState<Record<Side, string[]>>({ character: [], enemy: [] });
  const [deadSides, setDeadSides] = useState<Set<Side>>(new Set());

  const totalDamageRef = useRef(0);
  const rollNonceRef = useRef(0);
  const pendingLevelUpRef = useRef<LevelUpResult | null>(null);
  const hpInitializedRef = useRef(false);

  // Só usamos o currentHp do personagem da sessão pra semear a barra na
  // entrada do combate — a animação de dano/cura controla o valor local
  // a partir daí, turno a turno.
  useEffect(() => {
    if (character && !hpInitializedRef.current) {
      setCharacterHp(character.currentHp);
      hpInitializedRef.current = true;
    }
  }, [character]);

  const nameOf = useCallback(
    (id: string) => {
      if (character && id === character.id) return character.name;
      if (enemy && id === enemy.id) return enemy.name;
      return "???";
    },
    [character, enemy],
  );

  function sideOf(id: string): Side {
    return character && id === character.id ? "character" : "enemy";
  }

  function spawnFloater(side: Side, amount: number, positive: boolean) {
    const id = `${side}-${Date.now()}-${Math.random()}`;
    setFloaters((prev) => ({ ...prev, [side]: [...prev[side], { id, amount, positive }] }));
    setTimeout(() => {
      setFloaters((prev) => ({ ...prev, [side]: prev[side].filter((f) => f.id !== id) }));
    }, 850);
  }

  async function playStep(step: AnimStep, enemyId: string, xpGained: number) {
    setLog((prev) => [...prev, narrateStep(step, nameOf)]);
    const duration = stepDurationMs(step);

    if (step.kind === "attack") {
      const actorSide = sideOf(step.actorId);
      const targetSide = sideOf(step.targetId);

      rollNonceRef.current += 1;
      setRollBadges((prev) => ({ ...prev, [actorSide]: { value: step.roll, nonce: rollNonceRef.current } }));
      await sleep(600);

      setFlashes((prev) => ({ ...prev, [targetSide]: step.hit ? "hit" : "miss" }));
      if (step.hit && step.damage !== undefined && step.remainingHp !== undefined) {
        spawnFloater(targetSide, step.damage, false);
        if (targetSide === "character") setCharacterHp(step.remainingHp);
        else setEnemyHp(step.remainingHp);
        if (step.targetId === enemyId) totalDamageRef.current += step.damage;
      }

      await sleep(duration - 600);
      setFlashes((prev) => ({ ...prev, [targetSide]: undefined }));
      setRollBadges((prev) => ({ ...prev, [actorSide]: undefined }));
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
      spawnFloater(side, step.amount, true);
      if (side === "character") setCharacterHp(step.remainingHp);
      else setEnemyHp(step.remainingHp);
      await sleep(duration);
      return;
    }

    if (step.kind === "death") {
      const side = sideOf(step.actorId);
      setDeadSides((prev) => new Set(prev).add(side));
      await sleep(duration);
      return;
    }

    if (step.kind === "initiative") {
      await sleep(duration);
      return;
    }

    if (step.kind === "victory") {
      const victory = character ? step.winnerId === character.id : false;
      setResult({ victory, totalDamage: totalDamageRef.current, xpGained: victory ? xpGained : 0 });
      setCombatEnded(true);
      await sleep(duration);
    }
  }

  async function handleAction(action: CombatAction) {
    if (!character || !nodeId || resolving || combatEnded) return;

    setResolving(true);
    setError(null);
    setStatusIcons({ character: [], enemy: [] });

    try {
      const response = await resolveCombatAction(nodeId, action);

      if (!enemy) {
        setEnemy({
          id: response.enemyState.id,
          name: response.enemyState.name,
          level: response.enemyState.level,
          maxHp: response.enemyState.maxHp,
        });
        setEnemyHp(response.enemyState.currentHp);
      }

      pendingLevelUpRef.current = response.levelUp.leveledUp ? response.levelUp : null;

      const steps = groupCombatEvents(response.events, character.id, response.enemyState.id);
      for (const step of steps) {
        await playStep(step, response.enemyState.id, response.xpGained);
      }

      setCharacterHp(response.characterState.currentHp);
      setEnemyHp(response.enemyState.currentHp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível resolver o combate");
    } finally {
      setResolving(false);
    }
  }

  const canUseAbility = character ? CLASS_INFO[character.characterClass].primaryAttributes.includes("eir") : false;

  if (!loading && needsCharacter) {
    return <Navigate to="/character/new" replace />;
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
          className="rounded-sm border border-codex-gold/60 px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          Voltar ao mapa
        </button>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-codex-bg text-codex-ink">
      <header className="border-b border-codex-border/70 px-6 py-4">
        <h1 className="font-cinzel text-lg tracking-wide text-codex-goldBright">Combate</h1>
      </header>

      {error && (
        <div className="border-b border-red-900/50 bg-red-950/40 px-6 py-2 font-garamond text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 md:flex-row md:overflow-visible">
        <div className="flex flex-1 flex-col items-center justify-center gap-8 md:flex-row md:justify-around">
          <CombatantCard
            name={character.name}
            subtitle={`Nível ${character.level}`}
            hp={characterHp}
            maxHp={character.maxHp}
            known
            dead={deadSides.has("character")}
            rollBadge={rollBadges.character ?? null}
            flash={flashes.character ?? null}
            floaters={floaters.character}
            statusIcons={statusIcons.character}
            align="left"
          />

          <div className="font-cinzel text-sm text-codex-inkDim">vs</div>

          <CombatantCard
            name={enemy?.name ?? "Inimigo"}
            subtitle={enemy ? `Nível ${enemy.level}` : ""}
            hp={enemyHp}
            maxHp={enemy?.maxHp ?? 1}
            known={enemy !== null}
            dead={deadSides.has("enemy")}
            rollBadge={rollBadges.enemy ?? null}
            flash={flashes.enemy ?? null}
            floaters={floaters.enemy}
            statusIcons={statusIcons.enemy}
            align="right"
          />
        </div>

        <div className="h-64 w-full shrink-0 md:h-full md:w-80">
          <CombatLog lines={log} />
        </div>
      </div>

      <div className="flex shrink-0 justify-center gap-3 border-t border-codex-border/70 px-6 py-4">
        {(["attack", "defend", "heal"] as CombatAction[]).map((action) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={resolving || combatEnded || (action === "heal" && !canUseAbility)}
            title={action === "heal" && !canUseAbility ? "Esta classe ainda não tem habilidade de cura" : undefined}
            className="rounded-sm border border-codex-gold/60 px-5 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {result && (
        <CombatResultModal
          victory={result.victory}
          totalDamage={result.totalDamage}
          xpGained={result.xpGained}
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
