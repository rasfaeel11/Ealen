# Tarefas

Uma por vez, na ordem. Ao terminar, a tarefa sai daqui, entra uma linha em `docs/historico.md`, e vira commit. O
critério de pronto é o que se testa ou se vê; "visto na tela" quer dizer jogado no navegador.

A ordem segue o primeiro pilar: **o brinquedo antes de tudo**. Andar, mirar e jogar coisas com magia precisa ser
gostoso numa sala cinza antes de existir história, menu ou arte.

## Em paralelo: a história (autor)

| # | Tarefa | Pronto quando |
|---|---|---|
| H1 | **A história nova.** Responder às perguntas de `docs/historia.md` §1. O co-autor pode trazer propostas, e o autor escolhe e grava os fatos no cânone. | `docs/historia.md` tem o resumo aprovado |
| H2 | **O roteiro.** Cena a cena, com os níveis e as lutas, em `docs/roteiro.md`. | O autor aprovou |

## Marco 1 — O brinquedo

Uma sala greybox com caixas, barris, uma beirada e água, e bonecos de treino. Sem história e sem menu.

| # | Tarefa | Pronto quando |
|---|---|---|
| 1 | **Os pacotes.** Workspaces `sim/`, `game/`, `content/`; `npm run check` na raiz (tipos e testes); `npm run dev` abre `game/`. | `npm run check` passa; a página abre com uma cena vazia do three.js |
| 2 | **O laço da sim.** Tick fixo, RNG com semente, Rapier carregado na sim, mundo e entidades, sala de teste em `level.json`. | Testes em Node: o mundo sobe, dá passos, e a mesma semente dá o mesmo resultado |
| 3 | **Andar.** Controlador cinemático (rampa, degrau, pulo, queda), intenções `move` e `jump`, esquiva com Fôlego. | Testes: sobe rampa, para na parede, pula o degrau baixo |
| 4 | **A câmera no ombro.** Render da sala, manequim com esqueleto e animações de biblioteca (andar em oito direções), câmera com mola e colisão, troca de ombro, mira com zoom, pointer lock, interpolação. | Visto na tela: anda e mira liso a 60 fps, e a câmera não atravessa parede |
| 5 | **Puxão e Empurrão.** A mira vira raio na sim; feitiço com alcance, massa e impulso; dano por impacto; os objetos da sala voam. Encurtado por enquanto (toque), sem recitação. | Testes de impulso e impacto; visto: jogar caixa no boneco é divertido |
| 6 | **O peso.** Parada no impacto, tremida, partícula, som, número; painel de ajuste (`F1`) com os números de `content/`. | Visto: cada impacto se sente; os números mudam com o jogo rodando |
| 7 | **Recitar.** O cântico linha por linha (saudações, corpos, medida, rimas), o alvo que trava nos corpos, o anel do tamanho, as três faixas, o encurtado, a quebra ao apanhar. | Testes das três faixas e do tamanho; visto: recitar inteiro vale a pena, e encurtar tenta |
| 8 | **Mana e a marca.** Mana, limite por janela, `manaBurst`, sangue e tremor na mira. | Testes do limite; visto: dá para sentir quando se passou |

## Marco 2 — Quem luta de volta

| # | Tarefa | Pronto quando |
|---|---|---|
| 9 | **Navmesh e a primeira IA.** `tools/navmesh`; um espadachim que persegue, ameaça, avisa o golpe e bate; Caído e Prensado. | Visto: dá para ler o golpe e fugir; teste da perseguição |
| 10 | **As três escolas.** Gryskar avança, Ipojy espera e contragolpeia, Tsvirana troca e pune quem repete. | Testes de cada uma; visto: cada uma pede um jeito diferente |
| 11 | **Besteiro, Desviar e Arremesso.** Projétil, cobertura, Desviar, Arremesso, Desarmar, Puxar-se. | Visto: uma sala com três inimigos se resolve de jeitos diferentes |
| 12 | **Os bots.** `tools/bots`: um bot joga a sala N vezes e imprime vitória, tempo, dano, mana, marcas. | Roda 200 lutas e imprime a tabela |
| 13 | **A gravada.** Ponto de descanso, escrever o círculo, ativar na luta. | Visto: preparar a sala muda a luta |

## Marco 3 — O jogo

Depende da história (H1, H2).

| # | Tarefa | Pronto quando |
|---|---|---|
| 14 | **A história no motor.** O runner de Ink do 2D passa para `sim/`; diálogo em DOM; gatilhos no nível. | O teste da história joga tudo na sim |
| 15 | **Os níveis em greybox.** Os lugares do roteiro, com as lutas e a gente. | Dá para jogar do começo ao fim, feio |
| 16 | **O que todo jogo tem.** Save com versão, itens, progressão de nível de mago, menus, opções. | Testes; o save continua depois de fechar |
| 17 | **Electron.** `desktop/` passa a empacotar `game/`. | O app abre e salva |
| 18 | **O legado sai.** Saem `client/` e `shared/`. | Nada importa deles; `npm run check` passa |

## Marco 4 — A cara

| # | Tarefa | Pronto quando |
|---|---|---|
| 19 | **O caminho do Blender.** `tools/blender/export.py`, `tools/assets-check`, `content/assets.json`. | Um GLB de teste entra pelo caminho e passa na conferência |
| 20 | **O protagonista.** O modelo mais visto do jogo, no esqueleto comum. | Visto na tela no lugar do manequim |
| 21 | **A gente, o cenário e o som.** O resto do elenco, os níveis com arte, som gravado. | — |
