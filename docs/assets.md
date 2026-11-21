# Assets

O formato do que o jogo carrega e o caminho até ele. Vale para modelo feito à mão, no Blender por IA ou gerado.

## O provisório vem primeiro

Toda entidade tem um provisório desenhado por código: cápsula para gente (na cor de cada um, com um cone mostrando
para onde olha), caixa achatada para o Ykuruã, caixa para objeto. O jogo funciona inteiro assim. O modelo entra
por cima quando existir, e se faltar ou quebrar, volta o provisório com um aviso no console.

## Formato

- **GLB** (glTF binário), um arquivo por modelo, em `game/public/assets/<tipo>/<id>.glb`.
- **1 unidade = 1 metro**, Y para cima, frente para +Z.
- **Origem no chão, entre os pés.** Gente com uns 1,7 m; o Ykuruã do tamanho de um barco de carga.
- Low-poly. Textura pequena (até 1024) ou cor por vértice. A câmera é de longe: detalhe não se vê, silhueta sim.
- Personagem tem esqueleto. Peças trocáveis (arma) presas no osso `hand_R`.

## Clipes de animação

Nomes fixos, em inglês, minúsculos. O jogo procura por esses nomes; o que faltar cai no seguinte da lista ou em
movimento feito por código (inclinar, recuar, tombar).

| Clipe | Quando | Se faltar |
|---|---|---|
| `idle` | parado | pose de pé |
| `walk`, `run` | andando | `walk` → deslizar |
| `dodge` | esquiva | `run` acelerado |
| `attack_1`, `attack_2`, `attack_heavy` | golpes | recuo e bote por código |
| `parry`, `block` | defesa | inclinar para trás |
| `cast_loop`, `cast_release` | recitar e soltar | braço erguido por código |
| `hit` | levou golpe | tranco por código |
| `down`, `get_up` | Caído | tombar e levantar por código |
| `die` | morte | tombar por código |
| `submerged`, `surface` | só o Ykuruã | afundar e subir por código |

## O caminho

1. Fonte em `art/` (`.blend`, prompts, referência). O bruto pesado fica fora do git.
2. Exporta com `tools/blender/export.py` (escala, origem, nomes conferidos).
3. `tools/assets-check` confere todo GLB antes do commit.
4. Registra em `content/assets.json` (id → arquivo, escala extra se precisar).

Animação é o gargalo: vale usar biblioteca de animações prontas e reaproveitar o mesmo esqueleto em toda a gente
humana, para que um clipe sirva a todos.

## O nível

- Até ter arte: greybox em `content/levels/<nome>/level.json` (blocos, rampas, água, spawns, gatilhos).
- Com arte: o visual é um GLB; a colisão, a água, os spawns e os gatilhos saem de objetos marcados no Blender
  (`col_*`, `water_*`, `spawn:<id>`, `trigger:<id>`) e viram o mesmo JSON. O jogo nunca lê regra de dentro do GLB.
