# AGENTS.md — Eälen: O Canto das Primeiras Luzes

> RPG de turnos pra navegador, feito como jogo de verdade: Phaser 3 + TypeScript, sprites animados, motor de combate rodando no próprio navegador. A história ainda não está escrita — os sistemas vêm primeiro.

## Arquitetura

Monorepo com npm workspaces:

- **`shared/`** — as regras do jogo, em TypeScript puro (sem DOM, sem Node, sem rede). Tipos, Ordens, Povos, Artes de combate, bestiário, itens e, em `shared/combat/`, o motor de combate inteiro. Tudo que é regra mora aqui.
- **`client/`** — o jogo: Phaser 3 + Vite. Só apresentação e entrada; não calcula regra nenhuma.
- **`server/`** — Express + Supabase, herdado da versão anterior. **O jogo não depende dele**: hoje só sobram as rotas de personagem/mapa e a ferramenta `balance:matrix`. Fica como base caso um dia exista save na nuvem.

### A regra central do combate

O motor **nunca anima nada**. `playBattleTurn` (`shared/combat/battle.ts`) resolve um turno inteiro e devolve uma lista ORDENADA de `CombatEvent`; a `BattleScene` agrupa esses eventos em passos (`client/src/game/combatSteps.ts`) e os reproduz um por vez. Regra nova de combate entra no motor e vira evento; a cena só aprende a desenhar o evento.

### Reformulação em andamento: combate tático e mundo aberto

O jogo está saindo do combate 1 contra 1 por posturas (estilo Pokémon) pra um combate tático em grade, aos moldes de D&D/BG3, travado no próprio mapa em que o jogador anda. O que foi decidido:

- **Combate em grade quadrada, no mapa de exploração**, sem tela de batalha. Fora de luta o boneco anda livre; na luta o chão conta em quadrados. Diagonal custa 1.
- **Grupo opcional**: o motor aceita qualquer número de combatentes de cada lado; herói solo é só um grupo de um.
- **Mundo aberto como grafo de áreas**: cada nó é um mapa feito à mão (Tiled), as arestas são as saídas, nenhuma travada por história. Nível de inimigo fixo por área.
- **Câmera top-down 3/4** (Sea of Stars), pixel art.
- **IA de inimigo por utilidade** (pontuar jogadas possíveis), no lugar da política de Q-learning. O `ealen-IA` será aposentado pra combate; balanceamento passa a rodar o motor real em Node.
- **Diálogos em Ink** (`inkjs`), numa caixa com fala em cima e opções embaixo; testes de Len/Ul chamados pelo texto.
- Cenários, nomes, falas e kits de habilidade são **placeholder** até a história existir.

Fases: (1) motor tático puro — **feito**, em `shared/tactics/`; (2) cena de mapa: andar, câmera, colisão, troca de área; (3) combate no mapa, substituindo `BattleScene`/`Arena` e apagando `shared/combat/engine.ts`, `battle.ts`, `enemyPolicy.ts` e o `iaTuning`; (4) IA de utilidade; (5) superfícies, destrutíveis e altura; (6) diálogo e flags; (7) save ampliado.

### O motor tático (`shared/tactics/`)

Convive com o motor antigo (`shared/combat/`) até a fase 3 e ainda não é exportado por `shared/index.ts` — importe de `shared/tactics`.

- `startEncounter({ grid, units, seed })` rola a iniciativa e abre a luta; `applyCommand(encounter, command)` aplica UM comando de quem está no turno (`move`, `ability`, `useItem`, `endTurn`) e devolve `TacticalEvent[]` em ordem. Comando recusado não muda nada.
- `Encounter` é dado puro: `structuredClone` dá uma luta independente, com o dado (seed) junto. Nada de `Math.random` aqui dentro.
- Cada turno tem movimento, ação, ação bônus e uma reação (ataque de oportunidade).
- Habilidades são dados (`abilities.ts`): alcance, alvo, área, rolagem de ataque e uma lista de efeitos (`damage`, `heal`, `status`, `push`). Condições também (`statuses.ts`).
- `reachableTiles`, `abilityTargets` e `affectedUnits` são a mesma regra pra interface, pro motor e pra IA.
- Testes sem tela: `npm test` (lutas inteiras jogadas por um bot, com seed).

### Cenas (`client/src/scenes/`)

`Boot` (carrega sprites) → `Title` → `Prologue` → `ClassSelect` (Povo, Ordem, nome) → `Arena` → `Battle`.

A `Arena` é **andaime de desenvolvimento**, não parte do jogo: uma lista de criaturas pra lutar, no lugar onde o mapa e a história vão entrar.

### Sprites

Cada combatente é uma spritesheet com quatro animações (`idle`, `attack`, `hurt`, `die`). Enquanto não há arte final, `client/src/game/sprites.ts` gera folhas provisórias em tempo de execução, com o mesmo layout de quadros. Pra trocar por arte de verdade: salvar a folha em `client/public/sprites/` e registrar em `SPRITE_SHEETS` nesse arquivo — nada mais muda.

### Save

Um personagem, em `localStorage` (`client/src/game/save.ts`). Sem login, sem servidor.

### Restrições que valem ouro

- **Nada de dependência de servidor no caminho do jogo.** O alvo de longo prazo inclui empacotar com Electron e vender na Steam; por isso o motor roda no cliente, o save é local e o Vite builda com caminhos relativos (`base: "./"`). Assets são referenciados sem barra inicial (`sprites/x.png`, não `/sprites/x.png`).
- **`shared/` continua puro.** Se precisar de `window`, `fs` ou `fetch`, não é lá.

### Comandos

```
npm run dev:client                              # o jogo, em http://localhost:5173
npm run build --workspace=client                # typecheck + build
npm test                                        # testes do motor tático (shared/tactics), sem tela
npm run balance:matrix --workspace=server       # taxa de vitória de cada Ordem x criatura, pelo motor real
```

### Versão anterior

A versão em React (mapa em React Flow, combate em Framer Motion, login por Supabase) está preservada na tag `v0-codice`. Os oito prompts que a construíram estão no `AGENTS.md` daquela tag.

## Projeto relacionado (repo separado, sem dependência de código)

Existe um segundo projeto, "Balanceador de Combate + IA de Inimigo" (Python, standalone), em outro repositório (`../ealen-IA`). Ele reimplementa as regras de combate isoladamente em Python pra balancear classes numericamente e treinar um agente de IA.

**Continua sem import de código entre os dois repos.** A integração existe e está ativa, mas atravessa por um único arquivo de dados versionado aqui, `shared/data/iaTuning.json`, gerado lá por `exportar_para_o_jogo.py`. O jogo não executa Python; o balanceador não importa TypeScript. Três coisas consomem esse artefato: a IA de inimigo (`shared/combat/enemyPolicy.ts`, política de Q-learning), os atributos iniciais das Ordens (`shared/characterCreation.ts`) e a curva de XP (`shared/combat/leveling.ts`). Tudo com fallback: sem o artefato, cada um volta à regra escrita à mão.

Leia `INTEGRACAO_COM_O_JOGO.md` antes de mexer em qualquer uma dessas três coisas — ele explica o que encaixa, o que ficou de fora de propósito (o bestiário e as fórmulas de dano não são tocados) e como reexportar. Depois de reexportar, rode `npm run balance:matrix --workspace=server` pra ver o efeito no jogo.

## Referência: Sistema de Atributos (Tirán)

| Atributo | Runa | Tipo | Governa |
|---|---|---|---|
| Dain | Força | Combate | Dano corpo-a-corpo |
| Eir | Ressonância/Espírito | Combate | Dano/cura mágica |
| Nath | Vitalidade | Combate | HP máximo |
| Il | Percepção | Combate | Precisão / chance de crítico |
| Or | Densidade | Combate | Defesa/armadura |
| Len | Som/Voz | Interação | Carisma — checks de diálogo/persuasão |
| Ul | Mistério | Interação | Sabedoria/Intelecto — checks de lore/enigma |

**Povos:** Althirim, Miraven, Taharim, Kelbar
**Ordens (classes):** Luminar (Tank/Suporte), Entropista (Debuffer), Cantor de Eälen (Controle), Guardião (Tank Ofensivo), Sombrílico (Anti-Mago), Rachador (Sniper Físico)

---

Fique a vontade de mudar qualquer coisa no prompt se achar que uma solucao é melhor.
Toda vez que terminar uma tarefa, faça o commit. O push o usuário fará.
