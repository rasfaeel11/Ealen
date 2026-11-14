// As noites acampadas (task 73, `docs/propostas-corpo.md`): quando o grupo acampa (`Z`, Acampar), a cena abre
// `noite`, que conta no máximo uma conversa por momento da história, e cada uma uma vez só. A da floresta já existe
// (o `acampamento` antes do vau, num gatilho). Sem afinidade nem escolha: a amizade dos três é a do Livro 1, e o
// jogador só a vê. O segredo de Xanduí, só pela forma (§3.3 do AGENTS).

=== noite ===
{
- contrato && not ato2 && not noite_contrato && in_party("jarupa") && in_party("xandui"): -> noite_contrato
- ato3 && not ykurua_morto && not noite_cheia && in_party("oryndu") && in_party("jarupa") && in_party("xandui"): -> noite_cheia
}
-> END

// Depois do contrato, antes da primeira ida.
=== noite_contrato ===
O fogo na beira do cais, entre dois barcos virados. Jarupã conta nos dedos.
Jarupã: Três partes. A gente mata o bicho, e cada um sai com quanto, estudante?
Endyru: Com o que o conselho achar que vale um bicho morto.
Xanduí: Lê de novo a parte do pagamento.
Endyru: Eu li hoje de manhã.
Xanduí: Lê de novo. Pra ver se mudou.
Endyru abre o caderno, onde copiou o edital palavra por palavra, e lê devagar a linha do pagamento. Xanduí escuta de olhos fechados, e no fim da frase os lábios dela mexem junto.
Xanduí: Não mudou.
Jarupã: Papel não muda, Xanduí.
Xanduí: Papel de conselho muda.
-> END

// A véspera da cheia, antes da luta final.
=== noite_cheia ===
A chuva ainda não veio. Oryndu está sentado no barco puxado pro seco, batendo o cabo do remo no casco, devagar. Bate. Espera. Escuta. Bate.
Endyru refaz a conta da corda no caderno pela terceira vez.
Jarupã: Dezoito passos, estudante. Você mediu ontem.
Endyru: A água subiu desde ontem.
Oryndu para de bater.
Oryndu: Subiu dois dedos.
Ele volta ao remo. Xanduí passa a pedra na espada reta, uma passada a cada batida, e ninguém fala mais até o fogo baixar.
-> END
