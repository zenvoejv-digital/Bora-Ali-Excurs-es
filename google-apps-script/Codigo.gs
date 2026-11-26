/**
 * Bora Ali Excursões — planilha de reservas
 * Cole este código em: Planilha Google › Extensões › Apps Script.
 * Passo a passo completo em google-apps-script/LEIA-ME.md
 */

// ====== AJUSTES ======
var LINK_AVALIACAO = '';           // link de avaliação do Google (Perfil da Empresa › Pedir avaliações)
var NOME_AGENCIA = 'Bora Ali Excursões';
var STATUS = ['Aguardando sinal', 'Sinal pago', 'Pago', 'Cancelada'];
// =====================

var ABA_RESERVAS = 'Reservas';
var ABA_AGENDA = 'Agenda';
var CAB_RESERVAS = ['Recebido em', 'Código', 'Status', 'ID viagem', 'Destino', 'Data', 'Tipo', 'Nome', 'RG', 'CPF',
  'Nascimento', 'Idade', 'Telefone', 'E-mail', 'Endereço', 'Embarque', 'Emergência (nome)', 'Emergência (tel.)',
  'Necessidades / saúde', 'Pagamento', 'Parcelas', 'Total da reserva', 'Sinal (50%)', 'Observações', 'WhatsApp que recebeu'];
var CAB_AGENDA = ['id', 'data', 'dia', 'destino', 'categoria', 'valor', 'obs', 'selo', 'mes', 'cena', 'vagas', 'ativo'];

// ---------- menu ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bora Ali')
    .addItem('Preparar planilha (1ª vez)', 'configurarPlanilha')
    .addSeparator()
    .addItem('Gerar lista de embarque', 'gerarListaEmbarque')
    .addItem('Mensagens pós-viagem (avaliação)', 'mensagensPosViagem')
    .addToUi();
}

// ---------- 1ª vez: cria as abas ----------
function configurarPlanilha() {
  var ss = SpreadsheetApp.getActive();
  var r = ss.getSheetByName(ABA_RESERVAS) || ss.insertSheet(ABA_RESERVAS);
  if (r.getLastRow() === 0) {
    r.appendRow(CAB_RESERVAS);
    r.setFrozenRows(1);
    r.getRange(1, 1, 1, CAB_RESERVAS.length).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
    var regra = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build();
    r.getRange('C2:C').setDataValidation(regra);
    r.getRange('B:B').setFontWeight('bold');
    r.setColumnWidths(1, CAB_RESERVAS.length, 140);
  }
  var a = ss.getSheetByName(ABA_AGENDA) || ss.insertSheet(ABA_AGENDA);
  if (a.getLastRow() === 0) {
    a.appendRow(CAB_AGENDA);
    a.setFrozenRows(1);
    a.getRange(1, 1, 1, CAB_AGENDA.length).setFontWeight('bold').setBackground('#F47B20').setFontColor('#06284D');
    var seed = AGENDA_INICIAL;
    a.getRange(2, 1, seed.length, CAB_AGENDA.length).setValues(seed);
    a.getRange('B:B').setNumberFormat('@');
    a.setColumnWidths(1, CAB_AGENDA.length, 130);
    a.getRange(1, 1).setNote('Cada linha é uma viagem do site. "vagas": total de lugares (vazio = sem controle). ' +
      '"ativo": escreva "não" para esconder do site. "categoria": fds, praia, parques, natureza ou passeios.');
  }
  SpreadsheetApp.getUi().alert('Pronto! Abas "Reservas" e "Agenda" criadas. Agora publique como App da Web (veja o LEIA-ME).');
}

// ---------- recebe reservas do site ----------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.tipo !== 'reserva' || !/^BA-[A-Z0-9]{4,8}$/.test(String(d.codigo)) || !d.viagem || !d.contratante) return json_({ ok: false });
    var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
    var agora = new Date();
    var v = d.viagem, c = d.contratante, p = d.pagamento || {};
    var base = [agora, d.codigo, STATUS[0], v.id, v.destino, v.data];
    var linhas = [];
    linhas.push(base.concat(['Contratante', c.nome, c.rg, c.cpf, c.nascimento, c.idade, c.telefone, c.email, c.endereco,
      c.embarque, c.emergenciaNome, c.emergenciaTelefone, d.saude, p.forma, p.parcelas, p.total, p.sinal, d.observacoes, d.atendente]));
    (d.acompanhantes || []).slice(0, 20).forEach(function (a) {
      linhas.push(base.concat(['Acompanhante de ' + c.nome, a.nome, a.rg, a.cpf, a.nascimento, a.idade, c.telefone, '', '',
        a.embarque, c.emergenciaNome, c.emergenciaTelefone, '', '', '', '', '', '', d.atendente]));
    });
    linhas = linhas.map(function (l) { return l.map(limpa_); });
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, CAB_RESERVAS.length).setValues(linhas);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

// ---------- entrega agenda e vagas ocupadas para o site (sem dados pessoais) ----------
function doGet(e) {
  var ss = SpreadsheetApp.getActive();
  var viagens = [];
  var a = ss.getSheetByName(ABA_AGENDA);
  if (a && a.getLastRow() > 1) {
    var faixa = a.getRange(2, 1, a.getLastRow() - 1, CAB_AGENDA.length);
    var brutos = faixa.getValues(), textos = faixa.getDisplayValues();
    textos.forEach(function (r, n) {
      var ativo = String(r[11]).trim().toLowerCase();
      if (!r[0] || ativo === 'não' || ativo === 'nao') return;
      var o = {};
      CAB_AGENDA.forEach(function (k, i) { o[k] = r[i]; });
      o.valor = numero_(brutos[n][5]);
      o.vagas = brutos[n][10] === '' ? null : numero_(brutos[n][10]);
      viagens.push(o);
    });
  }
  var ocupadas = {};
  var r = ss.getSheetByName(ABA_RESERVAS);
  if (r && r.getLastRow() > 1) {
    r.getRange(2, 3, r.getLastRow() - 1, 2).getValues().forEach(function (x) {
      if (x[0] === 'Cancelada' || !x[1]) return;
      ocupadas[x[1]] = (ocupadas[x[1]] || 0) + 1;
    });
  }
  return json_({ ok: true, viagens: viagens, ocupadas: ocupadas });
}

// ---------- lista de embarque de uma viagem ----------
function gerarListaEmbarque() {
  var v = escolherViagem_('Gerar lista de embarque');
  if (!v) return;
  var pax = passageirosDa_(v.id);
  var ss = SpreadsheetApp.getActive();
  var nome = ('Embarque ' + v.destino + ' ' + v.data).replace(/[\/\\?*\[\]:]/g, '-').slice(0, 90);
  var sh = ss.getSheetByName(nome);
  if (sh) sh.clear(); else sh = ss.insertSheet(nome);
  pax.sort(function (a, b) { return String(a.embarque).localeCompare(b.embarque) || String(a.nome).localeCompare(b.nome); });
  var out = [[NOME_AGENCIA + ' — Lista de passageiros', '', '', '', '', '', '', '', ''],
    ['Destino: ' + v.destino, 'Data: ' + v.data, 'Total: ' + pax.length + ' passageiros', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['Nº', 'Embarque', 'Nome', 'RG', 'CPF', 'Idade', 'Telefone', 'Emergência', 'Status / Código']];
  pax.forEach(function (p, i) {
    out.push([i + 1, p.embarque, p.nome, p.rg, p.cpf, p.idade, p.telefone, [p.emgNome, p.emgTel].filter(String).join(' - '), p.status + ' / ' + p.codigo]);
  });
  var porCidade = {};
  pax.forEach(function (p) { porCidade[p.embarque] = (porCidade[p.embarque] || 0) + 1; });
  out.push(['', '', '', '', '', '', '', '', '']);
  Object.keys(porCidade).forEach(function (k) { out.push(['', k, porCidade[k] + ' passageiro(s)', '', '', '', '', '', '']); });
  sh.getRange(1, 1, out.length, 9).setValues(out.map(function (l) { return l.map(limpa_); }));
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sh.getRange(4, 1, 1, 9).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
  sh.setFrozenRows(4);
  sh.autoResizeColumns(1, 9);
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('Lista criada na aba "' + nome + '". Para imprimir: Arquivo › Imprimir.');
}

// ---------- mensagens de pós-viagem com link de avaliação ----------
function mensagensPosViagem() {
  var v = escolherViagem_('Mensagens pós-viagem');
  if (!v) return;
  var ss = SpreadsheetApp.getActive();
  var r = ss.getSheetByName(ABA_RESERVAS);
  var dados = r.getLastRow() > 1 ? r.getRange(2, 1, r.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues() : [];
  var nome = ('Pós-viagem ' + v.destino + ' ' + v.data).replace(/[\/\\?*\[\]:]/g, '-').slice(0, 90);
  var sh = ss.getSheetByName(nome);
  if (sh) sh.clear(); else sh = ss.insertSheet(nome);
  var out = [['Nome', 'Telefone', 'Enviar']];
  dados.forEach(function (l) {
    if (l[3] !== v.id || l[6] !== 'Contratante' || l[2] === 'Cancelada') return;
    var primeiro = String(l[7]).split(' ')[0];
    var msg = 'Oi, ' + primeiro + '! Aqui é da ' + NOME_AGENCIA + '. Obrigado por viajar com a gente para ' + v.destino + '! 🧡' +
      (LINK_AVALIACAO ? ' Se puder, deixa sua avaliação, ajuda muito: ' + LINK_AVALIACAO : '') + ' Bora para a próxima?';
    var tel = '55' + String(l[12]).replace(/\D/g, '');
    out.push([l[7], l[12], '=HYPERLINK("https://wa.me/' + tel + '?text=' + encodeURIComponent(msg) + '";"Abrir WhatsApp")']);
  });
  sh.getRange(1, 1, out.length, 3).setValues(out);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#F47B20');
  sh.autoResizeColumns(1, 3);
  ss.setActiveSheet(sh);
}

// ---------- auxiliares ----------
function escolherViagem_(titulo) {
  var ui = SpreadsheetApp.getUi();
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA);
  if (!a || a.getLastRow() < 2) { ui.alert('Rode "Preparar planilha" primeiro.'); return null; }
  var lista = a.getRange(2, 1, a.getLastRow() - 1, 4).getDisplayValues().filter(function (r) { return r[0]; });
  var texto = lista.map(function (r, i) { return (i + 1) + ') ' + r[3] + ' — ' + r[1]; }).join('\n');
  var resp = ui.prompt(titulo, 'Digite o número da viagem:\n\n' + texto, ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return null;
  var n = parseInt(resp.getResponseText(), 10);
  if (!(n >= 1 && n <= lista.length)) { ui.alert('Número inválido.'); return null; }
  var r = lista[n - 1];
  return { id: r[0], data: r[1], destino: r[3] };
}

function passageirosDa_(id) {
  var r = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!r || r.getLastRow() < 2) return [];
  return r.getRange(2, 1, r.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues()
    .filter(function (l) { return l[3] === id && l[2] !== 'Cancelada'; })
    .map(function (l) {
      return { codigo: l[1], status: l[2], nome: l[7], rg: l[8], cpf: l[9], idade: l[11], telefone: l[12],
        embarque: l[15], emgNome: l[16], emgTel: l[17] };
    });
}

// aceita 1200, "1.200,00" ou "1200.50"
function numero_(x) {
  if (typeof x === 'number') return x;
  var t = String(x).replace(/[^\d,.]/g, '');
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t) || 0;
}

// impede que um texto vire fórmula na planilha
function limpa_(x) {
  if (typeof x === 'string' && /^[=+\-@]/.test(x)) return "'" + x;
  return x == null ? '' : x;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Agenda inicial (copiada do site). Depois de criada, edite direto na aba "Agenda".
var AGENDA_INICIAL = [
    ["olimpia-jan-30", "30 e 31/01", "Sáb e dom", "Olímpia", "fds", 1200.0, "Com Thermas dos Laranjais", "", "Janeiro", "olimpia", "", "sim"],
    ["rio-de-janeiro-fev-06", "06 a 09/02", "Feriadão", "Rio de Janeiro", "fds", 1200.0, "Fim de semana de Carnaval", "Carnaval", "Fevereiro", "rio", "", "sim"],
    ["sao-thome-das-letras-fev-27", "27 e 28/02", "Sáb e dom", "São Thomé das Letras", "fds", 899.99, "Fim de semana na serra mineira", "", "Fevereiro", "saothome", "", "sim"],
    ["boraceia-bertioga-jan-02", "02/01", "Sábado", "Boracéia / Bertioga", "praia", 230.0, "Bate e volta", "", "Janeiro", "boraceia", "", "sim"],
    ["ilhabela-jan-02", "02/01", "Sábado", "Ilhabela", "praia", 250.0, "Bate e volta", "", "Janeiro", "ilhabela", "", "sim"],
    ["ipanema-rj-jan-10", "10/01", "Domingo", "Ipanema / RJ", "praia", 299.99, "Bate e volta", "", "Janeiro", "ipanema", "", "sim"],
    ["prumirim-jan-24", "24/01", "Domingo", "Prumirim", "praia", 299.99, "Bate e volta", "", "Janeiro", "prumirim", "", "sim"],
    ["guaruja-fev-02", "02/02", "Terça", "Guarujá", "praia", 230.0, "Bate e volta", "Feriado de Itu", "Fevereiro", "guaruja", "", "sim"],
    ["copacabana-fev-07", "07/02", "Domingo", "Copacabana", "praia", 299.99, "Bate e volta", "Carnaval", "Fevereiro", "copacabana", "", "sim"],
    ["maresias-fev-21", "21/02", "Domingo", "Maresias", "praia", 250.0, "Bate e volta", "", "Fevereiro", "maresias", "", "sim"],
    ["thermas-da-mata-jan-03", "03/01", "Domingo", "Thermas da Mata", "parques", 230.0, "Bate e volta", "", "Janeiro", "thermasmata", "", "sim"],
    ["castelo-park-jan-09", "09/01", "Sábado", "Castelo Park", "parques", 230.0, "Bate e volta", "", "Janeiro", "castelo", "", "sim"],
    ["hopi-hari-jan-16", "16/01", "Sábado", "Hopi Hari", "parques", 199.99, "Transporte com ingresso", "Férias", "Janeiro", "hopihari", "", "sim"],
    ["wet-n-wild-jan-17", "17/01", "Domingo", "Wet'n Wild", "parques", 240.0, "Transporte com ingresso", "", "Janeiro", "wetnwild", "", "sim"],
    ["maeda-fev-02", "02/02", "Terça", "Maeda", "parques", 260.0, "Bate e volta", "Feriado de Itu", "Fevereiro", "maeda", "", "sim"],
    ["thermas-de-sao-pedro-fev-07", "07/02", "Domingo", "Thermas de São Pedro", "parques", 230.0, "Bate e volta", "Carnaval", "Fevereiro", "thermassp", "", "sim"],
    ["cidade-das-criancas-fev-14", "14/02", "Domingo", "Cidade das Crianças", "parques", 230.0, "Bate e volta", "", "Fevereiro", "criancas", "", "sim"],
    ["greencamp-jan-23", "23/01", "Sábado", "Greencamp", "natureza", 280.0, "Bate e volta", "", "Janeiro", "greencamp", "", "sim"],
    ["holambra-jan-24", "24/01", "Domingo", "Holambra", "natureza", 199.99, "Cidade das Flores", "", "Janeiro", "holambra", "", "sim"],
    ["extrema-mg-fev-09", "09/02", "Terça", "Extrema / MG", "natureza", 199.99, "Bate e volta", "Carnaval", "Fevereiro", "extrema", "", "sim"],
    ["pico-do-lopo-fev-14", "14/02", "Domingo", "Pico do Lopo", "natureza", 280.0, "Bate e volta", "", "Fevereiro", "picolopo", "", "sim"],
    ["campos-do-jordao-fev-21", "21/02", "Domingo", "Campos do Jordão", "natureza", 220.0, "Bate e volta", "", "Fevereiro", "campos", "", "sim"],
    ["zoologico-de-sao-paulo-jan-03", "03/01", "Domingo", "Zoológico de São Paulo", "passeios", 250.0, "Bate e volta", "", "Janeiro", "zoo", "", "sim"],
    ["aparecida-do-norte-jan-10", "10/01", "Domingo", "Aparecida do Norte", "passeios", 180.0, "Bate e volta", "", "Janeiro", "aparecida", "", "sim"],
    ["serra-negra-jan-17", "17/01", "Domingo", "Serra Negra", "passeios", 199.99, "Compras e Circuito das Águas", "", "Janeiro", "serranegra", "", "sim"],
    ["rincao-fev-28", "28/02", "Domingo", "Rincão", "passeios", 280.0, "Bate e volta", "", "Fevereiro", "rincao", "", "sim"],
    ["ctn-fev-28", "28/02", "Domingo", "CTN", "passeios", 150.0, "Centro de Tradições Nordestinas", "", "Fevereiro", "ctn", "", "sim"]
];
