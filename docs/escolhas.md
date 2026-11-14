# O que eu decidi no seu lugar

Em 2026-11-04 você pediu que eu fizesse as tasks que esperavam por você, decidindo sozinho, e
listasse aqui as escolhas. Cada uma tem o porquê e o que mudar se você não gostar. Nada disto foi
gravado no repositório da história: se aprovar, é você quem passa pra lá (§1 do AGENTS.md).

## 89. Como o grau da escola vale e como sobe

**O que decidi**
- O grau **não sobe na árvore**. No cânone, o grau é o quanto se domina a escola, e quem o limita é a
  aura (`magia` §5.6). Jarupã e Xanduí já sabem a escola no grau 3, e o Fio os corta no 2 até o Corpo
  (`aura_rise`). O grau 4 traria o golpe-selo, que só vem por iniciação de mestre, e ninguém inicia o
  trio. Pôr um nó "Gryskar III → IV" na árvore seria dar golpe-selo por ponto de nível, e isso
  contradiz o cânone.
- O grau **rende no traço da escola**, não na força bruta:
  - vantagem no triângulo: +2 de acerto como antes, e mais 1 por grau acima do 2 (grau 3: +3). A
    desvantagem continua -2;
  - Onda (Gryskar): acumula até o grau mais 1 golpes seguidos (grau 3: 4, igual ao de antes);
  - Rachadura (Tsvirana): multiplica por 1,5 mais um quarto por grau (grau 2: o dobro, como antes;
    grau 3: 2,25);
  - Contragolpe (Ipojy): não cresce. A Espera rende pela vantagem sobre o Gryskar.

**Por quê**: assim, o Corpo de Jarupã e Xanduí na ponte passa a valer na luta (o grau sai de 2 pra
3), sem inventar técnica nova.

**Pra mudar**: os números estão em `momentumCap`, `crackFactor` e `styleEdgeBonus`
(`shared/tactics/styles.ts`).

## 87. Os nomes da árvore, a loja e as missões

**O que decidi**
- Os 20 nós ficam com o nome e a fala provisórios. Li um por um contra o tom (§1.2) e o cânone, e
  nenhum inventa técnica nem fato: são o costume de cada um ("Pé de Convés", "Cabo Escorregadio",
  "Página Certa").
- Uma troca: o **Fôlego de Biblioteca** dava Fôlego a Endyru, que não gasta Fôlego em nada. Virou
  **Anos de Biblioteca**: +2 de mana máxima, com a fala "Anos lendo em voz alta pra sala vazia. O
  texto dura mais que a voz." Quem já tinha o nó velho ganha o ponto de volta.
- **Sem ramo da Tsvirana**: ninguém do grupo é dela, e sistema que nenhuma cena pede não entra.
- **A Cura não ganha ramo próprio**: ela já mora no Preparo (Leitura Sem Pressa), que é o ramo do tema.
- A banca continua com **6 pães e 4 unguentos**, e compra de volta pela metade.
- O texto das três missões fica como está: sai só do que já se diz no roteiro.

**Pra mudar**: os nós estão em `shared/skillTree.ts`, e a banca em `shared/shop.ts`.

## 57. Pote de óleo, besteiro que vigia, e o virote que não entra

**O que decidi**
- **O item que se joga é o Pote de Óleo**: o óleo de lampião do armazém da guilda (os barris que
  Endyru lê na cena: "Óleo de lampião. Doze medidas."). Quebra em cima do inimigo sem rolagem, 1d4,
  e o quadrado pega fogo por 2 rodadas. Na água não pega, então não serve contra o Ykuruã submerso:
  é pra gente, não pro bicho, e o tema continua (o bicho se vence tirando da água).
- **De onde vem**: o mestre da guilda dá dois depois do armazém. Falas novas:
  - narração: "Jarupã volta do armazém com dois potes de óleo debaixo do braço, um de cada lado."
  - Mestre da guilda: "Óleo eu tenho. Barco pra levar, não. Leva."
  Essa é a única fala nova; o comércio parado já é o assunto da cidade.
- **O besteiro do pedágio vigia**, com o nome "Mira na Corrente": quem chega perto do guincho leva o
  virote antes. É o único do mundo que vigia.
- **O virote como item não entra**: ninguém do grupo usa besta, e sistema que nenhuma cena pede não
  entra (cabeçalho do AGENTS.md). Se um dia alguém do grupo pegar uma besta, entra aí.

**Pra mudar**: o pote está em `shared/data/items.ts`, a fala em `client/story/ybytugua.ink`
(`saqueadores_caem`), o besteiro em `shared/data/bestiary.ts`.

## 59. Os itens-chave

**O que decidi**
- Viraram itens que não se usam, não se passam e não se jogam fora:
  - **Estaca dos Baixios**: "Um pedaço de estaca do comprimento de um braço, tirado do lodo dos
    baixios. Na cabeça, ferro batido com letras cavadas: Ymboripe. Na madeira, um círculo de atração
    riscado a faca, torto e aberto." Fica na mochila até o fim (a conselheira não a quer: "precisa de
    mais que um pau").
  - **Carta ao Senhor de Ymboripe**: "Tirada do gibão de Mbyraku, com a dobra gasta de quem já leu
    muitas vezes. Três conselheiros de Ybytuguá escrevem ao senhor de Ymboripe: se o rio continuar
    fechado até a lua cheia, levam os termos do duque ao conselho. Três nomes embaixo." Sai da
    mochila quando a conselheira põe a palma da mão em cima.
  - **Cópia Selada do Contrato**: "O edital da cheia copiado numa folha estreita pelo escrivão da
    Mesa, com o selo de cera embaixo. Cópia selada, a família recebe a parte. Dobrada em quatro, e
    nunca desdobrada." O "nunca desdobrada" é a ironia pra quem sabe do segredo de Xanduí, sem dizer.
- Tudo sai do que as cenas já dizem; nenhum fato novo.
- Item-chave sempre cabe, mesmo com a mochila cheia.
- **Sem limite por peso**: a mochila de 12 lugares e o cinto de 3 já apertam, e nenhuma cena pede
  carga. Materiais ficam pra quando houver preparo (task 72).

**Pra mudar**: os textos estão em `shared/data/items.ts`.

## 95. Condições, resistência e o relógio

**O que decidi**
- **O Ykuruã**: a Bocada (boca larga, cheia de concha) deixa **Sangrando** por 2 turnos; a Investida
  (um bicho do tamanho de um barco de carga) deixa **Abalado** por 1; o couro de casca de árvore
  **resiste à pancada** (metade do dano de impacto: o bordão de Endyru e o pote). Corte e ponta entram
  normal, porque o jogo ensina que a espada entra quando o couro racha.
- Testei a Investida com **Atordoado** (perde a vez) e tirei: o espadachim sozinho contra o bicho caía
  de 18% pra 8% de vitória. Com Abalado, ficou nos 18%.
- **Mbyraku**: o Fechar a Corrente deixa **Preso** por 1 turno. O golpe de quem vive de parar o que desce.
- **Fica sem uso**: Envenenado (ninguém no mundo do jogo envenena arma; o tom é cruel, mas veneno pede
  uma cena), Calado, Com medo, Cego. Ficam prontos no motor.
- **O relógio não muda**: a deixa `clock N` (luta que acaba quando a Cheia chega) e o custo por área
  ficam sem uso. A Cheia já cobra o descanso e a luta; cobrar por andar castigaria explorar, e o tema
  é a pressa, não o passo.

**Pra mudar**: os `riders` e o `resist` estão em `shared/data/bestiary.ts`.

## 60. Mais lojas e o Thrykar

**O que decidi**
- **Thrykar não vende nada.** A placa dele diz "Conserta o que você estragou", ele tempera as duas
  espadas e é isso. O Gravado é trabalho de mago no cânone (espadachim usa equipamento feito por mago),
  então um ferreiro demônio vendendo Gravado contradiria `magia` §5.4.
- **Nenhuma loja nova.** O dinheiro do trio é curto de propósito (o calote do mercador, a prata do
  adiantamento indo pro ferreiro), e a banca do cais basta pro que se gasta: pão e unguento.

**Pra mudar**: lojas novas são uma entrada em `SHOPS` (`shared/shop.ts`) e um `shop("id")` no Ink.

## 52 e 53. Passagens fechadas e bordas do mapa

**O que decidi**
- **Ninguém barra as estradas**: em vez de um guarda novo (gente nova é nome ou papel novo), quem
  fala é o próprio grupo, e a razão é o contrato. Falas novas:
  - Ymonhã, estrada pra oeste, na abertura: "A estrada de terra segue a margem rumo oeste, até sumir
    entre as árvores." / Oryndu: "Por terra, até Ybytuguá, é mato e mais mato. Pelo rio, meio dia."
  - Ybytuguá, estrada do norte, antes do ato 2: "A estrada do norte sai da cidade e entra na floresta
    entre as bacias." Antes do contrato, Jarupã: "Floresta não paga escolta." Depois, Xanduí: "O bicho
    é pra leste, estudante. Contrato é contrato."
  - Floresta, a trilha do barranco depois da ponte: "Do alto do barranco, a trilha segue a margem rio
    acima, pro lado de Ymboripe. Na lama, pegadas de passo comprido." Jarupã (depois da ponte): "Corre
    bem, pra quem lê sentado." Xanduí: "Rio acima é o duque. O contrato é rio abaixo."
- **A clareira a nordeste** deixa de ser vazia: depois dos batedores, o acampamento deles. "Três
  mantas enroladas, uma panela de ferro e um saco com dois pães duros." Jarupã: "Pão de quem não
  volta." Xanduí: "Pão é pão." O grupo leva um Pão de Viagem. Não pus selo de Ymboripe na bolsa: a
  Contratada diz que "o papel não dizia pra quem", e na dúvida mostra-se menos.
- **As bordas**: árvore em toda borda que se alcança. A borda leste dos baixios, que era água rasa
  até a beira do mapa, virou o canal fundo, e o fundo agora se vê (escuro, com espuma onde o raso cai).

**Pra mudar**: as falas estão em `ymonha.ink`, `ybytugua.ink` e `floresta.ink`; os mapas mudaram por
script, e o cenário sai de `python art/pintar_cenario.py`.

## 13, 15, 92 e parte da 63. O que fica de fora

- **13. Bichos da floresta: não.** O Ykuruã é a primeira criatura do bestiário do mundo, e criatura
  nova é cânone que os livros vão ter de respeitar. A floresta já tem quem lutar: a patrulha e o vau
  de Ymboripe, os batedores, a ponte. Na dúvida, mostre menos.
- **15. Os mapas ficam como estão.** Só mexi nas bordas (52 e 53).
- **92. Modo de luta por pessoa: não.** O manual e o automático à vista bastam pra três pessoas.
- **63. Empurrar, derrubar e agarrar não viram verbo de todo mundo.** A Ombrada é de Jarupã e o
  Segurar o Bote é de Xanduí; se todo mundo empurra e agarra, os dons deixam de ser deles. O resto da
  63 (esconder-se na luta, preparar outra ação, aparar, interceptar) não dependia de você e continua
  na lista.
- **47. A arte continua com você**: as imagens saem do seu navegador. Não mexi.

## 101. O que é recuar, e o voto do Gryskar (2026-11-13)

**O que decidi**
- **Recuar** é terminar o movimento longe de um inimigo de pé que estava colado em quem anda. Andar de lado,
  ainda colado nele, não é recuar; ser empurrado ou puxado também não (não é movimento de quem vai). A
  `combate` §3.2 só diz "Recuar: movimento, distância", e isto é o menor sentido que serve.
- **O voto** ("não recuar o primeiro passo", `gryskar`; "não usa Recuar na primeira vez", `combate` §4.2): quem é
  do Gryskar não recua antes de dar o primeiro golpe dele na luta, acertando ou não. O primeiro passo é pra
  frente; depois do golpe, que leva a aura toda, ele recua como qualquer um.
- Nenhum custo novo: o ataque de oportunidade já cobra quem sai de perto.

**Por quê**: "na primeira vez" lido como "uma vez por luta, recusada" daria um voto que some sozinho. Lido
como "antes do primeiro golpe", ele casa com o princípio de aura da escola (tudo no primeiro golpe) e com o
custo de entrada (perder não impede, recuar sim).

**Pra mudar**: `holdsGround` e `retreatsFrom` em `shared/tactics/movement.ts`.

## 100. A margem e a borda do barco (2026-11-14)

**O que decidi**
- **A borda prensa** (`combate` §4.1, ao pé da letra): quem é de terra, empurrado do seco pra água, finca o pé
  na beira e fica ali. Com um verbo que prensa (Empurrar, Empurrão, Arremesso, Ombrada), sai **Prensado**. Não
  bate: água não é parede, então não há o dano do choque. A tela diz "finca o pé na beira d'água".
- Quem **já está na água** vai mais pro fundo, como no aberto (e cai, se o verbo prensa: Caído).
- **O bicho de rio não para na beira**: a água é dele. Empurrá-lo de volta pra água é o contrário de tirá-lo
  dela, e é ruim pra quem empurra. Isso não mudou.

**Por quê**: o cânone diz que borda do barco e margem prensam; a única leitura que não precisa de regra de
afogamento (que o jogo não tem, e que mataria gente com um empurrão) é a de que a beira segura o corpo.

**Pra mudar**: `edge` em `forcedPath` (`shared/tactics/movement.ts`) e `push` em `shared/tactics/engine.ts`.

## 98. Os custos que faltavam (2026-11-14)

**O que decidi**: cada custo da `combate` §2.2 cai numa hora certa, nesta ordem (o primeiro que couber):

1. **Lei** — magia numa luta na rua de cidade que pede licença pra conjurar. Na luta não pesa; a cidade cobra
   depois. Hoje só o armazém de Ybytuguá é assim (`law` no inimigo do Tiled): o mestre da guilda tira 2 de
   cobre da paga ("A guarda do conselho passou aqui... A multa é dois." / "Era a rua do conselho."). A
   história conta em `sem_licenca`.
2. **Tempo** — a magia recitada que, pagando 1 de mana a mais, passaria do limite: o texto demora a fechar e
   come a ação do turno em que sai, no lugar do estouro. É o custo de quem respeita o tempo; o estouro do ato 3
   é deixa de roteiro e continua acontecendo.
3. **A marca** — a outra magia paga 1 de mana a mais, como antes.
4. **Posição** — o golpe de perto dado de cima perde a altura (quem bateu desce pro quadrado mais baixo colado
   nele e no alvo); sem chão mais baixo, quem bateu de costas pro que barra sai Prensado.
5. **Gente em volta** — o tiro (ou a área) que pega por pouco, com um aliado de quem bateu colado no alvo,
   raspa nele: 1d4. Fora disto continua a deixa de Oryndu.
6. **Fôlego** — 1, pra quem tem, como antes.
7. **Equipamento** — sem Fôlego, o golpe de arma lasca a lâmina: Lâmina lascada, -1 no acerto até o fim da
   luta, uma vez por luta. A gravação que se gasta já é a regra da gravada (serve uma vez).
8. **Ferida** — o resto: 1d4 da própria vida, sem cair por ela, como antes.

**Por quê**: cada custo cai onde o mundo o faria cair, sem o jogador ter de escolher a cada golpe (o livro
escolhe pela prosa; o jogo, pela situação). A ordem põe primeiro o que é da situação (cidade, texto, chão,
gente) e por último o que é do corpo.

**Pra mudar**: `payCost` em `shared/tactics/engine.ts` (a ordem e as regras), `CHIPPED_TO_HIT`, e o texto da
multa em `saqueadores_caem` (`client/story/ybytugua.ink`). A fala da multa é minha, na voz do guia de falas.
