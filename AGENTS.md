# Jogo — Três na Estrada (título provisório)

O autor aprovou tudo em 2026-10-19, e os fatos do mundo estão gravados no repositório da história (`historiav2`,
em `Documents/historiav2`, nas fichas e referências da §9). O roteiro (`jogo.md`) mora aqui. Fato novo continua indo
pro autor antes de entrar (§1).

> RPG tático pra navegador, de 2 a 4 horas, passado no mundo da série de Karuã, uns 25 anos antes do Livro 1.
> Quem joga é **Endyru** jovem, o pai de Karuã. No caminho, forma o grupo com **Jarupã** e **Xanduí**, os pais de Exandy.
> Phaser 3 + TypeScript, mundo em pixel art, combate em grade travado no próprio mapa.
>
> **A história vem primeiro.** O jogo anterior (Eälen) fez os sistemas antes e ficou com cenário, nomes e falas
> de placeholder até o fim, e não ficou bom. Aqui o mundo já existe: todo sistema precisa servir a uma cena.
> Sistema que nenhuma cena pede não entra.

## Decisões do autor (2026-10-19)

- Caminho escolhido: Endyru, Jarupã e Xanduí na estrada, jovens.
- Geografia: uma terra como a Alemanha antes da unificação, de muitos rios, feita de reinos, ducados e cidades
  livres, com regiões separadas por florestas, montanhas e bacias fluviais.
- A ameaça do contrato é uma criatura do bestiário, a primeira do mundo (§5).
- Quem paga o preço do ato 3: o autor deixou o co-autor decidir (§6).
- O trio se forma no jogo.
- Vethrun não aparece.
- Nenhum Sem-Ferrugem aparece.

## Decisões do co-autor (2026-10-27, com a autorização do autor)

- Endyru chega ao Círculo na margem, no ato 2, como já está. No ato 3, a pressa é a de quem acabou de chegar
  lá e acha que aguenta a página inteira: o estouro passa do limite do Círculo. O `jogo.md` foi acertado.
- Na despedida, a tela mostra Endyru olhando a mão de Xanduí na lombada, abrindo a boca e calando. Não diz que
  ele entendeu: ninguém no jogo descobre o segredo (§1.1); quem percebe é o jogador.
- Nomes: o castelão é **Mbyraku**, o castelo de pedágio é o **Castelo da Volta**, o mago do duque é **Jurendy**
  (ex-colega de Endyru em Kuatiarape, filho de gente com dinheiro) e o ferreiro demônio é **Thrykar**. O
  `jogo.md` sugeria Thrymkel, mas nome de demônio macho termina em -r, -ar, -vald ou -grim (`alfabeto.md`).
  A conselheira, o mercador e o mestre da guilda continuam pelo papel.
- O autor aprovou esses nomes em 2026-10-30, e estão gravados na história.

## Decisões do autor (2026-10-31)

- Antes da unificação cada casa tem o próprio brasão, colorido; depois dela, todos passam ao de Ymboripe. A tabela
  está em `docs/arte.md`.

## 1. De onde vem o cânone

O mundo mora no repositório da história (`historiav2`, gerido pelo lore-pack). **Ele manda; o jogo obedece.**

- Antes de escrever fala, nome, lugar ou regra de magia, confira em `biblia.md`, `referencias/magia.md`,
  `alfabeto.md` e na ficha da entidade (`fichas/`).
- Fato novo que o jogo precisar (um lugar, uma criatura, um nome) não se inventa no código: vai como proposta
  pro autor, que grava a ficha na história. Só depois entra no jogo.
- Tudo que o jogo mostrar vira cânone que os livros vão ter de respeitar. Na dúvida, mostre menos.

### 1.1 O que o jogo nunca pode fazer

- **Nenhum rosto do Enganador aparece.** Nem Jupimã, nem Nhambiku, nem Zimridar, nem um rosto novo. O
  Enganador não existe pra este jogo, e a unificação (§2) é política humana, não obra dele.
- **Mito, árvore, canto e profecia nunca se confirmam nem se desmentem.** Um mural pode estar lá; ninguém o explica.
- **Nenhum vestígio da singularidade em cena.** Nenhuma pétala, nenhum objeto que responde.
- **Nenhuma caixa misteriosa nova** sem a resposta escrita na bíblia antes.
- **O segredo de Xanduí nunca é dito.** Ela não sabe ler e nunca contou, nem a Endyru, nem a Jarupã (§3.3).
- **Ninguém do trio morre ou se marca de um jeito que contradiga o Livro 1.** Endyru, Jarupã e Xanduí chegam
  ao Livro 1 inteiros, professores e ex-aventureiros de classe média alta em Itamoguá. Marca de mana em Endyru,
  só a leve, que passa em dias.
- Vethrun, Sem-Ferrugem, dragões de alto nível e o Descendente não aparecem.
- Nome real de pessoa, lugar ou obra, nunca. Criatura de folclore real também não.

### 1.2 Tom

- Adulto e sombrio. A magia é cruel e o mundo também. Preconceito e exclusão existem sem moral de fábula.
- Humor dos personagens, nunca amenizando a crueldade: Jarupã e Xanduí são canastrões; ferreiro demônio dá
  receita absurda que funciona; placa e nome de demônio dizem exatamente o que são.
- Tema da série: respeitar o tempo, num mundo imediatista. A magia cobra a pressa. **No jogo, a pressa é de
  Endyru**: o rapaz que, adulto, vai passar a vida alertando o filho de que a estrada mata. O jogo mostra de
  onde vem o alerta.
- O mundo é maior que o grupo: camponeses e barqueiros que vivem pelas estações e pela cheia, cidades que
  mudam de dono.
- Mostrar, não contar. Ninguém explica ao outro o que os dois já sabem. Sem flashbacks.
- Começa com um pouco de ação.

### 1.3 Nomes

Gente e lugar humanos seguem a língua humana de `alfabeto.md` (tupi-guarani: sem l, f, z, v nem rr; sílaba
termina em vogal; lugares em -tyba, -guá, -pe). Demônio, elfo e dragão, cada um na sua. Nome novo confere a
lista de nomes já usados e vai pro autor antes de entrar.

## 2. Onde se passa: Xerumbetyba antes da unificação

- **Xerumbetyba** (no cânone: reino humano do interior de Yrandupe, vizinho de Tanguratyba, famoso pela maior
  universidade e pelas maiores bibliotecas). No Livro 1 já é um reino só; no tempo do jogo é uma colcha de
  ducados, senhorios e cidades livres às vésperas da unificação.
- **O Ymonhã**, o rio grande: a espinha da região. Cada senhor dono de uma margem cobra pedágio de
  quem desce. Castelo de pedágio, corrente atravessada no rio, ponte fechada.
- **Bacias como fronteiras**: cada afluente é um senhorio; a floresta e a serra entre duas bacias são
  terra de ninguém, onde se contrata aventureiro.
- **Ybytuguá**, a cidade livre: sem senhor nem exército, com conselho de guildas e dinheiro. Vive do
  comércio do rio. Por isso contrata gente como o trio.
- **O ducado de cima**: o senhorio mais forte, rio acima, que vai unificar a região: **Ymboripe**, hoje a capital
  de Xerumbetyba. Quem manda é Pytumã; a herdeira, Iraxê (nenhum dos dois aparece no jogo).
- **A universidade** fica em **Kuatiarape**, cidade livre rio acima de Ybytuguá (que também cai na unificação): é
  de onde Endyru sai (§3.1).
- **A unificação** fecha o jogo: a cidade livre se rende ao ducado de cima, e a era dos contratos
  naquela terra acaba.
- O mapa do jogo é pequeno, como o do Livro 1: um trecho de rio com um castelo de pedágio, a cidade livre, os
  baixios onde mora a criatura, a floresta entre as bacias.

## 3. O grupo

Protagonista fixo, sem criação de personagem. **O trio se forma no jogo.**

### 3.1 Endyru — mago, atração e repulsão
- Humano. Futuro professor da cadeira de atração e repulsão em Itamoguá.
- Estudante da universidade de Xerumbetyba, em Kuatiarape, sem dinheiro pra terminar: desce o rio atrás de contrato.
- Nível de mago no começo: Página; chega a Círculo no fim do jogo. (Karuã chega ao Círculo aos 13,
  "o mais novo da história": Endyru tem de ser mais velho que isso quando chega lá.)
- É quem lê: contratos, placas, cartas, mapas.
- Apressado: quer o dinheiro, o nível e o nome, tudo agora. O jogo cobra isso dele (§6).

### 3.2 Jarupã — espadachim, Gryskar (o Bate-Primeiro)
- Humano, canastrão, nada culto. Bate primeiro e pergunta depois.
- Nível de aura baixo (Punho ou Fio).
- Já anda com Xanduí quando o jogo começa; os dois são dupla de escolta de barco.

### 3.3 Xanduí — espadachim, Ipojy (a Espera)
- Humana, canastrona, nada culta. Não sabe ler e nunca disse.
- Da Ipojy: é ela, anos depois, quem ensina Exandy. O voto: nunca dá o primeiro golpe.
- **Por que o trio existe**: o contrato de Ybytuguá exige que alguém do grupo saiba ler, para assinar
  e para o relatório ao conselho. Jarupã não lê; Xanduí diz que "a letra dela não serve pra conselho" e é ela
  quem insiste em levar o estudante. Ninguém nunca diz por quê.
- **Como o segredo vive no jogo:** pela forma, nunca pela fala. Ela pede que Endyru leia "porque ele lê
  bonito", segura um aviso de cabeça pra baixo uma vez, decora o que ouve e repete palavra por palavra. O
  jogador atento percebe; ninguém no jogo percebe. É ironia pra quem leu o cap. 13 do Livro 1.

### 3.4 Oryndu — barqueiro
- Humano, barqueiro do Ymonhã. Conhece a cheia e os baixios, e as regras da gente do rio (§5.2).
- Acompanha o grupo sem lutar: é o apoio no lugar de Gil. Apoio: **Ler a água** — mostra onde a criatura vai
  emergir e o que ela vai atacar (o `annotate` do Eälen, com outra cara).
- Morre no ato 3 (§6).

## 4. Como o mundo vira regra

O motor é o do Eälen (§7). O que muda é o que cada peça É neste mundo.

| No Eälen | Aqui | Regra do cânone que manda |
|---|---|---|
| Halmira, protagonista fixa | Endyru, protagonista fixo | — |
| Ordens destraváveis | **Saem.** Cada um tem o que é: Endyru o conceito, os outros a escola de espada | `magia` §3, §5.5 |
| Estilos Maré / Viés / Baluarte | **Escolas Gryskar / Tsvirana / Ipojy** | `magia` §5.5 |
| Triângulo incompleto (Baluarte e Maré neutros) | **Triângulo fechado**: Ipojy vence Gryskar, Gryskar vence Tsvirana, Tsvirana vence Ipojy | `magia` §5.5 |
| Traço de cada estilo | Gryskar = a Onda (pressão no mesmo alvo); Tsvirana = a Rachadura (pune quem repete); Ipojy = contra-ataque em quem a ataca e erra | `ipojy`, `gryskar`, `tsvirana` |
| Grau do estilo (só aparece) | **Proficiência 1 a 7 por escola**, nunca acima do nível de aura; golpe-selo a partir do 4, só por iniciação (o trio não chega lá) | `magia` §5.6 |
| Fôlego | **Fôlego** pra técnica de espadachim, **Mana** pra quem conjura | `magia` §4, §5.1 |
| Golpe pesado custa Fôlego | **Mana gasta de uma vez cobra do corpo**: passou do limite num turno, vem a marca | `magia` §4.1, §4.2 |
| `afflict` (Braço ferido) | **Marca da mana exaurida**: atração e repulsão dá sangue pelo nariz e tremor (acerto menor). A leve passa com descanso; a enorme não acontece com o trio | `magia` §4.2 |
| Habilidade usada na hora | **Recitada**: leva tempo. Declara num turno, sai no seguinte; apanhar no meio pode quebrar | `magia` §2.5 |
| — | **Gravada**: preparada fora de luta, no descanso, num objeto ou círculo. Na luta só se ativa, sem tempo de recitar. Cada texto gravado serve a uma coisa só | `magia` §2.5 |
| Golpe de abertura | **Círculo gravado no chão**: a emboscada do mago é preparar o terreno antes | `magia` §2.5 |
| Mania `retaliates` do fiscal | **Voto da Ipojy**: quem é da Espera nunca abre a luta, não embosca e não dá golpe de abertura | `ipojy` |
| Cura do Luminar | **Cura**: magia de primeiros socorros, separada dos conceitos. Acelera, e **quem paga é o paciente** (Fôlego, fome) | `magia` §4.3 |
| Kits por Ordem | **Repertório por nível**: atração e repulsão no Círculo arremessa, desarma, desvia projétil, puxa-se até um ponto (o puxão e o empurrão do Guardião já fazem isso) | `magia` §3.5 |
| Curva de poder | **Nos níveis baixos o espadachim amassa o mago.** Endyru é controle e preparo; quem mata são os dois | `magia` §5.3, §7.3 |
| Atributos Tirán (Dain, Eir...) | Nomes simples, em português: Força, Fator, Vigor, Olho, Couro, Lábia, Saber | — |
| Povos de Eälen | Humanos, demônios, elfos, dragões, meio-elfos | `biblia` §3.4 |
| Gil, o apoio que anota | Oryndu, o barqueiro que lê a água (§3.4) | — |
| Relógio "Luz do dia" | **Relógio da cheia**: o rio sobe com a estação, e com ele a criatura (§5) | camponeses pelas estações |
| Diário que some (Coletor de Lembranças) | **Sai.** Era do Eälen. O diário continua guardando fatos, não conclusões | — |
| Fiscais na ponte | **Castelo de pedágio no Ymonhã**: a mesma luta, agora com razão no mundo | §2 |
| Equipamento | Níveis do cânone: Ferro-cru, Temperado, Gravado, Recitado. Estelar e Dracônico ficam fora do alcance do trio | `magia` §7.4 |
| Dinheiro | Cobre e prata | — |

## 5. A criatura: o Ykuruã

A primeira criatura do bestiário do mundo.

### 5.1 O que é
- Bicho de rio, anfíbio, do tamanho de um barco de carga. Couro grosso como casca de árvore velha, coberto de
  lodo e de conchas. Boca larga, olhos pequenos, quase cego.
- Dorme enterrado no lodo dos baixios a maior parte do ano. Acorda com a cheia.
- **Sente mana gasta de uma vez**, como peixe sente pedra batendo na água. Verso doméstico ele não sente;
  encantamento grande, sim, e de longe. Vem até onde a mana bateu.
- Na água se cura e é rápido. Na terra é lento, pesado, e o couro seca e racha.
- Animal, não monstro de mito: não tem mente, não guarda nada, não é pista de nada. Não responde a vestígio.
- Era ressacada: na era de ouro, um espadachim sozinho o matava. Hoje uma cidade precisa contratar grupo.
- Nome: humano, Ykuruã. Na língua dos portos, **o Bebe-Cheia**. Alternativas: Ypuãma, Mbykuruã.

### 5.2 O que a gente do rio sabe
- "Na cheia, ninguém conjura no rio." Barqueiro usa Verso pra puxar a rede e mais nada.
- Bate-se com remo no casco, devagar, pra saber se ele está embaixo. Pressa no rio é coisa de forasteiro.
- Os velhos tiram o barco da água e esperam a cheia passar. É a regra do tempo do mundo, vivida por camponês
  e barqueiro, sem ninguém dizer o tema.

### 5.3 Na luta
- **Na água**: cura a cada turno, se esconde (só a ponta das costas à vista), escolhe onde emergir. Bater nele
  ali é quase inútil.
- **Atraído pela pressa**: toda vez que alguém passa do limite de mana num turno (a mesma conta que dá a marca),
  ele vai pra cima de quem conjurou e ganha um turno a mais. Peça nova do motor: uma deixa
  `when: burst`.
- **Como se vence**: tirando-o da água. Atração e repulsão no Círculo puxa, mas não puxa um bicho desse
  tamanho de uma vez sem passar do limite. O jeito é puxar aos poucos, turno após turno, com Versos pequenos ou
  círculos gravados na margem antes da luta, enquanto Jarupã e Xanduí o seguram. Na terra o couro racha, e aí a
  espada entra.
- O tema vira mecânica: quem tem pressa chama o bicho; quem prepara e espera o vence.
- No bestiário do motor: grande (2x2 se o motor ganhar unidade grande; senão 1 quadrado e uma área de alcance
  maior), Baluarte de criatura com Muralha alta na água e baixa na terra.

## 6. A história do jogo

Três atos, 2 a 4 horas, umas 10 a 15 lutas e dois chefes (o castelão do pedágio e o Ykuruã).

O roteiro cena a cena e o guia de falas (a voz de cada um, com exemplos) estão em `jogo.md`. Onde ele detalha
esta seção, vale o `jogo.md`; as tasks 31 a 46 trazem o jogo até ele.

### Abertura (ação): a corrente no rio
- Endyru desce o Ymonhã no barco de Oryndu. Jarupã e Xanduí estão no mesmo barco, contratados de escolta por
  um mercador.
- O barco é parado pela corrente de um castelo de pedágio. O pedágio subiu de novo. Pagar, convencer (teste de
  Lábia de Endyru) ou lutar.
- Ensina a luta, o voto de Xanduí (ela não abre a luta; Jarupã abre) e a pressa de Endyru (ele quer resolver
  com um encantamento grande; Oryndu o segura: "não no rio, rapaz").

### Ato 1: Ybytuguá
- A cidade livre está morrendo: barcos afundam nos baixios abaixo dela, a cheia veio cedo e o Ykuruã acordou.
  O comércio do rio para.
- O conselho de guildas oferece contrato. Exige quem saiba ler. Xanduí escolhe Endyru. O trio se forma.
- Na cidade: a guilda dos barqueiros, um ferreiro demônio com uma receita absurda pra couro de bicho de rio
  (funciona), a gente que já está fazendo as malas.
- Primeira ida aos baixios: o Ykuruã não se vence. Luta que não se vence batendo (inimigo `invulnerable` na
  água + deixa que encerra). Oryndu ensina a regra do rio.

### Ato 2: a floresta entre as bacias
- Por que a cheia veio cedo e por que o bicho acorda tanto? Seguindo a margem, o trio acha a resposta: homens
  do ducado de cima andam conjurando grande no rio, de propósito, rio acima e nos baixios, pra acordar o
  Ykuruã e matar o comércio da cidade livre. Cidade sem comércio aceita senhor.
- É política humana, explicada no próprio ato. Não é caixa misteriosa.
- Lutas com os homens do ducado, com bichos da floresta (mais criaturas do bestiário, se o autor quiser) e o
  castelão do pedágio de novo, agora sabendo de que lado ele está.
- Endyru prepara círculos na margem dos baixios. Ou não prepara: o jogo deixa ele ir sem.

### Ato 3: os baixios na cheia
- A luta final com o Ykuruã, com o relógio da cheia correndo.
- **O preço** (decidido pelo co-autor): no meio da luta, Endyru perde a paciência e solta o encantamento
  grande, pra acabar logo. É uma deixa de roteiro, não escolha do jogador: acontece em todo jogo. O Ykuruã vem
  na direção da mana e vira o barco de Oryndu, que estava segurando a margem pro grupo. Oryndu morre afogado.
  Endyru sai com a marca leve: sangue pelo nariz e tremor por uns dias.
- Depois disso, o resto da luta só se vence do jeito lento: puxar aos poucos, segurar, esperar o couro rachar.
- Por que esse preço: cai no corpo de quem estava ao redor, não no de quem teve pressa. É a mesma lição que
  Karuã aprende com a morte de Endyru, no Livro 2; aqui Endyru aprende primeiro, sem saber que vai ensinar ao
  filho do pior jeito. Não contradiz o Livro 1: o trio sai inteiro, e a marca de Endyru passa.

### Fim: a unificação
- O Ykuruã morre. O comércio volta. Uma semana depois, Ybytuguá assina mesmo assim com o ducado de cima: a
  cidade livre deixa de ser livre, e o trio não pode fazer nada sobre isso.
- Endyru volta pra universidade com o pagamento, e sai do jogo pela cátedra. Jarupã e Xanduí seguem pela
  estrada; ele dá a ela, de presente, alguma coisa escrita que ela guarda sem ler.
- Nada de epílogo explicando o futuro. Quem leu os livros sabe.

## 7. A base técnica

O código partiu do Eälen (Phaser 3 + Vite no `client/`, regra pura em TypeScript no `shared/`). Os sistemas
funcionavam; o que não funcionou foi a ordem de trabalho. O que era só do Eälen já saiu (ver Feito, a limpeza).

- A descrição técnica (motor tático, mundo em Tiled, Ink, save, som, sprites) está em `docs/motor.md`, com os
  nomes deste jogo. Mudou uma regra ou uma peça, muda lá também.
- Nome novo no lugar de um velho é trocar em todo lugar: código, testes, Ink, mapas, save (com migração).

### 7.1 A regra central (continua igual)
O motor nunca anima nada. `applyCommand` recebe um comando, valida, muta a luta e devolve eventos em ordem; o
client só os reproduz. Regra nova de combate entra no motor e vira evento. `shared/` continua puro: nada de
`window`, `fs`, `fetch`. Nada de dependência de servidor no caminho do jogo; o alvo continua sendo Electron e
Steam.

### 7.2 Peças do Eälen que o mundo pede de volta
- Inimigo `invulnerable` + deixa que encerra: a primeira luta com o Ykuruã.
- Lutas com roteiro (`cue`): o castelo de pedágio, o encantamento grande de Endyru no ato 3.
- Relógio: a cheia.
- `afflict`: a marca da mana.
- Emboscada e golpe de abertura: o círculo gravado na margem.
- Apoio (`annotate`): Oryndu lendo a água.

## 8. Tasks

Ao terminar uma, tire-a daqui e descreva o que entrou. **Toda vez que terminar uma task, faça o commit. O push
é do autor.**

Esta é a lista única: as tasks que estavam em `docs/motor.md` vieram pra cá (2026-10-31), com número novo. Texto novo
de história vai como proposta pro autor antes de entrar (§1).

Prioridades: **P0** = o jogo não fecha um capítulo sem isto · **P1** = faz falta em qualquer RPG, entra logo depois ·
**P2** = dá corpo ao jogo, pode esperar · **P3** = produto e acabamento.

### P0 — sem isto não há capítulo
| # | Task | O que é |
|---|---|---|

### P1 — a árvore de habilidades (pedida pelo autor em 2026-11-03)
O motor e a tela já entraram (ver Feito). Nenhum nó é técnica nova do mundo: é o que a pessoa já sabe, feito melhor. Repertório novo de mago vem do nível de mago, e golpe-selo só por iniciação (`magia` §3.5, §5.6).

| # | Task | O que é |
|---|---|---|

### P1 — pedidos do autor (2026-10-31)
Quem ou o que bloquear o caminho com fala ou fato novo vai como proposta pro autor antes de entrar (§1).

| # | Task | O que é |
|---|---|---|

### P1 — o conteúdo
| # | Task | O que é |
|---|---|---|
| 47 | **Gerar a arte** | O autor gera pelo navegador (Nano Banana Pro) com os prompts de `art/PROMPTS.md` (ficha de design, retrato, folha e splash de cada um) e o script importa (`importar <pasta>`). Os retratos de Jarupã e Xanduí, do primeiro lote, ficam. Toda a gente do jogo já tem folha, e quem fala muito tem retrato. Faltam o Ykuruã (a folha, e a seca sai dela), a tela de título e, se o autor quiser, os retratos dos saqueadores, da Contratada e do guarda do portão, que falam pouco. O que falta é o que `list` marca como `falta`, e quem tem `proposal` o autor ainda não viu desenhado. O quadro de Xanduí no aviso de cabeça pra baixo, se houver, é sutil (§3.3). Olhar cada folha: a que sair torta se refaz. |

### P1 — o que todo RPG tem
| # | Task | O que é |
|---|---|---|
| 61 | **Golpe de abertura, o resto** | Balancear (escondido, ainda é golpe grátis MAIS a surpresa); inimigo que vira a cabeça ou anda de ronda; companheiro dar o primeiro golpe; mirar um quadrado com área; acertar destrutível fora de luta (o barril de óleo); mouse na ficha e na mochila. |
| 63 | **Mais verbos de combate, o resto** | A Disparada, o Ajudar e o Vigiar já entraram (ver Feito). Falta: esconder-se no meio da luta, preparar outra ação que não o golpe; reações além do ataque de oportunidade (aparar, interceptar). |
| 66 | **Mapa, o resto** | O mapa da região é a task 48. Falta o grafo de áreas, marcadores e viagem rápida entre lugares já visitados. |
| 68 | **Objetos do mundo fora de luta** | Baú, porta com chave, alavanca, armadilha, coisa pra pegar no chão. Hoje só se mexe em objeto dentro de luta (`interact`). |

### P2 — corpo
| # | Task | O que é |
|---|---|---|
| 94 | **Ver na tela o que só se testou no motor** | Ninguém abriu no jogo: a árvore desenhada (`R` na ficha) e o desaprender no acampamento, o item jogado num aliado, as ordens, a Disparada e o Ajudar, jogar fora e arrumar a mochila, a opção Árvore dos companheiros. Jogar cada um e corrigir o que sair torto. |
| 96 | **Ícones e arte das peças novas** | Os ícones da árvore, da Disparada, do Ajudar e das ordens são os provisórios de `icons.ts`, emprestados de outras coisas. Entram com a task 70. |
| 70 | **Arte final** | Retratos, folhas de 48x48, splash e o mapa do mundo saem de `art/gerar_arte.py` (`docs/arte.md`). O cenário sai de `art/pintar_cenario.py`. Faltam animações próprias de ataque, dano e morte, efeitos e ícones (32x32). Trilha e efeitos sonoros gravados, no lugar dos sintetizados (a troca é em `audio.ts`). |
| 71 | **Relíquias e runas** | Itens que não se gastam: efeito passivo além de atributo (o acessório de hoje só soma atributo), encaixe em equipamento. As armas lendárias da história entram aqui. |
| 72 | **Coleta e preparo** | Materiais no mapa e no espólio; receitas de consumível. |
| 73 | **Companheiros como gente** | Afinidade, conversa de acampamento, comentário no meio do diálogo dos outros, missão pessoal, discordar de uma escolha. |
| 74 | **Reputação** | Como cada facção e cada lugar vê o grupo, e o que isso abre ou fecha (preço, diálogo, saída). |
| 75 | **Códice** | O que o jogador já viu: bestiário (com o que descobriu de cada criatura — estilo, mania, fraqueza), gente, lugares. |
| 76 | **Mais apoios** | Hoje só existe Ler a água (Oryndu). Apoio novo é uma linha em `SUPPORTS`, mas faltam os tipos (curar de fora, distrair, avisar). |
| 77 | **Invocação e criatura aliada** | Unidade que entra no meio da luta e sai com ela. |
| 78 | **Terreno que muda** | A água e a cheia já existem. Falta lama, ponte que cai, porta que se fecha no meio da luta; luz e escuro pesando na visão; hora do dia e clima. |
| 79 | **Tutorial** | Ensinar movimento, ação, bônus, reação, cobertura, flanco, estilo e emboscada dentro do jogo, na ordem em que aparecem. |
| 80 | **Balanceamento** | `balance:matrix` roda classe x criatura sozinha no nível 1. O herói já entra com o equipamento de começo da classe. Falta grupo x grupo, por nível (é onde as Técnicas aparecem), com item; os números dos kits e das peças, que são os primeiros a conferir; e os números do Fôlego (quanto cada coisa custa, quanto a guarda devolve). |

### P3 — produto
| # | Task | O que é |
|---|---|---|
| 81 | **Empacotar** | Electron, página na Steam, conquistas. O build já usa caminhos relativos. |
| 82 | **Save na nuvem** | Não existe servidor: seria do zero, e o jogo não pode depender dele. |
| 83 | **Jogo novo com o que se levou** | New Game+. Falta tudo. |
| 84 | **Tradução e acessibilidade** | Texto fora do código (o do jogo já está em Ink; o da interface não), daltonismo, leitor de tela onde der. |

### Feito
- **1. A descrição técnica mudou de casa.** O AGENTS.md do Eälen está inteiro em `docs/motor.md`, sem mudança.
- **2. Escolas no lugar dos estilos.** `styles.ts` tem Ipojy, Gryskar e Tsvirana em triângulo fechado. Gryskar
  leva a Onda, Tsvirana a Rachadura, e a Ipojy o Contragolpe: quem a ataca e erra leva o golpe de volta, na reação
  dela (a IA não pesa isso, de propósito: bate na Espera como em qualquer um). A proficiência vai de 1 a 7 e entra
  na luta cortada pelo nível de aura (Punho a Divindade). O Baluarte, com a Muralha, ficou só pra criatura grande,
  fora do triângulo. Na gente provisória do Eälen: o fiscal é Ipojy, os mergulhadores Gryskar, Taevel Tsvirana;
  Halmira e Lish viraram Gryskar e Tsvirana até a task 7 trocar o elenco. Detalhe em `docs/motor.md`.
- **3. O voto da Ipojy.** A luta sabe se alguém já deu o primeiro golpe (`Encounter.opened`). Até lá, quem é da
  Espera não tem alvo pra golpe nenhum, nem dá ataque de oportunidade; depois, ainda não bate em quem está Surpreso.
  Não dá golpe de abertura e não embosca (`keepsVow` no elenco). A IA espelha a regra: antes de a luta abrir, quem é
  da Ipojy não ameaça ninguém. O fiscal provisório perdeu a mania `retaliates` (a tabela da §4 diz que o voto
  faz o papel dela): sem isso, mago e fiscal na IA ficavam se guardando pra sempre.
- **4. Mana e custo no corpo.** `shared/mana.ts`: quem tem `magic` no elenco (conceito e nível de mago, Verso a
  Divindade) paga a magia em mana, que fica na ficha e só o descanso devolve. O limite por turno é o nível de mago.
  Passou dele, o motor solta `manaBurst` (a deixa `when: burst` do Ykuruã vai ler isto) e põe a marca do conceito:
  atração e repulsão dá Sangue e tremor, -2 no acerto. A marca sai da luta com ele, vai pra história como `afflict`
  e sai no descanso (ou na derrota, que acorda inteiro). Ninguém do elenco conjura ainda: Endyru entra na task 7.
- **5. Recitada e Gravada.** Magia é recitada: o comando só a declara (gasta a ação), e ela sai no começo do próximo
  turno de quem a leu, seguindo o alvo, pagando a mana ali. Apanhar no meio pode quebrar (d20 + Ul contra 10 mais
  metade do golpe); alvo que some ou vez perdida também. Uma recitação de cada vez. A gravada é escrita no descanso
  (o acampamento abre o painel de gravar), uma por gravação até o nível de mago, num objeto ou círculo: na luta sai na hora,
  serve uma vez, e é a única magia que abre luta — o círculo preparado antes. O círculo não tem lugar no mapa: é o
  texto pronto, não um quadrado marcado.
- **6. A cura cobra o paciente.** Cada 3 de vida que a cura devolve custa 1 de Fôlego a quem a recebe, e ela não vai
  além do que ele pode pagar: sem Fôlego, nada se acelera. Quem foi curado fica com Fome até o descanso, e com fome a
  cura custa o dobro. Vale na luta e fora dela. Antes a fome travava a recuperação de Fôlego pela guarda; isso
  deixava o grupo sem Fôlego pro resto da luta (duas IAs empacavam), e a regra do dobro ficou no lugar.
- **7. O elenco.** Endyru (humano, classe `atracao_repulsao`, Página: Puxão, Bordão, Empurrão, Guarda, Cura;
  Desarmar e Arremesso no Círculo, tudo magia recitada e paga em mana), Jarupã (`espadachim`, Gryskar, Fio,
  espada pesada), Xanduí (`espadachim`, Ipojy, Fio, espada reta) e Oryndu (barqueiro, apoio "Ler a água") no
  lugar de Halmira, Lish, Varel e Gil, em código, testes, Ink, mapa e save (versão 5 refaz as fichas antigas no
  mesmo nível). Saíram o perfil, `unlock_order`, `ClassSelect`, os retratos das Ordens e o prólogo do Eälen (que
  mostrava a Ruptura, vestígio da singularidade). O título virou "Três na Estrada". As Ordens do Eälen ficam só nas
  criaturas provisórias. Na clareira, o trio e Oryndu não falam: o texto deles espera o roteiro (task 11).
- **8. O Ykuruã.** Entrou no bestiário (`encounter-ykurua`) com o que o cânone diz dele. O chão ganhou água (a propriedade
  `water` de um tile do tileset do Tiled, `w` nos desenhos de teste). Bicho de rio (`river`) na água fica Submerso — rápido, Muralha
  alta (2 do Baluarte + 6) e se refaz 6 por turno —, e em seco fica Em seco — lento, couro rachado, Muralha zero; a
  troca acontece sempre que ele muda de quadrado, inclusive puxado. É pesado (`heft` 1): cada puxão o tira um
  quadrado a menos, então ele sai da água aos poucos. A cada `manaBurst` de alguém do outro lado, ele ganha um
  turno a mais logo depois da vez de quem está agindo (`bonusTurns`/`interlude`) e vai atrás de quem conjurou
  (`prey`). A deixa `when: burst` dispara na primeira vez. A unidade grande (2x2) não coube: pede ocupação de
  vários quadrados em toda a grade, e ficou de fora. Ele ainda não está em nenhum mapa: os baixios são da task 10.
- **9. Atributos com nomes do mundo.** As runas Tirán saíram: Força, Fator, Vigor, Olho, Couro, Lábia e Saber, com
  as chaves sem acento (`forca`, `fator`, `vigor`, `olho`, `couro`, `labia`, `saber`) no código, nos testes, no Ink
  (`attr`, `check`, `# check:`) e na ficha. O save foi pra versão 6, que troca as chaves das fichas e do item de mochila
  que soma um atributo.
- **13. A gente do mundo no bestiário.** O Ykuruã da primeira ida (`encounter-ykurua-desperto`, o mesmo bicho, sem vida
  pra perder), a gente do castelo de pedágio (o guarda de chuço, o besteiro e o castelão, primeiro chefe, da Tsvirana) e
  a de Ymboripe (a espada, do Gryskar; a lança, da Ipojy, que não bate primeiro; o recitador, mago de atração e repulsão
  na Página, que conjura de verdade: o bestiário ganhou `magic`), e o aventureiro contratado, da Tsvirana. Quem não tem
  nome aprovado aparece pelo papel. Armas novas: chuço, besta e as duas espadas temperadas do ferreiro. Os dois itens
  que o jogo usa (os ids do Eälen ficam) agora são o Unguento de Barqueiro e o Pão de Viagem. As criaturas do Eälen
  ficam no fim do bestiário só pros testes do motor: nenhum mapa as usa.
- **10, 11 e 12. O jogo de verdade.** As quatro áreas do cânone (`ymonha`, `ybytugua`, `baixios`, `floresta`) e a
  história inteira em Ink, um arquivo por lugar, seguindo a §6: a abertura no barco parado na corrente (pagar,
  convencer com Lábia ou lutar; o voto de Xanduí e o "Não no rio, rapaz"), o contrato na Mesa (o trio se forma, o
  relógio da Cheia começa), o ferreiro e a receita, a primeira ida que não se vence, a margem onde Endyru chega ao
  Círculo, a leitura na floresta e o papel de Ymboripe, o castelão e o livro de contas, a cheia (a deixa `burst`
  impõe a pressa e a `dismiss` tira Oryndu da luta) e o fim, uma semana depois. O segredo de Xanduí só pela forma
  (o contrato lido "porque ele lê bonito", o aviso de cabeça pra baixo, a cláusula repetida palavra por palavra, o
  relatório que ela guarda pra "ler com calma"). A bolsa de cobre e prata paga o pedágio, a cabeça, a fiança, o
  ferreiro e a parte de quem fica. Quem não tem nome aprovado aparece pelo papel (task 14). O tileset ganhou água
  rasa, lodo e a corrente (`placeholder-water`). Os mapas e o texto provisórios do Eälen saíram do jogo; os mapas
  ficaram como fixtures dos testes do mundo. O diário que se apagava (`forget`/`recall`) saiu, como a §4 manda. O
  teste da história joga o caminho inteiro, do pedágio ao fim.
- **Revisão das tasks 1 a 8** (2026-10-20). O que estava errado: um comentário apontava pra um arquivo que não existe;
  dois testes não passavam no typecheck desde antes da conversão; e Endyru ficava na Página pra sempre, com Desarmar e
  Arremesso chegando pelo nível — o cânone diz que ele chega ao Círculo e que esse repertório é do Círculo (`magia`
  §3.5). Agora o nível de mago fica na ficha (`mageLevel`), o texto o sobe com `mage_rise`, e as Técnicas com
  `mage` chegam com ele.
- **16. O aviso do Círculo.** A caixa anunciava `mageRose` como "Endyru chegou ao ."; agora diz o nível e o que
  ele aprendeu ("Endyru chegou ao Círculo. Aprendeu Desarmar e Arremesso.").
- **17. Retrato na caixa.** Quem fala ganha um busto grande no canto de baixo, à esquerda, que entra na caixa por
  cima e encosta na borda da tela; o nome, a fala e as escolhas andam pra direita dele. A chave é o nome como está no
  Ink (`client/src/game/dialogue/portraits.ts`): `PORTRAITS` recebe a arte final, e até lá o trio, Oryndu e a gente
  que fala pelo papel têm um busto liso provisório, na cor de cada um, sem rosto desenhado. Narração, acontecimento e
  quem não está na lista falam sem busto.
- **18. Entrada e troca do retrato.** Quando quem fala muda, o busto novo entra deslizando da esquerda, aparecendo,
  e o de quem falava escurece e some. Quem continua falando fica parado. Narração, acontecimento e escolha sem fala
  não tiram o busto da tela: o de quem falava só escurece, e acende de novo se a mesma pessoa voltar a falar.
- **27. O Ykuruã grande na tela.** O bicho de rio (`river` no bestiário) tem quadro de 48x32 e continua num
  quadrado só na regra; sombra, anel da vez e barra de vida do `MapActor` saem do tamanho do quadro. Submerso, metade
  do corpo some abaixo da linha d'água, com uma ondulação no lugar da sombra; Em seco, a folha troca pela seca, mais
  clara e de couro rachado (`drySpriteKey`: arte final registra `creature:<id>:seco` em `MAP_SHEETS`; sem ela, fica a
  normal). Na luta, quem troca é a condição (`statusApplied` de Submerso ou Em seco); fora dela, o quadrado de água
  onde o bicho está no mapa. O provisório é um monte de lodo com conchas, boca larga e olhos pequenos.
- **28. O estouro aparece.** No `manaBurst`, a tela treme, o mago clareia e a água abre um anel em volta dele, com um
  estalo e a água batendo (`burst`). No `manaDrawn`, um som grave e comprido (`rumble`) e uma fila de anéis corre pela
  água do mago até o bicho, antes do turno a mais. Enquanto a marca de atração e repulsão durar na luta, pinga sangue
  do nariz de quem a carrega (de costas não se vê).
- **29. Voto e Contragolpe legíveis.** Todo botão apagado da barra de luta diz por quê (`why` no `ActionButton`):
  na linha de explicação, ao passar o mouse, e como aviso, ao clicar ou apertar a tecla. O voto vem primeiro ("O voto
  da Ipojy: Xanduí não dá o primeiro golpe da luta"; depois, "não se bate em quem está Surpreso"), e então o que falta
  pagar, a recarga ou a falta de alvo. O mouse em cima de um botão não conta mais como mouse no mapa. No Contragolpe,
  quem espera clareia em ouro, um corte de luz vai dela até quem errou, e o bote de reação é mais largo e mais rápido.
- **19. Expressões por tag.** O runner põe as tags de cada fala do Ink no `DialogueBeat` (`tags`, sem o `#`), e
  `faceOf` lê o `# rosto: <nome>`. Vale só pra aquela fala: a seguinte, sem tag, volta ao retrato de sempre. Quem
  continua falando com outro rosto troca o quadro ali mesmo, sem sair e entrar. A arte de cada rosto entra em
  `PORTRAITS` (`faces`, textura `portrait:<quem>:<rosto>`); rosto pedido sem arte mostra o retrato de sempre, e o
  provisório, que não tem rosto, não muda.
- **30. As sobras do Eälen saíram de `shared/`.** As classes agora são só `atracao_repulsao` e `espadachim`; os
  povos, `humano` e `bicho`; os Princípios (`principle.ts`) saíram inteiros, e com eles o `principle` do bestiário.
  Saíram os seis kits das Ordens e suas Artes e Técnicas, as dez criaturas do Eälen, oito consumíveis (ficam o
  Unguento e o Pão) e dezoito peças (ficam as dez que o jogo veste), e os personagens de exemplo do `mock/seed.ts`.
  O mapa de nós do `seed` ficou: é o que o servidor opcional ainda serve em `/map`. As peças do motor que só as
  Ordens usavam (área, chão de fogo e gelo, golpe que fura ou drena, Fôlego roubado, condições) ficam, e os testes
  as exercitam com um kit e itens deles (`TEST_KIT`, `TEST_ITEMS` em `tactics/__tests__/helpers.ts`); os mapas de
  teste do mundo usam criaturas e peças de teste (`world/__tests__/catalog.ts`). A cara de NPC deixou de ser
  Ordem: `look` é uma classe ou uma de `NPC_LOOKS` (a conselheira, o escrivão, o mestre da guilda, o ferreiro, a
  família, o mercador), e cada uma tem o boneco provisório na cor do busto dela. A Cota de Escamas citava os Miraven;
  a descrição virou neutra e espera o autor. O jogo ainda não tem acessório nenhum.
- **32. A abertura do roteiro.** Antes da corrente, o barco: Oryndu mede o fundo batendo o remo, "Ah, empurrar coisa." No
  cais do Castelo da Volta, o sargento do pedágio cobra o dobro pela cheia; o tratado fluvial das cidades livres só
  serve pra acender cachimbo (sempre falha), a tábua ainda se discute com Lábia, e o Empurrão dá em "Na cheia ninguém
  grita com a água". Antes da luta, "Deixa que eu abro" e a trava do guincho. O guincho é um objeto que se mexe
  (`winch` em `PROPS`): soltá-lo é a deixa `used` que vence a luta, e o barco desce a corredeira sob virotes direto
  pra Ybytuguá. No cais, o mercador paga metade em cobre porque o sal molhou: a escolta chega à cidade sem dinheiro.
- **33. A Mesa do roteiro.** O trio se forma no quadro: o edital com lacre ("Contrato de Corpo", fiança dispensada por
  urgência), o escrivão que lê por uma moeda, Xanduí segurando o pulso de Jarupã e olhando o edital de longe, de cabeça
  inclinada, "Lê aí pra gente, estudante", a exigência das guildas de seguro, "Assina lá, Xanduí" e a letra grande
  demais pras linhazinhas do conselho (`leu_edital`). A conselheira só oferece depois, e a fiança cai: o conselho tem
  pressa. Jarupã agora diz que não lê e nunca precisou. Na guilda, ninguém guia ("Quem espera a cheia baixar vive até
  a seca"); no barco, Oryndu leva o grupo pelo leme rachado na corrente e põe a condição. O aviso de cabeça pra baixo
  saiu do quadro e espera a tabuleta da floresta (task 37).
- **34. O ferreiro do roteiro.** O ferreiro é Thrykar (no mapa, na caixa e no busto). A placa tem duas tábuas: "Ferro e
  couro" na letra dos portos, e em runas "Thrykar. Conserta o que você estragou. Não faço fiado." A receita é a do
  `jogo.md`: banha de bagre cego, pregos de barco que afundou com carga paga, trinta marretadas cantando pra sogra
  morrer, e a cena do bagre que não desviou da rede e da conta que parou no doze. Endyru conta as batidas, para no vinte
  e não diz nada. A unha do pé saiu. Ele continua só temperando as duas espadas; vender Temperado e Gravado fica com a
  banca da task 25.
- **36. A primeira ida do roteiro.** O casco no raso é a barcaça de grãos; um rochedo da margem (`rochedo`, depois do
  contrato) tem cinza de giz e pedra queimada, e vai pro diário. Antes da luta, Jarupã ("Bate na cabeça, cai"), Xanduí
  ("Quando a água cansar, você me avisa") e Oryndu apontando a saída: na água ele bebe o golpe. Na saída, Oryndu tira do
  lodo a estaca com o ferro de Ymboripe e um círculo de atração aberto ("Não precisava fechar. Só precisava gritar."),
  e a conselheira responde que o conselho precisa de mais que um pau. A pista de Ymboripe começa no fim do ato 1; a leitura
  ouvida pela guilda ficou de reforço. Ficaram de fora a passarela que o bicho parte e o recuo até a barcaça como
  objeto: o destrutível não tem `if`/`unless`, e o barco não pode estar de pé no ato 3. O objetivo continua o de
  aguentar até Oryndu tirar o grupo.
- **37. A estrada pela floresta.** Um acampamento antes do vau (`acampamento`, gatilho de uma vez): o círculo que não
  fecha "por um dedo", o giz que vira placar de dados e três cobres de Endyru que vão pro lado de Jarupã, e Xanduí, de
  costas pro fogo, com a última palavra. A tabuleta de fronteira caída (`tabuleta`): Xanduí a endireita de cabeça pra
  baixo e pede que Endyru veja se o nome do duque está certo; ele torce o pescoço e lê. Os contratados viraram os
  batedores da Tsvirana pagos pelo ducado, e depois da luta vem a Cura em Jarupã: o talho "raso", o pão duro comido de
  uma mordida e o imposto que abre outro buraco na barriga.
- **38. Jurendy e o castelão na ponte.** O ato 2 acaba numa luta só, na clareira do afluente (`ponte`): o afluente fundo
  com a ponte de pedra no meio e um barranco do outro lado, pintados no mapa da floresta. Jurendy (`encounter-jurendy`,
  Círculo de atração e repulsão, com Desarmar) lê do barranco; Mbyraku (o castelão, agora com nome) e dois escudeiros
  seguram a ponte. Antes, Jurendy reconhece Endyru (o nome riscado no mural das taxas) e faz a conta de Ymboripe sem
  vilania ("Rio abaixo sempre tem gente"); Xanduí repete a cláusula do contrato palavra por palavra (ela voltou pro
  edital), e a ponte da fala manda puxar o leitor do barranco. Na queda, Jurendy se rende e foge sem o livro, Xanduí
  chama aquilo de legítima defesa "com essas mesmas palavras", e no gibão de Mbyraku está a carta de três conselheiros
  de Ybytuguá ao senhor de Ymboripe, com o prazo da lua cheia. A conselheira a recebe dobrando o papel nas assinaturas.
  Saíram o recitador sem nome, a luta do pátio do castelo, o livro de contas e `papel_do_recitador`; o castelo por
  terra só mostra o guincho parado. O recitador fica no bestiário pros testes do motor.
- **42. O couro seca devagar.** Em seco, o Ykuruã fica lento e perde a Muralha da água, mas segura o que o Baluarte segura
  (2). No segundo turno dele fora d'água (`CRACK_TURNS`), o couro racha (`cracked_hide`, Couro rachado): Muralha zero e o
  golpe entra fundo, como antes era Em seco direto. Volta pra água, e o couro se refaz (`dryTurns` zera). Esperar o
  bicho na pedra virou regra. No `balance:matrix` (um contra um), o espadachim contra o Ykuruã foi de 35% a 32%.
- **40. A cheia sobe na luta.** Uma luta pode ter cheia (`Flood`; no mapa, `flood` = "3 2" num inimigo do grupo): de
  tantas em tantas rodadas, até tantas vezes, a água come um anel da margem — todo chão seco que não barra o passo e
  encosta de lado em água vira água, com o passo de água. O bicho de rio que estava ali volta a ficar Submerso. Uma deixa
  com `rise` faz a água subir na hora (a task 41 usa). A primeira subida dá à luta a própria grade (`ownGrid`): a cheia
  não alaga o mapa da área. No client, `waterRose` pinta o chão alagado de água barrenta, com o som grave. A luta final
  dos baixios tem cheia de 3 em 3 rodadas, até 2 vezes. Limite: um caixote quebrado depois da primeira subida não reabre
  o chão do mapa (só a cópia); nenhum mapa com cheia tem caixote.
- **39. O preparo na margem.** Antes da luta final, `a_cheia` oferece riscar os círculos na margem seca (`preparo`):
  Endyru mede a corda duas vezes, Jarupã rola dois barris de óleo e crava as estacas, o sinal do remo se combina, e vêm as
  falas de Oryndu ("Puxa um palmo, deixa a moça segurar o bote...") e de Endyru ("desde os quatorze anos"). Dá pra ir
  sem. O círculo gravado ganhou lugar no mapa: é um objeto (`circle` em `PROPS`) que se acende encostado nele, puxa o
  inimigo mais perto (o bicho de rio primeiro) três quadrados na direção dele, menos o peso, e não gasta mana nem chama o
  bicho. A água que sobe apaga o círculo que alcança (`washes`). Os destrutíveis passaram a aceitar `if`/`unless` e a
  seguir a história como o resto do mapa (aparecem e somem a cada `syncPresence`), e o que se mexeu numa luta está
  pronto de novo na seguinte. Os três círculos e os dois barris dos baixios só existem com `preparo`.
- **41. A virada pela metade da vida.** A deixa nova `hurt Nome 50` dispara quando alguém chega àquela parte da vida. A
  `final_pressa` saiu da rodada 3: vem quando o Ykuruã chega à metade, e faz a água subir (`rise`). Na cena, a chuva
  aperta e o bicho escorrega de volta pro canal, o braço de Jarupã está aberto, a lua da carta é amanhã (se o grupo tem a
  carta), e Endyru conta três fôlegos que não tem. Ele grita a página inteira, o estouro bate como um sino debaixo do rio,
  a cauda parte o barco, e a recitação pra puxar Oryndu quebra na segunda linha; Jarupã puxa só o remo. A marca de sangue e
  tremor agora também baixa o limite de mana em 1 e tira 3 de quem tenta segurar a recitação apanhando: na fase 2, o
  atalho estoura de novo e chama o bicho de novo. Endyru já é Círculo aqui, como decidido.
- **43. O silêncio na margem.** O `final_fim` é o do roteiro: o bicho morto na pedra, cheirando a lodo e ferro; Jarupã
  volta do raso com o remo partido de Oryndu e o amarra nas costas, sem piada; Xanduí limpa a espada no capim, aperta o
  ombro de Endyru uma vez e sobe o barranco; Endyru abre a boca e fecha. Saíram o corpo achado de manhã e o relatório
  escrito na areia (o relatório é da Mesa, na task 44).
- **44. A unificação na parede.** O `fim` não anuncia mais: Endyru escreve o relatório devagar, esperando a mão parar
  no fim de cada linha; a conselheira paga as três pilhas; três guardas de Ymboripe entram sem tirar a espada e pregam o
  edital por cima do da cheia; Endyru lê sem querer e para no meio; "A prata é a mesma"; e o estandarte da torre do cais
  troca. A parte de Oryndu na guilda ficou.
- **45. A bifurcação.** O `fim` termina em `bifurcacao`: a estrada de Kuatiarape e a da costa (Tanguratyba, Itamoguá),
  Endyru separando a taxa da universidade e a passagem pra escola que procura professor de fundamentos ("É empurrar
  coisa"), o almanaque que Jarupã dá a Xanduí "pra quando a gente for rico", ela segurando pela lombada do lado das
  folhas, "Vou ler no barco, que sacode menos", e Endyru olhando, abrindo a boca, calando, sorrindo, e o carneiro na
  porta da costa. A tela não diz o que ele viu. Saiu a cópia do relatório. Sem epílogo.
- **35. Os saqueadores do dique.** O armazém de cordas e óleo da guilda é uma sala de taipa nova colada na guilda, no
  mapa de Ybytuguá, com três caixotes e três barris de óleo. Lá dentro, dois saqueadores do Gryskar e uma saqueadora
  da Tsvirana (`encounter-saqueador-do-dique`, `encounter-saqueadora-do-dique`, mercenários de uma caravana que não sai
  mais), passivos até a porta: o gatilho dela (`armazem`) abre a cena toda vez que se entra, depois do contrato, e dá
  pra deixar a corda com eles. Antes da luta, Xanduí reparte o triângulo ("O da espada grande é meu. A da espada fina
  é sua") e avisa do barril. Na queda, a guilda paga seis de cobre e um Unguento. O mestre da guilda dá a deixa
  ("Arrancaram a tranca de madrugada"). No motor, o empurrão que bate (`slammed`): empurrado (não puxado) contra
  parede, destrutível ou corpo, o alvo leva 2 por quadrado que faltou andar (`SLAM_PER_TILE`), sem armadura, e o
  destrutível leva o mesmo — o barril de óleo quebra e derrama fogo. A IA ainda não mira o choque.
- **46. De Fio a Corpo.** A aura agora fica na ficha (`aura`, lida por `auraOf`; sem ela, a do elenco), como o nível de
  mago. O texto a sobe com `aura_rise("jarupa", 3)`: só sobe, só em quem luta de espada e já andou com o grupo, e a
  caixa anuncia "Jarupã chegou ao Corpo. Gryskar III." No elenco, Jarupã e Xanduí sabem a escola no grau 3, e o Fio os
  corta no 2 até a subida. Ela vem em `ponte_caiu`, depois que Jurendy foge: "Hoje ela pesou menos." / "Hoje você
  bateu menos." Os dons (task 26) continuam esperando o autor.
- **31. A voz do `jogo.md` em todo o texto.** Os textos das tasks 32 a 45 já vinham do roteiro; a passada final
  acertou o resto. Verso com maiúscula quando é o nível ("Sem Verso", "Verso pequeno"). Xanduí diz "Quebra de
  contrato" no calote do mercador, com o juiz de Kuatiarape e a mula, e na ponte o "Legítima defesa" vira eco: quem
  completa "Um dos dois" é Jarupã. Jarupã chama a Cura de reza; Oryndu não fala de mana ("onde a palavra grande
  bateu") e lê o caranguejo no junco antes da primeira ida; Endyru corrige o "estirão" de Jarupã no preparo
  ("Dezoito passos"). Depois que Oryndu afunda, Endyru corta a frase ("Deixa. Verso pequeno. A gente tem...") e
  abre o livro na primeira linha: é a última fala antes de a luta seguir, e aponta pro jeito lento.
- **26. Um dom pra cada espadachim** (aprovado pelo autor em 2026-10-29). Nenhum é golpe-selo: é o costume de cada um.
  Jarupã ganhou a Ombrada (`shoulder`): ação bônus, empurra um quadrado, e quem estava encostado na parede bate nela.
  Xanduí ganhou Segurar o Bote (`hold_the_lunge`): ação bônus, deixa o alvo Seguro (`held`, -4 no passo) por dois
  turnos. Com o Em seco, o Ykuruã não volta pra água: é o "deixa a moça segurar o bote" do preparo. É golpe, então o
  voto da Ipojy vale.
- **25. O cobre serve pra alguma coisa** (aprovado pelo autor em 2026-10-29). Uma banca na boca do cais de Ybytuguá
  (`banca`, um ponto sem boneco): a vendedora, pelo papel, vende Pão de Viagem a 2 de cobre e Unguento a 4, e não
  troca prata. Depois do contrato, o escrivão faz por 1 cobre a cópia selada do contrato ("Cópia selada a família
  recebe a parte"), e Xanduí a guarda dobrada sem abrir ("Estudante perde papel"). O cobre agora também paga os dados
  do acampamento e entra pela guilda, depois do armazém. Os saqueadores e a vendedora ganharam busto provisório.
- **A limpeza do Eälen** (2026-10-29). Saíram o `server/` (Express + Supabase), o `supabase/`, o `LORE.md` (o mundo do
  Eälen), o mapa de nós (`seed.ts`, e com ele `currentNodeId` na ficha), as skills e o MCP do Supabase e os worktrees
  velhos. O `balance:matrix` foi pra `client/scripts/balanceMatrix.ts` (`npm run balance:matrix` na raiz). Os pacotes
  viraram `@jogo/shared` e `@jogo/client`, e a pasta `shared/mock` virou `shared/data` (`ITEMS` no lugar de
  `MOCK_ITEMS`). Os itens têm ids do mundo (`item-unguento-de-barqueiro`, `item-pao-de-viagem`; o save foi pra
  versão 7, que os troca), as faixas de música também (`cidade`, `baixios`), e o que o jogo guarda no
  `localStorage` tem o prefixo `jogo:` (o que estava em `ealen:` muda de casa sozinho); o estado da história marca
  `historia` e ainda lê a marca antiga. Saíram os três dons e as quatro condições das Ordens que nada usava; o que
  os testes do motor exercitam virou kit de teste (`abrir`, `rede`), e os mapas de teste viraram `campo`, `trilha` e
  `porao`, com gente neutra. A ficha não fala mais em Ordem ("Isso não é arma de quem ele é"), e a arma diz quem a
  usa por `classes`. O `docs/motor.md` foi reescrito com os nomes deste jogo.
- **O bundle dividido** (a 40 da antiga lista do `docs/motor.md`). O build sai em quatro arquivos: o Phaser (1,4 MB, que não se
  divide), o Ink, a regra (`shared/`) e o jogo. O aviso de tamanho ficou no limite do Phaser.
- **O descanso de verdade** (a 11 da antiga lista do `docs/motor.md`). Em qualquer lugar, mas na tecla `Z` (ou Descansar, na pausa),
  e sempre escolhendo. A pausa curta devolve o Fôlego e metade da vida que falta, duas entre um acampamento e outro,
  sem gastar a Cheia. O acampamento come um Pão de Viagem a cada duas bocas de quem luta; quem fica sem acorda com
  metade do que faltava e com Fome, e a noite gasta a Cheia. Endyru começa com dois pães; a banca do cais vende mais.
  O save foi pra versão 8 (`shortRests`).
- **A furtividade** (a 12 da antiga lista do `docs/motor.md`, pedida pelo autor em 2026-10-30). Nada obriga a se esconder, e cada
  jeito de começar a luta tem o seu preço. Cada inimigo olha pra um lado (`facing` no Tiled) num cone de 6 quadrados, e
  ouve quem anda à vista a 2. Com `Q` o grupo se agacha e anda devagar: o olhar deles fica pintado no chão, e quem tem o
  grupo no olhar desconfia antes de ver (um "?" que vai do dourado ao vermelho). Escondido, `F` embosca e o outro lado
  entra Surpreso; pego no meio do bote, quem entra Surpreso é o grupo. À vista, `F` é a investida, chutar a porta: o
  grupo age antes de todos e a Força pode deixar o outro lado Abalado. Luta aberta pela história não dá vantagem a
  ninguém. Os inimigos da floresta e do portão ganharam direção.
- **A arte gerada** (pedida pelo autor em 2026-10-30; `docs/arte.md`). A escala é 48x48 por quadrado: a arte final entra
  pixel por pixel com o zoom 3 da câmera (`sheetScale`), e o provisório continua. Cada pessoa pode ter folha própria
  pelo nome (`person:Jarupã`), e o trio deixou de dividir o boneco da classe. `art/gerar_arte.py` pede à API de
  imagens da OpenAI o que `art/manifest.json` descreve (prompts em inglês): 18 retratos pintados (640x800), 22 folhas
  de 48x48 em pixel art (a folha sai do retrato, pra ter a mesma cara), o Ykuruã em 96x96 com a folha seca, as
  splash arts do trio, de Oryndu, do título e dos baixios, e o mapa do mundo. Converte, guarda o bruto fora do git e
  escreve `client/src/game/generatedArt.ts`, que o jogo lê. A tela de título usa a ilustração, a caixa de diálogo o
  retrato pintado, e `M` (ou Mapa, na pausa) abre o mapa do mundo. A skill `gerar-arte` tem os comandos. Quem desenha,
  por padrão, é o Antigravity (`--via agy`, o Imagen da assinatura do autor), numa pasta fora do projeto, com fundo
  verde que o script recorta; a OpenAI ficou como alternativa. O retrato e a folha de Endyru já saíram; o resto é a
  task 47.
- **14. Os nomes na história** (2026-10-31). Fichas de `mbyraku`, `jurendy`, `thrykar` e `castelo-da-volta`, os nomes
  em `alfabeto.md`, os brasões em `ymboripe` e `xerumbetyba`, e o mapa do autor em `referencias/mapa-do-mundo.md`.
- **20. A aparência conferida** (2026-10-31). As fichas não descrevem rosto, então o autor aprovou o que viu. O Thrykar
  ganhou `look` da ficha do povo demônio. Os prompts mudaram: a idade é de cada um (`young`), a espada de Jarupã não é
  mais enxada, o escrivão tem um livro só, e Endyru foi redesenhado. A floresta ganhou `Espada do vale` e `Lança da
  serra`, pra casas diferentes no mesmo grupo (`docs/arte.md`).
- **As peças guardadas na mochila** (do ramo `worktree-equipamento`, de 2026-10-09). O equipamento daquele ramo já
  estava todo no `main`, refeito; só faltava isto: a mochila (`I`) lista, depois dos itens, as peças que ninguém
  veste — as espadas temperadas de Thrykar, o que cai de inimigo —, com o que cada uma faz, e Enter leva à ficha pra
  vestir. As peças do ramo eram do mundo do Eälen e não entraram.

- **A interface nova** (pedida pelo autor em 2026-10-31, parecida com a de BG3). A coluna do grupo à esquerda, com retrato, vida, Fôlego, mana, nível e condições, na exploração e na luta. A barra embaixo em grade de quadrados com ícone, tecla, custo (verde a ação, laranja o bônus), quantidade e recarga; o que cada um faz aparece num cartão ao passar o mouse, e apagado ele diz por quê. Na luta, a ordem dos turnos no alto com o rosto de cada um, o registro à direita, os recursos do turno, o botão redondo de encerrar e a chance de acerto junto do cursor. Andando, o minimapa e as ações ao alcance numa pílula. A conversa virou uma faixa de lado a lado, com o selo do teste na escolha. Ficha com abas, retrato, lugares do corpo e atributos em quadros; mochila em grade (`Tab` troca de pessoa na ficha, no lugar de ←/→, que agora andam na grade). Título, saves, diário, gravar, som, descanso, pausa e mapa na mesma moldura. Os ícones são desenhados em canvas, provisórios (`icons.ts`), e a tela de título usa a splash de Oryndu até a do título existir (task 47). O motor e o save não mudaram. Detalhe em `docs/motor.md`.

- **O parado de verdade** (pedido pelo autor em 2026-10-31). O "parado" de perfil era uma passada da caminhada, e o boneco parava no meio do passo. Agora a pose de pé sai da própria folha, sem arte nova (`client/src/game/idlePose.ts`), e toda folha que entrar já vem com isso. Em cima dela, todo mundo respira, cada um no seu ritmo, e quem fica parado faz um gesto de vez em quando: suspira, pende o corpo ou olha em volta. Na luta o fôlego encurta e os gestos param; o Ykuruã só respira. Detalhe em `docs/motor.md`.

- **O cenário pintado** (pedido pelo autor em 2026-10-31: "muito feio e genérico"). `art/pintar_cenario.py` lê os mapas e pinta as quatro áreas em 48 pixels por quadrado, a mesma densidade dos bonecos: rio de margem torta com a água correndo por baixo, casas de enxaimel com telhado íngreme, o Castelo da Volta da ficha (pedra embaixo, madeira em cima, o pano amarelo com a corrente), barcos virados no barro do cais, a torre do cais, hortas e terreiro em vez de gramado, lavoura e vinha na margem sul do Ymonhã, junco e bruma nos baixios, faia e abeto na floresta. Quem entra numa casa vê o telhado sumir, na luta também. Os mapas continuam em quadrados de 16 e mandam na regra; 31 quadrados novos barram o passo, pra ninguém atravessar a torre, a Mesa ou a forja (a conta de quem se alcança não mudou). Enxaimel, vinha e guindaste de roda vieram da decisão de "uma terra como a Alemanha", e ainda não estão nas fichas. Detalhe em `docs/arte.md`.

- **49, 50 e 51. Bonecos maiores, o card inteiro e a tela limpa** (pedidos do autor em 2026-10-31). Os bonecos saem a 1,5 vez o quadrado, com o pé no quadrado dele, e a regra não muda. O "segundo card" era o de Oryndu, que por não lutar tinha o rosto cortado ao meio; agora todo cartão tem o rosto inteiro. As barras pretas vinham do formato da janela: a largura interna agora acompanha a janela, de 1280 a 1728 (`widthForWindow` em `config.ts`), e se a janela muda de formato a página recarrega e volta de onde estava (`viewport.ts`), esperando acabar a luta ou a conversa. Saíram da tela os números de vida, o nível no cartão (ficam ao passar o mouse), os quadrados vazios, os itens repetidos na barra, o nome da área em cima do minimapa e a dica de teclas. Na luta, saíram o retrato repetido na barra, a segunda fileira quando ela não faz falta, a legenda do Mover e o rótulo de encerrar (fica no cartão), e o registro mostra 5 linhas em vez de 12.

- **48. O `M` mostra a região** (pedido do autor em 2026-10-31). O painel (`RegionMapPanel.ts`) pinta a área em que o grupo está, com a água, o chão e o que está de pé (`paintRegion` em `Scenery.ts`), e marca o grupo, a gente da área e as saídas abertas, com o nome do destino. Inimigo não aparece, como no minimapa. A ilustração do mundo não abre mais em lugar nenhum do jogo; só sobra como reserva da tela de título, até a do título existir.

- **54 e 55. A voz e as opções** (pedidos do autor em 2026-10-31). `OptionsPanel.ts` abre no título e na pausa, no lugar do Som, com cinco abas. **Jogo**: dificuldade (a vida dos inimigos, `applyDifficulty` em `shared/tactics/difficulty.ts`: 70%, 100%, 135%), velocidade da luta e conversa que passa sozinha. **Tela**: tamanho dos bonecos, câmera, tamanho da letra (na conversa, nos cartões e no registro; os painéis de layout fixo continuam no tamanho deles), minimapa, barra de ações (sempre, só parado, nunca), registro da luta, números de vida e tremer a tela. **Som**: os três volumes e a voz. **Teclas**: as doze do mundo se trocam, e se a tecla já tem dono as duas trocam; Esc, Enter, Tab, Espaço, setas e números ficam fixos. **Controle**: `gamepad.ts` transforma cada botão na tecla que aquilo já usa, então toda tela funciona sem saber de controle; na luta, que se joga com o mouse, o analógico anda com um cursor, o A clica, o RB anda pelas ações e o Y encerra o turno. Testado com um controle simulado no navegador, não com um de verdade. A voz (`voice` em `audio.ts`) são duas sílabas sintetizadas sem palavra, na altura de quem fala, quando alguém começa a falar; narração não tem voz. Ninguém ouviu ainda: os números são de cabeça, e a troca por áudio gravado é em `audio.ts`.

- **56. O cinto e o que cada um leva.** A mochila continua sendo a do grupo, com a protagonista; cada companheiro tem um cinto de 3 lugares (`BELT_SLOTS`), que nasce quando recebe o primeiro item. A mochila (`I`) mostra uma pessoa por vez (`Tab`), e dali se usa ou se passa um item (`passItem`). Na luta, cada um usa na vez dele só o que leva. O acampamento come também do cinto. Na ficha, `X` deixa uma habilidade de fora das lutas (`benched` na ficha, `toggleBenched`), menos o último golpe que a pessoa sabe. Por enquanto não há limite de quantas se levam, então a escolha ainda não aperta: o limite é da task 80. O save não mudou de versão: os dois campos são opcionais.

- **64. Cair e levantar.** Quem chega a 0 fica caído e não ocupa o quadrado. Um aliado colado gasta a ação e o põe de pé com um quarto da vida, sem as condições, e ele volta à ordem dos turnos (`lift` no motor, `liftable` em `targeting.ts`). Enquanto houver alguém do grupo caído, a barra mostra Levantar quem caiu, e diz o que falta. O outro lado não se levanta. Se ninguém levanta, continua como era: numa luta vencida ele acorda com 1 de vida; se o grupo inteiro cai, é a derrota. Levantar por item ou por cura ainda não existe, e o caminho foi testado no motor, não numa luta na tela.

- **57. O tiro, a primeira parte.** Golpe de arma com alcance de 3 ou mais é um tiro (`isShot` em `attack.ts`; magia não é). Na segunda metade do alcance ele perde 2 de acerto, e com um inimigo colado em quem atira, mais 2. De um chão mais alto, alcança um quadrado a mais. A besta tem 12 virotes por luta, contados em cada golpe (`ammo` na arma). A chance na tela e a IA usam a mesma conta: o besteiro agora chega até a metade do alcance em vez de atirar do limite, e fica atrás da pedra quando ela está nessa distância. Cobertura parcial (+2 na defesa) e total (a pedra alta que corta a vista) já existiam. Ninguém do grupo usa besta hoje, então isto aparece nos inimigos. O resto ficou na task 57.

- **85. A árvore de habilidades, o motor** (pedida pelo autor em 2026-11-03). `shared/skillTree.ts`: cada nível depois do primeiro dá um ponto, e cada nó custa um. Três ramos por pessoa, cada nó pedindo o anterior, e às vezes um nível ou o Círculo: Endyru tem Atração, Repulsão e Preparo (o ramo do tema: Cura mais barata, mais Fôlego, uma gravação a mais); o espadachim, Lâmina, Corpo e o ramo da escola dele (o do Gryskar melhora a Ombrada de Jarupã, o da Ipojy o Segurar o Bote de Xanduí). O nó melhora o que a pessoa já sabe (alcance, acerto, custo, recarga, empurrão, duração, dano) ou o corpo (vida, Fôlego, passo, gravações); valem na ficha, na luta e na gravação. Fica na ficha (`skills`), sem versão nova de save. Os nomes e os números são provisórios (task 87).
- **86. A árvore na ficha.** `R`, na ficha, abre a árvore na coluna da direita: cada nó com o ramo, o que é, o que faz em números e o que falta (o nível, o Círculo, o de cima, o ponto). Enter aprende. A ficha mostra quantos pontos sobram, e subir de nível avisa do ponto novo. Testado no motor (`skills.test.ts`), não numa partida na tela.
- **67. O relógio dentro da luta.** A deixa nova `clock N` dispara quando o relógio da história chega em N no meio da luta, contando o que cada rodada virada gasta (`FightClock` na luta, `clockNow` no motor); luta sem relógio não a dispara. Fora de luta, o relógio ganhou o custo `area`: `clock_cost("area", 1)` faz cada área em que se entra, por saída ou viagem, gastar o tempo. Por passo ficou de fora: a Cheia anda por dia, não por passo. Nenhum mapa usa as duas ainda; quem decide onde é o roteiro.
- **91. A árvore com cara de árvore.** Na ficha, `R` não abre mais uma lista: cada ramo é uma coluna, com o nome em cima e os nós de cima pra baixo, cada um com o ícone da habilidade que melhora (ou do corpo que mexe), ligados por uma linha que fica dourada no que já se aprendeu, e uma bolinha dourada no nó aprendido. O que não dá pra aprender ainda fica apagado. Setas (ou WASD) andam entre ramos e nós, o mouse em cima mostra o nó e o clique aprende. Os ícones são os provisórios de `icons.ts`. Ninguém viu na tela ainda.
- **62. Mais condições e tipos de dano.** Sete condições prontas pro que vier: Envenenado (1d4 por turno), Sangrando (1d6), Atordoado (perde a vez), Preso (não anda), Calado (não conjura: o botão apagado diz por quê), Com medo (-2 no acerto, -1 de Couro) e Cego (-4 no acerto, e quem o ataca acerta mais). O dano tem tipo: a arma diz o dela (a espada corta; o chuço e a besta furam; o bordão e a mão vazia batem) e a magia de Endyru é de atração e repulsão; a linha da habilidade mostra. Criatura pode resistir ou sofrer mais com um tipo (`resist` no bestiário), na regra e na conta da IA. Nada do jogo põe as condições novas, e nenhuma criatura resiste a nada: o que cada bicho aguenta é fato dele, e espera a entrada no bestiário da história (§1).
- **63. A Disparada e o Ajudar** (a primeira parte). Todo mundo do grupo, desde o nível 1, tem dois verbos a mais na barra. A Disparada gasta a ação e dá o passo inteiro de novo naquele turno (o número sobe em cima do boneco). O Ajudar gasta a ação num aliado colado, nunca em si: ele sai Ajudado, com +2 no acerto até o fim da vez seguinte. As criaturas não os ganham. Os nomes e as falas são provisórios, como os da árvore.
- **59. Jogar fora, arrumar e o item-chave** (a primeira parte). Na mochila, Enter num item oferece, além de usar e passar, jogar fora uma unidade, com um sim antes; numa peça guardada, vestir pela ficha ou jogar fora. `O` arruma a mochila ou o cinto: o item-chave primeiro, depois por nome, sem encaixe vazio no meio. O item-chave (`key`) não se joga fora nem se passa, e a mochila diz isso; nenhum item do jogo é chave ainda.
- **57 e 59. O item na mão de quem precisa.** Na luta, o item sai de quem o leva e vai nele ou num aliado à vista, até três quadrados, pela ação bônus. Sem ninguém ao alcance, o botão usa na hora; com alguém, pede em quem, e o registro diz em quem pegou. Em inimigo, não.
- **69. As ordens** (a primeira parte). Com os companheiros jogando sozinhos (Opções), a barra de Endyru ganha um botão por companheiro, que troca a ordem dele sem gastar nada: avançar (o de sempre), segurar posição (não sai do quadrado) ou proteger Endyru (fica colado nele, e bate em quem chegar). A ordem vale até o fim da luta, e o registro diz quem mandou o quê.
- **90. A árvore que se escolhe sozinha** (a primeira parte). Opções, Jogo, Árvore dos companheiros: em Eles escolhem, Jarupã e Xanduí gastam os pontos sozinhos toda vez que ganham XP, numa ordem por classe que alterna os ramos (o da escola primeiro) e pula o que ainda não pode. O painel do fim da luta diz o que cada um aprendeu. A árvore de Endyru é sempre do jogador. O padrão é Eu escolho.
- **88. Desaprender no acampamento.** Depois de acampar, e até o primeiro passo ou a próxima luta, `U` na árvore devolve todos os pontos de quem está na ficha (`unlearnSkills`), de graça: a noite já foi paga. A vida que os nós davam sai da ficha. Fora do acampamento, a ficha diz que não dá.

- **93. A IA dos aliados, mais esperta.** O item vai no aliado ao alcance do braço quando vale mais nele (o Unguento em quem está por um fio; o reforço só em quem já está ameaçado; o Foco nunca, que é de quem bate agora). O empurrão é mirado no que faz bater: a IA espelha o caminho do empurrão, e a parede, o corpo e o barril de óleo entram na nota, com o fogo que ele derrama. O grupo pesa o Contragolpe da Ipojy (a chance de errar vezes o golpe que volta); o outro lado continua batendo na Espera como em qualquer um. A Disparada sai quando não há em quem bater, pelo caminho que encurta (nunca parado por ordem), e o Ajudar só vale em quem tem inimigo perto. Só o grupo tem os dois verbos (o bestiário só sabe o que nomeia). No `balance:matrix` as lutas ficaram meio turno mais curtas, e o espadachim contra o Ykuruã foi de 32% a 26%: a Disparada o leva mais cedo pra perto do bicho.
- **69. As ordens, o resto.** A IA olha o objetivo da luta: o companheiro sem ordem anda até o objeto que a vence (o guincho da corrente) e o solta quando chega, e acende o círculo gravado quando ele tiraria o Ykuruã da água. A ordem nova é mirar: o companheiro vai atrás de um inimigo só e só bate nele, até ele cair. O botão do companheiro agora pede em quem: nele, segurar (ou avançar, se já segurava); num aliado, proteger esse; num inimigo, mirar; o botão de novo, avançar. Testado no motor, não na tela.
- **92. O modo da luta à vista.** A opção escondida (Companheiros na luta) agora aparece na luta, à direita da barra: "Modo: manual" (o jogador comanda o grupo inteiro) ou "automático" (a IA comanda Jarupã e Xanduí, e o jogador só Endyru). O clique nele, a tecla `G` ou o Select do controle trocam na hora, até no meio da vez de um companheiro. É o mesmo valor das Opções. O modo por pessoa ficou na lista. Ninguém viu na tela ainda.
- **80. O Fôlego não se enche enrolando.** O que a guarda devolve no meio da luta só vale dentro dela: a ficha sai da luta com, no máximo, o Fôlego com que entrou. Enrolar o fim de uma luta em guarda não enche ninguém; quem enche é o descanso. O resto da 80 continua na lista.
- **57 e 63. O Vigiar.** Mais um verbo de todo mundo do grupo, desde o nível 1: gasta a ação, e até a vez seguinte o primeiro inimigo que ENTRAR no alcance do golpe da arma leva o golpe, na reação ("Vigia!" sobre a cabeça). Quem já estava no alcance não dispara nada. A Ipojy não vigia antes de a luta abrir. A IA vigia quando não alcança ninguém neste turno, contra quem precisa vir até ela e chega a tempo (o companheiro parado por ordem é quem mais usa), e quem anda conta o golpe de quem vigia antes de entrar no alcance. As criaturas não sabem (o bestiário só sabe o que nomeia). O nome e a fala são provisórios, como os da Disparada. Testado no motor, não na tela.
- **90. O balanço por nó.** `npm run balance:matrix -- --nos 100` mede cada nó sozinho, no nível 1, contra a mesma pessoa sem nó: o espadachim uma vez por escola (Gryskar com a Ombrada, Ipojy com o Segurar o Bote), o mago na Página e, pros nós do Círculo, no Círculo. O primeiro passe (100 lutas por célula, uns 15 minutos): nenhum nó vale demais; os que mais rendem são a Ponta Funda (+8 a +13 contra o Ykuruã e a Lança), o Couro de Estrada (+3 a +8), a Página Certa e o Empurrão Largo (até +8) e o Arremesso Pesado (+2 a +7 em quase tudo). Não mudam nada numa luta: o Verso de Longe e o Puxão Fundo (a IA quase não puxa num um contra um), a Leitura Sem Pressa (a Cura barata, e ele luta sozinho), o Mais um Texto (a matriz não grava nada) e o Fôlego de Biblioteca, este de verdade: o mago não gasta Fôlego em nada, então o nó é vazio pra ele. Ombro Pronto, Ombrada Funda, Mão Que Não Solta e Segurar Sem Cansar ficam entre -2 e +2. Xanduí contra a Lança de Ymboripe, as duas da Ipojy, nunca acaba (as 900 lutas sem fim da tabela): nenhuma pode dar o primeiro golpe. No jogo não acontece, porque Jarupã e Endyru sempre abrem, mas a matriz de um contra um mostra.
- **58. Os pontos de atributo.** Além do que o nível soma sozinho, cada nível depois do primeiro dá um ponto de atributo pra pôr onde o jogador quiser (`attributePoints`, `raiseAttribute` em `shared/leveling.ts`). O de Vigor dá 3 de vida na hora. Fica na ficha (`raised`, sem versão nova de save) e não se tira. Na ficha, `T` abre a lista; o rodapé diz quantos sobram, e subir de nível avisa. Com a Árvore dos companheiros em Eles escolhem, Jarupã e Xanduí põem os deles sozinhos, revezando entre os da classe (`autoRaise`). O grau do estilo valer alguma coisa ficou com a task 89. Testado no motor, não na tela.
- **65. O registro de missões.** A história guarda, junto com o diário, as missões (`quest`, `quest_done`, `quest_failed`, `quest_state` no Ink; `openQuest` e `closeQuest` em `shared/story/memory.ts`): aberta, cumprida ou falhada, com o que cada uma pede nas palavras de quem pediu, e nunca a resposta. Vão no mesmo texto do save da história, sem versão nova. No `J`, `Tab` troca o Diário pela aba Missões: as abertas em cima, as fechadas embaixo. A caixa anuncia cada mudança. São três, com texto PROVISÓRIO tirado só do que já se diz no roteiro (vai pro autor com a 87): o contrato da cheia (abre na Mesa, cumpre no relatório), o armazém da guilda (abre com o mestre, cumpre com os saqueadores) e "Cedo demais" (abre quando a conselheira manda perguntar à guilda, reescreve com a leitura na margem, cumpre na ponte e falha se o conselho chama sem a carta). O teste do caminho inteiro confere os três. A tela não foi vista.
- **60. A loja.** `shared/shop.ts`: cada loja (`SHOPS`) diz o que vende, por quanto, em que moeda e quanto tem; o preço é dela, não do item. O texto a abre com `shop("banca")`, e a cena mostra o `ShopPanel` quando a conversa acaba: comprar, e numa segunda aba (`Tab`) vender o que ela compra de volta, pela metade. O estoque acaba e fica guardado com a história (`sold`, no mesmo texto do save, sem versão nova); a mochila cheia não leva o dinheiro; item-chave não se vende. A banca do cais passou pra loja, com os preços e as duas falas do roteiro, sem fala nova. São PROVISÓRIOS os 6 pães e 4 unguentos e a compra de volta, que vão pro autor com a 87. Testado no motor e no caminho da história, não na tela.
- **89. O grau vale no golpe** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). O grau não sobe na árvore: quem o corta é a aura, e o grau 4 traria o golpe-selo, que só vem por iniciação. O grau rende no traço: a vantagem no triângulo ganha 1 por grau acima do 2 (`styleEdgeBonus`), a Onda acumula até o grau mais 1 (`momentumCap`) e a Rachadura multiplica por 1,5 mais um quarto por grau (`crackFactor`, o dobro no 2). O Contragolpe não cresce. Com isto, o Corpo de Jarupã e Xanduí na ponte vale na luta.
- **87. Os nomes da árvore fechados** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). Os 20 nós ficam com o nome e a fala que tinham, menos um: o Fôlego de Biblioteca, que dava Fôlego a quem só gasta mana, virou Anos de Biblioteca (`ar.anos_de_biblioteca`), +2 de mana máxima (`mana` no `passive`, somado em `maxMana`). Quem tinha aprendido o nó velho ganha o ponto de volta. Não há ramo da Tsvirana (ninguém do grupo é dela) nem ramo próprio da Cura (ela mora no Preparo). O estoque da banca (6 pães, 4 unguentos), a compra de volta pela metade e o texto das três missões ficam como estão.
- **57. O resto do combate à distância** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). O item que se joga num inimigo (`throw`): o Pote de Óleo, óleo de lampião da guilda, quebra em cima sem rolagem (1d4) e deixa o quadrado pegando fogo por 2 rodadas, menos na água. A guilda dá dois depois do armazém ("Óleo eu tenho. Barco pra levar, não."). A IA o joga quando vale, e a tela pede o inimigo e diz por que o botão está apagado. O besteiro do pedágio vigia (`vigiar: "Mira na Corrente"` no `arts`). A nota da vantagem de escola na tela mostra o número de verdade, com o grau (`styleToHit`). O virote como item ficou de fora: ninguém do grupo usa besta, e sistema que nenhuma cena pede não entra.
- **59. Os itens-chave de verdade** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). A estaca, a carta de Mbyraku e a cópia selada viraram itens (`key`, efeito `none`), com descrição tirada só do que a cena já diz. A estaca entra em `primeira_oryndu` e fica; a carta entra em `ponte_caiu` e sai em `chamado`, quando a conselheira põe a palma da mão em cima; a cópia entra no escrivão. As flags (`estaca`, `prova`) continuam mandando no texto. O item-chave sempre cabe na mochila. Materiais ficam com a task 72; limite por peso não entra: a mochila de 12 e o cinto de 3 já apertam, e nenhuma cena pede carga.
- **95. As peças novas em uso** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). O golpe de uma criatura pode deixar uma condição (`riders` no bestiário, pela chave da Arte). A Bocada do Ykuruã sangra por 2 turnos e a Investida abala por 1; o Fechar a Corrente de Mbyraku prende por 1. O Ykuruã resiste à pancada (`impacto` 0.5). O atordoar na Investida foi testado e saiu: no `balance:matrix` o espadachim sozinho contra o bicho caiu de 18% a 8%; com o abalar, ficou em 18%. Veneno, Atordoado, Calado, Com medo e Cego continuam no motor sem uso, e a deixa `clock N` e o custo `area` do relógio também: nenhuma cena pede, e a Cheia já cobra o descanso e a luta. O item-chave entrou com a 59.
- **60. As lojas, fechadas** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). A banca do cais é a única loja. Thrykar não vende: a placa dele diz "Conserta o que você estragou", ele só tempera as duas espadas, e o Gravado é trabalho de mago (`magia` §5.4, §7.4). O estoque da banca e a compra de volta pela metade ficam.
- **52 e 53. Sem passagem muda e sem parede invisível** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). Cada passagem fechada diz por quê, num gatilho que fala toda vez que se pisa: a estrada pra oeste do Ymonhã, na abertura (`estrada_oeste`: "Pelo rio, meio dia."); a estrada do norte de Ybytuguá antes do ato 2 (`estrada_norte`, com o contrato ou sem); a trilha do barranco, depois da ponte, rio acima (`trilha_barranco`). A clareira a nordeste da floresta, depois dos batedores, tem o acampamento deles e um Pão de Viagem (`clareira`, `contratados_vencidos`). As bordas que se alcançam ganharam árvore (o Ymonhã dos dois lados da margem norte, os baixios a oeste, as pontas do cais de Ybytuguá, a trilha do barranco), e a borda leste dos baixios virou canal fundo, que barra o passo; o fundo agora é pintado escuro, com espuma na beira (`paint_baixios`). Os cenários foram repintados.
- **13, 15, 92 e a 63 dos dons** (decidido pelo co-autor em 2026-11-04, ver `docs/escolhas.md`). Não entram bichos da floresta: o Ykuruã é a primeira criatura do bestiário, e a floresta é de gente (os homens de Ymboripe, os batedores). Os mapas ficam com a disposição de hoje. O modo de luta por pessoa não entra: o manual e o automático à vista bastam. Empurrar, derrubar e agarrar não viram verbo de todo mundo: são os dons de Jarupã (a Ombrada) e de Xanduí (Segurar o Bote), e dar a todos tiraria deles o que é deles.

## 9. Onde isto está no cânone

Gravado no repositório da história com a aprovação de 2026-10-19:

- `referencias/bestiario.md` §1: o Ykuruã.
- Fichas novas: `ymonha`, `ybytugua`, `oryndu`, `ymboripe`, `kuatiarape`.
- Fichas que mudaram: `xerumbetyba`, `endyru`, `jarupa`, `xandui`.
- `alfabeto.md`, `estado.md` e a bíblia (nomes aprovados).
- A `mesa-dos-contratos`: o balcão onde o contrato de Ybytuguá se registra (nome da companhia, nível, fiança).
- Em 2026-10-31: `mbyraku`, `jurendy`, `thrykar`, `castelo-da-volta`, os brasões e `referencias/mapa-do-mundo.md`.

O que o jogo ainda quiser e não estiver lá (nome de gente, criatura nova) vai como proposta, e até a aprovação
o jogo usa o papel no lugar do nome: o castelão, o mercador, a conselheira, o ferreiro.

## 10. Delegação ao Antigravity

O Antigravity CLI (`agy`, o sucessor do Gemini CLI) está disponível pelo subagente `antigravity-delegate`.

- Delegue a ele: leitura e resumo de docs ou logs grandes, pesquisa em muito material, boilerplate, testes
  repetitivos, conversão de formatos.
- Não delegue: planejamento, arquitetura, refactors delicados, bugs sutis, mudanças que dependam de entender o
  projeto inteiro, e a revisão final. Nem texto do jogo ou fato do mundo: o cânone (§1) não passa por ele.
- A arte é a exceção que escreve arquivo: `art/gerar_arte.py --via agy` pede cada imagem ao `image-generator` dele,
  numa pasta temporária fora do projeto. O prompt (a aparência, que é cânone) vem de `art/manifest.json`, escrito
  aqui; ele só desenha, e cada imagem é olhada antes de entrar.
- Só delegue quando a tarefa for grande e bem isolada. Em tarefa pequena, faça você mesmo: o custo de montar o
  contexto não compensa.
- Todo código vindo do Antigravity é rascunho: leia, compare com as convenções do projeto, rode typecheck, lint
  e testes, e corrija antes de aplicar.
- Nunca envie segredos ou código sensível ao Antigravity.
- Ao fim de cada task, diga em poucas palavras o que foi delegado e o que você corrigiu.
