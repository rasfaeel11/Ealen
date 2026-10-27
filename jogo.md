# Jogo — Três na Estrada (título provisório)

Conteúdo completo da história, regras do mundo, direção de diálogos e conversão técnica para o repositório do jogo. É cânone: o autor aprovou a base em 2026-10-19, e os fatos do mundo estão gravados nas fichas e referências da história principal.

> **O que é:** RPG tático para navegador (2 a 4 horas), passado no mesmo mundo da série de Karuã, cerca de **25 anos antes do Livro 1**.
> **Quem joga:** **Endyru** jovem (futuro pai de Karuã). No caminho, forma o trio com **Jarupã** e **Xanduí** (futuros pais de Exandy), acompanhados por **Oryndu**, o barqueiro.
> **Motor:** Phaser 3 + TypeScript, mundo em pixel art, combate em grade travado no próprio mapa, diálogos em Ink.
>
> **A história vem primeiro.** O jogo anterior (Eälen) fez os sistemas antes e ficou com cenário, nomes e falas de placeholder até o fim, e não ficou bom. Aqui o mundo já existe: **todo sistema precisa servir a uma cena**. Sistema que nenhuma cena pede não entra.

---

## 1. Leis do Cânone e Limites do Jogo

O mundo mora no repositório da história (`historia-nova`, gerido pelo lore-pack). **A história manda; o jogo obedece.** Tudo o que aparece aqui foi extraído do cânone para que a IA do repositório do jogo não precise adivinhar nada.

### 1.1 O que o jogo NUNCA pode fazer
1. **Nenhum rosto do Enganador (Qashdum) aparece.** Nem Jupimã, nem Nhambiku, nem Zimridar, nem Mondaru, nem rosto novo. O Enganador não existe para este jogo. A unificação de Xerumbetyba (§2) é **política humana**, obra do duque Pytumã, sem dedo de imortal.
2. **Mito, árvore, canto e profecia nunca se confirmam nem se desmentem.** Um mural antigo ou uma estátua pode estar numa parede; ninguém explica o que significa nem prova nada.
3. **Nenhum vestígio da singularidade em cena.** Nenhuma pétala, nenhum objeto ou relíquia que gira ou responde a alguém.
4. **Nenhuma mystery box nova.** Toda trama aberta no jogo (por que a cheia subiu, por que o Ykuruã acordou tanto) tem resposta humana e material dentro do próprio jogo.
5. **O segredo de Xanduí nunca é dito em voz alta.** Ela não sabe ler e nunca contou, nem a Endyru, nem a Jarupã (§3.3). O jogador atento percebe pela ação; os personagens nunca descobrem.
6. **Ninguém do trio morre ou ganha cicatriz permanente que contradiga o Livro 1.** Endyru, Jarupã e Xanduí chegam ao Livro 1 inteiros, como professores e ex-aventureiros de classe média alta em Itamoguá. Marca de mana em Endyru, apenas a leve (sangue pelo nariz e tremor nas mãos), que passa em dias.
7. **Sem flashbacks.** Tudo acontece no presente da cena.
8. **Não aparecem:** Vethrun, Sem-Ferrugem (Rystløs), dragões de alto nível e o Descendente (Azukhar / Asukã).
9. **Nunca usar nome real** de pessoa, lugar, personagem de outra obra ou criatura de folclore real.

### 1.2 Tom e Tema
- **Adulto, terreno e sombrio.** A magia é cara e o mundo também. Preconceito, burocracia, pedágio e exclusão existem como na vida real, sem moral de fábula.
- **Tema central: respeitar o tempo num mundo imediatista.** A magia cobra a pressa no corpo; na estrada, a pressa de um cai no corpo de quem está ao redor.
  - **No jogo, a pressa é de Endyru.** No Livro 1, Endyru adulto é o pai cauteloso que vive engolindo o sermão sobre a pressa ("vivia decidindo que não era a hora"). O jogo mostra **de onde veio esse trauma**: quando jovem, a pressa dele matou Oryndu.
- **O mundo é maior que o grupo:** barqueiros que batem o remo devagar para ouvir o fundo, camponeses que vivem pela cheia, mercadores fazendo as malas, cidades livres que mudam de dono na caneta.
- **Humor seco e de personagem, que nunca ameniza a crueldade:**
  - Vem da canastrice prática de Jarupã e Xanduí e do contraste com o academicismo apressado de Endyru.
  - Vem do **humor literal dos demônios** (estilo "tio do pavê" de cara fechada): placas e nomes dizem exatamente o que são (*"Comida. É peixe."*, *"Ferreiro. Bate."*), e receitas de forja parecem absurdas (*prego de caixão de homem honesto, sal chorado, cuspe de quem está devendo*), mas são encantamentos de entropia disfarçados de tradição de oficina — e funcionam.

### 1.3 Línguas e Regras de Nomes (`alfabeto.md`)
Se o jogo precisar de nome para NPC secundário, siga estritamente a fonética do povo:
- **Humanos (inspiração tupi-guarani):**
  - Sons permitidos: vogais `a, e, i, o, u, y` (e nasais `ã, ẽ, ĩ, õ, ũ`); consoantes `p, t, k, m, n, nh, r (brando), s, x, j, gu`; encontros `mb, nd, ng`.
  - **Proibido em nomes humanos:** `l, f, z, v, rr forte` e encontros consonantais (`tr, pl, st`). Sílaba sempre termina em vogal. Acento quase sempre na última sílaba.
  - Terminações: masculinos em `-u, -y, -ã` (ex.: *Endyru, Jarupã, Oryndu, Pytumã*); femininos em `-í, -ê, -ara` (ex.: *Xanduí, Iraxê*); lugares em `-tyba, -guá, -pe` (ex.: *Xerumbetyba, Ybytuguá, Ymboripe, Kuatiarape*).
- **Demônios (inspiração nórdico antigo):**
  - Sons: `k, g, th, dh, r, h, v, s`; encontros `sk, st, kr, gr, hr, thr`; vogais `a, e, i, o, u, y, ø`. Sem nasais, sem `x, j, nh, lh, z`. Acento na primeira sílaba.
  - Terminações: masculinos em `-r, -ar, -vald, -grim`; femininos em `-a, -dis, -run, -hild`; lugares/coisas em `-garn, -vek, -fjar, -held`.
- **Elfos (inspiração eslava):**
  - Sons: `zh, sh, ch, ts, v, l, m, r, kh`; encontros `zd, vl, sl, mr, zv`. Terminações: masc. `-mir, -slav, -an, -ek`; fem. `-a, -ka, -na, -mila`.

---

## 2. Cenário: Xerumbetyba antes da Unificação

- **Xerumbetyba:** reino humano no interior do continente de Yrandupe, famoso pela maior universidade e pelas maiores bibliotecas (em **Kuatiarape**). No Livro 1 já é um reino unificado; **no tempo do jogo (25 anos antes), é uma colcha de retalhos** de ducados, senhorios e cidades livres separados por florestas, serras e bacias fluviais.
- **O rio Ymonhã:** o rio grande, espinha dorsal da região. Nasce nas serras a oeste (em Ymboripe), passa por Kuatiarape e Ybytuguá e desce rumo ao mar.
  - Antes da unificação, cada senhor dono de uma margem cobra pedágio de quem desce: castelo de pedágio, corrente grossa de ferro atravessada de margem a margem, ponte fechada.
  - Cada afluente é um senhorio; a mata e a serra entre duas bacias são terra de ninguém, onde a lei não chega e se contrata aventureiro.
- **Ybytuguá (a Cidade Livre):** cidade mercante às margens do Ymonhã. Governa-se por um conselho de guildas, sem senhor feudal e sem exército próprio. Vive do comércio do rio e contrata companhias na **Mesa dos Contratos** para se defender.
- **Ymboripe (o Ducado de Cima):** o senhorio mais forte, rio acima, governado pelo duque **Pytumã**. Está engolindo os vizinhos um por um, pela força ou sufocando o comércio.
- **Os Baixios do Ymonhã:** trecho largo de lodo, ilhotas de junco e água turva logo abaixo de Ybytuguá, onde dorme o **Ykuruã (o Bebe-Cheia)**.

---

## 3. Os Personagens Principais

Protagonista fixo, sem tela de criação. **O trio se forma no Ato 1.**

### 3.1 Endyru — Mago de Atração e Repulsão (Protagonista)
- **Quem é:** humano, cerca de 20 anos. Estudante da universidade de **Kuatiarape**, filho de gente sem fortuna. Ficou sem dinheiro para pagar as taxas e terminar os estudos; desce o Ymonhã atrás de um contrato gordo que pague o resto do curso e faça seu nome.
- **Magia:** conceito humano de **atração e repulsão**. Começa no nível **Página** (3) e chega a **Círculo** (4) no fim do jogo.
  - *Recitada:* exige dizer a saudação (dois versos pedindo licença à força que puxa e à força que empurra), nomear os dois corpos (*este*, *aquele*), declarar a **medida exata da distância** entre eles em voz alta e fechar com o verbo (*Junta* ou *Afasta*).
  - *Gravada:* círculos riscados no chão antes da luta ou placas preparadas no descanso.
- **Papel no grupo:** é quem lê (contratos, editais, mapas, placas, cartas) e quem controla o espaço no combate (puxar, empurrar, desarmar, gravar armadilhas). Nos níveis baixos, espadachins batem muito mais forte que magos; Endyru não é artilharia de matar sozinho, é preparo e alavanca.
- **Defeito trágico (a pressa):** tem pressa de provar que vale uma cadeira, pressa de medir de olho em vez de medir a corda, pressa de acabar a luta num golpe grande. Ao contrário do homem contido do Livro 1, o Endyru jovem fala demais quando quer mostrar que sabe, corrige os outros e acha que quem vive no rio é lento por ignorância.

### 3.2 Jarupã — Espadachim do Gryskar (o Bate-Primeiro)
- **Quem é:** humano, pouco mais velho que Endyru. Escolta de barco, canastrão, barulhento, prático, zero cultura livresca. Já anda em dupla com Xanduí quando o jogo começa.
- **Combate:** escola demônio **Gryskar (o Bate-Primeiro)**, nível de aura **Fio** (2) para **Corpo** (3), ramo de impacto/espada pesada.
  - *Regra de vida e de escola:* não recuar o primeiro passo e despejar tudo no primeiro golpe. Abre todas as brigas em que Xanduí não pode bater primeiro.
- **Personalidade:** fala com os dois cotovelos apoiados na mesa quando vai dar um conselho muito importante e quase sempre errado. Resolve problemas com o que tem na mão. Chama qualquer ferimento que não precise de costura de *"raso"*. Acha que lei, edital e licença são invenções de quem tem tempo sobrando. Não sabe ler e não tem a menor vergonha disso.

### 3.3 Xanduí — Espadachim da Ipojy (a Espera)
- **Quem é:** humana, parceira de Jarupã (e futura esposa dele). Canastrona, seca, observadora, de poucas palavras certeiras.
- **Combate:** escola humana **Ipojy (a Espera)**, nível de aura **Fio** (2) para **Corpo** (3), espada reta.
  - *O Voto da Ipojy:* **nunca dá o primeiro golpe**. Não abre luta, não faz emboscada. Guarda a aura parada até o inimigo atacar e devolve inteira no contragolpe.
- **O Segredo (fundamental para os diálogos):** **Xanduí não sabe ler, mas tem orgulho demais para admitir.**
  - Enquanto Jarupã diz abertamente que não sabe ler, Xanduí finge que sabe, mas que *"a letra dela é feia para papel de conselho"*, ou que *"vista cansada no barco dá dor de cabeça"*.
  - É por isso que o trio nasce: o contrato de Ybytuguá exige que um membro da companhia assine o livro da Mesa e escreva o relatório ao conselho. Xanduí cisma que eles precisam levar Endyru.
  - *Como mostrar sem nunca contar:* ela pede para Endyru ler em voz alta dizendo *"Lê pra gente, você lê bonito"*; olha um edital pregado na parede de longe, com a cabeça inclinada, como quem avalia se um bicho morde; segura um mapa ou recibo de cabeça para baixo por um instante antes de passar para Endyru; decora contratos e frases jurídicas (*"legítima defesa"*) palavra por palavra de ouvido e repete com autoridade absoluta, mesmo sem lembrar de quem ganhou a causa.

### 3.4 Oryndu — O Barqueiro do Ymonhã (Apoio)
- **Quem é:** humano, barqueiro veterano de uns cinquenta anos. Dono da barcaça chata que desce de Kuatiarape até Ybytuguá.
- **Papel mecânico e narrativo:** não luta com armas; é a unidade de apoio (**Ler a água** — marca onde a correnteza puxa e onde o Ykuruã vai emergir).
- **Personalidade:** homem de rio, paciente, que conhece a estação das águas pelo cheiro do lodo e pelo subir dos caranguejos no junco. Usa apenas um Verso doméstico minúsculo (aprendido de ouvido... não, lido uma única vez numa tábua de barqueiro há trinta anos) para puxar a rede, e mais nada.
- **Frase-marca:** *"Não no rio, rapaz."* / *"Pressa no rio é coisa de quem não sabe nadar."*

---

## 4. A Criatura e as Regras do Mundo no Jogo

### 4.1 O Ykuruã (o Bebe-Cheia)
- **O que é:** anfíbio fluvial colossal, do tamanho de uma barcaça de carga. Couro grosso como casca de árvore velha, coberto de lodo seco e conchas de rio. Boca larga de bagre/jacaré, olhos miúdos quase cegos. É um animal da era ressacada (na era de ouro um mestre o matava sozinho; hoje pede companhia inteira e preparo), sem mente e sem relação com mitos ou vestígios.
- **Como caça (a mecânica do tema):**
  - Dorme enterrado no lodo dos baixios na seca; acorda com a cheia.
  - **Sente mana gasta de uma vez**, como peixe sente pedra batendo n'água. Verso curto ele ignora; encantamento grande (ou turno em que o mago estoura o limite de mana — `when: burst`) atrai o bicho na hora e dá a ele um ataque/turno extra direto em quem conjurou.
- **Água vs. Terra:**
  - **Na água:** regenera vida a cada turno, tem Muralha altíssima e submerge no lodo. Bater nele dentro d'água é inútil.
  - **Na terra:** fica lento, pesado, sem regeneração; o couro seca ao vento e racha, reduzindo a Muralha para as espadas de Jarupã e Xanduí entrarem.
- **Como se vence:** puxando-o para o seco **aos poucos**, turno a turno, com Versos medidos de atração e repulsão e círculos gravados antes na margem, enquanto Xanduí apara as investidas na beira d'água e Jarupã segura o flanco.

### 4.2 Magia, Custo e Espada (Resumo de Regras para o Roteiro)
- **Recitada vs. Gravada:** Recitar exige tempo (declara num turno, sai no outro; tomar golpe no meio interrompe e obriga a recomeçar do primeiro verso). Gravar exige preparo antes da luta (no acampamento/margem), mas ativa na hora.
- **Custo da Mana (A Marca):** gastar mana além do limite num único turno cobra do corpo. No conceito de atração e repulsão (Endyru), a marca leve é **sangue escorrendo pelo nariz e tremor nas mãos** (penalidade de precisão/acerto).
- **Cura:** primeiros socorros. Não cria carne do nada; acelera o corpo, e **quem paga o custo é o paciente** (perde Fôlego, sente fome aguda e febre). Jarupã reclama toda vez que é curado.
- **Triângulo de Espadas:**
  - **Ipojy (a Espera / Xanduí)** vence **Gryskar** (espera o golpe pesado passar e corta na brecha).
  - **Gryskar (o Bate-Primeiro / Jarupã)** vence **Tsvirana** (atropela no primeiro passo antes de o outro ler o ritmo).
  - **Tsvirana (a Correnteza / batedores e mercenários)** vence **Ipojy** (finta o primeiro movimento sem se comprometer, fazendo a Espera errar o tempo).

---

## 5. A História Completa (Ato a Ato, Cena a Cena)

Estrutura para **2 a 4 horas de jogo**, dividida em **Abertura + 3 Atos + Fecho**, com cerca de 10 a 12 combates táticos e 2 chefes principais (**O Castelão do Pedágio** e **O Ykuruã**).

---

### ABERTURA: A Corrente no Rio (Tutorial de Mundo e Combate)

#### Cena 0.1 — A Barcaça de Oryndu
- **Onde:** Rio Ymonhã, descendo de Kuatiarape rumo a Ybytuguá. Manhã de começo de cheia; água barrenta subindo, galhos descendo na correnteza.
- **Quem está no barco:** Oryndu no leme; Endyru sentado num caixote lendo seu caderno de círculos e contando as últimas moedas de cobre; Jarupã amolando a espada pesada; Xanduí encostada na borda, conferindo as correias da bainha. Os dois espadachins foram contratados por um mercador de sal (que viaja escondido atrás dos sacos) apenas até Ybytuguá.
- **O que acontece:**
  - Oryndu bate com o cabo do remo no casco da barcaça, uma batida seca e lenta, e escuta a madeira. Endyru pergunta se o casco está furado; Oryndu diz que está medindo o fundo — a cheia subiu três dedos antes da lua certa.
  - Jarupã puxa conversa com Endyru sobre a beca de estudante; Xanduí pergunta o que Endyru tanto escreve. Quando Endyru fala de "medida de linha entre dois corpos", Jarupã resume: *"Ah, empurrar coisa."*
  - De repente, um sino de ferro bate na margem. Uma **corrente grossa de elos forjados** sobe da água, esticada por um guincho entre um fortim de madeira e pedra (**o Castelo da Volta**, senhorio menor na divisa da bacia) e um pilar na outra margem.

#### Cena 0.2 — O Pedágio Dobrado (Luta 1)
- **O conflito:** Cobradores do castelão **Mbyraku** `[sugestão de nome humano]` abordam o barco no píer da corrente. O pedágio de passagem dobrou "por causa do perigo da cheia". O mercador de sal não tem como pagar; se não pagarem, a guarda confisca a carga e o barco de Oryndu.
- **A escolha / gancho:**
  - Endyru tenta citar o tratado fluvial das cidades livres (teste de **Saber / Lábia**). O sargento do pedágio cospe na água: papel de Kuatiarape ali só serve para acender cachimbo.
  - Endyru perde a paciência e começa a recitar um encantamento grande para rebentar a corrente. Oryndu segura o braço dele na hora: **"Não no rio, rapaz. Na cheia ninguém grita com a água."**
  - A briga estoura no píer de madeira.
- **O que a Luta 1 ensina na prática (sem texto de tutorial chato):**
  1. **O Voto de Xanduí:** no turno 1, o jogador tenta atacar com Xanduí e descobre que ela não dá o primeiro golpe em quem ainda não a atacou. Jarupã grita: *"Deixa que eu abro!"* e dá o primeiro passo (**Gryskar**).
  2. **A Recitada e a Medida de Endyru:** Endyru usa um Verso de repulsão para jogar um cobrador de escudo na água ou puxar a alavanca do guincho da corrente.
  3. Solta a corrente, o grupo embarca sob flechas e desce a corredeira até Ybytuguá. No barco, o mercador de sal dá um calote parcial porque a carga molhou, vai embora, e deixa Jarupã e Xanduí sem dinheiro no cais de Ybytuguá — exatamente como Endyru.

---

### ATO 1: Ybytuguá, a Cidade Livre

#### Cena 1.1 — O Cais Parado e a Mesa dos Contratos
- **Onde:** O porto fluvial de Ybytuguá. Dezenas de barcaças amarradas lado a lado, apodrecendo sem sair. Carregadores sentados jogando osso; famílias amarrando baús em carroças para ir embora.
- **O ambiente:** A cidade livre vive do rio, e o rio fechou. Dois barcos de carga afundaram nos baixios ao sul na última semana.
- **Na Mesa dos Contratos:**
  - O quadro está cheio de papéis pequenos e um edital grande, com lacre de cera do Conselho das Guildas: **Contrato de Corpo — Matar ou expulsar o Ykuruã dos baixios do sul**. Pagamento alto em prata, fiança dispensada por urgência.
  - Um leitor de quadro cobra uma moeda para ler para os aventureiros. Jarupã vai tirar uma moeda; Xanduí segura a mão dele, olha para o edital de longe, inclina a cabeça e aponta Endyru:
    - **Xanduí:** *"Pra que dar moeda pra escrivão se o menino lê bonito? Lê aí pra gente, estudante."*
  - Endyru lê o contrato inteiro em voz alta. Na última linha está a exigência do Conselho: **o grupo precisa ter pelo menos um letrado capaz de assinar o livro de registro pelo próprio punho e entregar relatório escrito** sobre o estado dos baixios (as guildas de seguro mercante exigem papel assinado).
  - Jarupã olha para Xanduí: *"Assina lá, Xanduí."*
  - Xanduí cruza os braços, sem piscar: *"Minha letra é grande, Jarupã. Não cabe nessas linhazinhas de conselho. E escrivão de cidade livre implica com letra de mulher da estrada. Chama o estudante. Três divide melhor que dois."*
  - Endyru percebe que sem a espada deles não passa da fiança de nível Corpo, e que sem a pena dele os dois não pegam o contrato. **O trio assina como companhia provisória.**

#### Cena 1.2 — Pistas na Cidade (Preparação antes dos Baixios)
O jogador explora Ybytuguá antes de descer aos baixios:
1. **A Forja de Thrymkel `[sugestão de nome demônio]`:**
   - Uma forja baixa perto do dique. Duas placas na porta: embaixo, na letra dos portos, `FERRO E COURO`; em cima, em runas, *"Thrymkel. Conserta o que você estragou. Não faço fiado."*
   - O ferreiro demônio vende equipamento **Temperado** e **Gravado** e oferece uma receita absurda para endurecer lâmina e couraça contra dente de bicho d'água: *"Banha de bagre velho, três pregos de barco afundado e trinta marretadas cantando pra sogra morrer."* Endyru reconhece a métrica: é um Verso de entropia cantado no compasso da bigorna.
2. **A Guilda dos Barqueiros (Oryndu):**
   - Os barqueiros velhos puxaram os barcos para o seco e se recusam a guiar aventureiros: *"Quem espera a cheia baixar vive até a seca."*
   - Oryndu aceita levar o trio porque precisa pagar o conserto do leme da barcaça (estragado no castelo de pedágio), mas impõe uma condição: no rio, ninguém conjura alto.
3. **Saqueadores do Dique (Luta 2 — opcional/preparação):**
   - Mercenários dispensados por uma caravana tentam roubar o armazém de cordas e óleo da guilda. Luta curta em espaço fechado para testar posicionamento, empurrão de Endyru contra obstáculos e o triângulo de escolas.

#### Cena 1.3 — O Primeiro Encontro nos Baixios (Luta 3 — O Bicho que Não Morre)
- **Onde:** Os baixios ao sul de Ybytuguá. Água pela canela nas margens de lodo, canais fundos no meio, neblina baixa.
- **O combate:**
  - O grupo encontra os destroços de uma barcaça de grãos. Mas, estranhamente, há **cinza de giz e pedra queimada de encantamento** num rochedo da margem — alguém andou conjurando ali antes.
  - O **Ykuruã** emerge do canal central (`invulnerable` dentro da água profunda).
  - Jarupã tenta bater na água e a espada mal arranha o lodo do couro. Endyru recita um arremesso de pedra; o bicho sente a mana, vira a cabeça cega direto para Endyru e avança como uma onda, partindo a passarela de madeira.
  - Oryndu grita da barcaça: **"Pra trás! Na água ele bebe o golpe! Saiam pro junco alto!"**
  - Objetivo da luta: **sobreviver e recuar até a barcaça em X turnos** enquanto Oryndu lê a água (`annotate`) mostrando onde o bicho vai dar o bote.
- **A descoberta:** Saindo dos baixios, Oryndu mostra um pedaço de estaca tirado do lodo: tem o ferro marcado de **Ymboripe (o ducado de cima)** e restos de um círculo de atração riscado às pressas para fazer barulho de mana na água.
  - O Ykuruã não acordou sozinho. Alguém está descendo pela floresta entre as bacias e batendo mana no rio de propósito para manter o bicho acordado e faminto na porta de Ybytuguá.

---

### ATO 2: A Floresta entre as Bacias

#### Cena 2.1 — Subindo a Margem Cega
- **Onde:** A mata fechada e os barrancos que separam a bacia de Ybytuguá das terras do ducado de Ymboripe.
- **O que acontece:**
  - O trio sobe por terra para cortar os conjuradores do ducado antes de tentar matar o Ykuruã de novo (se não pararem quem bate mana rio acima, o bicho nunca vai sair do canal fundo).
  - No caminho, momentos de estrada que constroem a relação dos três (que no Livro 1 serão vinte anos de amizade):
    - No acampamento, Endyru tenta ensinar a Jarupã por que um círculo de giz precisa fechar exato; Jarupã usa o giz para marcar placar de jogo de dados e ganha três moedas de Endyru.
    - Xanduí encontra uma tabuleta de fronteira caída na estrada, pregada numa árvore. Ela para, olha séria, vira a tábua (de cabeça para baixo) e diz: *"Madeira boa. Endyru, vê se o nome do duque tá escrito direito aí."* Endyru lê o aviso de proibição de passagem sem notar que a tábua estava invertida.
    - Quando Jarupã leva um corte num combate na mata (Luta 4 — batedores mercenários de escola **Tsvirana** contratados pelo ducado), Endyru aplica a **Cura**. A ferida fecha na hora, mas Jarupã cai sentado, suando frio e faminto, devorando meio pão duro de uma vez: *"Magia de estudante é igual imposto: tira de um buraco e abre outro na barriga!"*

#### Cena 2.2 — Os Conjuradores do Duque (Lutas 5 e 6)
- **Onde:** Uma clareira na beira de um afluente que desce direto para os baixios.
- **O que eles encontram:**
  - Um destacamento de **Ymboripe**, liderado por um mago da corte ducal — um ex-colega rico de Endyru da universidade de Kuatiarape, **Jurendy** `[sugestão de nome humano]` — escoltado por guardas pesados e pelo próprio castelão **Mbyraku** (do castelo de pedágio da abertura).
  - Eles não estão atacando Ybytuguá com exército: a cada duas noites, o mago do duque desce à beira do rio e descarrega um Círculo bruto de repulsão na água, só pelo estrondo de mana, para atiçar o Ykuruã lá embaixo.
  - **O diálogo antes da luta:**
    - Jurendy reconhece Endyru e ri da roupa de estrada dele: lembra que Endyru largou a bancada de Kuatiarape por falta de duas moedas de prata, enquanto ele ganhou cargo no ducado de Pytumã.
    - Não há vilania caricata: Jurendy explica a lógica fria de Ymboripe como quem explica uma conta. Fazer guerra contra Ybytuguá custa soldados e queima barcaças; deixar um bicho de rio fechar o porto por um mês faz o Conselho das Guildas pedir de joelhos para entrar no ducado em troca de proteção. *"Daqui a duas semanas eles mesmos abrem o portão e ainda pagam o jantar do duque, Endyru. Você está sujando a bota por uma cidade que já comprou a tinta para se vender."*
    - Endyru sente o golpe no orgulho — quer provar que é melhor mago que Jurendy e que o trabalho deles importa.
- **O Combate (Chefe Intermediário — Castelão Mbyraku + Mago Jurendy):**
  - Luta tática de duas frentes: Mbyraku e os escudeiros seguram a ponte de pedra enquanto Jurendy recita do alto.
  - Para vencer rápido sem ser bombardeado, Endyru precisa usar **Gravada** (ou interromper a recitação de Jurendy puxando-o do barranco com atração), enquanto Xanduí segura a linha contra os lanceiros e Jarupã quebra a guarda dos batedores.
- **Consequência:** Jurendy foge ou se rende; os tambores de mana no rio param. No bolso do castelão, Endyru encontra uma carta aberta de **alguns conselheiros da própria Ybytuguá** negociando os termos da rendição com o duque Pytumã caso o comércio continue fechado até a lua cheia.
  - Xanduí ouve Endyru ler a carta e resume: *"Então a gente mata o bicho antes da lua cheia, recebe a prata antes de eles venderem a cadeira e vai embora. Simples."*

---

### ATO 3: Os Baixios na Cheia e o Preço da Pressa

#### Cena 3.1 — O Preparo na Margem Seca
- **Onde:** Os baixios do Ymonhã, na véspera do pico da cheia. O rio subiu; sobrou apenas uma língua de terra firme e pedra rachada onde a água não chega.
- **A mecânica de preparação:**
  - Antes de chamar o Ykuruã, o jogador (como Endyru) tem tempo de preparar o terreno: **gravar círculos de atração na margem seca** (para puxar o bicho passo a passo para fora d'água), posicionar barris de óleo/estacas que Jarupã trouxe e combinar o sinal com Oryndu na barcaça.
  - Oryndu olha o céu escuro de chuva e avisa mais uma vez:
    - **Oryndu:** *"O bicho vai vir devagar, Endyru. Puxa um palmo, deixa a moça segurar o bote, puxa outro palmo. Se você despejar tudo de uma vez para puxar inteiro, ele não sobe na pedra — ele vira para o lado onde a mana gritou. E no lado da água estou eu."*
    - **Endyru:** *"Eu sei a medida, Oryndu. Eu faço essa conta desde os quatorze anos."*

#### Cena 3.2 — A Caçada ao Ykuruã e a Pressa de Endyru (Luta Final)
- **Fase 1 da Luta:**
  - O **Relógio da Cheia** corre a cada turno (a água vai subindo nos quadrados baixos do mapa).
  - O plano funciona nos primeiros turnos: Oryndu lê a água (`annotate`), avisando onde o Ykuruã vai dar o bote; Endyru ativa o primeiro círculo gravado e puxa a besta meio corpo para o raso; Xanduí espera o bote da bocarra e corta no contragolpe (**Ipojy**); Jarupã martela a pata dianteira (**Gryskar**).
- **O Ponto de Virada (Deixa de Roteiro Obrigatória — O Preço):**
  - Quando o Ykuruã está com metade da vida e quase saindo para a pedra seca, a chuva aperta, a água sobe um degrau e o bicho ameaça escorregar de volta para o canal fundo.
  - Jarupã está com o braço sangrando; a lua da rendição da cidade é amanhã; Endyru vê que puxar com Verso pequeno vai levar mais três fôlegos.
  - **A pressa vence.** Endyru ignora o aviso de Oryndu, larga a medida segura e **encurta/força um Círculo inteiro de uma vez só** (`when: burst`), além do seu limite de Página, gritando o verbo para arrancar o monstro da água num único puxão.
  - **O que acontece em cena:**
    1. O sangue jorra pelo nariz de Endyru na hora e as duas mãos dele começam a tremer (**Marca da mana exaurida**).
    2. O puxão arranca metade do Ykuruã do lodo, mas o estouro de mana reverbera pela água inteira como um sino debaixo do rio.
    3. O Ykuruã, cego e enfurecido pelo clarão de mana, gira o corpo colossal no raso — e a cauda e o bote vão direto na barcaça que segurava a rede de apoio na margem.
    4. **A barcaça de Oryndu é partida ao meio.** Oryndu é jogado na correnteza barrenta sob os destroços. Endyru tenta recitar para puxá-lo da água, mas **a mão treme, o sangue entra na boca e o cântico quebra na segunda linha** (regra de `magia.md` §2.7: recitação interrompida não volta do meio). Jarupã corre até a beira, mas só puxa o remo quebrado. Oryndu não sobe mais.
- **Fase 2 da Luta (O Jeito Lento):**
  - Com Endyru marcado (tremor nas mãos, limite de mana reduzido) e sem Oryndu, a última metade da luta **não aceita atalho**.
  - O jogador é obrigado a vencer exatamente como Oryndu tinha ensinado: Versos curtos, um palmo por turno, usando os círculos gravados restantes, esperando o couro do Ykuruã secar no vento da margem até rachar, para que Xanduí (no contragolpe final) e Jarupã abram o peito da besta na pedra seca.

---

### FECHO: A Conta e a Unificação

#### Cena 4.1 — O Silêncio na Margem
- O Ykuruã está morto na pedra, enorme, cheirando a lodo e ferro.
- Ninguém comemora. Jarupã amarra o remo quebrado de Oryndu nas costas sem fazer piada. Xanduí limpa a espada reta num tufo de capim, olha para as mãos trêmulas de Endyru e para o nariz sujo de sangue seco, e não dá sermão nenhum — só aperta o ombro dele uma vez, curto, como quem confere se uma corda ainda aguenta, e sobe o barranco.
- Endyru olha para a água barrenta levando as tábuas da barcaça. Pela primeira vez no jogo, ele abre a boca para justificar a medida que fez — e fecha sem dizer nada. *(Nasce ali o hábito de Endyru do Livro 1: o homem que tem o sermão inteiro pronto sobre o que a pressa custa a quem está em volta, e guarda para si.)*

#### Cena 4.2 — Uma Semana Depois: O Papel Assinado
- **Onde:** A Mesa dos Contratos de Ybytuguá.
- O comércio do rio voltou; as barcaças estão descendo. O Conselho das Guildas paga a bolsa de prata prometida e recebe o relatório escrito por Endyru (que agora domina o nível **Círculo**, mas escreve devagar porque o resto do tremor ainda está passando dos dedos).
- Enquanto eles contam a prata no balcão, guardas com a insígnia de **Ymboripe** entram na prefeitura sem desembainhar espada e pregam um edital novo por cima do quadro da Mesa:
  - **Ybytuguá assinou o tratado de anexação com o duque Pytumã mesmo assim.** Os conselheiros já tinham fechado o acordo; o Ykuruã morto só serviu para que as guildas entrassem no reino novo com o porto limpo e valorizado.
- A cidade livre deixa de ser livre na caneta, sem um grito. O trio vê o estandarte mudar na torre e sabe que não há nada a fazer sobre isso.

#### Cena 4.3 — A Despedida na Bifurcação
- Na saída da cidade, a estrada se divide: para cima, de volta à universidade de **Kuatiarape**; para o leste, a estrada longa rumo à costa de **Tanguratyba** (e **Itamoguá**).
- Endyru separa a parte dele da prata — dá exatamente para quitar a universidade e comprar uma passagem para a costa, onde ouviu dizer que há uma escola precisando de professor de fundamentos.
- Jarupã e Xanduí vão continuar na estrada mais uns anos, como escolta e aventureiros.
- Antes de se separarem, Jarupã entrega a Xanduí um presente que comprou no mercado de Ybytuguá com a parte dele: um **pequeno almanaque de bolso / salvo-conduto encadernado em couro**, *"porque tem figura bonita na capa e nome de cidade grande, pra quando a gente for rico"*.
- Xanduí pega o livrinho, passa o polegar na capa sem abrir, guarda no bolso de dentro do gibão e diz:
  - **Xanduí:** *"Vou ler no barco, que sacode menos."*
- Endyru percebe, naquele último segundo, pelo jeito como ela segurou a lombada pelo lado cortado das folhas, que Xanduí nunca leu uma letra na vida. Ele abre a boca — e cala de novo. Sorri, diz que quando eles cansarem da estrada a porta dele na costa vai ter carneiro, e cada um segue para um lado.
- **Fim do jogo.** Sem texto de epílogo explicando quem é Karuã ou Exandy.

---

## 6. Guia de Diálogos (Como Escrever as Falas no Jogo)

> **Regra de ouro para a IA do repositório do jogo:**
> Os diálogos deste mundo **nunca são expositivos, nunca são teatrais/épicos de RPG medieval genérico** (*"Ó bravo guerreiro, as terras de Xerumbetyba sofrem!"*) e **nunca explicam a piada ou o sentimento**. As pessoas falam curto, concreto, sobre coisas materiais (moeda, bota, corda, linha de contrato, medida em passos, chuva, pão duro), e o que sentem fica por baixo do que dizem.

### 6.1 As 8 Regras Gerais de Diálogo
1. **Ninguém explica ao outro o que os dois já sabem.** Dois moradores do rio não explicam o que é o Ymonhã nem o que é uma cidade livre. Se falarem de Ymboripe, falam do preço do pedágio ou do brasão na manga do guarda.
2. **Frases curtas no bate-boca; concreto em vez de abstrato.** Em vez de *"Estou preocupado com os efeitos colaterais da sua magia"*, Jarupã diz: *"Seu nariz tá pingando na minha bota."* Em vez de *"Essa missão é suicida"*, Oryndu diz: *"Barco meu não desce ali depois do meio-dia."*
3. **Cortar a última frase explicativa.** Quando uma cena tem tensão ou peso emocional, pare uma frase antes do que um roteiro comum escreveria. Deixe o gesto físico fechar a cena (dobrar um papel, conferir uma correia, cuspir na água).
4. **A burocracia e o analfabetismo são concretos.** Quase ninguém sabe ler. Quem não lê olha para o papel com desconfiança, pergunta *"onde tá a parte que me rouba?"*, assina com uma cruz ou com um desenho, e trata quem lê com uma mistura de respeito prático e pé atrás.
5. **Vocabulário do mundo (usar sempre):**
   - Magia não é *"feitiço arcano"* ou *"mana mística"*: é **Verso**, **Página**, **Círculo**, **saudação**, **medida**, **linha**, **fator**, **cântico**, **marca**.
   - Luta de espada não é *"skill"* ou *"arte marcial"*: é **escola**, **a Espera (Ipojy)**, **o Bate-Primeiro (Gryskar)**, **a Correnteza (Tsvirana)**, **aura**, **grau**, **o voto**.
   - Tempo e medidas: **luas** (meses), **palmos**, **passos**, **dedos**, **braços**, **fôlegos** (duração curta de recitação), **cheia** e **seca**.
6. **Sem palavrões modernos nem gírias de internet,** mas sem português quinhentista artificial (*"vós"*, *"outrossim"*, *"maldito sejas"*). Use **"você"** (ou *"o senhor"* quando há hierarquia/ironia, como na universidade). O ritmo é o português brasileiro seco, limpo e direto dos capítulos do Livro 1.
7. **Repetição seca como gancho de diálogo:** Um personagem repete uma palavra do outro para virá-la do avesso ou cobrar exatidão.
   - *Exemplo do Livro 1:*
     > — Escorregou para cima?
     > — Escorregou com força.
8. **A Regra da Ponte (Ink -> Combate):** A última fala de um nó de Ink antes de uma luta deve apontar diretamente para a mecânica daquela luta (ex.: Oryndu avisando para não estourar mana na água; Jarupã avisando que vai dar o primeiro passo porque Xanduí espera).

---

### 6.2 A Voz de Cada Personagem (Com Exemplos Prontos)

#### ENDYRU (Jovem)
- **Como fala:** Educado, vocabulário preciso de estudante de Kuatiarape, mas impaciente. Gosta de dar o número exato (*"quatorze passos e meio"*, *"artigo sétimo"*). Antes do Ato 3, tem o vício de explicar a regra achando que resolveu o problema; depois da morte de Oryndu, fica quieto e corta as próprias frases no meio.
- **Tiques:** Lê qualquer placa ou papel em voz alta sem perceber; corrige medidas aproximadas dos outros; quando mente ou fica sem graça, fala mais formal.
- **Exemplos de falas certas para Endyru:**
  - *"Não é 'um estirão', Jarupã. Do barranco até a estaca são dezoito passos. Se forem vinte, o Verso cai na água e eu sangro pelo nariz à toa."*
  - *"Está escrito na terceira linha, embaixo do lacre. A companhia responde pelo casco. Se o casco afundar, a gente paga o barco antes de receber."*
  - *(Depois do Ato 3, mais seco):* *"Deixa. Eu faço com o Verso pequeno. A gente tem tempo."*

#### JARUPÃ
- **Como fala:** Canastrão, expansivo, cheio de certezas absurdas ditas com a autoridade de quem já viu tudo na estrada. Não tem filtro entre pensar e falar. Chama coisas complicadas pelo nome mais baixo possível.
- **Tiques:** Dá regras universais de estrada inventadas na hora (*"Diante de juiz a regra é uma: nega tudo"*, *"Cerveja de graça não tem segunda vez"*, *"Nunca tira a bota"*); minimiza ferimento (*"Raso. Não apareceu osso, é raso"*); interrompe Xanduí e leva corte dela em duas palavras.
- **Exemplos de falas certas para Jarupã:**
  - *"Escuta o Jarupã, que eu já passei por três pedágios desses só neste inverno. Guarda de corrente só sabe contar até cinco. Se tiver seis palavras na frase, ele acha que é imposto do duque e deixa passar."*
  - *"Pra que eu vou esperar o homem levantar o machado pra ver se ele quer mesmo me bater? Se ele trouxe machado, ele quer. Eu bato antes e economizo a dúvida dos dois."*
  - *(Sobre a Cura de Endyru):* *"Não encosta essa reza em mim de novo sem um pão na outra mão. Da última vez fechou o talho na canela e parecia que eu não comia desde a lua passada."*

#### XANDUÍ
- **Como fala:** Curta, seca, irônica de cara fechada. Fala metade das palavras de Jarupã e sempre tem a última palavra da conversa. Nunca levanta a voz.
- **Tiques:**
  - Confere correias, fivelas e bainhas enquanto os outros discutem.
  - **O segredo da leitura:** nunca diz *"não sei ler"*. Sempre inventa uma razão prática, imediata e inquestionável para Endyru ler no lugar dela, e elogia a leitura dele (*"Você lê bonito"*). Quando ouve um termo bonito ou jurídico, guarda de ouvido e usa depois como se fosse advogada.
- **Exemplos de falas certas para Xanduí:**
  - *"Lê pra gente, Endyru. Esse carvão de escrivão de porto borra tudo no sol, e você lê bonito."*
  - *(Quando Jarupã quer bater num alvo dentro d'água):* *"Vai lá. Bate na água. Quando a água cansar, você me avisa."*
  - *"Quebra de contrato. Eu ouvi um juiz dizer isso em Kuatiarape, com essas mesmas palavras. Quebra. O homem saiu com a mula e com os sacos."* — *(Endyru: "O dono da mula ou o ladrão?")* — *"Um dos dois. Mas a palavra era essa."*
  - *(Sobre a escola Ipojy):* *"Quem bate primeiro mostra onde o braço vai estar quando o golpe acabar. Eu só fico olhando até ele mostrar."*

#### ORYNDU (O Barqueiro)
- **Como fala:** Calmo, sem raiva, como quem fala com o tempo ou com o rio. Não discute política nem escola de magia; fala de nível de água, lodo, corda, peso de carga e vento.
- **Tiques:** Bate o cabo do remo na madeira para escutar o oco; chama Endyru de *"rapaz"* ou *"estudante"*; nunca corre.
- **Exemplos de falas certas para Oryndu:**
  - *"Na cheia ninguém conjura no rio, rapaz. Verso de puxar rede o bicho não escuta, que é do tamanho de um peixe pulando. Palavra grande bate no fundo igual pedra."*
  - *"Você está olhando a água de cima. Água de cima corre todo dia igual. Olha o junco da beira: o caranguejo subiu três palmos na haste desde ontem. Tem coisa grande deitada no canal."*

#### FERREIROS E NPCs DEMÔNIOS (ex.: Thrymkel)
- **Como falam:** Literais ao extremo, secos, sem metáfora poética. A graça vem de tratarem o absurdo como óbvio.
- **Exemplos de falas certas para Demônios:**
  - *(Placa da porta):* *"Thrymkel. Ferro. Se quebrou sozinho, fui eu que fiz e eu conserto. Se você quebrou batendo em pedra, é o dobro."*
  - *(Sobre receita de forja):*
    > — Banha de bagre cego — disse o ferreiro, e bateu. — Três pregos de barco que afundou com carga paga. — Bateu. — Se a carga era roubada, o ferro entorta.
    > — Como o senhor sabe se o bagre era cego? — perguntou Endyru.
    > — Ele não desviou da rede. Puxa o fole e cala a boca, que a conta é de trinta e você me fez falar no doze.

---

## 7. Tabela de Conversão Técnica (Eälen → Três na Estrada)

O motor parte do repositório do Eälen (`client/` em Phaser 3 + Vite, `shared/` em TypeScript puro). A descrição técnica do motor do Eälen vai para `docs/motor.md`; abaixo está o que muda para refletir este mundo:

| No Eälen | Neste Jogo | Regra do Cânone |
|---|---|---|
| Halmira, Lish, Varel, Gil | **Endyru, Jarupã, Xanduí, Oryndu** | §3 |
| Ordens destraváveis / `ClassSelect` | **Saem.** Cada personagem tem sua natureza fixa: Endyru o conceito (Atração e Repulsão), Jarupã o Gryskar, Xanduí a Ipojy | `magia` §3, §5.5 |
| Estilos Maré / Viés / Baluarte | **Escolas Gryskar / Tsvirana / Ipojy** | `magia` §5.5 |
| Triângulo incompleto | **Triângulo fechado:** Ipojy vence Gryskar, Gryskar vence Tsvirana, Tsvirana vence Ipojy | `magia` §5.5 |
| Traço de cada estilo | **Gryskar** = a Onda (pressão/dano no primeiro golpe e no mesmo alvo); **Tsvirana** = a Rachadura (pune quem repete); **Ipojy** = contra-ataque automático quando atacada | `ipojy`, `gryskar`, `tsvirana` |
| Grau do estilo | **Proficiência 1 a 7 por escola**, nunca acima do nível de aura; golpe-selo a partir do 4 (o trio fica entre 2 e 3) | `magia` §5.6 |
| Fôlego único | **Fôlego** para técnicas de espadachim; **Mana** para quem conjura (Endyru e magos inimigos) | `magia` §4, §5.1 |
| Golpe pesado custa Fôlego | **Estouro de Mana (`burst`):** gastar acima do limite seguro num turno aplica a **Marca da mana exaurida** no conjurador e ativa a deixa `when: burst` do Ykuruã | `magia` §4.1, §4.2 |
| `afflict` (Braço ferido) | **Marca da mana exaurida (Atração e Repulsão):** sangue pelo nariz e tremor nas mãos (penalidade de acerto e quebra mais fácil de recitação). Passa no descanso | `magia` §4.2 |
| Habilidade instantânea de mago | **Recitada:** declara num turno, resolve no seguinte; sofrer dano pesado no meio interrompe o texto e exige recomeçar do zero | `magia` §2.5, §2.7 |
| — | **Gravada:** preparada fora de luta (no descanso ou pré-combate) em placas ou círculos no chão. Ativa na hora, sem tempo de recitação, uma vez por objeto/círculo | `magia` §2.5 |
| Golpe de abertura | **Círculo gravado no chão:** a emboscada do mago é riscar o terreno antes | `magia` §2.5 |
| Mania `retaliates` do fiscal | **Voto da Ipojy (Xanduí):** nunca abre a luta, não embosca, não ataca um alvo que ainda não atacou na cena | `ipojy` |
| Cura do Luminar | **Cura de primeiros socorros:** fecha o ferimento (restaura vida), mas **quem paga é o paciente** (perde Fôlego na hora) | `magia` §4.3 |
| Curva de poder | **Nos níveis baixos o espadachim bate mais forte que o mago.** Endyru é preparo, deslocamento (puxar/empurrar) e controle; Jarupã e Xanduí causam o grosso do dano no seco | `magia` §5.3, §7.3 |
| Atributos Tirán (Dain, Eir...) | **Força, Fator, Vigor, Olho, Couro, Lábia, Saber** | — |
| Relógio "Luz do dia" | **Relógio da Cheia:** a água sobe no mapa e fortalece o Ykuruã | §4.1, §5 |
| Diário que some | **Diário de Endyru:** guarda os fatos anotados, contratos lidos e medidas, sem sumir | — |
| Equipamento | **Ferro-cru, Temperado, Gravado, Recitado** (Estelar e Dracônico ficam fora do alcance do trio) | `magia` §7.4 |
| Dinheiro | **Cobre e prata** | — |

---

## 8. Roadmap de Implementação no Repositório do Jogo

### P0 — A Conversão de Regras (`shared/` e `client/`)
1. **Mover a documentação técnica antiga:** passar o `AGENTS.md` antigo do Eälen para `docs/motor.md` e colocar este documento como referência principal.
2. **Escolas de espada (`styles.ts`):** substituir Maré/Viés/Baluarte por **Gryskar / Tsvirana / Ipojy**, fechar o triângulo e limitar proficiência pelo nível de aura.
3. **Voto da Ipojy:** bloquear golpe de abertura, emboscada e primeiro ataque contra alvo intacto para unidades da Ipojy (Xanduí).
4. **Mana, Limite por Turno e Marca (`afflict`):** separar Mana de Fôlego; estourar o limite no turno aplica a marca de sangue/tremor e dispara o evento `burst`.
5. **Recitada vs. Gravada:** implementar tempo de leitura na Recitada (quebrável por dano) e cargas pré-preparadas na Gravada + círculo no chão antes da luta.
6. **Cura com custo no paciente:** curar restaura HP do alvo e drena Fôlego dele.
7. **Elenco fixo:** substituir Halmira, Lish, Varel e Gil por **Endyru, Jarupã, Xanduí e Oryndu**; remover `ClassSelect`.
8. **O Ykuruã:** implementar regeneração e Muralha alta em tiles de água, queda de Muralha em tiles de terra seca, reação `when: burst` e vulnerabilidade a puxões sucessivos.

### P1 — Conteúdo, Mapas e Diálogos (`ink/` e `maps/`)
9. **Mapas Tiled:**
   - Barcaça e Píer da Corrente (Castelo da Volta).
   - Porto e Cidade Livre de Ybytuguá (Mesa dos Contratos, Forja de Thrymkel, Dique dos Barqueiros).
   - Baixios do Ymonhã (água funda, lodo raso, língua de pedra seca).
   - Floresta e Barranco entre as Bacias (acampamento, ponte do afluente).
10. **Roteiro em Ink:** escrever as cenas das seções §5.1 a §5.4 seguindo estritamente o Guia de Diálogos da §6.
11. **Bestiário do jogo:** Cobradores do pedágio, Saqueadores do dique, Batedores da Tsvirana, Guardas de Ymboripe, Castelão Mbyraku, Mago Jurendy e o Ykuruã.
