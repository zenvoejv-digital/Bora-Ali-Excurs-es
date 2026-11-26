# Planilha de reservas — Bora Ali Excursões

Com a planilha ligada ao site:

- **cada reserva cai numa linha** (uma por passageiro), com código, dados, embarque e pagamento;
- o **status** de cada reserva fica num campo de escolha: *Aguardando sinal → Sinal pago → Pago*, ou *Cancelada*;
- as **vagas** são contadas sozinhas, e o site mostra "Restam X vagas" e "Esgotado" (reservas *Canceladas* devolvem a vaga);
- a **agenda** do site pode ser editada direto na aba *Agenda*, sem mexer em código;
- dá para **buscar qualquer reserva pelo código**, nome, CPF ou telefone;
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

- **Reservas:** quando o cliente pagar o sinal, mude o *Status* para **Sinal pago**. Se cancelar, use **Cancelada**: a vaga volta para o site.
- **Agenda:** cada linha é uma viagem. Coluna `vagas` = total de lugares (vazio = não controla). Coluna `ativo` = escreva **não** para esconder a viagem. O `id` não deve mudar depois que já houver reservas. As categorias aceitas são `fds`, `praia`, `parques`, `natureza` e `passeios`.
- **Buscar uma reserva (quando o cliente mandar o código):**
  - **Aba Buscar** (a primeira da planilha): digite na célula laranja o **código** (ex.: `BA-K3F9Q2`), parte do **nome**, o **CPF** (com ou sem pontos) ou o **telefone**, e aperte Enter. Todos os passageiros daquela reserva aparecem embaixo, na hora.
  - **Menu Bora Ali › Buscar reserva:** abre uma janela com o resumo da reserva (status, passageiros, pagamento, sinal e telefone) e já deixa as linhas selecionadas na aba Reservas, prontas para mudar o status.
  - Se a planilha foi criada antes dessa função, use **Bora Ali › Ir para a aba de busca** uma vez para criar a aba.
- **Menu Bora Ali › Gerar lista de embarque:** escolha a viagem e é criada uma aba com todos os passageiros, organizada por cidade de embarque e com a contagem por cidade, pronta para imprimir.
- **Menu Bora Ali › Mensagens pós-viagem:** cria uma aba com um botão "Abrir WhatsApp" para cada cliente, com a mensagem de agradecimento e o link de avaliação.

## Privacidade (LGPD)

A planilha guarda nome, RG, CPF, endereço e data de nascimento. Compartilhe só com quem atende as reservas e não deixe o link da planilha público. (O link do *App da Web* pode ser público: ele não mostra dados pessoais.)
