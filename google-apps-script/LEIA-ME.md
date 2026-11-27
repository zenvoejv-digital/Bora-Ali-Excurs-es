# Planilha de reservas — Bora Ali Excursões

Com a planilha ligada ao site:

- **cada reserva cai numa linha** (uma por passageiro), com código, dados, embarque e pagamento;
- o **status** de cada reserva fica num campo de escolha: *Aguardando sinal → Sinal pago → Pago*, ou *Cancelada*;
- as **vagas** são contadas sozinhas, e o site mostra "Restam X vagas" e "Esgotado" (reservas *Canceladas* devolvem a vaga);
- a **agenda** do site pode ser editada direto na aba *Agenda*, sem mexer em código;
- dá para **buscar qualquer reserva pelo código**, nome, CPF ou telefone;
- a aba **Clientes** é o painel dos gestores: histórico de cada cliente, risco de perda e viagem recomendada para o perfil;
- o menu **Bora Ali** gera a **lista de embarque** de cada viagem e as **mensagens de pós-viagem** com o link de avaliação.

> O site **não lê** dados pessoais da planilha. Ele só envia as reservas e lê a agenda e a contagem de vagas.

## Como ligar (uns 10 minutos, uma vez só)

1. Com a conta Google da agência, crie uma planilha nova em [sheets.google.com](https://sheets.google.com), por exemplo "Reservas Bora Ali".
2. Abra **Extensões › Apps Script**. Apague o que estiver lá, cole todo o conteúdo de `Codigo.gs` e salve (ícone de disquete).
3. Se quiser, preencha no topo do código o `LINK_AVALIACAO` (link de avaliação do Google).
4. Na barra de cima, escolha a função **`configurarPlanilha`** e clique em **Executar**. Autorize com a conta da agência. (O Google mostra um aviso de "app não verificado": clique em *Avançado › Acessar*. É o próprio script da agência.)
5. Clique em **Implantar › Nova implantação**. Em tipo, escolha **App da Web** e preencha:
   - *Executar como:* **Eu**
   - *Quem pode acessar:* **Qualquer pessoa**
6. Clique em **Implantar** e copie o **URL do app da Web** (termina em `/exec`).
7. No site, abra `assets/js/data.js` e cole o endereço em `planilhaUrl`:
   ```js
   planilhaUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
8. Publique o site. Faça uma reserva de teste e confira se ela aparece na aba **Reservas**.

### Se mudar o código do script depois

Use **Implantar › Gerenciar implantações › editar (lápis) › Versão: Nova versão › Implantar**. Assim o endereço continua o mesmo.

## Uso no dia a dia

- **Valor de cada passageiro:** a última coluna da aba Reservas mostra quanto cada um paga (crianças isentas aparecem com 0). O *Total da reserva*, na linha do contratante, já soma tudo.
- **Reservas:** quando o cliente pagar o sinal, mude o *Status* para **Sinal pago**. Se cancelar, use **Cancelada**: a vaga volta para o site.
- **Agenda:** cada linha é uma viagem. Coluna `vagas` = total de lugares (vazio = não controla). Coluna `ativo` = escreva **não** para esconder a viagem. O `id` não deve mudar depois que já houver reservas. As categorias aceitas são `fds`, `praia`, `parques`, `natureza` e `passeios`.
- **Buscar uma reserva (quando o cliente mandar o código):**
  - **Aba Buscar** (a primeira da planilha): digite na célula laranja o **código** (ex.: `BA-K3F9Q2`), parte do **nome**, o **CPF** (com ou sem pontos) ou o **telefone**, e aperte Enter. Todos os passageiros daquela reserva aparecem embaixo, na hora.
  - **Menu Bora Ali › Buscar reserva:** abre uma janela com o resumo da reserva (status, passageiros, pagamento, sinal e telefone) e já deixa as linhas selecionadas na aba Reservas, prontas para mudar o status.
  - Se a planilha foi criada antes dessa função, use **Bora Ali › Ir para a aba de busca** uma vez para criar a aba.
- **Painel de clientes (para os gestores), menu Bora Ali › Atualizar painel de clientes:** cria a aba **Clientes**, com uma linha por cliente (agrupado pelo CPF):
  - nome completo, CPF, e-mail, telefone e cidade;
  - quantas viagens fez, cancelamentos, total gasto, primeira e última reserva, último destino e destinos já feitos;
  - **perfil**: categoria preferida, "viaja com crianças", "em grupo" ou "sozinho(a)", "cliente fiel";
  - **risco de perda** pela data da última reserva: Ativo / Novo (até 90 dias), Atenção (91 a 180), Em risco (181 a 365) e Perdido (mais de 365). Os prazos ficam no topo do script. A aba vem com filtro, e os clientes em risco aparecem primeiro;
  - **viagem recomendada**: da categoria preferida, um destino que ele ainda não fez (quem viaja com crianças tem prioridade em parques). O link **"Enviar recomendação"** abre o WhatsApp do cliente com a mensagem pronta, mas **só para quem marcou "Quero receber novidades"** na reserva (LGPD). Acompanhantes aparecem como "Falar com o contratante".
  - **Menu Bora Ali › Ficha do cliente:** busque pelo CPF, nome ou e-mail e veja todo o histórico dele (cada reserva, passageiros, status e valores), com RG, nascimento e endereço.
  - **Menu Bora Ali › Atualizar o painel sozinho todo dia:** liga a atualização automática da aba Clientes, todo dia por volta das 6h.
- **Menu Bora Ali › Gerar lista de embarque:** escolha a viagem e é criada uma aba com todos os passageiros, organizada por cidade de embarque e com a contagem por cidade, pronta para imprimir.
- **Menu Bora Ali › Mensagens pós-viagem:** cria uma aba com um botão "Abrir WhatsApp" para cada cliente, com a mensagem de agradecimento e o link de avaliação.

## Privacidade (LGPD)

A planilha guarda nome, RG, CPF, endereço e data de nascimento. Compartilhe só com quem atende as reservas e não deixe o link da planilha público. (O link do *App da Web* pode ser público: ele não mostra dados pessoais.)

## Menores de idade (autorização)

**No site:** quando um acompanhante tem menos de 18 anos na data do passeio, o site pede quem é o contratante para ele (pai/mãe, responsável legal, parente ou outra pessoa) e, se precisar, os dados de quem vai assinar. Depois da reserva, o cliente imprime a autorização pronta.

**Contratante menor de idade:** quem tem menos de 18 anos pode reservar, mas o site abre um quadro para os dados do pai, mãe ou responsável legal e pergunta com quem o menor viaja (com o responsável, com outro adulto da reserva ou só com o grupo). Na planilha, a coluna AC da linha do contratante mostra essa escolha.

**Na planilha (tudo automático):**
- Ao chegar uma reserva com menor, a linha fica **laranja** e a planilha gera a **autorização em PDF** na pasta *Bora Ali - Autorizações de menores* do seu Google Drive. O link fica na coluna **AI**. O arquivo é privado: para mandar ao cliente, baixe e envie no WhatsApp.
- A coluna **AB** resume quem assina e se precisa de firma reconhecida. Se faltar algum dado, ela diz o que falta (e o PDF só é gerado quando estiver completo).
- As colunas **AC a AH** e **AK–AL** guardam quem é o contratante para o menor e os dados do responsável (nome, mãe/pai/tutor, CPF, RG, telefone, nascimento e e-mail). Pode corrigir à vontade.
- A coluna **AJ** é a caixinha **Autorização entregue**: marque no embarque.
- A idade é calculada **na data do passeio** (ano em `ANO_VIAGENS`, no topo do código). Se mudar a data ou o nascimento e a pessoa fizer 18 anos antes da viagem, o destaque e a autorização somem sozinhos.

**Para a autorização se refazer sozinha quando alguém editar a reserva** (nome, nascimento, data, responsável, embarque...): menu **Bora Ali › Menores de idade › Refazer autorizações sozinho ao editar** (uma vez só; o Google pede autorização para o Drive). O PDF antigo vai para a lixeira e o novo entra no lugar, com o link atualizado.

Outros itens do menu *Menores de idade*:
- **Gerar/atualizar autorização (linhas selecionadas)**: refaz na hora as autorizações da reserva selecionada.
- **Conferir menores em todas as reservas**: destaca e gera o que faltar (útil depois de importar reservas antigas).

**Lista de embarque:** traz, para cada passageiro, **nome completo, CPF e data de nascimento** (nas primeiras colunas, fixas ao rolar), idade na viagem, RG, telefone, emergência, status/código e a coluna **Menor / autorização**. Menores com autorização entregue ficam verdes; os pendentes ficam laranja com "CONFERIR AUTORIZAÇÃO".

**Regra legal:** menor de 16 anos viajando com quem não é parente próximo precisa de autorização com **firma reconhecida em cartório** (Resolução CNJ nº 295/2019). Assinatura pelo gov.br não vale. O documento avisa quando é o caso.

## Sinal: prazo, link de pagamento e confirmação

**Prazo do sinal = prazo do link de pagamento.** Cada reserva nasce com um prazo (padrão: 24 horas, em `PRAZO_SINAL_HORAS` no código e `prazoSinalHoras` no `assets/js/data.js`, use o mesmo número nos dois). A data fica na coluna **AM (Prazo do sinal)**. No site, o cliente vê um **contador** depois de reservar, e um aviso no topo se voltar ao site com o sinal pendente.

**Pagamento automático (Mercado Pago):**
1. No Mercado Pago da agência: *Seu negócio › Configurações › Credenciais › Credenciais de produção* e copie o **Access Token**.
2. Na planilha: menu **Bora Ali › Pagamentos do sinal › Ligar Mercado Pago** e cole o token. Ele fica guardado em segredo no projeto, não aparece na planilha.
3. Menu **Bora Ali › Pagamentos do sinal › Conferir sozinho a cada 10 minutos** (uma vez só).
4. Publique o App da Web de novo (Implantar › Gerenciar implantações › editar › Nova versão), para o Mercado Pago conseguir avisar a planilha.

A partir daí, cada reserva recebe um **link de pagamento do sinal** (Pix ou cartão em até 12x, sem boleto) que **vence junto com o prazo**. O link fica na coluna **AN** e aparece para o cliente no site. Quando o pagamento é aprovado, a reserva vira **Sinal pago** sozinha (ou **Pago**, se pagou o total), a data entra na coluna **AO** e o contador do cliente vira "Reserva confirmada".

**Cliente mandou o comprovante no WhatsApp (Pix direto, transferência...):** confira o comprovante e mude o **Status** para **Sinal pago** (ou **Pago**). Na hora:
- todos os passageiros da reserva ficam com o mesmo status;
- a data do pagamento entra na coluna AO;
- a coluna **AP (Confirmação ao cliente)** ganha o link **Enviar confirmação no WhatsApp**, com a mensagem pronta ("reserva confirmada", código, destino, data, embarque e passageiros);
- o contador do cliente no site para e mostra "Reserva confirmada".

Mudar o status na linha do **contratante** vale para a reserva inteira (por exemplo, Cancelada). Na linha de um acompanhante, só aquela pessoa muda (exceto Sinal pago/Pago, que confirmam a reserva toda).

**Prazo vencido:** se o prazo passar sem pagamento, a reserva vira **Prazo vencido** e **a vaga volta para o site** (para não liberar sozinho, mude `LIBERAR_VAGA_AO_VENCER` para `false`). Se o cliente pagar depois, a planilha marca o pagamento e deixa um aviso nas Observações para conferir se ainda há vaga. Para conferir na hora: **Bora Ali › Pagamentos do sinal › Conferir pagamentos e prazos agora**.

Outro banco ou maquininha (InfinitePay, PagBank, Asaas...) também pode ser ligado se tiver API de link de pagamento. Sem integração, tudo funciona com o prazo, o contador e a confirmação manual pelo comprovante.

## Aniversariantes do mês (desconto)

Quem faz aniversário no mês tem **desconto especial**, com as condições combinadas no WhatsApp.

- **No site:** se algum passageiro faz aniversário no **mês do passeio**, a reserva mostra o aviso "🎂 tem desconto especial, condições confirmadas pelo WhatsApp" e a mensagem para a agência sai com a linha **ANIVERSARIANTE DO MÊS** (o valor do site não muda: o desconto é combinado no WhatsApp). Para desligar: `descontoAniversario.ativo: false` em `assets/js/data.js`.
- **Nas reservas:** a coluna **AQ (Aniversariante do mês)** marca o passageiro, para a equipe conferir o desconto.
- **Aba "Aniversariantes":** menu **Bora Ali › Aniversariantes do mês (desconto)** (pergunta o mês; vazio = mês atual). Usa as datas de nascimento de todas as reservas e lista nome, CPF, aniversário, idade, telefone, viagens e último destino, com o link **Enviar parabéns + desconto** no WhatsApp (já sugerindo viagens da agenda daquele mês). Só aparece o link para quem tem o próprio telefone e **aceitou receber novidades** (LGPD); acompanhantes ficam como "Falar com o contratante".
- Marque **Desconto usado** e anote as **Condições combinadas**: isso é guardado quando a aba é atualizada.
- Com **Atualizar o painel sozinho todo dia** ligado, a aba de aniversariantes também se atualiza sozinha.
- Para citar um valor na mensagem (ex.: "10% de desconto"), escreva em `DESCONTO_ANIVERSARIO` no topo do código.

## Cores por situação

Cada reserva na aba **Reservas** muda de cor sozinha conforme o **Status**:

| Status | Cor da linha |
|---|---|
| Aguardando sinal | amarelo |
| Sinal pago | azul |
| Pago | verde |
| Prazo vencido | vermelho |
| Cancelada | cinza (letra apagada) |

A célula do Status fica com a cor mais forte e em negrito. Menores de idade têm o **nome** e a **autorização** em laranja. Em planilhas que já existiam, use uma vez o menu **Bora Ali › Aplicar cores por situação**.
