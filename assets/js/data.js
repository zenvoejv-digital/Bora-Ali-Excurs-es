/* =========================================================
   AGENDA DE VIAGENS E CONFIGURAÇÕES — Bora Ali Excursões
   Para mudar a agenda sem a planilha, edite este arquivo.
   (Se a planilha estiver ligada em BORA_CONFIG.planilhaUrl, a agenda
    da aba "Agenda" da planilha substitui a lista abaixo.)

   Campos de cada viagem:
   - id:        identificador único (sem espaços nem acentos), usado para contar vagas
   - data:      texto mostrado no card (ex.: "02/01" ou "30 e 31/01")
   - dia:       dia da semana (ex.: "Sábado")
   - destino:   nome do destino
   - categoria: "fds" (fins de semana), "praia", "parques", "natureza" ou "passeios"
   - valor:     preço por pessoa, em número (ex.: 199.99)
   - obs:       texto curto abaixo do nome (ex.: "Bate e volta")
   - selo:      etiqueta opcional (ex.: "Carnaval"); deixe "" para nenhuma
   - mes:       chave do mês, igual a uma das chaves em BORA_MESES
   - cena:      animação do card (chaves em assets/js/art.js, SCENES); "" = genérica
   - vagas:     total de lugares no ônibus (ex.: 46); null = não controlar vagas
   ========================================================= */

window.BORA_CONFIG = {
  // números que recebem as reservas (com DDI 55); cada reserva vai para um deles, intercalando
  whatsappReservas: ["5511974882023", "5511995383275"],
  maxParcelas: 10,                     // parcelas máximas no cartão de crédito
  cidadesEmbarque: ["Sorocaba", "Itu", "Salto", "Indaiatuba", "Campinas"],

  // Pix para o sinal de 50%. Deixe chave "" para não mostrar o Pix no site.
  pix: {
    chave: "",                         // CPF/CNPJ só números, e-mail, celular (+5511999999999) ou chave aleatória
    nome: "BORA ALI EXCURSOES",        // nome do recebedor (até 25 letras, sem acento)
    cidade: "SALTO"                    // cidade do recebedor (até 15 letras, sem acento)
  },

  // Endereço do "App da Web" do Google Apps Script (veja google-apps-script/LEIA-ME.md).
  // Com ele preenchido: cada reserva vai para a planilha, as vagas são contadas sozinhas
  // e a agenda pode ser editada pela planilha. Vazio = só WhatsApp.
  planilhaUrl: "",

  // Link para avaliar a agência no Google (Perfil da Empresa › Pedir avaliações). Vazio = não mostra.
  linkAvaliacao: "",

  // Mostrar "Restam X vagas" quando sobrarem até este número de lugares
  avisoVagas: 10
};

window.BORA_MESES = [
  { id: "jan", label: "Janeiro" },
  { id: "fev", label: "Fevereiro" }
];

window.BORA_VIAGENS = [
  {"id": "olimpia-jan-30", "data": "30 e 31/01", "dia": "Sáb e dom", "destino": "Olímpia", "categoria": "fds", "valor": 1200.0, "obs": "Com Thermas dos Laranjais", "selo": "", "mes": "jan", "cena": "olimpia", "vagas": null},
  {"id": "rio-de-janeiro-fev-06", "data": "06 a 09/02", "dia": "Feriadão", "destino": "Rio de Janeiro", "categoria": "fds", "valor": 1200.0, "obs": "Fim de semana de Carnaval", "selo": "Carnaval", "mes": "fev", "cena": "rio", "vagas": null},
  {"id": "sao-thome-das-letras-fev-27", "data": "27 e 28/02", "dia": "Sáb e dom", "destino": "São Thomé das Letras", "categoria": "fds", "valor": 899.99, "obs": "Fim de semana na serra mineira", "selo": "", "mes": "fev", "cena": "saothome", "vagas": null},
  {"id": "boraceia-bertioga-jan-02", "data": "02/01", "dia": "Sábado", "destino": "Boracéia / Bertioga", "categoria": "praia", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "boraceia", "vagas": null},
  {"id": "ilhabela-jan-02", "data": "02/01", "dia": "Sábado", "destino": "Ilhabela", "categoria": "praia", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "ilhabela", "vagas": null},
  {"id": "ipanema-rj-jan-10", "data": "10/01", "dia": "Domingo", "destino": "Ipanema / RJ", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "ipanema", "vagas": null},
  {"id": "prumirim-jan-24", "data": "24/01", "dia": "Domingo", "destino": "Prumirim", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "prumirim", "vagas": null},
  {"id": "guaruja-fev-02", "data": "02/02", "dia": "Terça", "destino": "Guarujá", "categoria": "praia", "valor": 230.0, "obs": "Bate e volta", "selo": "Feriado de Itu", "mes": "fev", "cena": "guaruja", "vagas": null},
  {"id": "copacabana-fev-07", "data": "07/02", "dia": "Domingo", "destino": "Copacabana", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "copacabana", "vagas": null},
  {"id": "maresias-fev-21", "data": "21/02", "dia": "Domingo", "destino": "Maresias", "categoria": "praia", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "maresias", "vagas": null},
  {"id": "thermas-da-mata-jan-03", "data": "03/01", "dia": "Domingo", "destino": "Thermas da Mata", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "thermasmata", "vagas": null},
  {"id": "castelo-park-jan-09", "data": "09/01", "dia": "Sábado", "destino": "Castelo Park", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "castelo", "vagas": null},
  {"id": "hopi-hari-jan-16", "data": "16/01", "dia": "Sábado", "destino": "Hopi Hari", "categoria": "parques", "valor": 199.99, "obs": "Transporte com ingresso", "selo": "Férias", "mes": "jan", "cena": "hopihari", "vagas": null},
  {"id": "wet-n-wild-jan-17", "data": "17/01", "dia": "Domingo", "destino": "Wet'n Wild", "categoria": "parques", "valor": 240.0, "obs": "Transporte com ingresso", "selo": "", "mes": "jan", "cena": "wetnwild", "vagas": null},
  {"id": "maeda-fev-02", "data": "02/02", "dia": "Terça", "destino": "Maeda", "categoria": "parques", "valor": 260.0, "obs": "Bate e volta", "selo": "Feriado de Itu", "mes": "fev", "cena": "maeda", "vagas": null},
  {"id": "thermas-de-sao-pedro-fev-07", "data": "07/02", "dia": "Domingo", "destino": "Thermas de São Pedro", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "thermassp", "vagas": null},
  {"id": "cidade-das-criancas-fev-14", "data": "14/02", "dia": "Domingo", "destino": "Cidade das Crianças", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "criancas", "vagas": null},
  {"id": "greencamp-jan-23", "data": "23/01", "dia": "Sábado", "destino": "Greencamp", "categoria": "natureza", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "greencamp", "vagas": null},
  {"id": "holambra-jan-24", "data": "24/01", "dia": "Domingo", "destino": "Holambra", "categoria": "natureza", "valor": 199.99, "obs": "Cidade das Flores", "selo": "", "mes": "jan", "cena": "holambra", "vagas": null},
  {"id": "extrema-mg-fev-09", "data": "09/02", "dia": "Terça", "destino": "Extrema / MG", "categoria": "natureza", "valor": 199.99, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "extrema", "vagas": null},
  {"id": "pico-do-lopo-fev-14", "data": "14/02", "dia": "Domingo", "destino": "Pico do Lopo", "categoria": "natureza", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "picolopo", "vagas": null},
  {"id": "campos-do-jordao-fev-21", "data": "21/02", "dia": "Domingo", "destino": "Campos do Jordão", "categoria": "natureza", "valor": 220.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "campos", "vagas": null},
  {"id": "zoologico-de-sao-paulo-jan-03", "data": "03/01", "dia": "Domingo", "destino": "Zoológico de São Paulo", "categoria": "passeios", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "zoo", "vagas": null},
  {"id": "aparecida-do-norte-jan-10", "data": "10/01", "dia": "Domingo", "destino": "Aparecida do Norte", "categoria": "passeios", "valor": 180.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "aparecida", "vagas": null},
  {"id": "serra-negra-jan-17", "data": "17/01", "dia": "Domingo", "destino": "Serra Negra", "categoria": "passeios", "valor": 199.99, "obs": "Compras e Circuito das Águas", "selo": "", "mes": "jan", "cena": "serranegra", "vagas": null},
  {"id": "rincao-fev-28", "data": "28/02", "dia": "Domingo", "destino": "Rincão", "categoria": "passeios", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "rincao", "vagas": null},
  {"id": "ctn-fev-28", "data": "28/02", "dia": "Domingo", "destino": "CTN", "categoria": "passeios", "valor": 150.0, "obs": "Centro de Tradições Nordestinas", "selo": "", "mes": "fev", "cena": "ctn", "vagas": null}
];
