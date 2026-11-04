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
