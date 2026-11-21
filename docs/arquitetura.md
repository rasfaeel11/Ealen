# Arquitetura

Como o jogo é montado e por quê. Mudou uma peça daqui, muda este doc.

## As pastas

| Pasta | Pacote | Depende de | Roda em |
|---|---|---|---|
| `sim/` | `@jogo/sim` | `content/` (dados), `inkjs` | Node e navegador |
| `game/` | `@jogo/game` | `sim/`, `three`, `preact` | navegador, Electron |
| `content/` | — (só dados) | nada | é lido pelos dois |
| `tools/` | — | `sim/`, Blender (por linha de comando) | Node |
| `desktop/` | `@jogo/desktop` | o build de `game/` | Electron |

`client/` e `shared/` são do jogo 2D e ficam até a história e o save passarem para cá; depois saem.

## A simulação (`sim/`)

### O laço

- **Passo fixo de 60 Hz** (`TICK = 1/60`). Cada tick recebe as intenções daquele tick e avança o mundo.
- O tempo é contado em ticks, nunca em segundos de relógio. Duração em `content/` vem em segundos e a sim
  converte na carga.
- **Determinística**: RNG com semente (`sim/rng.ts`), sem `Math.random`, sem `Date.now`. Mesma semente e mesmas
  intenções dão o mesmo jogo. É o que permite repetir uma luta, reproduzir um bug e rodar bot em lote.

```ts
// a forma, não o código final
const world = createWorld(level, content, seed);
const events = step(world, intents);   // um tick
```

### Estado

- Entidades são objetos simples num array (`world.entities`), com componentes opcionais (`body`, `health`,
  `folego`, `mana`, `brain`, `weapon`...). Sistemas são funções que passam pelas entidades na ordem fixa do
  tick: intenção → IA → movimento → colisão → ataques → condições → morte → gatilhos.
- Sem biblioteca de ECS: o jogo é pequeno e a forma simples se lê melhor por qualquer IA.
- O estado é serializável (JSON): o save é um retrato do mundo fora de luta, e um teste pode montar um estado
  na mão.

### Intenções (entram)

Do jogador ou da IA, sempre a mesma forma: `move {x,z}`, `aim {x,z}`, `attack`, `heavy`, `recite {spell}`
(segurar) e `release`, `dash`, `parry`, `use {item}`, `interact`, `command {companion, order}`. A IA dos inimigos
e dos companheiros gera intenções como o jogador: não tem atalho na regra.

### Eventos (saem)

O que aconteceu naquele tick, em ordem: `hit`, `blocked`, `parried`, `countered`, `pulled`, `pushed`,
`slammed`, `fell`, `recitationStarted`, `recitationBroken`, `spellCast`, `manaBurst`, `conditionApplied`,
`died`, `triggerEntered`, `cue`... Cada evento tem a faixa (`plena`, `custo`, `falha`) quando houver.

### Colisão e terreno

- A regra é **2D no plano do chão** (x, z) mais a altura do terreno. Corpo é círculo; parede, pedra e casa são
  polígonos estáticos; água é área no chão com profundidade.
- A altura vem de uma grade de alturas do nível. Degrau acima de 0,5 m barra o passo (pula-se com o `dash`
  quando der); queda de barranco machuca.
- Empurrão e puxão são velocidade com atrito. Bater em parede, corpo ou destrutível com velocidade causa dano e
  deixa Prensado. Cair na água funda tira do chão.
- Sem motor de física. Se uma cena pedir coisa que rola, empilha e quebra de verdade, avalia-se Rapier (roda em
  Node também) e registra-se em `docs/decisoes.md`.

## O client (`game/`)

- **Render em three.js.** A cena reflete o estado da sim; entre dois ticks, posição e rotação são interpoladas.
- **Câmera fixa**, inclinada uns 50°, seguindo Endyru com um pouco de antecipação para onde ele mira. Sem
  rotação livre. Paredes entre a câmera e o grupo ficam transparentes.
- **Input**: teclado e mouse (WASD anda, o mouse mira) e controle. O input vira intenção; o client não sabe
  regra nenhuma.
- **Juice sai dos eventos**: parada curta no golpe (hit-stop), tremida, número de dano, partícula, som. Cada
  evento tem a resposta dele em `game/feedback/`. É aqui que mora boa parte da diversão: um golpe sem peso não se
  salva com modelo bonito.
- **HUD e menus em DOM** (Preact) por cima do canvas: mais fácil de fazer, de ler por IA, de traduzir e de tornar
  acessível do que UI desenhada no WebGL.
- **Áudio** pelo WebAudio. Som sintetizado até ter o gravado; a troca é num lugar só.
- **Painel de ajuste** (`F1`, só no dev): mexe nos números de `content/` com o jogo rodando.

## Conteúdo (`content/`)

- JSON validado na carga (o esquema mora em `sim/content/`), com erro claro se faltar campo.
- `content/story/*.ink`: a história, compilada para JSON no build, como no 2D.
- `content/levels/<nome>/`: o nível. Enquanto não tem arte, é greybox descrito em JSON (blocos, rampas, água,
  pontos de spawn, gatilhos), que o client desenha com caixas. Quando tiver arte, o visual vem de um GLB e a
  parte de jogo (colisão, spawn, gatilho) continua no JSON, gerada a partir de objetos marcados no Blender.

## Ferramentas (`tools/`)

- `tools/sim-lote`: roda N lutas com bots dos dois lados, em Node, e imprime taxa de vitória, tempo de luta, dano
  tomado. Toda mudança de número de luta passa por aqui.
- `tools/blender`: scripts Python que exportam GLB no padrão de `docs/assets.md` e extraem os marcadores do nível.
- `tools/assets-check`: confere escala, origem e nomes de clipes de todo GLB.

## Testes

- `npm run check` na raiz: tipos de todos os pacotes e testes da sim (`tsx --test`, como no 2D).
- Teste de luta é cenário: monta o mundo, manda intenções por N ticks, confere eventos e estado.
- O teste do roteiro joga a história inteira na sim, sem tela, do primeiro gatilho ao fim.

## Por quê

- **Sim separada do render**: o jogo 2D já provou que regra pura com eventos aguenta trocar a tela inteira. Agora
  ela também é o que deixa bot testar a diversão (tempo de luta, dano) sem ninguém jogar.
- **Plano do chão em vez de 3D completo**: quase todo action RPG de câmera de cima faz assim. Corta pela metade o
  trabalho de colisão, IA e nível, e não se vê diferença na tela.
- **Câmera fixa**: a arte pode ser simples (vista de longe, de cima), o controle é direto e o nível não precisa
  ser bonito de todo ângulo.
- **Números em `content/`**: a diversão se acha ajustando. Ajuste sem recompilar e sem tocar em regra.
- **DOM para UI**: three.js não tem UI; fazer UI no WebGL é caro e ruim de manter.
