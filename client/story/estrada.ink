// PROVISÓRIO, como o resto: a gente do capítulo, posta na estrada pra
// exercitar o jeito de lutar de cada um (o estilo e a mania da IA, ver
// shared/mock/bestiary.ts). Nomes, falas e o que cada um quer esperam a
// história de verdade.
//
// Os fiscais são dois inimigos `passive` com `dialog`, de pé NA ponte: enquanto
// estiverem ali, não se atravessa. Saem pagando (take_item), na conversa
// (teste de Len) ou na luta — e, sem luta, quem os tira do mapa é a variável
// (`unless` = fiscais_fora).

VAR fiscais_fora = false

=== fiscais ===
{fiscais == 1:
    Dois homens de capa encerada ocupam a ponte de um parapeito ao outro, cada um com um bastão de aferir atravessado no peito.
    Fiscal: Conferência da Companhia. Quem passa pela ponte mostra o que carrega.
- else:
    Fiscal: A ponte continua em conferência.
}
-> opcoes

= opcoes
* [Perguntar o que eles conferem.]
    Fiscal: O que sobe da água. E quem sobe com ela.
    O outro não diz nada. Também não sai do lugar.
    -> opcoes
+ [Pagar a taxa com uma Lágrima de Eir.]
    {take_item("item-lagrima-de-eir"):
        O mais velho ergue o frasco contra a luz, confere o nível e guarda no próprio bolso.
        Fiscal: Taxa recolhida. Pode passar.
        ~ fiscais_fora = true
        -> END
    - else:
        Você procura na mochila e não acha nenhuma.
        Fiscal: Sem taxa, sem ponte.
        -> opcoes
    }
* [Dizer que já foi conferida rio acima. # check: len 13]
    {passed():
        Fiscal: Rio acima... então já está no livro. Passa.
        Os dois abrem um vão do tamanho exato de uma pessoa, e nem um dedo a mais.
        ~ fiscais_fora = true
        ~ grant_xp(20)
        -> END
    - else:
        Fiscal: Então mostra o selo.
        Você não tem selo nenhum.
        -> opcoes
    }
+ [Forçar a passagem.]
    Nenhum dos dois ergue o bastão. Só fecham o ombro um no outro.
    ~ start_fight("fiscais")
    -> END
+ [Voltar.]
    -> END

// A deixa de abertura da luta (`when` = round 1, sem `ends`): só fala. É a
// dica da mania deles — `retaliates` no bestiário: um fiscal só bate em quem
// já o atacou três turnos seguidos. Até lá fica no caminho e se guarda (e o
// ataque de oportunidade continua valendo: passar por ele é outra conversa).
=== fiscais_parados ===
Nenhum dos dois ataca. Ficam no meio da ponte, de bastão baixo, esperando você desistir.
Fiscal: Empurrão a gente releva. Insistência a gente anota.
-> END

// O `onDefeat` do grupo.
=== fiscais_cairam ===
~ fiscais_fora = true
Os dois sentam no parapeito, cada um segurando onde dói. A ponte volta a ser só uma ponte.
-> END

// Taevel é a luta que não se perde: uma deixa `defeat` no mapa abre
// `taevel_basta` NO LUGAR da derrota, e a luta para ali. Quem o derruba leva
// o que ele dá; quem cai só ouve. A mania dele é `mirrors` — a ação de cada
// turno repete o TIPO da última ação de Halmira — e o estilo é o Viés, cuja
// Rachadura dobra o dano em quem se repetiu.
=== taevel ===
{taevel == 1:
    Um homem magro, de cabelo ainda molhado, enrola um cabo de arpão sentado no capim. Ele ergue os olhos antes de você fazer barulho.
    Taevel: Halmira de Selmir. Disseram que você desce bem. Em terra eu ainda não vi.
- else:
    Taevel: Voltou. O chão continua no mesmo lugar.
}
-> opcoes

= opcoes
* [Perguntar o que ele quer.]
    Taevel: Tirar uma medida. Eu faço o que você fizer, do jeito que você fizer.
    Taevel: Quem varia luta comigo. Quem se repete luta sozinho, e perde.
    -> opcoes
+ [Aceitar a medida.]
    Ele larga o cabo e fica de pé na mesma postura que a sua, como um reflexo que chegou atrasado.
    ~ start_fight("taevel")
    -> END
+ [Deixar pra outra hora.]
    Taevel: A maré espera menos do que eu.
    -> END

// A deixa da rodada 2, sem `ends`: a dica.
=== taevel_espelho ===
O golpe que volta é o seu, com um tempo de atraso. Ele não escolhe: devolve.
E quando você faz duas vezes a mesma coisa, a resposta chega mais funda, por onde você já tinha passado.
-> END

=== taevel_caiu ===
Taevel senta onde caiu e ri, sem fôlego.
Taevel: Medida tirada. Fica com isto: lá embaixo serve mais do que aqui.
~ give_item("item-oleo-da-coruja-de-miraven")
Ele recolhe o cabo e pega a estrada sem olhar pra trás.
-> END

=== taevel_basta ===
O golpe que ia acabar com a luta para a um dedo do seu rosto.
Taevel: Chega. Era uma medida, não uma briga.
Ele estende a mão, põe você de pé e recolhe o cabo.
Taevel: Você se repete quando cansa. Lá embaixo isso custa mais caro.
-> END
