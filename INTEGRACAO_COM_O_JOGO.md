# Integração com o Balanceador + IA (`ealen-IA`)

O repositório irmão `ealen-IA` (Python) é um projeto de Cálculo/IA que
reimplementa as regras de combate isoladamente pra fazer três coisas:
balancear as classes por Monte Carlo + gradiente descendente (Camada 1),
treinar um agente de inimigo por Q-learning (Camada 2) e modelar a curva de
XP com derivada/integral (Camada 3).

Este documento descreve **o que está integrado hoje**, como a ponte funciona,
e o que continua fora dela de propósito. Uma versão anterior dele concluía
que a integração não era possível; a conclusão mudou depois de olhar melhor
pra qual PARTE de cada lado encaixa — nem tudo encaixa, mas a parte que
encaixa é justamente a que dá mais resultado jogável.

## A ponte: um arquivo de dados, nenhuma dependência de código

```
  ealen-IA (Python)                          ealen (jogo)
  ─────────────────                          ────────────
  demo_balanceamento.py  ──┐
  (Camada 1: auto-tuner)   │
                           ├─► exportar_para_o_jogo.py
  q_learning.treinar()   ──┘            │
  (Camada 2: agente)                    │
                                        ▼
                         shared/data/iaTuning.json  ◄── versionado AQUI
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
           characterCreation.ts   enemyPolicy.ts      leveling.ts
           (atributos iniciais)   (IA de inimigo)     (curva de XP)
```

O jogo **não executa Python** e o balanceador **não importa TypeScript** —
o non-goal dos dois lados continua de pé. A única coisa que atravessa é
`shared/data/iaTuning.json`, versionado neste repositório. Quem o gera é
`exportar_para_o_jogo.py`, do outro lado:

```bash
cd ../ealen-IA
python demo_balanceamento.py          # (opcional) roda o auto-tuner de novo
python exportar_para_o_jogo.py        # treina o agente e grava ../ealen/shared/data/iaTuning.json
```

`shared/iaTuning.ts` valida o artefato ao carregar. Se ele sumir, vier
corrompido ou trouxer uma `schemaVersion` desconhecida, cada consumidor volta
sozinho à regra escrita à mão que existia antes — o jogo fica menos afinado,
nunca quebrado.

## O que integra, e por quê

### 1. A IA de inimigo passou a ser a política treinada

É a integração com melhor encaixe, e não por acaso: o estado que o agente
aprendeu a ler existe no motor daqui sem nenhuma adaptação — faixa do próprio
HP, faixa do HP do oponente, quem está de guarda — e as três ações do
simulador têm correspondência direta:

| Simulador (Python) | Motor do jogo | Observação |
|---|---|---|
| `ATACAR` | `attack` | vira `quick_attack` se o oponente está abaixo de 25% de HP |
| `DEFENDER` | `defend` | |
| `HABILIDADE` | `heavy_attack` | 180% de dano dos dois lados; o acerto cai -20% lá, -4 no d20 aqui |

`shared/combat/enemyPolicy.ts` decide em duas camadas. Primeiro as regras
autorais: uma criatura que cura e está abaixo de 30% de HP cura, ponto — o
agente nunca viu uma poção e não tem opinião legítima sobre isso. Depois, a
política treinada. Quando ela não tem opinião (estado nunca visitado no
treino, ou empate quase exato entre duas ações), cai na heurística original,
que está preservada inteira em `heuristicEnemyAction`.

O agente vence 77% dos combates contra a política ingênua "sempre ataca" no
simulador, e a diferença aparece no jogo. Um exemplo real: com o inimigo a
5/28 de HP contra um oponente também quase morto, a heurística mandava
defender e a política treinada manda atacar pesado — ela aprendeu que, com os
dois na lona, turtlear perde a corrida. No caminho inverso, com o inimigo a
5/28 contra um oponente de HP cheio, as duas concordam em defender.

Uma peça nova foi necessária: a guarda do inimigo agora sobrevive entre as
chamadas HTTP de uma mesma luta (`CombatSession.enemyGuardUp`), com a mesma
regra de consumo do simulador — a postura dura até quem a levantou ser alvo
de uma ação ofensiva. Sem isso, metade do espaço de estados da política era
inalcançável.

### 2. Os atributos iniciais das Ordens vêm do auto-tuner

Antes, toda Ordem começava com 5 em tudo e +2 nos primários: seis fichas
quase idênticas. Agora a base dos cinco atributos de combate vem dos valores
que o auto-tuner convergiu, reescalados pro orçamento de pontos do jogo
(`shared/characterCreation.ts`). Len e Ul continuam na regra antiga — o
simulador não os modela, porque lá nada fora de combate existe.

A reescala normaliza pelo TOTAL das seis Ordens, não Ordem por Ordem: o tuner
não só redistribuiu pontos dentro de cada classe, ele também concluiu que
algumas precisam de mais pontos brutos que outras pra empatar (o Sombrílico
soma ~50 contra ~41 do Cantor). Normalizar cada uma pro mesmo total jogaria
metade do resultado fora.

**O efeito colateral, medido e não suposto.** `npm run balance:matrix
--workspace=server` roda a matriz de vitória pelo motor real do jogo. Antes e
depois, nível 1, contra o Servo Enferrujado (nível 4):

| Ordem | antes | depois |
|---|---|---|
| Luminar | 36% | 52% |
| Sombrílico | 33% | 27% |
| Guardião | 28% | 18% |
| Entropista | 23% | 22% |
| Cantor de Eälen | 22% | 10% |
| Rachador | 20% | 19% |

As Ordens deixaram de estar todas na mesma faixa. Isso é o objetivo — existe
um tanque de verdade e um canhão de vidro de verdade agora —, mas é mais
espalhamento do que todo projeto quer, e ele **não vem com garantia nenhuma**:
o 50/50 do tuner vale no modelo probabilístico dele (`chance_acerto_base +
chance_acerto_por_il * il`), não no d20 daqui. Por isso existe
`BASELINE_BLEND` em `characterCreation.ts`: 1 usa os números do tuner
inteiros, 0 volta à regra antiga, valores no meio interpolam. A matriz mostra
o efeito de cada escolha.

(A matriz usa um jogador que só ataca, então ela subestima as Ordens que
curam — Luminar, Entropista, Cantor. Serve pra comparar antes/depois, não
como medida absoluta de dificuldade.)

### 3. A curva de XP, no sentido inverso

`xpToNextLevel(level) = level * 100` é uma reta, exatamente o que
`progressao_xp.curva_linear` modela com `a=0, b=100`. Aqui o jogo é a fonte
da verdade — o outro repo analisou essa curva (derivada constante de 100
XP/nível, 5.500 de XP acumulado até o nível 10), não propôs mudá-la.
`leveling.ts` lê os coeficientes do artefato só pra que um descasamento
futuro entre a fórmula real e a analisada apareça, em vez de passar batido.

## O que continua fora, de propósito

**O bestiário não é tocado.** Cada criatura de `shared/mock/bestiary.ts` tem
atributos escolhidos à mão junto com lore e Artes nomeadas — o Lobo-de-Bruma
dá um Bote Silencioso, não uma "Fome do Vazio". Sobrescrever esses números
com a saída de um auto-tuner numérico descartaria decisões de design que não
são só estatística de combate. O caminho certo, se um dia fizer falta, é o
tuner sugerir uma FAIXA equilibrada pro nível da criatura e um humano
escolher dentro dela.

**As fórmulas de combate não são importadas.** `ParametrosDeFormula`
(`hp_por_nath`, `reducao_dano_por_or`, ...) parametriza fórmulas que não
existem aqui: o motor daqui rola d20 + atributo contra 10 + Or, com crítico
natural, falha crítica, bloqueio dinâmico e buffs de item. Não há um "slot"
onde `reducao_dano_por_or` encaixe. Só o que o tuner produziu em termos de
ATRIBUTOS atravessa, porque atributo é a única unidade que os dois modelos
compartilham.

**Ataque rápido, itens e cura ficam fora da política.** O simulador não os
tem. O motor trata esses casos com as regras autorais dele, e a política
decide o resto.

## Como reexportar

```bash
cd ../ealen-IA
python demo_balanceamento.py                   # se quiser rebalancear as classes
python exportar_para_o_jogo.py --episodios 60000
cd ../ealen
npm run balance:matrix --workspace=server      # confira o que mudou no jogo
```

O artefato é determinístico dado o seed (`--seed`, padrão 1). Se a
`schemaVersion` mudar do outro lado, `shared/iaTuning.ts` ignora o arquivo e
avisa no console em vez de carregar dados que não sabe ler.
