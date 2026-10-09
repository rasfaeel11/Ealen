// PROVISÓRIO. A Andarilha existe pra exercitar o sistema de diálogo — fala
// que muda na segunda visita, na Ordem de quem ouve e no que já aconteceu no
// mapa; teste anunciado na escolha; teste no meio do texto; item e flag;
// pista anotada no diário (note); uma conversa que termina levando o
// personagem a outra área (travel).
// Nada aqui é canônico: sai quando a história de verdade for escrita.

VAR andarilha_falou_das_ruinas = false

// Um `trigger` no mapa, em cima do ponto onde o jogo começa: abre sozinho,
// uma vez só (o Ink lembra que o trecho já foi lido).
=== clareira_chegada ===
A clareira está quieta, a não ser por um zumbido fino que vem de leste, de trás das árvores.
O que zumbe ainda não deu por você. Quem chega sem ser percebido escolhe a hora — e bate primeiro.
-> END

=== andarilha ===
{andarilha == 1:
    Uma mulher de capa gasta descansa à beira do caminho, com os olhos no mato e não em você.
    Andarilha: Mais um de pé a esta hora. Senta, se quiser. Só não faz barulho.
    {order() == "cantor_de_ealen": Andarilha: Você anda afinado demais pra quem veio a pé. Cantor, é? Então sabe do que eu falo quando peço silêncio.}
- else:
    Andarilha: Você de novo. Ainda inteiro, pelo visto.
}
// O relógio que as ruínas puseram na tela (ruinas_anoitece) acaba aqui.
{clock() > 0:
    Andarilha: Voltou com a noite nas costas. Fica perto do fogo, que de manhã a estrada reaparece.
    ~ clock_stop()
}
{defeated("clareira:fiapo") && not gratidao: -> gratidao}
-> perguntas

= gratidao
Andarilha: Aquela coisa que zumbia logo ali calou a boca. Foi você, não foi?
Andarilha: Faz três noites que eu não durmo direito. Toma. Não é muito, mas é o que eu tenho.
~ give_item("item-pao-de-cinza")
-> perguntas

= perguntas
+ [O que tem por aqui?]
    Andarilha: A leste, a estrada, e os lobos que tomaram conta dela. Ao norte, as ruínas.
    Andarilha: Eu fico aqui no meio, que é onde ninguém briga por nada.
    -> perguntas
* [Perguntar das ruínas.]
    ~ andarilha_falou_das_ruinas = true
    Andarilha: Um salão sem teto. Tem um patamar no fundo, e quem sobe nele enxerga o salão inteiro — e acerta o salão inteiro.
    ~ note("ruinas_patamar", "Ao norte, as ruínas: um salão sem teto, com um patamar no fundo de onde se enxerga o salão inteiro.")
    {check("ul", 12):
        Você junta o que ela diz com o que já viu de construções assim: salões desses guardavam óleo de lamparina. Se ainda houver barris, um golpe basta pra derramar fogo no chão.
        ~ note("ruinas_oleo", "Salões assim guardavam óleo de lamparina.")
    - else:
        Ela parece saber mais do que conta, mas você não acha a pergunta certa.
    }
    -> perguntas
+ {andarilha_falou_das_ruinas} [Pedir que ela mostre o caminho das ruínas.]
    Andarilha: Mostro até a porta. Dali pra dentro é com você.
    ~ travel("ruinas", "from_clareira")
    -> END
* [Pedir alguma coisa pra viagem. # check: len 13]
    {passed():
        Andarilha: Você pede bonito. Tá bom. Eu ia guardar pra uma hora ruim, mas a sua parece mais perto que a minha.
        ~ give_item("item-lagrima-de-eir")
    - else:
        Andarilha: Todo mundo que passa quer alguma coisa. Eu também queria.
    }
    -> perguntas
+ {in_party("lish")} [Pedir que Lish fique com ela.]
    Andarilha: Ele não fala muito. Serve.
    ~ leave_party("lish")
    -> perguntas
+ {in_party("gil")} [Pedir que Gil fique com ela.]
    Andarilha: Esse fala. Tá bom, eu aguento.
    ~ leave_party("gil")
    -> perguntas
+ [Seguir caminho.]
    Andarilha: Vai com o ouvido aberto.
    -> END

// PROVISÓRIO: Lish está na clareira só pra exercitar companheiros. Ele entra
// no grupo aqui e sai pela Andarilha; o lugar e as falas de verdade vêm com a
// história. O `npc` dele no mapa tem `unless` = `party:lish`: some enquanto
// ele anda com o grupo e volta ao lugar quando sai, sem variável nenhuma.
=== lish ===
{lish == 1:
    Um homem magro espera encostado numa árvore. O olho passa por ele e não segura o rosto.
    Lish: Você vai pro lado das ruínas. Eu remo, e sei abrir quem se fecha demais.
- else:
    Lish: Mudou de ideia?
}
+ [Chamar Lish pra ir junto.]
    Lish: Então eu vou atrás. Não me espere falar.
    ~ join_party("lish")
    -> END
+ [Deixar pra depois.]
    -> END

// PROVISÓRIO: Gil é quem acompanha SEM lutar (`support` em COMPANIONS). Anda
// na fila como Lish, mas numa luta não é unidade: fica de fora e oferece o
// apoio dele (Anotar: mostra o que um inimigo pretende fazer), que qualquer
// um do grupo chama na própria vez, uma vez por rodada.
=== gil ===
{gil == 1:
    Um rapaz de dedos manchados de tinta escreve de pé, com a tábua apoiada no braço, e não para quando você chega.
    Gil: Eu não sei bater em ninguém. Mas eu vejo a mão subir antes do golpe, e anoto. Às vezes ajuda.
- else:
    Gil: Ainda tenho tinta.
}
+ [Chamar Gil pra ir junto.]
    Gil: Eu fico atrás. Sempre fico.
    ~ join_party("gil")
    -> END
+ [Deixar pra depois.]
    -> END
