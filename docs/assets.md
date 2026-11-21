# Assets

O formato do que o jogo carrega e o caminho até ele. Vale para modelo feito à mão, no Blender por IA ou gerado.

## O provisório vem primeiro

Toda entidade tem um provisório. Gente usa um manequim humano com o esqueleto padrão e as animações de biblioteca,
na cor do papel dela. Objeto é caixa, cilindro ou esfera, com a massa certa. O nível é greybox. O jogo funciona
inteiro assim. O modelo final entra por cima quando existir; se faltar ou quebrar, volta o provisório, com um
aviso no console.

## Formato

- **GLB** (glTF binário), um arquivo por modelo, em `game/public/assets/<tipo>/<id>.glb`.
- **1 unidade = 1 metro**, Y para cima, frente para +Z.
- **Origem no chão, entre os pés** (ou no centro da base, para objeto).
- Low-poly, textura de até 1024 ou cor por vértice.
- A câmera fica perto, nas costas: **o protagonista é o modelo mais visto do jogo**, sobretudo de costas e de lado.
  É nele que a qualidade vale primeiro.

## O esqueleto

- **Toda gente humana usa o mesmo esqueleto humanoide**, com os nomes de osso do padrão das bibliotecas de
  animação. Assim todo clipe serve a todos, e animação nova se faz uma vez.
- A arma ou objeto na mão fica preso no osso `hand_R`. A mão que conjura é a esquerda (`hand_L`), de onde o
  feitiço sai.
- Criatura tem esqueleto próprio e clipes próprios.

## Clipes de animação

Nomes fixos, em inglês e minúsculos. O jogo procura por esses nomes, e o que faltar cai no seguinte da lista.

| Clipe | Quando | Se faltar |
|---|---|---|
| `idle` | parado | a pose de bind |
| `walk_f`, `walk_b`, `walk_l`, `walk_r` | andando, mirando | `walk_f` |
| `run_f` | correndo | `walk_f` acelerado |
| `jump_start`, `jump_loop`, `land` | pulo | `idle` |
| `dodge` | esquiva | `run_f` acelerado |
| `aim_idle` | mirando, parado | `idle` |
| `cast_loop`, `cast_release`, `cast_short` | recitar, soltar, encurtar | braço erguido por código |
| `staff_hit` | Bordão | recuo e bote por código |
| `hit_light`, `hit_heavy` | levou golpe | tranco por código |
| `knockdown`, `get_up` | Caído | tombar por código |
| `die` | morte | tombar por código |

A camada de cima do corpo (mirar, recitar) se mistura por cima da locomoção. A regra decide o tempo; o clipe se
estica para caber (`docs/arquitetura.md`).

## O caminho

1. A fonte fica em `art/` (`.blend`, prompts, referência). O bruto pesado fica fora do git.
2. Exporta-se com `tools/blender/export.py` (escala, origem e nomes conferidos). Pode ser rodado por uma IA
   ligada ao Blender, por MCP ou por linha de comando.
3. `tools/assets-check` confere todo GLB antes do commit.
4. Registra-se em `content/assets.json` (id → arquivo, escala extra se precisar).

## O nível

- Feito no Blender: o greybox com primitivas, depois a arte por cima.
- A colisão, a água, os spawns e os gatilhos saem de objetos marcados (`col_*`, `water_*`, `spawn:<id>`,
  `trigger:<id>`, `prop:<id>`) e viram `content/levels/<nível>/level.json`. A navmesh sai da colisão
  (`tools/navmesh`). O jogo nunca lê regra de dentro do GLB visual.
- As arenas de teste podem ser só `level.json` com caixas e rampas, sem Blender.
