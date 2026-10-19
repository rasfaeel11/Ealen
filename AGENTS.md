# Jogo — Três na Estrada (título provisório)

Conteúdo do jogo, para ser transferido ao AGENTS.md do repositório do jogo. Não é arquivo do cânone: o que
aqui virar fato do mundo só entra na história quando o autor aprovar as fichas da §9.

Linhas marcadas com [PROPOSTA] foram completadas pelo co-autor e aguardam a aprovação do autor.

> RPG tático pra navegador, de 2 a 4 horas, passado no mundo da série de Karuã, uns 25 anos antes do Livro 1 [PROPOSTA].
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
  onde vem o alerta [PROPOSTA].
- O mundo é maior que o grupo: camponeses e barqueiros que vivem pelas estações e pela cheia, cidades que
  mudam de dono.
- Mostrar, não contar. Ninguém explica ao outro o que os dois já sabem. Sem flashbacks.
- Começa com um pouco de ação.

### 1.3 Nomes

Gente e lugar humanos seguem a língua humana de `alfabeto.md` (tupi-guarani: sem l, f, z, v nem rr; sílaba
termina em vogal; lugares em -tyba, -guá, -pe). Demônio, elfo e dragão, cada um na sua. Nome novo confere a
lista de nomes já usados e vai pro autor antes de entrar.

## 2. Onde se passa: Xerumbetyba antes da unificação [PROPOSTA]

- **Xerumbetyba** (no cânone: reino humano do interior de Yrandupe, vizinho de Tanguratyba, famoso pela maior
  universidade e pelas maiores bibliotecas). No Livro 1 já é um reino só; no tempo do jogo é uma colcha de
  ducados, senhorios e cidades livres às vésperas da unificação [PROPOSTA].
- **O Ymonhã**, o rio grande [PROPOSTA]: a espinha da região. Cada senhor dono de uma margem cobra pedágio de
  quem desce. Castelo de pedágio, corrente atravessada no rio, ponte fechada.
- **Bacias como fronteiras** [PROPOSTA]: cada afluente é um senhorio; a floresta e a serra entre duas bacias são
  terra de ninguém, onde se contrata aventureiro.
- **Ybytuguá**, a cidade livre [PROPOSTA]: sem senhor nem exército, com conselho de guildas e dinheiro. Vive do
  comércio do rio. Por isso contrata gente como o trio.
- **O ducado de cima** [PROPOSTA]: o senhorio mais forte, rio acima, que vai unificar a região. Nome a criar.
- **A universidade** já está lá, em outra cidade: é de onde Endyru sai (§3.1).
- **A unificação** fecha o jogo [PROPOSTA]: a cidade livre se rende ao ducado de cima, e a era dos contratos
  naquela terra acaba.
- O mapa do jogo é pequeno, como o do Livro 1: um trecho de rio com um castelo de pedágio, a cidade livre, os
  baixios onde mora a criatura, a floresta entre as bacias.

## 3. O grupo

Protagonista fixo, sem criação de personagem. **O trio se forma no jogo.**

### 3.1 Endyru — mago, atração e repulsão
- Humano. Futuro professor da cadeira de atração e repulsão em Itamoguá.
- Estudante da universidade de Xerumbetyba, sem dinheiro pra terminar: desce o rio atrás de contrato [PROPOSTA].
- Nível de mago no começo: Página; chega a Círculo no fim do jogo [PROPOSTA]. (Karuã chega ao Círculo aos 13,
  "o mais novo da história": Endyru tem de ser mais velho que isso quando chega lá.)
- É quem lê: contratos, placas, cartas, mapas.
- Apressado: quer o dinheiro, o nível e o nome, tudo agora. O jogo cobra isso dele (§6).

### 3.2 Jarupã — espadachim, Gryskar (o Bate-Primeiro) [PROPOSTA]
- Humano, canastrão, nada culto. Bate primeiro e pergunta depois.
- Nível de aura baixo (Punho ou Fio) [PROPOSTA].
- Já anda com Xanduí quando o jogo começa; os dois são dupla de escolta de barco [PROPOSTA].

### 3.3 Xanduí — espadachim, Ipojy (a Espera) [PROPOSTA]
- Humana, canastrona, nada culta. Não sabe ler e nunca disse.
- Da Ipojy: é ela, anos depois, quem ensina Exandy [PROPOSTA]. O voto: nunca dá o primeiro golpe.
- **Por que o trio existe** [PROPOSTA]: o contrato de Ybytuguá exige que alguém do grupo saiba ler, para assinar
  e para o relatório ao conselho. Jarupã não lê; Xanduí diz que "a letra dela não serve pra conselho" e é ela
  quem insiste em levar o estudante. Ninguém nunca diz por quê.
- **Como o segredo vive no jogo:** pela forma, nunca pela fala. Ela pede que Endyru leia "porque ele lê
  bonito", segura um aviso de cabeça pra baixo uma vez, decora o que ouve e repete palavra por palavra. O
  jogador atento percebe; ninguém no jogo percebe. É ironia pra quem leu o cap. 13 do Livro 1.

### 3.4 Oryndu — barqueiro [PROPOSTA]
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
| Traço de cada estilo | Gryskar = a Onda (pressão no mesmo alvo); Tsvirana = a Rachadura (pune quem repete); Ipojy = contra-ataque em quem a ataca e erra [PROPOSTA] | `ipojy`, `gryskar`, `tsvirana` |
| Grau do estilo (só aparece) | **Proficiência 1 a 7 por escola**, nunca acima do nível de aura; golpe-selo a partir do 4, só por iniciação (o trio não chega lá) | `magia` §5.6 |
| Fôlego | **Fôlego** pra técnica de espadachim, **Mana** pra quem conjura | `magia` §4, §5.1 |
| Golpe pesado custa Fôlego | **Mana gasta de uma vez cobra do corpo**: passou do limite num turno, vem a marca | `magia` §4.1, §4.2 |
| `afflict` (Braço ferido) | **Marca da mana exaurida**: atração e repulsão dá sangue pelo nariz e tremor (acerto menor). A leve passa com descanso; a enorme não acontece com o trio | `magia` §4.2 |
| Habilidade usada na hora | **Recitada**: leva tempo. Declara num turno, sai no seguinte; apanhar no meio pode quebrar [PROPOSTA] | `magia` §2.5 |
| — | **Gravada**: preparada fora de luta, no descanso, num objeto ou círculo. Na luta só se ativa, sem tempo de recitar. Cada texto gravado serve a uma coisa só | `magia` §2.5 |
| Golpe de abertura | **Círculo gravado no chão**: a emboscada do mago é preparar o terreno antes | `magia` §2.5 |
| Mania `retaliates` do fiscal | **Voto da Ipojy**: quem é da Espera nunca abre a luta, não embosca e não dá golpe de abertura | `ipojy` |
| Cura do Luminar | **Cura**: magia de primeiros socorros, separada dos conceitos. Acelera, e **quem paga é o paciente** (Fôlego, fome) | `magia` §4.3 |
| Kits por Ordem | **Repertório por nível**: atração e repulsão no Círculo arremessa, desarma, desvia projétil, puxa-se até um ponto (o puxão e o empurrão do Guardião já fazem isso) | `magia` §3.5 |
| Curva de poder | **Nos níveis baixos o espadachim amassa o mago.** Endyru é controle e preparo; quem mata são os dois | `magia` §5.3, §7.3 |
| Atributos Tirán (Dain, Eir...) | Nomes simples, em português: Força, Fator, Vigor, Olho, Couro, Lábia, Saber [PROPOSTA] | — |
| Povos de Eälen | Humanos, demônios, elfos, dragões, meio-elfos | `biblia` §3.4 |
| Gil, o apoio que anota | Oryndu, o barqueiro que lê a água (§3.4) | — |
| Relógio "Luz do dia" | **Relógio da cheia**: o rio sobe com a estação, e com ele a criatura (§5) | camponeses pelas estações |
| Diário que some (Coletor de Lembranças) | **Sai.** Era do Eälen. O diário continua guardando fatos, não conclusões | — |
| Fiscais na ponte | **Castelo de pedágio no Ymonhã**: a mesma luta, agora com razão no mundo | §2 |
| Equipamento | Níveis do cânone: Ferro-cru, Temperado, Gravado, Recitado. Estelar e Dracônico ficam fora do alcance do trio | `magia` §7.4 |
| Dinheiro | Cobre e prata | — |

## 5. A criatura: o Ykuruã [PROPOSTA inteira]

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
- Nome: humano, Ykuruã. Na língua dos portos, **o Bebe-Cheia** [PROPOSTA]. Alternativas: Ypuãma, Mbykuruã.

### 5.2 O que a gente do rio sabe
- "Na cheia, ninguém conjura no rio." Barqueiro usa Verso pra puxar a rede e mais nada.
- Bate-se com remo no casco, devagar, pra saber se ele está embaixo. Pressa no rio é coisa de forasteiro.
- Os velhos tiram o barco da água e esperam a cheia passar. É a regra do tempo do mundo, vivida por camponês
  e barqueiro, sem ninguém dizer o tema.

### 5.3 Na luta
- **Na água**: cura a cada turno, se esconde (só a ponta das costas à vista), escolhe onde emergir. Bater nele
  ali é quase inútil.
- **Atraído pela pressa**: toda vez que alguém passa do limite de mana num turno (a mesma conta que dá a marca),
  ele vai pra cima de quem conjurou e ganha um turno a mais [PROPOSTA]. Peça nova do motor: uma deixa
  `when: burst`.
- **Como se vence**: tirando-o da água. Atração e repulsão no Círculo puxa, mas não puxa um bicho desse
  tamanho de uma vez sem passar do limite. O jeito é puxar aos poucos, turno após turno, com Versos pequenos ou
  círculos gravados na margem antes da luta, enquanto Jarupã e Xanduí o seguram. Na terra o couro racha, e aí a
  espada entra.
- O tema vira mecânica: quem tem pressa chama o bicho; quem prepara e espera o vence.
- No bestiário do motor: grande (2x2 se o motor ganhar unidade grande; senão 1 quadrado e uma área de alcance
  maior), Baluarte de criatura com Muralha alta na água e baixa na terra.

## 6. A história do jogo [PROPOSTA; o autor decidiu os pontos da abertura do arquivo, o co-autor o resto]

Três atos, 2 a 4 horas, umas 10 a 15 lutas e dois chefes (o castelão do pedágio e o Ykuruã).

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
  estrada; ele dá a ela, de presente, alguma coisa escrita que ela guarda sem ler [PROPOSTA].
- Nada de epílogo explicando o futuro. Quem leu os livros sabe.

## 7. A base técnica

O código parte do Eälen (Phaser 3 + Vite no `client/`, regra pura em TypeScript no `shared/`, `server/`
opcional). Ele já tem 22 fases prontas, e os sistemas funcionam. O que não funcionou foi a ordem de trabalho.

- A descrição técnica completa do Eälen (motor tático, mundo em Tiled, Ink, save, som, sprites) **sai do
  AGENTS.md e vai para `docs/motor.md`**, sem mudar. Ela continua valendo para tudo que a tabela da §4 não troca.
- Trocar um nome do Eälen por um deste mundo é trocar em todo lugar: código, testes, Ink, mapas, save.

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

### P0 — a conversão (o jogo não existe sem isto)
| # | Task | O que é |
|---|---|---|
| 5 | **Recitada e Gravada** | Recitada com tempo (declara, sai no turno seguinte, pode quebrar). Gravada preparada no descanso, num número limitado de objetos e círculos, ativada sem tempo. O círculo no chão como golpe de abertura. |
| 6 | **Cura que cobra o paciente** | A cura tira do alvo (Fôlego, fome) o que acelera. |
| 7 | **O elenco** | Endyru, Jarupã, Xanduí e Oryndu no lugar de Halmira, Lish, Varel e Gil. Ordens destraváveis e `ClassSelect` saem. |
| 8 | **O Ykuruã** | Cura na água, Muralha que muda na terra, deixa `when: burst` (alguém passou do limite de mana), puxar aos poucos funcionando contra ele. Unidade grande, se couber. |
| 9 | **Atributos com nomes do mundo** | Depois da aprovação do autor. |

### P1 — o conteúdo
| # | Task | O que é |
|---|---|---|
| 10 | **Mapas** | O rio com o castelo de pedágio, Ybytuguá, os baixios, a floresta entre as bacias. |
| 11 | **O texto** | Ink, ato por ato, depois de o roteiro estar aprovado. |
| 12 | **Dinheiro e pedágio** | Cobre e prata; pagar o pedágio é uma das três saídas do castelo. |
| 13 | **Bestiário do resto** | Homens do ducado, gente do castelão e bichos da floresta, cada criatura aprovada como entrada no bestiário da história antes. |

### P2 e P3
Arte final, som gravado, balanceamento (`balance:matrix` com as escolas), tutorial, opções e o empacotamento
seguem as tasks 24 a 40 do Eälen, que vão junto para `docs/motor.md`.

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
  da Ipojy não ameaça ninguém. A mania `retaliates` do fiscal ficou junto, porque o texto provisório da estrada
  fala dela; sai quando o castelo de pedágio entrar no lugar.
- **4. Mana e custo no corpo.** `shared/mana.ts`: quem tem `magic` no elenco (conceito e nível de mago, Verso a
  Divindade) paga a magia em mana, que fica na ficha e só o descanso devolve. O limite por turno é o nível de mago.
  Passou dele, o motor solta `manaBurst` (a deixa `when: burst` do Ykuruã vai ler isto) e põe a marca do conceito:
  atração e repulsão dá Sangue e tremor, -2 no acerto. A marca sai da luta com ele, vai pra história como `afflict`
  e sai no descanso (ou na derrota, que acorda inteiro). Ninguém do elenco conjura ainda: Endyru entra na task 7.

## 9. O que precisa virar cânone na história

Nada disto foi gravado. Com a aprovação do autor, o co-autor grava:

- **Referência nova `bestiario`** (`referencias/bestiario.md`), com o Ykuruã como §1. Criatura não tem tipo de
  ficha, e a referência guarda o bestiário inteiro por tema, como a bíblia §7 pede.
- **Fichas novas:** `ymonha` (lugar), `ybytugua` (lugar), `oryndu` (personagem).
- **Fichas que mudam:** `xerumbetyba` (antes da unificação, a colcha de ducados e cidades livres; unificada
  uns 25 anos antes do Livro 1), `endyru` (estudou na universidade de Xerumbetyba; a estrada do jogo e a morte
  de Oryndu como origem do alerta ao filho), `jarupa` (Gryskar), `xandui` (Ipojy; ensina Exandy).
- **`alfabeto.md`:** Ymonhã, Ybytuguá, Ykuruã, Bebe-Cheia e Oryndu na lista de nomes.
- **`estado.md`:** a decisão do jogo em "Decisões recentes".
- Ainda sem nome: o ducado de cima.
