/* =========================================================
   AGENDA DE VIAGENS — Bora Ali Excursões
   Para mudar a agenda, edite só este arquivo.

   Campos de cada viagem:
   - data:      texto mostrado no card (ex.: "02/01" ou "30 e 31/01")
   - dia:       dia da semana (ex.: "Sábado")
   - destino:   nome do destino
   - categoria: "fds" (fins de semana), "praia", "parques", "natureza" ou "passeios"
   - valor:     preço por pessoa, em número (ex.: 199.99)
   - obs:       texto curto abaixo do nome (ex.: "Bate e volta")
   - selo:      etiqueta opcional (ex.: "Carnaval"); deixe "" para nenhuma
   - mes:       chave do mês, igual a uma das chaves em MESES abaixo
   - cena:      animação do card (veja as chaves em assets/js/art.js, SCENES)
                use "" para uma cena genérica
   ========================================================= */

window.BORA_CONFIG = {
  whatsapp: "5511974882023",          // número que recebe as reservas (com DDI 55)
  maxParcelas: 10,                     // parcelas máximas no cartão de crédito
  cidadesEmbarque: ["Sorocaba", "Itu", "Salto", "Indaiatuba", "Campinas"]
};

window.BORA_MESES = [
  { id: "jan", label: "Janeiro" },
  { id: "fev", label: "Fevereiro" }
];

window.BORA_VIAGENS = [
  {"data": "30 e 31/01", "dia": "Sáb e dom", "destino": "Olímpia", "categoria": "fds", "valor": 1200.0, "obs": "Com Thermas dos Laranjais", "selo": "", "mes": "jan", "cena": "olimpia"},
  {"data": "06 a 09/02", "dia": "Feriadão", "destino": "Rio de Janeiro", "categoria": "fds", "valor": 1200.0, "obs": "Fim de semana de Carnaval", "selo": "Carnaval", "mes": "fev", "cena": "rio"},
  {"data": "27 e 28/02", "dia": "Sáb e dom", "destino": "São Thomé das Letras", "categoria": "fds", "valor": 899.99, "obs": "Fim de semana na serra mineira", "selo": "", "mes": "fev", "cena": "saothome"},
  {"data": "02/01", "dia": "Sábado", "destino": "Boracéia / Bertioga", "categoria": "praia", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "boraceia"},
  {"data": "02/01", "dia": "Sábado", "destino": "Ilhabela", "categoria": "praia", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "ilhabela"},
  {"data": "10/01", "dia": "Domingo", "destino": "Ipanema / RJ", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "ipanema"},
  {"data": "24/01", "dia": "Domingo", "destino": "Prumirim", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "prumirim"},
  {"data": "02/02", "dia": "Terça", "destino": "Guarujá", "categoria": "praia", "valor": 230.0, "obs": "Bate e volta", "selo": "Feriado de Itu", "mes": "fev", "cena": "guaruja"},
  {"data": "07/02", "dia": "Domingo", "destino": "Copacabana", "categoria": "praia", "valor": 299.99, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "copacabana"},
  {"data": "21/02", "dia": "Domingo", "destino": "Maresias", "categoria": "praia", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "maresias"},
  {"data": "03/01", "dia": "Domingo", "destino": "Thermas da Mata", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "thermasmata"},
  {"data": "09/01", "dia": "Sábado", "destino": "Castelo Park", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "castelo"},
  {"data": "16/01", "dia": "Sábado", "destino": "Hopi Hari", "categoria": "parques", "valor": 199.99, "obs": "Transporte com ingresso", "selo": "Férias", "mes": "jan", "cena": "hopihari"},
  {"data": "17/01", "dia": "Domingo", "destino": "Wet'n Wild", "categoria": "parques", "valor": 240.0, "obs": "Transporte com ingresso", "selo": "", "mes": "jan", "cena": "wetnwild"},
  {"data": "02/02", "dia": "Terça", "destino": "Maeda", "categoria": "parques", "valor": 260.0, "obs": "Bate e volta", "selo": "Feriado de Itu", "mes": "fev", "cena": "maeda"},
  {"data": "07/02", "dia": "Domingo", "destino": "Thermas de São Pedro", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "thermassp"},
  {"data": "14/02", "dia": "Domingo", "destino": "Cidade das Crianças", "categoria": "parques", "valor": 230.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "criancas"},
  {"data": "23/01", "dia": "Sábado", "destino": "Greencamp", "categoria": "natureza", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "greencamp"},
  {"data": "24/01", "dia": "Domingo", "destino": "Holambra", "categoria": "natureza", "valor": 199.99, "obs": "Cidade das Flores", "selo": "", "mes": "jan", "cena": "holambra"},
  {"data": "09/02", "dia": "Terça", "destino": "Extrema / MG", "categoria": "natureza", "valor": 199.99, "obs": "Bate e volta", "selo": "Carnaval", "mes": "fev", "cena": "extrema"},
  {"data": "14/02", "dia": "Domingo", "destino": "Pico do Lopo", "categoria": "natureza", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "picolopo"},
  {"data": "21/02", "dia": "Domingo", "destino": "Campos do Jordão", "categoria": "natureza", "valor": 220.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "campos"},
  {"data": "03/01", "dia": "Domingo", "destino": "Zoológico de São Paulo", "categoria": "passeios", "valor": 250.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "zoo"},
  {"data": "10/01", "dia": "Domingo", "destino": "Aparecida do Norte", "categoria": "passeios", "valor": 180.0, "obs": "Bate e volta", "selo": "", "mes": "jan", "cena": "aparecida"},
  {"data": "17/01", "dia": "Domingo", "destino": "Serra Negra", "categoria": "passeios", "valor": 199.99, "obs": "Compras e Circuito das Águas", "selo": "", "mes": "jan", "cena": "serranegra"},
  {"data": "28/02", "dia": "Domingo", "destino": "Rincão", "categoria": "passeios", "valor": 280.0, "obs": "Bate e volta", "selo": "", "mes": "fev", "cena": "rincao"},
  {"data": "28/02", "dia": "Domingo", "destino": "CTN", "categoria": "passeios", "valor": 150.0, "obs": "Centro de Tradições Nordestinas", "selo": "", "mes": "fev", "cena": "ctn"}
];
