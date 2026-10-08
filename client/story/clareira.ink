// PROVISÓRIO. A Andarilha existe pra exercitar o sistema de diálogo — fala
// que muda na segunda visita, na Ordem de quem ouve e no que já aconteceu no
// mapa; teste anunciado na escolha; teste no meio do texto; item e flag.
// Nada aqui é canônico: sai quando a história de verdade for escrita.

VAR andarilha_falou_das_ruinas = false

=== andarilha ===
{andarilha == 1:
    Uma mulher de capa gasta descansa à beira do caminho, com os olhos no mato e não em você.
    Andarilha: Mais um de pé a esta hora. Senta, se quiser. Só não faz barulho.
    {order() == "cantor_de_ealen": Andarilha: Você anda afinado demais pra quem veio a pé. Cantor, é? Então sabe do que eu falo quando peço silêncio.}
- else:
    Andarilha: Você de novo. Ainda inteiro, pelo visto.
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
    {check("ul", 12):
        Você junta o que ela diz com o que já viu de construções assim: salões desses guardavam óleo de lamparina. Se ainda houver barris, um golpe basta pra derramar fogo no chão.
    - else:
        Ela parece saber mais do que conta, mas você não acha a pergunta certa.
    }
    -> perguntas
* [Pedir alguma coisa pra viagem. # check: len 13]
    {passed():
        Andarilha: Você pede bonito. Tá bom. Eu ia guardar pra uma hora ruim, mas a sua parece mais perto que a minha.
        ~ give_item("item-lagrima-de-eir")
    - else:
        Andarilha: Todo mundo que passa quer alguma coisa. Eu também queria.
    }
    -> perguntas
+ [Seguir caminho.]
    Andarilha: Vai com o ouvido aberto.
    -> END
