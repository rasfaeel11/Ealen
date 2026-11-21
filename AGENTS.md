# Três na Estrada (título provisório)

Action RPG 3D de navegador, em three.js, passado no mundo da série de Karuã, uns 25 anos antes do Livro 1. Quem
joga é **Endyru** jovem, mago de atração e repulsão; no caminho ele forma o grupo com **Jarupã** e **Xanduí**.

Este arquivo vale para qualquer IA que trabalhe aqui (Claude, Gemini, Antigravity, outras). É curto de propósito:
as regras e o mapa do projeto. O resto mora em `docs/`, e cada doc diz uma coisa só.

> O jogo tático 2D em Phaser (2026-10 a 2026-11) está na tag `tatico-2d`. O AGENTS dele, com o histórico inteiro,
> está em `docs/legado/`. Consulte para saber como uma regra do mundo virou mecânica; não copie a forma.

## 1. O que manda

1. **A gameplay vem primeiro.** O jogo pode ser feio; precisa ser divertido de jogar. Entre arte e sensação de
   jogo (resposta do controle, peso do golpe, leitura do inimigo), ganha a sensação. Todo boneco começa como
   cápsula colorida, e o jogo nunca espera por arte.
2. **O cânone manda no mundo.** A história mora em `../historiav2` (bíblia, fichas, `referencias/`). O jogo
   obedece. Fato novo (nome, lugar, criatura, regra de magia) não se inventa no código: vai como proposta para o
   autor (`docs/decisoes.md`), e só entra depois de aprovado. Tudo o que o jogo mostra vira cânone.
3. **Todo sistema serve a uma cena.** Sistema que nenhuma cena, luta ou lugar do roteiro pede não entra.
4. **A regra é testável sem tela.** A simulação roda em Node, sem three.js nem DOM, e todo comportamento de luta
   tem teste. Ver §4.

## 2. O que o jogo nunca pode fazer (cânone)

- Nenhum rosto do Enganador aparece (Jupimã, Nhambiku, Zimridar ou um novo). A unificação é política humana.
- Mito, árvore, canto e profecia nunca se confirmam nem se desmentem. Nenhum vestígio da singularidade em cena.
- Nenhuma caixa misteriosa nova sem a resposta escrita na bíblia antes.
- **O segredo de Xanduí nunca é dito**: ela não sabe ler e nunca contou. Vive só na forma (ela pede que Endyru
  leia, segura um aviso de cabeça para baixo, repete palavra por palavra).
- Endyru, Jarupã e Xanduí chegam ao Livro 1 inteiros. Marca de mana em Endyru, só a leve, que passa em dias.
- Vethrun, Sem-Ferrugem, dragões de alto nível e o Descendente não aparecem.
- Nome real de pessoa, lugar ou obra, nunca. Criatura de folclore real, também não.
- Nomes humanos seguem `../historiav2/alfabeto.md` (tupi-guarani: sem l, f, z, v nem rr; sílaba termina em
  vogal; lugares em -tyba, -guá, -pe). Demônio, elfo e dragão seguem as listas deles.

Tom: adulto e sombrio, humor só dos personagens, mostrar e não contar. O tema é **respeitar o tempo**: a magia
cobra a pressa, e no jogo a pressa é de Endyru. O mundo, o grupo, a criatura e os atos estão em `docs/historia.md`;
o roteiro cena a cena e a voz de cada um, em `docs/roteiro.md`.

## 3. Os pilares de gameplay

O que torna este action RPG diferente dos outros. Toda mecânica nova se mede por estes cinco.

1. **Atração e repulsão é física.** Endyru puxa e empurra gente, bicho e coisa: contra a parede, na água, um no
   outro, de cima do barranco. O mapa é arma.
2. **A pressa chama o bicho.** Gastar mana demais de uma vez passa do limite: vem a marca (sangue e tremor) e o
   Ykuruã sente e vem. Quem prepara e espera vence; quem aperta tudo se afoga.
3. **Recitar leva tempo.** Magia forte é segurar o botão enquanto o texto sai; apanhar no meio quebra. Magia
   gravada se prepara antes da luta, no descanso, e na luta só se ativa.
4. **Cada espadachim luta de um jeito.** Jarupã (Gryskar) bate primeiro e pesado; Xanduí (Ipojy) nunca dá o
   primeiro golpe, espera o erro e devolve. O jogador lê os dois e joga em volta deles.
5. **Toda ação cai em três faixas**: plena, com custo ou falha (`combate` §2 da história). No action RPG quem
   decide a faixa é o tempo e a posição do jogador, com pouco dado. Ver `docs/combate.md`.

## 4. Arquitetura

Detalhe e motivos em `docs/arquitetura.md`. O resumo que toda IA precisa saber:

```
sim/       A simulação. TypeScript puro: sem three.js, sem DOM, sem window, sem fetch, sem Date.now/Math.random.
           Passo fixo de 60 Hz, RNG com semente. Recebe intenções, devolve estado e eventos. Testada em Node.
game/      O client. three.js (render), input, câmera, áudio, HUD em DOM. Lê o estado da sim e reproduz os
           eventos; nunca decide regra. Vite.
content/   Dados do jogo: bestiário, itens, habilidades, níveis (JSON), história (Ink). Sem código.
tools/     Scripts: Blender → GLB, conferência de assets, simulação em lote (bots que jogam sem tela).
desktop/   Electron (empacota game/ para Steam). Já existe.
art/       Fonte da arte (prompts, .blend). O que o jogo carrega vai para game/public/assets/.
```

As regras que não se quebram:

- **A sim não conhece o render.** `game/` importa `sim/`; `sim/` nunca importa `game/`. O jogo inteiro roda em
  Node sem tela: é assim que bot testa luta, balanço e roteiro.
- **Intenção entra, evento sai.** O input vira intenção (`move`, `aim`, `attack`, `recite`, `dash`...) no tick;
  a sim muda o estado e solta eventos (`hit`, `parried`, `manaBurst`, `died`...). Som, partícula, tremida e
  número na tela saem dos eventos, nunca de dentro da regra.
- **A luta acontece no plano do chão.** A regra é 2D (x, z) com a altura do terreno; o 3D é do render. Colisão
  é círculo contra forma estática, feita na sim, sem motor de física. Física de verdade (Rapier) só se uma cena
  pedir e não couber assim.
- **Câmera fixa de cima, inclinada** (como Diablo ou Hades): sem câmera livre. Simplifica controle, arte e nível.
- **Tudo que é número está em `content/`**, não no código: vida, dano, tempo de recarga, janela do aparar. Assim
  se ajusta a luta sem mexer em regra, e com o painel de ajuste aberto no jogo (`F1`, só no dev).
- **Asset é GLB.** 1 unidade = 1 metro, Y para cima, origem no pé, clipes de animação com os nomes de
  `docs/assets.md`. Asset que falta cai no provisório (cápsula, caixa), nunca quebra o jogo.
- **Save é JSON com versão** e migração a cada versão nova.
- Sem servidor no caminho do jogo. O alvo é navegador e Electron/Steam.

O que vem do jogo 2D (a história em Ink e o runner, o save, a bolsa, as fichas, mana e Fôlego) muda para `sim/`
e `content/` aos poucos, pelas tarefas. Até lá `client/` e `shared/` são legado: não se cresce neles.

## 5. Como trabalhar aqui

- **Tarefas** em `docs/tarefas.md`: uma por vez, com o critério de pronto escrito. Terminou, tire da lista e
  ponha uma linha em `docs/historico.md` dizendo o que entrou. **Toda tarefa terminada é um commit. O push é do
  autor.**
- **Decisões** em `docs/decisoes.md`: uma entrada por decisão (data, o que, por quê, quem decidiu). Decisão que
  toca o cânone espera o autor.
- **Antes do commit**: `npm run check` (tipos e testes) passa. Mudou regra de luta, rode também a simulação em
  lote e diga no histórico o que mudou nos números.
- **Mudou uma peça, muda o doc dela.** Cada doc de `docs/` é dono de um assunto; não duplique texto entre eles.
- Nome no código em inglês; texto do jogo e docs em português. Termo do mundo (Fôlego, Ipojy, Recitar) fica em
  português também no código quando não tem tradução boa (`folego`, `recite`).
- Diga o que foi visto e o que não foi. "Testado na sim, não visto na tela" é uma frase válida e obrigatória.

### Mapa dos docs

| Doc | O que tem |
|---|---|
| `docs/arquitetura.md` | As pastas, o laço da sim, intenções e eventos, o render, os motivos |
| `docs/combate.md` | A luta do action RPG: controles, faixas, verbos, escolas, magia, o Ykuruã |
| `docs/historia.md` | O mundo do jogo, o grupo, a criatura, os três atos (resumo do cânone) |
| `docs/roteiro.md` | O roteiro cena a cena e o guia de falas |
| `docs/mundo.md` | O mapa do mundo, na descrição do autor |
| `docs/assets.md` | Formato, escala, nomes de clipes, o caminho Blender → jogo, o provisório |
| `docs/arte.md` | Direção de arte, brasões, paleta (parte é do 2D e vai sendo revista) |
| `docs/escolhas.md` | Decisões do co-autor sobre o cânone, do tempo do 2D (continuam valendo) |
| `docs/decisoes.md` | Registro de decisões daqui em diante |
| `docs/tarefas.md` | A lista de tarefas |
| `docs/historico.md` | O que entrou, tarefa por tarefa |

## 6. Várias IAs no projeto

- Este arquivo é a porta de entrada de todas. `CLAUDE.md` e `GEMINI.md` só o importam.
- Leia só o doc do assunto da tarefa, não `docs/` inteiro.
- **Texto do jogo e fato do mundo** (fala, nome, descrição) só com o cânone aberto do lado, e vai para o autor
  antes de entrar. IA nenhuma inventa mundo sozinha.
- Código vindo de outra IA é rascunho até passar em `npm run check` e ser lido por quem faz o commit.
- O Antigravity (`agy`, pelo subagente `antigravity-delegate`) serve para ler muito material, gerar boilerplate,
  testes repetitivos e imagens (`art/`). Não para arquitetura, bug sutil ou revisão final. Nunca mande segredo.
- Ao fim de uma tarefa, diga o que foi delegado a outra IA e o que foi corrigido.
