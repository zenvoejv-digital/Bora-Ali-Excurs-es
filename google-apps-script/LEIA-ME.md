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

**Na planilha (tudo automático):**
- Ao chegar uma reserva com menor, a linha fica **laranja** e a planilha gera a **autorização em PDF** na pasta *Bora Ali - Autorizações de menores* do seu Google Drive. O link fica na coluna **AI**. O arquivo é privado: para mandar ao cliente, baixe e envie no WhatsApp.
- A coluna **AB** resume quem assina e se precisa de firma reconhecida. Se faltar algum dado, ela diz o que falta (e o PDF só é gerado quando estiver completo).
- As colunas **AC a AH** guardam quem é o contratante para o menor e os dados do responsável. Pode corrigir à vontade.
- A coluna **AJ** é a caixinha **Autorização entregue**: marque no embarque.
- A idade é calculada **na data do passeio** (ano em `ANO_VIAGENS`, no topo do código). Se mudar a data ou o nascimento e a pessoa fizer 18 anos antes da viagem, o destaque e a autorização somem sozinhos.

**Para a autorização se refazer sozinha quando alguém editar a reserva** (nome, nascimento, data, responsável, embarque...): menu **Bora Ali › Menores de idade › Refazer autorizações sozinho ao editar** (uma vez só; o Google pede autorização para o Drive). O PDF antigo vai para a lixeira e o novo entra no lugar, com o link atualizado.

Outros itens do menu *Menores de idade*:
- **Gerar/atualizar autorização (linhas selecionadas)**: refaz na hora as autorizações da reserva selecionada.
- **Conferir menores em todas as reservas**: destaca e gera o que faltar (útil depois de importar reservas antigas).

**Lista de embarque:** ganhou a coluna **Menor / autorização**. Menores com autorização entregue ficam verdes; os pendentes ficam laranja com "CONFERIR AUTORIZAÇÃO".

**Regra legal:** menor de 16 anos viajando com quem não é parente próximo precisa de autorização com **firma reconhecida em cartório** (Resolução CNJ nº 295/2019). Assinatura pelo gov.br não vale. O documento avisa quando é o caso.
