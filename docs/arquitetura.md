# Arquitetura

Como o jogo é montado e por quê. Quem mudar uma peça daqui muda este doc também.

## As pastas

| Pasta | Pacote | Depende de | Roda em |
|---|---|---|---|
| `sim/` | `@jogo/sim` | Rapier, `inkjs`, os dados de `content/` | Node e navegador |
| `game/` | `@jogo/game` | `sim/`, `three`, `preact` | navegador, Electron |
| `content/` | (só dados) | nada | lido pelos dois |
| `tools/` | (scripts) | `sim/`, Blender por linha de comando, recast | Node |
| `desktop/` | `@jogo/desktop` | o build de `game/` | Electron |

`client/` e `shared/` são do jogo 2D. Ficam até o runner de Ink e o save passarem para cá, e depois saem.

## A simulação (`sim/`)

### O laço

- **Passo fixo de 60 Hz** (`TICK = 1/60`). Cada tick recebe as intenções daquele tick, roda a regra e dá um passo
  na física.
- O tempo se conta em ticks, nunca em segundos de relógio. As durações em `content/` vêm em segundos, e a sim
  converte na carga.
- **Determinística na mesma plataforma**: RNG com semente (`sim/rng.ts`), sem `Math.random` e sem `Date.now`.
  Com a mesma semente e as mesmas intenções, o jogo sai igual. É o que deixa repetir uma luta, reproduzir um bug
  e rodar bot em lote.

```ts
// a forma, não o código final
const world = await createWorld(level, content, seed);
const events = step(world, intents);   // um tick
```

### Estado

- As entidades são objetos simples (`world.entities`) com componentes opcionais (`body`, `health`, `mana`,
  `folego`, `caster`, `brain`, `prop`...). Os sistemas são funções que rodam numa ordem fixa a cada tick:
  intenção → IA → controlador → feitiços → física → colisões e dano → condições → morte → gatilhos.
- Sem biblioteca de ECS: o jogo é pequeno, e a forma simples se lê melhor por qualquer IA.
- O estado lógico é serializável (JSON). O save é um retrato dele fora de luta, e o mundo físico se monta de novo
  a partir dele.

### A física (Rapier)

- `@dimforge/rapier3d-compat` (WASM embutido, roda em Node e no navegador). Ela vive só dentro da sim.
- **Personagem**: cápsula com o controlador cinemático do Rapier (subir degrau, rampa, grudar no chão, pular).
- **Inimigos**: cápsulas cinemáticas que andam pela navmesh; viram corpo dinâmico enquanto voam (puxados,
  arremessados) e voltam a cinemático quando param.
- **Objetos**: corpos dinâmicos com massa. A massa decide quanto o feitiço move e quanto o golpe machuca.
- **Nível**: colisores estáticos gerados dos objetos `col_*` do Blender (ou de primitivas, no greybox).
- **Dano por impacto**: dois corpos que batem acima de uma velocidade se machucam pela energia do choque. É o que
  torna o cenário munição.
- A mira é um raycast na sim, a partir da origem e da direção que o client manda.

### A IA e a navmesh

- A navmesh sai do nível no build (`tools/navmesh`, recast-navigation em WASM) e fica em `content/levels/<nível>/`.
- A IA gera intenções, como o jogador, e não tem atalho na regra. Ela pede caminho à navmesh e enxerga por
  raycast.

### Intenções (entram)

`move {x, z}` (relativo à câmera, já convertido), `aim {origem, direção}`, `recite {feitiço}` (segurar),
`release`, `cancel`, `jump`, `dodge`, `activate` (gravada), `interact`, `use {item}`.

### Eventos (saem)

O que aconteceu no tick, em ordem: `recitationStarted`, `recitationLine`, `recitationBroken`, `spellCast`
(com tamanho e faixa), `pulled`, `pushed`, `thrown`, `impact` (com energia), `hit`, `deflected`, `manaSpent`,
`manaBurst`, `conditionApplied`, `died`, `triggerEntered`, `cue`...

## O client (`game/`)

- **Render em three.js.** A cena reflete o estado da sim, com posição e rotação interpoladas entre dois ticks.
- **Câmera no ombro.** Braço de mola atrás do ombro direito, com colisão (raycast do personagem até a câmera: a
  parede puxa a câmera para perto em vez de atravessar). Troca de ombro numa tecla. Ao mirar, o zoom aproxima e
  o personagem passa a encarar a mira. O mouse fica preso (pointer lock).
- **A mira**: a mira no meio da tela é um raio a partir da câmera. O client manda origem e direção; a sim acha o
  ponto e faz o feitiço sair da mão até ele (o jeito de todo shooter em terceira pessoa).
- **Animação**: `AnimationMixer` do three.js. Locomoção em oito direções misturada pela velocidade (o personagem
  anda de lado mirando), camada de cima do corpo para mirar e recitar, inclinação pela altura da mira. O tempo do
  clipe se estica para caber no tempo da regra.
- **Juice sai dos eventos**: parada curta no impacto, tremida, distorção da recitação, partícula, som. Cada evento
  tem a resposta dele em `game/feedback/`. É aqui que mora boa parte da diversão.
- **HUD e menus em DOM** (Preact) por cima do canvas: mira, mana, vida, a recitação, o tamanho do feitiço.
- **Áudio** no WebAudio, posicional, com som sintetizado até ter o gravado; a troca fica num lugar só.
- **Painel de ajuste** (`F1`, só no dev): mexe nos números de `content/` com o jogo rodando.
- **Desempenho**: WebGL2, 60 fps num notebook médio. Low-poly, poucas luzes com sombra, instancing no que se
  repete, nada de pós-processamento caro.

## Conteúdo (`content/`)

- JSON validado na carga (o esquema mora em `sim/content/`), com erro claro se faltar campo.
- `content/spells/`, `content/enemies/`, `content/items/`, `content/tuning.json`.
- `content/story/*.ink`: a história, compilada para JSON no build.
- `content/levels/<nível>/`: `level.json` (spawns, gatilhos, água, áreas, com a referência ao GLB), `navmesh.bin`,
  e o GLB visual em `game/public/assets/levels/`. O greybox é feito no Blender com primitivas, ou descrito à mão
  em `level.json` (caixas e rampas) para as arenas de teste.

## Ferramentas (`tools/`)

- `tools/bots`: roda N lutas com um bot no lugar do jogador, em Node, e imprime vitória, tempo, dano tomado,
  mana gasta, marcas. Toda mudança de número de luta passa por aqui.
- `tools/blender`: Python que exporta GLB no padrão de `docs/assets.md` e extrai os marcadores do nível.
- `tools/navmesh`: gera a navmesh de cada nível.
- `tools/assets-check`: confere escala, origem, esqueleto e nomes de clipes de todo GLB.

## Testes

- `npm run check` na raiz: tipos de todos os pacotes e testes da sim (`tsx --test`, como no 2D).
- Teste de jogo é cenário: monta o mundo, manda intenções por N ticks, confere eventos e estado.
- O teste da história joga a história inteira na sim, sem tela.

## Por quê

- **Sim separada do render**: o jogo 2D provou que regra pura com eventos aguenta trocar a tela inteira. Aqui ela
  também é o que deixa bot testar a diversão sem ninguém jogar, e o que deixa várias IAs mexerem na regra com
  teste, sem abrir o navegador.
- **Rapier dentro da sim**: num jogo em que a magia é física, a física é regra, não enfeite. Por isso ela fica do
  lado da regra, testável em Node.
- **Animação sem root motion**: com animação provisória ou feita por IA, o tempo do golpe não pode depender do
  clipe. A regra manda, e o clipe se ajusta.
- **Câmera no client**: ela não muda regra nenhuma; a sim só recebe o raio da mira.
- **Números em `content/`**: a diversão se acha ajustando. Ajuste sem recompilar e sem tocar em regra.
- **DOM para a UI**: o three.js não tem UI, e UI desenhada no WebGL é cara e ruim de manter.
