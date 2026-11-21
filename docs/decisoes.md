# Decisões

Uma entrada por decisão, da mais nova para a mais velha: data, o que, por quê, quem. Decisão que toca o cânone
espera o autor e diz isso. As decisões do tempo do jogo 2D estão em `docs/escolhas.md` e em
`docs/legado/AGENTS-tatico-2d.md`.

## 2026-11-20 — Atração e repulsão para o protagonista (co-autor, espera o autor)

O conceito de magia do protagonista novo é atração e repulsão. Os motivos estão em `docs/historia.md` §3. Toda a
luta de `docs/combate.md` supõe isso; se o autor escolher outro conceito, o combate se refaz antes da tarefa 5.

## 2026-11-20 — A Camada 1 no jogo de ação (co-autor, espera o autor)

As três faixas ficam, decididas pela recitação (inteira e no tamanho padrão; encurtada ou fora do padrão;
quebrada) em vez do dado. O dado fica só no improvável. As escolas viram jeitos de lutar dos inimigos (a Tsvirana
pune quem repete). Detalhe em `docs/combate.md`. Toca a decisão do autor de 2026-11-05 (livro e jogo na mesma
Camada 1): a regra é a mesma, e muda quem decide a faixa.

## 2026-11-20 — A arquitetura do jogo em terceira pessoa (co-autor)

Detalhe em `docs/arquitetura.md`. Substitui a da entrada de baixo, que era de câmera de cima.

- **Simulação pura em passo fixo**, separada do render, determinística na mesma plataforma, testável em Node.
- **Rapier (física) dentro da sim**: a magia é física, então a física é regra.
- **Controlador cinemático** para o personagem e para os inimigos; corpo dinâmico enquanto voa.
- **Navmesh** (recast) gerada do nível no build.
- **Câmera no ombro no client**, com colisão e troca de ombro; a mira vai para a sim como raio.
- **Animação como enfeite**, sem root motion: a regra decide o tempo.
- **Esqueleto humanoide único** para toda a gente, com animação de biblioteca no provisório.
- **Blender** como editor de nível e de modelo; a regra do nível sai de objetos marcados para JSON.
- **Números em `content/`**, painel de ajuste no dev; **UI em DOM** (Preact); **GLB** como formato único.

## 2026-11-20 — Terceira pessoa, magia mirada, sozinho, história nova (autor)

O jogo é 3D de verdade, com a câmera no ombro, como um shooter em terceira pessoa. A luta principal é magia
mirada. Joga-se sozinho, sem companheiros. O mundo da série de Karuã fica e a história é nova. Isso substitui a
ideia de action RPG de câmera de cima com o trio (a entrada de baixo), que fica só como registro.

## 2026-11-20 — Sair do jogo tático 2D (autor)

O jogo tático 2D não estava engajando, nem na cara nem na gameplay. A gameplay vem antes da arte: pode ser feio,
mas tem de divertir. Sem protótipo descartável: o jogo novo começa na arquitetura final, no mesmo repositório, na
branch `acao-3d`. O jogo 2D fica na tag `tatico-2d`.

*Superado no mesmo dia:* a primeira versão (action RPG de câmera fixa de cima, regra no plano do chão, Endyru com
Jarupã e Xanduí pela IA) foi trocada pela entrada de cima.
