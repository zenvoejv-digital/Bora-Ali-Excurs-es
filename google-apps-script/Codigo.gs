/**
 * Bora Ali Excursões — planilha de reservas
 * Cole este código em: Planilha Google › Extensões › Apps Script.
 * Passo a passo completo em google-apps-script/LEIA-ME.md
 */

// ====== AJUSTES ======
var LINK_AVALIACAO = '';           // link de avaliação do Google (Perfil da Empresa › Pedir avaliações)
var NOME_AGENCIA = 'Bora Ali Excursões';
var STATUS = ['Aguardando sinal', 'Sinal pago', 'Pago', 'Cancelada'];
// Risco de perda do cliente: dias desde a última reserva
var DIAS_ATIVO = 90;       // até 90 dias: Ativo
var DIAS_ATENCAO = 180;    // 91 a 180: Atenção
var DIAS_RISCO = 365;      // 181 a 365: Em risco · acima disso: Perdido
// Menores de idade: ano das viagens da agenda (para calcular a idade no dia do passeio) e pasta das autorizações no Drive
var ANO_VIAGENS = 2027;
var PASTA_AUTORIZACOES = 'Bora Ali - Autorizações de menores';
var COR_MENOR = '#ffe8d6';
// =====================

var ABA_RESERVAS = 'Reservas';
var ABA_AGENDA = 'Agenda';
var ABA_BUSCA = 'Buscar';
var ABA_CLIENTES = 'Clientes';
var CAB_RESERVAS = ['Recebido em', 'Código', 'Status', 'ID viagem', 'Destino', 'Data', 'Tipo', 'Nome', 'RG', 'CPF',
  'Nascimento', 'Idade', 'Telefone', 'E-mail', 'Endereço', 'Embarque', 'Emergência (nome)', 'Emergência (tel.)',
  'Necessidades / saúde', 'Pagamento', 'Parcelas', 'Total da reserva', 'Sinal (50%)', 'Observações', 'WhatsApp que recebeu',
  'Aceita novidades', 'Valor do passageiro', 'Autorização do menor',
  'Contratante é (menor)', 'Responsável (nome)', 'Responsável é', 'Responsável (CPF)', 'Responsável (RG)', 'Responsável (telefone)',
  'Link da autorização', 'Autorização entregue'];
// colunas (1 = A) usadas pelas autorizações
var COL_AUT = 28, COL_VINC = 29, COL_LINK = 35, COL_ENTREGUE = 36;
var VINC_ROTULO = { pai: 'Pai ou mãe', resp: 'Responsável legal', parente: 'Parente', outro: 'Outra pessoa' };
var CAB_AGENDA = ['id', 'data', 'dia', 'destino', 'categoria', 'valor', 'obs', 'selo', 'mes', 'cena', 'vagas', 'ativo'];

// ---------- menu ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bora Ali')
    .addItem('Preparar planilha (1ª vez)', 'configurarPlanilha')
    .addSeparator()
    .addItem('Buscar reserva (código, nome ou CPF)', 'buscarReserva')
    .addItem('Ir para a aba de busca', 'abrirAbaBusca')
    .addSeparator()
    .addItem('Atualizar painel de clientes', 'atualizarClientes')
    .addItem('Ficha do cliente (histórico completo)', 'fichaCliente')
    .addItem('Atualizar o painel sozinho todo dia', 'ativarAtualizacaoDiaria')
    .addSeparator()
    .addItem('Gerar lista de embarque', 'gerarListaEmbarque')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Menores de idade')
      .addItem('Gerar/atualizar autorização (linhas selecionadas)', 'gerarAutorizacaoSelecionada')
      .addItem('Conferir menores em todas as reservas', 'atualizarMenores')
      .addItem('Refazer autorizações sozinho ao editar', 'ativarAutorizacaoAutomatica'))
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
    validacoesMenores_(r);
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
  criarAbaBusca_();
  SpreadsheetApp.getUi().alert('Pronto! Abas "Buscar", "Reservas" e "Agenda" criadas. Agora publique como App da Web (veja o LEIA-ME).');
}

// ---------- busca ----------
// Aba "Buscar": digite o código (ex.: BA-K3F9Q2), parte do nome, CPF ou telefone na célula B2
// e todas as linhas daquela reserva aparecem embaixo, atualizando sozinhas.
function criarAbaBusca_() {
  var ss = SpreadsheetApp.getActive();
  var b = ss.getSheetByName(ABA_BUSCA);
  if (b) return b;
  b = ss.insertSheet(ABA_BUSCA, 0);
  b.getRange('A1').setValue('Buscar reserva').setFontSize(16).setFontWeight('bold').setFontColor('#0A4D8C');
  b.getRange('A2').setValue('Código, nome, CPF ou telefone:').setFontWeight('bold');
  b.getRange('B2').setBackground('#FFF1E6').setBorder(true, true, true, true, false, false, '#F47B20', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setNote('Digite aqui. Ex.: BA-K3F9Q2, Maria, 529.982.247-25 ou 52998224725');
  b.getRange('C2').setValue('← digite e aperte Enter').setFontColor('#55657A');
  b.getRange(4, 1, 1, CAB_RESERVAS.length).setValues([CAB_RESERVAS]).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
  var col = 'Reservas!';
  var txt = 'TRIM(B2)', dig = 'REGEXREPLACE(B2&"","\\D","")';
  b.getRange('A5').setFormula(
    '=IF(' + txt + '="","",IFERROR(FILTER(' + col + 'A2:AJ,' +
    '(ISNUMBER(SEARCH(' + txt + ',' + col + 'B2:B&" "&' + col + 'H2:H&" "&' + col + 'J2:J&" "&' + col + 'M2:M)))+' +
    '((LEN(' + dig + ')>=4)*ISNUMBER(SEARCH(' + dig + ',REGEXREPLACE(' + col + 'J2:J&" "&' + col + 'M2:M,"\\D",""))))),' +
    '"Nada encontrado. Confira o código ou tente parte do nome."))');
  b.getRange('A5:A').setNumberFormat('dd/mm/yyyy hh:mm');
  b.setFrozenRows(4);
  b.setColumnWidths(1, CAB_RESERVAS.length, 140);
  b.setColumnWidth(1, 220);
  return b;
}

function abrirAbaBusca() {
  var b = criarAbaBusca_();
  SpreadsheetApp.getActive().setActiveSheet(b);
  b.getRange('B2').activate();
}

// Menu: pergunta o código (ou nome/CPF), mostra o resumo da reserva e seleciona as linhas na aba Reservas
function buscarReserva() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Buscar reserva', 'Digite o código (ex.: BA-K3F9Q2), parte do nome, CPF ou telefone:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var termo = String(resp.getResponseText()).trim();
  if (!termo) return;
  var r = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!r || r.getLastRow() < 2) { ui.alert('Ainda não há reservas.'); return; }
  var dados = r.getRange(2, 1, r.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues();
  var t = termo.toLowerCase(), d = termo.replace(/\D/g, '');
  var achadas = [];
  dados.forEach(function (l, i) {
    var texto = (l[1] + ' ' + l[7] + ' ' + l[9] + ' ' + l[12]).toLowerCase();
    var nums = (l[9] + ' ' + l[12]).replace(/\D/g, '');
    if (texto.indexOf(t) >= 0 || (d.length >= 4 && nums.indexOf(d) >= 0)) achadas.push({ linha: i + 2, l: l });
  });
  if (!achadas.length) { ui.alert('Nada encontrado para "' + termo + '".'); return; }
  // agrupa por código
  var porCodigo = {};
  achadas.forEach(function (a) { (porCodigo[a.l[1]] = porCodigo[a.l[1]] || []).push(a); });
  var html = '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5">';
  Object.keys(porCodigo).forEach(function (cod) {
    var g = porCodigo[cod], c = g[0].l;
    html += '<div style="border:1px solid #D6E4F2;border-radius:8px;padding:10px 12px;margin-bottom:10px">' +
      '<div style="font-size:15px;font-weight:bold;color:#0A4D8C">' + esc_(cod) + ' · ' + esc_(c[2]) + '</div>' +
      '<div><b>' + esc_(c[4]) + '</b> — ' + esc_(c[5]) + '</div>';
    g.forEach(function (a) {
      var l = a.l;
      html += '<div>• ' + esc_(l[6]) + ': <b>' + esc_(l[7]) + '</b> · CPF ' + esc_(l[9]) + ' · embarque ' + esc_(l[15]) + ' <span style="color:#888">(linha ' + a.linha + ')</span></div>';
      if (l[19]) html += '<div style="margin-top:4px">Pagamento: ' + esc_(l[19]) + (l[20] && l[20] !== '1' ? ' em ' + esc_(l[20]) + 'x' : '') + ' · Total ' + esc_(l[21]) + ' · Sinal ' + esc_(l[22]) + ' · Tel. ' + esc_(l[12]) + '</div>';
    });
    html += '</div>';
  });
  html += '<div style="color:#555">As linhas encontradas ficaram selecionadas na aba Reservas.</div></div>';
  var ss = SpreadsheetApp.getActive();
  ss.setActiveSheet(r);
  r.getRangeList(achadas.map(function (a) { return 'A' + a.linha + ':AJ' + a.linha; })).activate();
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(Math.min(560, 140 + achadas.length * 60)),
    achadas.length + ' linha(s) encontrada(s)');
}

function esc_(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// ---------- recebe reservas do site ----------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.tipo !== 'reserva' || !/^BA-[A-Z0-9]{4,8}$/.test(String(d.codigo)) || !d.viagem || !d.contratante) return json_({ ok: false });
    var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
    // planilhas criadas antes de novas colunas ganham o cabeçalho que falta
    if (sh.getRange(1, CAB_RESERVAS.length).getValue() !== CAB_RESERVAS[CAB_RESERVAS.length - 1]) {
      sh.getRange(1, 1, 1, CAB_RESERVAS.length).setValues([CAB_RESERVAS]).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
    }
    var novidades = d.aceitaNovidades ? 'Sim' : 'Não';
    var agora = new Date();
    var v = d.viagem, c = d.contratante, p = d.pagamento || {};
    var base = [agora, d.codigo, STATUS[0], v.id, v.destino, v.data];
    var linhas = [];
    linhas.push(base.concat(['Contratante', c.nome, c.rg, c.cpf, c.nascimento, c.idade, c.telefone, c.email, c.endereco,
      c.embarque, c.emergenciaNome, c.emergenciaTelefone, d.saude, p.forma, p.parcelas, p.total, p.sinal, d.observacoes, d.atendente, novidades, c.valor, '',
      '', '', '', '', '', '', '', '']));
    (d.acompanhantes || []).slice(0, 20).forEach(function (a) {
      linhas.push(base.concat(['Acompanhante de ' + c.nome, a.nome, a.rg, a.cpf, a.nascimento, a.idade, c.telefone, '', '',
        a.embarque, c.emergenciaNome, c.emergenciaTelefone, '', '', '', '', '', '', d.atendente, novidades, a.valor, a.autorizacao || ''].concat(colunasMenor_(a.menor))));
    });
    linhas = linhas.map(function (l) { return l.map(limpa_); });
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, CAB_RESERVAS.length).setValues(linhas);
    // menores: destaca e gera a autorização em PDF no Drive
    try { prepararMenores_(sh, [d.codigo], false); } catch (errMenor) { /* a reserva já foi gravada; a autorização pode ser gerada pelo menu */ }
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
  var V = function () { return ['', '', '', '', '', '', '', '', '', '']; };
  var nMenores = pax.filter(function (p) { return p.menor; }).length;
  var pendentes = pax.filter(function (p) { return p.menor && !p.entregue; }).length;
  var out = [[NOME_AGENCIA + ' — Lista de passageiros', '', '', '', '', '', '', '', '', ''],
    ['Destino: ' + v.destino, 'Data: ' + v.data, 'Total: ' + pax.length + ' passageiros', nMenores ? 'Menores: ' + nMenores + (pendentes ? ' (' + pendentes + ' sem autorização entregue)' : ' (todas as autorizações entregues)') : '', '', '', '', '', '', ''],
    V(),
    ['Nº', 'Embarque', 'Nome', 'RG', 'CPF', 'Idade na viagem', 'Telefone', 'Emergência', 'Status / Código', 'Menor / autorização']];
  pax.forEach(function (p, i) {
    out.push([i + 1, p.embarque, p.nome, p.rg, p.cpf, p.idadeViagem == null ? p.idade : p.idadeViagem, p.telefone, [p.emgNome, p.emgTel].filter(String).join(' - '), p.status + ' / ' + p.codigo,
      p.menor ? (p.entregue ? 'Menor · autorização entregue' : 'MENOR · CONFERIR AUTORIZAÇÃO' + (/firma reconhecida/.test(p.aut) ? ' (firma reconhecida)' : '')) : '']);
  });
  var porCidade = {};
  pax.forEach(function (p) { porCidade[p.embarque] = (porCidade[p.embarque] || 0) + 1; });
  out.push(V());
  Object.keys(porCidade).forEach(function (k) { var l = V(); l[1] = k; l[2] = porCidade[k] + ' passageiro(s)'; out.push(l); });
  sh.getRange(1, 1, out.length, 10).setValues(out.map(function (l) { return l.map(limpa_); }));
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sh.getRange(4, 1, 1, 10).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
  pax.forEach(function (p, i) { if (p.menor) sh.getRange(5 + i, 1, 1, 10).setBackground(p.entregue ? '#e6f4ea' : COR_MENOR); });
  sh.setFrozenRows(4);
  sh.autoResizeColumns(1, 10);
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


// =====================================================================
// PAINEL DE CLIENTES (para os gestores)
// Uma linha por cliente (agrupado pelo CPF): dados, histórico, gasto,
// perfil, risco de perda e a próxima viagem recomendada para ele.
// =====================================================================
function atualizarClientes(silencioso) {
  var ss = SpreadsheetApp.getActive();
  var res = ss.getSheetByName(ABA_RESERVAS);
  if (!res || res.getLastRow() < 2) { if (silencioso !== true) SpreadsheetApp.getUi().alert('Ainda não há reservas.'); return; }
  var linhas = res.getRange(2, 1, res.getLastRow() - 1, CAB_RESERVAS.length).getValues();
  var txt = res.getRange(2, 1, res.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues();
  var agenda = lerAgenda_();
  var catPorId = {}; agenda.forEach(function (v) { catPorId[v.id] = v.categoria; });
  var nomeCat = { fds: 'Fins de semana', praia: 'Praias', parques: 'Parques', natureza: 'Natureza', passeios: 'Passeios' };

  // contratante de cada reserva (para contato dos acompanhantes)
  var contrat = {};
  txt.forEach(function (l) { if (l[6] === 'Contratante') contrat[l[1]] = { nome: l[7], tel: l[12], email: l[13], cidade: cidadeDe_(l[14]), novidades: l[25] }; });
  // passageiros por reserva (para saber se viaja sozinho, em grupo, com crianças)
  var porReserva = {};
  txt.forEach(function (l) { (porReserva[l[1]] = porReserva[l[1]] || []).push(l); });

  var clientes = {};
  txt.forEach(function (l, i) {
    var chave = String(l[9]).replace(/\D/g, '') || ('nome:' + String(l[7]).toLowerCase());
    var c = clientes[chave];
    var dono = contrat[l[1]] || {};
    if (!c) c = clientes[chave] = { nome: l[7], cpf: l[9], email: '', tel: '', cidade: '', contato: '', reservas: {}, canceladas: 0,
      gasto: 0, cats: {}, destinos: {}, ultima: null, primeira: null, ultimoDestino: '', comCriancas: false, sozinho: 0, grupo: 0, novidades: '' };
    if (l[6] === 'Contratante') { c.email = l[13] || c.email; c.tel = l[12] || c.tel; c.cidade = cidadeDe_(l[14]) || c.cidade; c.contato = 'próprio'; c.novidades = l[25] || c.novidades; }
    else if (!c.tel) { c.tel = dono.tel || ''; c.email = c.email || ''; c.contato = 'via ' + (dono.nome || 'contratante'); c.novidades = c.novidades || dono.novidades || ''; }
    var quando = linhas[i][0] instanceof Date ? linhas[i][0] : null;
    var cancelada = l[2] === 'Cancelada';
    if (cancelada) { c.canceladas++; }
    else {
      c.reservas[l[1]] = { quando: quando, destino: l[4], data: l[5], status: l[2] };
      c.destinos[l[4]] = 1;
      var cat = catPorId[l[3]]; if (cat) c.cats[cat] = (c.cats[cat] || 0) + 1;
      var valor = numero_(linhas[i][21]); if (l[6] === 'Contratante' && valor) c.gasto += valor;
      if (quando && (!c.ultima || quando > c.ultima)) { c.ultima = quando; c.ultimoDestino = l[4]; }
      if (quando && (!c.primeira || quando < c.primeira)) c.primeira = quando;
      var grupo = porReserva[l[1]] || [];
      if (grupo.length === 1) c.sozinho++; else c.grupo++;
      grupo.forEach(function (g) { var id = parseInt(g[11], 10); if (id >= 0 && id < 12) c.comCriancas = true; });
    }
  });

  var hoje = new Date();
  var saida = [], resumo = { 'Ativo': 0, 'Novo': 0, 'Atenção': 0, 'Em risco': 0, 'Perdido': 0 };
  Object.keys(clientes).forEach(function (k) {
    var c = clientes[k];
    var nRes = Object.keys(c.reservas).length;
    var dias = c.ultima ? Math.floor((hoje - c.ultima) / 86400000) : null;
    var risco = dias == null ? 'Perdido' : dias <= DIAS_ATIVO ? (nRes === 1 ? 'Novo' : 'Ativo') : dias <= DIAS_ATENCAO ? 'Atenção' : dias <= DIAS_RISCO ? 'Em risco' : 'Perdido';
    if (nRes === 0) risco = 'Perdido';
    if (risco === 'Ativo' && c.canceladas > 0 && c.canceladas >= nRes) risco = 'Atenção';
    resumo[risco] = (resumo[risco] || 0) + 1;
    var catsOrd = Object.keys(c.cats).sort(function (a, b) { return c.cats[b] - c.cats[a]; });
    var perfil = [];
    if (catsOrd[0]) perfil.push('Prefere ' + nomeCat[catsOrd[0]]);
    if (c.comCriancas) perfil.push('Viaja com crianças');
    else if (c.grupo > c.sozinho) perfil.push('Viaja em grupo');
    else if (c.sozinho) perfil.push('Viaja sozinho(a)');
    if (nRes >= 5) perfil.push('Cliente fiel');
    var rec = recomendar_(agenda, catsOrd, c.destinos, c.comCriancas);
    var primeiro = String(c.nome).split(' ')[0];
    var msg = rec ? mensagemRecomendacao_(primeiro, c.ultimoDestino, rec, risco) : '';
    var tel = String(c.tel).replace(/\D/g, '');
    var proprio = c.contato === 'próprio';
    var podeEnviar = proprio && c.novidades === 'Sim' && tel.length >= 10 && rec;
    saida.push([
      c.nome, c.cpf, c.email, c.tel + (c.contato && c.contato !== 'próprio' ? ' (' + c.contato + ')' : ''), c.cidade,
      nRes, c.canceladas, c.gasto, c.primeira || '', c.ultima || '', dias == null ? '' : dias, c.ultimoDestino,
      Object.keys(c.destinos).join(', '), perfil.join(' · '), risco,
      rec ? rec.destino + ' — ' + rec.data + ' (' + brl_(rec.valor) + ')' : '—',
      c.novidades || 'Não informado',
      podeEnviar ? '=HYPERLINK("https://wa.me/55' + tel + '?text=' + encodeURIComponent(msg) + '";"Enviar recomendação")' : (!proprio ? 'Falar com o contratante' : c.novidades === 'Sim' ? '—' : 'Sem autorização')
    ]);
  });
  var ordem = { 'Em risco': 0, 'Atenção': 1, 'Perdido': 2, 'Novo': 3, 'Ativo': 4 };
  saida.sort(function (a, b) { return (ordem[a[14]] - ordem[b[14]]) || (b[7] - a[7]); });

  var cab = ['Nome completo', 'CPF', 'E-mail', 'Telefone', 'Cidade', 'Reservas', 'Canceladas', 'Total gasto', 'Primeira reserva',
    'Última reserva', 'Dias sem reservar', 'Último destino', 'Destinos já feitos', 'Perfil', 'Risco de perda', 'Viagem recomendada',
    'Aceita novidades', 'Ação'];
  var sh = ss.getSheetByName(ABA_CLIENTES) || ss.insertSheet(ABA_CLIENTES, 1);
  sh.clear(); sh.clearConditionalFormatRules();
  sh.getRange('A1').setValue('Painel de clientes').setFontSize(16).setFontWeight('bold').setFontColor('#0A4D8C');
  sh.getRange('A2').setValue('Atualizado em ' + Utilities.formatDate(hoje, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') +
    ' · Ativos: ' + resumo['Ativo'] + ' · Novos: ' + resumo['Novo'] + ' · Atenção: ' + resumo['Atenção'] +
    ' · Em risco: ' + resumo['Em risco'] + ' · Perdidos: ' + resumo['Perdido']).setFontColor('#33445A');
  sh.getRange(4, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
  if (saida.length) {
    sh.getRange(5, 1, saida.length, cab.length).setValues(saida.map(function (l) { return l.map(function (x, j) { return j === 17 ? x : limpa_(x); }); }));
    sh.getRange(5, 8, saida.length, 1).setNumberFormat('"R$" #,##0.00');
    sh.getRange(5, 9, saida.length, 2).setNumberFormat('dd/mm/yyyy');
    var faixa = sh.getRange(5, 15, saida.length, 1);
    var cores = [['Em risco', '#FDE2D2', '#9A3412'], ['Atenção', '#FFF1CC', '#7A5300'], ['Perdido', '#ECECEC', '#55657A'], ['Novo', '#E2F1FC', '#0A4D8C'], ['Ativo', '#E6F4EA', '#1E5B37']];
    sh.setConditionalFormatRules(cores.map(function (c) {
      return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(c[0]).setBackground(c[1]).setFontColor(c[2]).setBold(true).setRanges([faixa]).build();
    }));
  }
  sh.setFrozenRows(4); sh.setFrozenColumns(1);
  sh.setColumnWidths(1, cab.length, 140); sh.setColumnWidth(1, 220); sh.setColumnWidth(13, 260); sh.setColumnWidth(14, 220); sh.setColumnWidth(16, 260);
  if (saida.length) sh.getRange(4, 1, saida.length + 1, cab.length).createFilter();
  if (silencioso !== true) { ss.setActiveSheet(sh); SpreadsheetApp.getActive().toast('Painel de clientes atualizado: ' + saida.length + ' clientes.', 'Bora Ali', 5); }
}

// escolhe a próxima viagem para o perfil: categoria preferida, destino que ainda não fez;
// quem viaja com crianças ganha prioridade em parques
function recomendar_(agenda, catsOrd, feitos, comCriancas) {
  var ordem = catsOrd.slice();
  if (comCriancas && ordem.indexOf('parques') < 0) ordem.splice(1, 0, 'parques');
  ['praia', 'parques', 'natureza', 'passeios', 'fds'].forEach(function (c) { if (ordem.indexOf(c) < 0) ordem.push(c); });
  for (var i = 0; i < ordem.length; i++) {
    for (var j = 0; j < agenda.length; j++) {
      var v = agenda[j];
      if (v.categoria === ordem[i] && !feitos[v.destino]) return v;
    }
  }
  return agenda[0] || null;
}

function mensagemRecomendacao_(primeiro, ultimo, rec, risco) {
  var abre = risco === 'Em risco' || risco === 'Perdido' || risco === 'Atenção'
    ? 'Oi, ' + primeiro + '! Que saudade de você nas nossas viagens! 🧡'
    : 'Oi, ' + primeiro + '! Tudo bem? 🧡';
  var ponte = ultimo ? ' Como você curtiu ' + ultimo + ', separamos uma que é a sua cara:' : ' Separamos uma viagem que é a sua cara:';
  return abre + ponte + ' *' + rec.destino + '* em ' + rec.data + ', por ' + brl_(rec.valor) + ' por pessoa. ' +
    'Quer que eu reserve sua vaga? — ' + NOME_AGENCIA;
}

// Menu: ficha completa de um cliente (todas as reservas e passageiros)
function fichaCliente() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Ficha do cliente', 'Digite o CPF, nome ou e-mail do cliente:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var termo = String(resp.getResponseText()).trim(); if (!termo) return;
  var r = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!r || r.getLastRow() < 2) { ui.alert('Ainda não há reservas.'); return; }
  var dados = r.getRange(2, 1, r.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues();
  var t = termo.toLowerCase(), d = termo.replace(/\D/g, '');
  var achou = dados.filter(function (l) {
    return (d.length >= 6 && String(l[9]).replace(/\D/g, '') === d) || String(l[7]).toLowerCase().indexOf(t) >= 0 || (t.indexOf('@') > 0 && String(l[13]).toLowerCase() === t);
  });
  if (!achou.length) { ui.alert('Nenhum cliente encontrado para "' + termo + '".'); return; }
  var cpfs = {}; achou.forEach(function (l) { cpfs[String(l[9]).replace(/\D/g, '') || l[7]] = l; });
  var chaves = Object.keys(cpfs);
  if (chaves.length > 1) {
    ui.alert('Encontrei ' + chaves.length + ' clientes:\n\n' + chaves.map(function (k) { return '• ' + cpfs[k][7] + ' — CPF ' + cpfs[k][9]; }).join('\n') + '\n\nBusque pelo CPF para abrir a ficha de um deles.');
    return;
  }
  var cpf = chaves[0];
  var mesmas = dados.filter(function (l) { return (String(l[9]).replace(/\D/g, '') || l[7]) === cpf; });
  var base = mesmas.filter(function (l) { return l[6] === 'Contratante'; })[0] || mesmas[0];
  var html = '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5">' +
    '<div style="font-size:17px;font-weight:bold;color:#0A4D8C">' + esc_(base[7]) + '</div>' +
    '<div>CPF ' + esc_(base[9]) + ' · RG ' + esc_(base[8]) + ' · Nascimento ' + esc_(base[10]) + '</div>' +
    '<div>Telefone ' + esc_(base[12]) + (base[13] ? ' · ' + esc_(base[13]) : '') + '</div>' +
    (base[14] ? '<div>Endereço ' + esc_(base[14]) + '</div>' : '') +
    '<div>Aceita novidades: <b>' + esc_(base[25] || 'Não informado') + '</b></div>' +
    '<div style="margin:10px 0 4px;font-weight:bold">Histórico (' + mesmas.length + ')</div>';
  mesmas.forEach(function (l) {
    html += '<div style="border-top:1px solid #E4EDF6;padding:6px 0"><b>' + esc_(l[4]) + '</b> — ' + esc_(l[5]) + ' · ' + esc_(l[1]) +
      ' · <span style="color:' + (l[2] === 'Cancelada' ? '#9A3412' : '#1E5B37') + '">' + esc_(l[2]) + '</span><br>' +
      esc_(l[6]) + ' · embarque ' + esc_(l[15]) + (l[21] ? ' · total ' + esc_(l[21]) : '') + ' · recebido em ' + esc_(l[0]) + '</div>';
  });
  html += '</div>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(Math.min(600, 220 + mesmas.length * 52)), 'Ficha do cliente');
}

function ativarAtualizacaoDiaria() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'atualizarClientesDiario') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('atualizarClientesDiario').timeBased().everyDays(1).atHour(6).create();
  SpreadsheetApp.getUi().alert('Pronto! O painel de clientes vai se atualizar sozinho todo dia, por volta das 6h.');
}
function atualizarClientesDiario() { atualizarClientes(true); }

function lerAgenda_() {
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA);
  if (!a || a.getLastRow() < 2) return [];
  var faixa = a.getRange(2, 1, a.getLastRow() - 1, CAB_AGENDA.length), brutos = faixa.getValues(), txt = faixa.getDisplayValues();
  var out = [];
  txt.forEach(function (r, n) {
    var ativo = String(r[11]).trim().toLowerCase();
    if (!r[0] || ativo === 'não' || ativo === 'nao') return;
    out.push({ id: r[0], data: r[1], destino: r[3], categoria: r[4], valor: numero_(brutos[n][5]) });
  });
  return out;
}
function cidadeDe_(endereco) { var m = /,\s*([^,]+?)\s*-\s*CEP/i.exec(String(endereco || '')); return m ? m[1] : ''; }
function brl_(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

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
      var iv = idadeNaViagem_(l[10], l[5]);
      return { codigo: l[1], status: l[2], nome: l[7], rg: l[8], cpf: l[9], idade: l[11], telefone: l[12],
        embarque: l[15], emgNome: l[16], emgTel: l[17], idadeViagem: iv,
        menor: iv != null && iv >= 0 && iv < 18 && !/^Contratante/.test(l[6]), entregue: String(l[35]).toUpperCase() === 'TRUE', aut: l[27] };
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

// ======================================================================
// MENORES DE IDADE: destaque, autorização em PDF e atualização automática
// ======================================================================

// valores das colunas AC a AJ para um acompanhante vindo do site
function colunasMenor_(m) {
  if (!m) return ['', '', '', '', '', '', '', ''];
  var r = m.responsavel || {};
  return [VINC_ROTULO[m.vinculo] || '', r.nome || '', r.papel || '', r.cpf || '', r.rg || '', r.telefone || '', '', false];
}

function validacoesMenores_(sh) {
  var v = function (lista) { return SpreadsheetApp.newDataValidation().requireValueInList(lista, true).setAllowInvalid(false).build(); };
  sh.getRange(2, COL_VINC, sh.getMaxRows() - 1, 1).setDataValidation(v(Object.keys(VINC_ROTULO).map(function (k) { return VINC_ROTULO[k]; })));
  sh.getRange(2, COL_VINC + 2, sh.getMaxRows() - 1, 1).setDataValidation(v(AUT_.PAPEIS));
}

// "10/08/2016" ou "2016-08-10" (ou Date) -> "2016-08-10"
function isoDe_(x) {
  if (x instanceof Date) return Utilities.formatDate(x, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var t = String(x || '').trim(), m;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return '';
}
function idadeNaViagem_(nasc, dataViagem) { return AUT_.idade(isoDe_(nasc), String(dataViagem || ''), ANO_VIAGENS); }

function chaveVinculo_(rotulo) {
  var t = String(rotulo || '').trim().toLowerCase();
  for (var k in VINC_ROTULO) if (VINC_ROTULO[k].toLowerCase() === t || k === t) return k;
  return '';
}

// Confere as linhas das reservas indicadas (ou todas): destaca menores e gera/atualiza a autorização.
// forcar = refaz o PDF mesmo que já exista (usado quando alguém edita a reserva).
function prepararMenores_(sh, codigos, forcar) {
  var n = sh.getLastRow() - 1;
  var res = { menores: 0, pdfs: 0, pendentes: [] };
  if (n < 1) return res;
  var txt = sh.getRange(2, 1, n, CAB_RESERVAS.length).getDisplayValues();
  var alvo = null;
  if (codigos) { alvo = {}; codigos.forEach(function (c) { alvo[c] = 1; }); }
  var contratantes = {};
  txt.forEach(function (l) { if (/^Contratante/.test(l[6])) contratantes[l[1]] = l; });
  var dias = {};
  var ag = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA);
  if (ag && ag.getLastRow() > 1) ag.getRange(2, 1, ag.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) { dias[r[0]] = r[2]; });
  txt.forEach(function (l, i) {
    if (alvo && !alvo[l[1]]) return;
    var linha = i + 2, faixa = sh.getRange(linha, 1, 1, CAB_RESERVAS.length);
    var id = idadeNaViagem_(l[10], l[5]);
    var menor = id != null && id >= 0 && id < 18 && !/^Contratante/.test(l[6]);
    if (!menor) {
      // deixou de ser menor (data ou nascimento corrigidos): tira o destaque e a autorização
      if (String(faixa.getBackground()).toLowerCase() === COR_MENOR) faixa.setBackground(null);
      if (/^Menor/.test(l[COL_AUT - 1])) sh.getRange(linha, COL_AUT).setValue('');
      if (l[COL_LINK - 1]) { apagaArquivo_(l[COL_LINK - 1]); sh.getRange(linha, COL_LINK).setValue(''); }
      return;
    }
    res.menores++;
    faixa.setBackground(l[2] === 'Cancelada' ? '#eeeeee' : COR_MENOR);
    var ent = String(l[COL_ENTREGUE - 1]).toUpperCase();
    if (ent !== 'TRUE' && ent !== 'FALSE') sh.getRange(linha, COL_ENTREGUE).insertCheckboxes();
    var c = contratantes[l[1]] || [];
    var a = { nome: l[7], nasc: isoDe_(l[10]), rg: l[8], cpf: l[9], dif: c.length && l[15] !== c[15], emb: l[15],
      vinc: chaveVinculo_(l[COL_VINC - 1]), rNome: l[29], rVinc: l[30], rCpf: l[31], rRg: l[32], rTel: l[33] };
    var r = { codigo: l[1], ano: ANO_VIAGENS, v: { destino: l[4], data: l[5], dia: dias[l[3]] || '' },
      f: { nome: c[7] || '', rg: c[8] || '', cpf: c[9] || '', tel: c[12] || '', embarque: c[15] || l[15], cidade: cidadeDe_(c[14]), saude: c[18] || '', emgNome: c[16] || '', emgTel: c[17] || '' } };
    var falta = [];
    if (!c.length) falta.push('linha do contratante');
    if (!a.vinc) falta.push('quem é o contratante (coluna AC)');
    else if (AUT_.precisaResp(a)) {
      if (String(a.rNome).trim().split(/\s+/).length < 2) falta.push('nome do responsável (AD)');
      if (!a.rVinc) falta.push('responsável é mãe, pai ou tutor (AE)');
      if (!a.rCpf) falta.push('CPF do responsável (AF)');
      if (!a.rRg) falta.push('RG do responsável (AG)');
      if (!a.rTel) falta.push('telefone do responsável (AH)');
    }
    var resumo = 'Menor (' + id + (id === 1 ? ' ano' : ' anos') + ' na viagem): ' +
      (falta.length ? 'autorização PENDENTE, falta ' + falta.join(', ') : 'autorização ' + AUT_.texto(a, r.f, id));
    if (l[COL_AUT - 1] !== resumo) sh.getRange(linha, COL_AUT).setValue(resumo);
    if (falta.length) {
      res.pendentes.push(l[7] + ' (' + l[1] + ')');
      if (l[COL_LINK - 1]) { apagaArquivo_(l[COL_LINK - 1]); sh.getRange(linha, COL_LINK).setValue(''); }   // não deixa um PDF desatualizado
      return;
    }
    if (l[COL_LINK - 1] && !forcar) return;
    var nome = ('Autorização - ' + l[7] + ' - ' + l[1] + '.pdf').replace(/[\\\/:*?"<>|]/g, '-');
    sh.getRange(linha, COL_LINK).setValue(criarPdfAutorizacao_(AUT_.html(r, a), nome, l[COL_LINK - 1]));
    res.pdfs++;
  });
  return res;
}

function criarPdfAutorizacao_(corpo, nome, linkAntigo) {
  if (linkAntigo) apagaArquivo_(linkAntigo);
  var pastas = DriveApp.getFoldersByName(PASTA_AUTORIZACOES);
  var pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA_AUTORIZACOES);
  var doc = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;color:#111}' +
    AUT_.CSS + '</style></head><body>' + corpo + '</body></html>';
  var pdf = Utilities.newBlob(doc, 'text/html', 'autorizacao.html').getAs('application/pdf').setName(nome);
  return pasta.createFile(pdf).getUrl();   // o arquivo fica privado na conta da agência
}
function apagaArquivo_(link) {
  var m = /\/d\/([-\w]{20,})|id=([-\w]{20,})/.exec(String(link || ''));
  if (!m) return;
  try { DriveApp.getFileById(m[1] || m[2]).setTrashed(true); } catch (e) { /* já foi apagado */ }
}

// ---------- menu ----------
function gerarAutorizacaoSelecionada() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(ABA_RESERVAS);
  var sel = ss.getActiveRange();
  if (!sel || sel.getSheet().getName() !== ABA_RESERVAS || sel.getLastRow() < 2) { ui.alert('Selecione, na aba Reservas, a linha do menor (ou qualquer linha da reserva).'); return; }
  var ini = Math.max(2, sel.getRow());
  var cods = sh.getRange(ini, 2, sel.getLastRow() - ini + 1, 1).getDisplayValues().map(function (r) { return r[0]; }).filter(String);
  var res = prepararMenores_(sh, unicos_(cods), true);
  ui.alert(relatorioMenores_(res));
}
function atualizarMenores() {
  var res = prepararMenores_(SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS), null, false);
  SpreadsheetApp.getUi().alert(relatorioMenores_(res));
}
function relatorioMenores_(res) {
  if (!res.menores) return 'Nenhum menor de idade nessas reservas.';
  return res.menores + ' menor(es) destacados em laranja. ' + res.pdfs + ' autorização(ões) gerada(s) na pasta "' + PASTA_AUTORIZACOES + '" do Drive (link na coluna AI).' +
    (res.pendentes.length ? '\n\nFaltam dados para: ' + res.pendentes.join(', ') + '. Veja a coluna AB.' : '');
}
function ativarAutorizacaoAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'aoEditarReservas') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('aoEditarReservas').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  validacoesMenores_(SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS));
  SpreadsheetApp.getUi().alert('Pronto! Quando alguém editar uma reserva com menor (nome, nascimento, data, responsável...), a autorização em PDF é refeita sozinha com os dados novos.');
}
// gatilho instalado por ativarAutorizacaoAutomatica
function aoEditarReservas(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== ABA_RESERVAS) return;
  var r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow(), c0 = e.range.getColumn(), c1 = e.range.getLastColumn();
  if (r1 < 2) return;
  if (c0 >= COL_AUT && c1 <= COL_AUT) return;            // resumo escrito pelo próprio script
  if (c0 >= COL_LINK && c1 <= COL_ENTREGUE) return;     // link e "entregue" não mudam o documento
  if (c0 === 3 && c1 === 3) return;                     // só o status mudou
  var cods = sh.getRange(r0, 2, r1 - r0 + 1, 1).getDisplayValues().map(function (r) { return r[0]; }).filter(String);
  prepararMenores_(sh, unicos_(cods), true);
}
function unicos_(l) { var o = {}; l.forEach(function (x) { o[x] = 1; }); return Object.keys(o); }

// Núcleo da autorização — cópia de assets/js/autorizacao.js (o mesmo texto do site).
var AUT_ = (function () {
  // <núcleo>
  var VINCULOS = {
    pai: 'Pai ou mãe do menor',
    resp: 'Responsável legal do menor (tutor ou guarda)',
    parente: 'Avô/avó, tio(a) ou irmão(ã) maior de idade',
    outro: 'Outra pessoa (amigo, vizinho, padrinho...)'
  };
  var PAPEIS = ['Mãe', 'Pai', 'Tutor(a) ou guardião(ã)'];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dataBr(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (v || ''); }

  // idade no dia do passeio ("16/01", "30 e 31/01", "06 a 09/02")
  function idade(nascIso, dataViagem, ano) {
    var n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascIso || '');
    var d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(dataViagem || '');
    if (!n) return null;
    var y = +(ano || new Date().getFullYear()), mes = d ? +d[2] : new Date().getMonth() + 1, dia = d ? +d[1] : new Date().getDate();
    var a = y - +n[1];
    if (mes < +n[2] || (mes === +n[2] && dia < +n[3])) a--;
    return a;
  }
  function ehMenor(a, r) { var i = idade(a.nasc, r.v.data, r.ano); return i != null && i >= 0 && i < 18; }
  function precisaResp(a) { return a.vinc === 'parente' || a.vinc === 'outro'; }
  function exigeFirma(a, idadeNaViagem) { return idadeNaViagem < 16 && a.vinc === 'outro'; }
  function quemAssina(a, f) {
    if (precisaResp(a)) return { nome: (a.rNome || '').trim(), rg: (a.rRg || '').trim(), cpf: a.rCpf || '', tel: a.rTel || '', papel: a.rVinc || '' };
    return { nome: f.nome, rg: f.rg, cpf: f.cpf, tel: f.tel, papel: a.vinc === 'resp' ? 'Tutor(a) ou guardião(ã)' : '' };
  }
  function texto(a, f, idadeNaViagem) {
    var q = quemAssina(a, f);
    return 'assinada por ' + q.nome + (q.papel ? ' (' + q.papel.toLowerCase() + ')' : '') + (exigeFirma(a, idadeNaViagem) ? ', com firma reconhecida' : '') + ', entregue no embarque';
  }

  // r = { codigo, ano, v: { destino, data, dia }, f: { nome, rg, cpf, tel, embarque, cidade, saude, emgNome, emgTel } }
  function html(r, a) {
    var v = r.v, f = r.f, q = quemAssina(a, f), id = idade(a.nasc, v.data, r.ano), mesmo = !precisaResp(a);
    var box = function (on) { return '<span class="ap-box">' + (on ? 'X' : '&nbsp;') + '</span>'; };
    var ln = function (t) { return t ? '<strong>' + esc(t) + '</strong>' : '<span class="ap-blank"></span>'; };
    var nota = exigeFirma(a, id)
      ? '<strong>Firma reconhecida obrigatória.</strong> O(a) menor tem menos de 16 anos e viaja com quem não é parente próximo: reconheça a firma desta assinatura em cartório (Resolução CNJ nº 295/2019). Assinatura eletrônica (gov.br) não é aceita.'
      : (id < 16 && a.vinc === 'parente'
        ? 'O(a) menor viaja com parente: leve também um documento que comprove o parentesco (certidão de nascimento ou RG com filiação).'
        : 'Leve esta autorização assinada e um documento com foto do(a) menor no dia do embarque.');
    return '<section class="ap-doc">' +
      '<table class="ap-head"><tr><td><strong class="ap-brand">Bora Ali Excursões</strong><br>Salto/SP · Reserva ' + esc(r.codigo) + '</td><td class="ap-right">' + esc(v.destino) + ' · ' + esc(v.data) + '</td></tr></table>' +
      '<h1>Autorização de viagem para menor de idade</h1>' +
      '<p>Eu, ' + ln(q.nome) + ', RG nº ' + ln(q.rg) + ', CPF nº ' + ln(q.cpf) + ', telefone ' + ln(q.tel) + ', na qualidade de ' +
        box(q.papel === 'Mãe') + ' mãe ' + box(q.papel === 'Pai') + ' pai ' + box(q.papel === PAPEIS[2]) + ' tutor(a) ou guardião(ã),</p>' +
      '<p><strong>AUTORIZO</strong> o(a) menor ' + ln((a.nome || '').trim()) + ', nascido(a) em ' + ln(dataBr(a.nasc)) + ' (' + id + (id === 1 ? ' ano' : ' anos') + ' na data do passeio), RG nº ' + ln((a.rg || '').trim()) + ', CPF nº ' + ln(a.cpf) +
        ', a participar da excursão para <strong>' + esc(v.destino) + '</strong> no dia <strong>' + esc(v.data) + (v.dia ? ' (' + esc(v.dia) + ')' : '') + '</strong>, organizada pela Bora Ali Excursões, com embarque e retorno em <strong>' + esc(a.dif && a.emb ? a.emb : f.embarque) + '</strong>.</p>' +
      (mesmo
        ? '<p>O(a) menor viajará acompanhado(a) por mim, responsável pela reserva, durante toda a excursão.</p>'
        : '<p>O(a) menor viajará acompanhado(a) de ' + ln(f.nome) + ', RG nº ' + ln(f.rg) + ', CPF nº ' + ln(f.cpf) + ', telefone ' + ln(f.tel) + ', ' +
          (a.vinc === 'parente' ? 'parente maior de idade do(a) menor' : 'pessoa maior de idade de minha confiança') + ', que se responsabiliza por ele(a) durante toda a excursão.</p>') +
      '<p>Saúde e necessidades informadas: ' + esc(f.saude || 'nenhuma') + '. Contato de emergência: ' + esc([f.emgNome, f.emgTel].filter(Boolean).join(' - ') || q.nome + ' - ' + q.tel) + '.</p>' +
      '<p>Em caso de emergência, autorizo ' + (mesmo ? 'a Bora Ali Excursões' : 'o(a) acompanhante e a Bora Ali Excursões') + ' a levar o(a) menor para atendimento médico. Declaro que as informações acima são verdadeiras.</p>' +
      '<p class="ap-local">' + esc(f.cidade || '______________') + ', ____ de ______________ de ________.</p>' +
      '<table class="ap-sign"><tr><td class="ap-assina"><div class="ap-line"></div>' + esc(q.nome) + '<br><small>Assinatura do(a) responsável legal</small></td><td class="ap-firma">Espaço para reconhecimento de firma</td></tr></table>' +
      '<p class="ap-note">' + nota + '</p>' +
    '</section>';
  }

  // </núcleo>
  var CSS = '#aut-print{display:none}' +
    '@media print{@page{size:A4;margin:16mm}body.imprimindo{background:#fff !important}body.imprimindo>*:not(#aut-print){display:none !important}' +
    'body.imprimindo #aut-print{display:block !important;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:12.5pt;line-height:1.55}}' +
    '.ap-doc{page-break-after:always;break-after:page}.ap-doc:last-child{page-break-after:auto;break-after:auto}' +
    '.ap-head{width:100%;border-collapse:collapse;border-bottom:2px solid #0A4D8C;margin-bottom:14px;font-size:10.5pt;color:#333}.ap-head td{padding:0 0 8px;vertical-align:bottom}.ap-right{text-align:right}.ap-brand{font-size:14pt;color:#0A4D8C}' +
    '.ap-doc h1{font-size:15pt;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 16px}.ap-doc p{margin:0 0 11px;text-align:justify}' +
    '.ap-box{display:inline-block;width:14px;height:14px;border:1.2px solid #111;text-align:center;line-height:13px;font-size:10pt;font-weight:700;vertical-align:-2px}' +
    '.ap-blank{display:inline-block;min-width:160px;border-bottom:1px solid #111}.ap-local{margin-top:22px !important}' +
    '.ap-sign{width:100%;border-collapse:separate;border-spacing:20px 0;margin:40px -20px 0;width:calc(100% + 40px)}.ap-assina{vertical-align:bottom;text-align:center;font-size:11pt}' +
    '.ap-line{border-top:1px solid #111;margin-bottom:4px}' +
    '.ap-firma{width:200px;height:110px;border:1px dashed #777;color:#777;font-size:9pt;text-align:center;vertical-align:middle;padding:6px}' +
    '.ap-note{margin-top:22px !important;border:1px solid #F47B20;background:#FFF8F1;padding:8px 10px;font-size:10.5pt}';
  return { VINCULOS: VINCULOS, PAPEIS: PAPEIS, idade: idade, precisaResp: precisaResp, exigeFirma: exigeFirma, texto: texto, html: html, CSS: CSS };
})();
