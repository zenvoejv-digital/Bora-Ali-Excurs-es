/**
 * Bora Ali Excursões — planilha de reservas
 * Cole este código em: Planilha Google › Extensões › Apps Script.
 * Passo a passo completo em google-apps-script/LEIA-ME.md
 */

// ====== AJUSTES ======
var LINK_AVALIACAO = '';           // link de avaliação do Google (Perfil da Empresa › Pedir avaliações)
var NOME_AGENCIA = 'Bora Ali Excursões';
var STATUS = ['Aguardando sinal', 'Sinal pago', 'Pago', 'Prazo vencido', 'Cancelada'];
// SINAL: o prazo do sinal é o prazo do link de pagamento. Passou do prazo sem pagar, a reserva vira "Prazo vencido" e a vaga volta para o site.
var PRAZO_SINAL_HORAS = 24;
var LIBERAR_VAGA_AO_VENCER = true;
// ANIVERSARIANTE DO MÊS: desconto com condições combinadas no WhatsApp.
// Se quiser citar um valor na mensagem, escreva aqui (ex.: '10% de desconto'); vazio = "um desconto especial".
var DESCONTO_ANIVERSARIO = '';
var ABA_ANIVERSARIANTES = 'Aniversariantes';
// O Access Token do Mercado Pago NÃO fica aqui: use o menu Bora Ali › Pagamentos › Ligar Mercado Pago (fica guardado em segredo no projeto).
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
  'Link da autorização', 'Autorização entregue', 'Responsável (nascimento)', 'Responsável (e-mail)',
  'Prazo do sinal', 'Link de pagamento', 'Sinal pago em', 'Confirmação ao cliente', 'Aniversariante do mês'];
var COL_NIVER = 43;
var COL_PRAZO = 39, COL_LINKPAG = 40, COL_PAGOEM = 41, COL_CONFIRMA = 42;
var SEM_VAGA = ['Cancelada', 'Prazo vencido'];   // status que não ocupam lugar no ônibus
// colunas (1 = A) usadas pelas autorizações
var COL_AUT = 28, COL_VINC = 29, COL_LINK = 35, COL_ENTREGUE = 36;
var VINC_ROTULO = { pai: 'Pai ou mãe', resp: 'Responsável legal', parente: 'Parente', outro: 'Outra pessoa',
  // quando o próprio contratante é menor: com quem ele viaja
  junto: 'Viaja com o responsável', acomp: 'Viaja com adulto da reserva', sozinho: 'Viaja só com o grupo' };
var CAB_AGENDA = ['id', 'data', 'dia', 'destino', 'categoria', 'valor', 'obs', 'selo', 'mes', 'cena', 'vagas', 'ativo'];
// Colunas extras da Agenda (ficam depois de "ativo"). O código acha cada uma pelo nome do cabeçalho.
// "reservadas" e "restantes" são calculadas sozinhas (não digite nelas).
var AGENDA_EXTRAS = [
  { k: 'local', h: 'local', nota: 'Onde fica o passeio (ex.: Ilhabela - SP). Aparece no card do site e na reserva.' },
  { k: 'embarques', h: 'embarques', nota: 'Pontos de embarque SÓ desta viagem, separados por ponto e vírgula. Ex.: Salto · Rodoviária; Itu · Tenda. Vazio = todos os pontos de sempre.' },
  { k: 'gratis', h: 'criança grátis até (idade)', nota: 'Até esta idade a criança não paga (no colo). Ex.: 5. Vazio = regra geral do site (até 4 anos).' },
  { k: 'valoresCrianca', h: 'valores de criança', nota: 'Preço ou desconto por faixa de idade, separados por ponto e vírgula.\nEx.: 5 a 8 = 50%; 9 a 11 = 199,99\nQuem está fora das faixas paga o valor normal.' },
  { k: 'avisoCrianca', h: 'aviso de criança', nota: 'Texto extra mostrado na reserva. Ex.: Criança acima de 1 metro paga o ingresso do parque.' },
  { k: 'foto1', h: 'foto 1', nota: 'Até 5 fotos por viagem. Use o menu Bora Ali › Agenda do site › Enviar fotos de uma viagem, ou cole aqui o link da foto (Google Drive compartilhado como "Qualquer pessoa com o link" ou link direto da imagem). A foto 1 vira a capa do card.' },
  { k: 'foto2', h: 'foto 2' }, { k: 'foto3', h: 'foto 3' }, { k: 'foto4', h: 'foto 4' }, { k: 'foto5', h: 'foto 5' },
  { k: 'descricao', h: 'descrição', nota: 'O que está incluso, horário aproximado, dicas. Aparece nas fotos e na reserva. Opcional.' },
  { k: 'reservadas', h: 'reservadas', calc: true, nota: 'Calculado sozinho: passageiros desta viagem na aba Reservas (sem Cancelada e Prazo vencido). Não digite aqui.' },
  { k: 'restantes', h: 'restantes', calc: true, nota: 'Calculado sozinho: vagas - reservadas. Não digite aqui.' }
];
var CATEGORIAS_AGENDA = ['fds', 'praia', 'parques', 'natureza', 'passeios'];
var PASTA_FOTOS = 'Bora Ali - Fotos do site';

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
    .addItem('Aniversariantes do mês (desconto)', 'atualizarAniversariantes')
    .addItem('Atualizar o painel sozinho todo dia', 'ativarAtualizacaoDiaria')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Agenda do site')
      .addItem('Enviar fotos de uma viagem', 'enviarFotosViagem')
      .addItem('Duplicar viagem (nova data)', 'duplicarViagem')
      .addItem('Arrumar a aba Agenda (colunas, listas e contas)', 'arrumarAbaAgenda'))
    .addItem('Gerar lista de embarque', 'gerarListaEmbarque')
    .addItem('Aplicar cores por situação', 'aplicarCoresStatus')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Menores de idade')
      .addItem('Gerar/atualizar autorização (linhas selecionadas)', 'gerarAutorizacaoSelecionada')
      .addItem('Conferir menores em todas as reservas', 'atualizarMenores')
      .addItem('Refazer autorizações sozinho ao editar', 'ativarAutorizacaoAutomatica'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Pagamentos do sinal')
      .addItem('Ligar Mercado Pago (link de pagamento)', 'configurarMercadoPago')
      .addItem('Conferir pagamentos e prazos agora', 'conferirPagamentosMenu')
      .addItem('Conferir sozinho a cada 10 minutos', 'ativarConferenciaPagamentos'))
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
    aplicarCoresStatus_(r);
    r.setColumnWidths(1, CAB_RESERVAS.length, 140);
  }
  var a = ss.getSheetByName(ABA_AGENDA) || ss.insertSheet(ABA_AGENDA);
  if (a.getLastRow() === 0) {
    a.appendRow(CAB_AGENDA);
    a.setFrozenRows(1);
    var seed = AGENDA_INICIAL;
    a.getRange(2, 1, seed.length, CAB_AGENDA.length).setValues(seed);
    a.getRange('B:B').setNumberFormat('@');
    a.getRange(1, 1).setNote('Cada linha é uma viagem do site. "vagas": total de lugares (vazio = sem controle). ' +
      '"ativo": escreva "não" para esconder do site. "categoria": fds, praia, parques, natureza ou passeios. ' +
      'Nova viagem: preencha data e destino numa linha vazia; o id é criado sozinho.');
  }
  prepararAbaAgenda_(a);
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
    '=IF(' + txt + '="","",IFERROR(FILTER(' + col + 'A2:AQ,' +
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
  r.getRangeList(achadas.map(function (a) { return 'A' + a.linha + ':AQ' + a.linha; })).activate();
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(Math.min(560, 140 + achadas.length * 60)),
    achadas.length + ' linha(s) encontrada(s)');
}

function esc_(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// ---------- recebe reservas do site ----------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = {};
    try { d = JSON.parse(e.postData.contents); } catch (errJson) { d = {}; }
    // aviso do banco (Mercado Pago) de que um pagamento mudou
    if (ehAvisoPagamento_(e, d)) { receberAvisoPagamento_(e, d); return json_({ ok: true }); }
    if (d.tipo !== 'reserva' || !/^BA-[A-Z0-9]{4,8}$/.test(String(d.codigo)) || !d.viagem || !d.contratante) return json_({ ok: false });
    var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
    // planilhas criadas antes de novas colunas ganham o cabeçalho que falta
    if (sh.getRange(1, CAB_RESERVAS.length).getValue() !== CAB_RESERVAS[CAB_RESERVAS.length - 1]) {
      sh.getRange(1, 1, 1, CAB_RESERVAS.length).setValues([CAB_RESERVAS]).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
      sh.getRange(2, 3, sh.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build());
      aplicarCoresStatus_(sh);
    }
    // prazo do sinal = prazo do link de pagamento
    var agoraMs = Date.now(), limite = agoraMs + PRAZO_SINAL_HORAS * 3600000;
    var pedido = Date.parse(d.prazoSinal || '');
    var prazo = new Date(pedido > agoraMs && pedido <= limite + 600000 ? Math.min(pedido, limite) : limite);
    var novidades = d.aceitaNovidades ? 'Sim' : 'Não';
    var agora = new Date();
    var v = d.viagem, c = d.contratante, p = d.pagamento || {};
    var base = [agora, d.codigo, STATUS[0], v.id, v.destino, v.data];
    var linhas = [];
    linhas.push(base.concat(['Contratante', c.nome, c.rg, c.cpf, c.nascimento, c.idade, c.telefone, c.email, c.endereco,
      c.embarque, c.emergenciaNome, c.emergenciaTelefone, d.saude, p.forma, p.parcelas, p.total, p.sinal, d.observacoes, d.atendente, novidades, c.valor, c.autorizacao || ''
      ].concat(colunasMenor_(c.menor), [prazo, '', '', '', niverTxt_(c.nascimento, v.data)])));
    (d.acompanhantes || []).slice(0, 20).forEach(function (a) {
      linhas.push(base.concat(['Acompanhante de ' + c.nome, a.nome, a.rg, a.cpf, a.nascimento, a.idade, c.telefone, '', '',
        a.embarque, c.emergenciaNome, c.emergenciaTelefone, '', '', '', '', '', '', d.atendente, novidades, a.valor, a.autorizacao || ''].concat(colunasMenor_(a.menor), ['', '', '', '', niverTxt_(a.nascimento, v.data)])));
    });
    linhas = linhas.map(function (l) { return l.map(limpa_); });
    var linhaContratante = sh.getLastRow() + 1;
    sh.getRange(linhaContratante, 1, linhas.length, CAB_RESERVAS.length).setValues(linhas);
    sh.getRange(linhaContratante, COL_PRAZO).setNumberFormat('dd/mm/yyyy hh:mm');
    // link de pagamento do sinal, que vence junto com o prazo
    var linkPag = '';
    try { linkPag = criarLinkPagamento_(d, Number(p.sinal) || 0, prazo); } catch (errLink) { linkPag = ''; }
    if (linkPag) sh.getRange(linhaContratante, COL_LINKPAG).setValue(linkPag);
    // menores: destaca e gera a autorização em PDF no Drive
    try { prepararMenores_(sh, [d.codigo], false); } catch (errMenor) { /* a reserva já foi gravada; a autorização pode ser gerada pelo menu */ }
    return json_({ ok: true, codigo: d.codigo, prazo: prazo.toISOString(), link: linkPag });
  } catch (err) {
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

// ---------- entrega agenda e vagas ocupadas para o site (sem dados pessoais) ----------
function doGet(e) {
  var ss = SpreadsheetApp.getActive();
  var prm = (e && e.parameter) || {};
  if (prm.acao === 'status') return json_(statusDaReserva_(String(prm.codigo || '')));
  var viagens = lerLinhasAgenda_().map(viagemParaSite_);
  var ocupadas = {};
  var r = ss.getSheetByName(ABA_RESERVAS);
  if (r && r.getLastRow() > 1) {
    r.getRange(2, 3, r.getLastRow() - 1, 2).getValues().forEach(function (x) {
      if (SEM_VAGA.indexOf(x[0]) >= 0 || !x[1]) return;
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
  var NC = 11;
  var V = function () { var l = []; for (var k = 0; k < NC; k++) l.push(''); return l; };
  var nMenores = pax.filter(function (p) { return p.menor; }).length;
  var pendentes = pax.filter(function (p) { return p.menor && !p.entregue; }).length;
  var titulo = V(); titulo[0] = NOME_AGENCIA + ' — Lista de passageiros';
  var info = V(); info[0] = 'Destino: ' + v.destino; info[1] = 'Data: ' + v.data; info[2] = 'Total: ' + pax.length + ' passageiros';
  info[3] = nMenores ? 'Menores: ' + nMenores + (pendentes ? ' (' + pendentes + ' sem autorização entregue)' : ' (todas as autorizações entregues)') : '';
  var out = [titulo, info, V(),
    ['Nº', 'Embarque', 'Nome completo', 'CPF', 'Data de nascimento', 'Idade na viagem', 'RG', 'Telefone', 'Emergência', 'Status / Código', 'Menor / autorização']];
  pax.forEach(function (p, i) {
    out.push([i + 1, p.embarque, p.nome, p.cpf, p.nascimento, p.idadeViagem == null ? p.idade : p.idadeViagem, p.rg, p.telefone, [p.emgNome, p.emgTel].filter(String).join(' - '), p.status + ' / ' + p.codigo,
      p.menor ? (p.entregue ? 'Menor · autorização entregue' : 'MENOR · CONFERIR AUTORIZAÇÃO' + (/firma reconhecida/.test(p.aut) ? ' (firma reconhecida)' : '')) : '']);
  });
  var porCidade = {};
  pax.forEach(function (p) { porCidade[p.embarque] = (porCidade[p.embarque] || 0) + 1; });
  out.push(V());
  Object.keys(porCidade).forEach(function (k) { var l = V(); l[1] = k; l[2] = porCidade[k] + ' passageiro(s)'; out.push(l); });
  sh.getRange(1, 1, out.length, NC).setNumberFormat('@');   // CPF e datas como texto (não viram número)
  sh.getRange(1, 1, out.length, NC).setValues(out.map(function (l) { return l.map(limpa_); }));
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sh.getRange(4, 1, 1, NC).setFontWeight('bold').setBackground('#0A4D8C').setFontColor('#FFFFFF');
  pax.forEach(function (p, i) { if (p.menor) sh.getRange(5 + i, 1, 1, NC).setBackground(p.entregue ? '#e6f4ea' : COR_MENOR); });
  sh.setFrozenRows(4);
  sh.setFrozenColumns(3);
  sh.autoResizeColumns(1, NC);
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
    if (l[3] !== v.id || l[6] !== 'Contratante' || SEM_VAGA.indexOf(l[2]) >= 0) return;
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
  SpreadsheetApp.getUi().alert('Pronto! O painel de clientes e a aba de aniversariantes do mês vão se atualizar sozinhos todo dia, por volta das 6h.');
}
function atualizarClientesDiario() { atualizarClientes(true); try { atualizarAniversariantes(true); } catch (e) { /* segue */ } }

function lerAgenda_() {
  return lerLinhasAgenda_().map(function (v) { return { id: v.id, data: v.data, destino: v.destino, categoria: v.categoria, valor: v.valor }; });
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
    .filter(function (l) { return l[3] === id && SEM_VAGA.indexOf(l[2]) < 0; })
    .map(function (l) {
      var iv = idadeNaViagem_(l[10], l[5]);
      return { codigo: l[1], status: l[2], nome: l[7], rg: l[8], cpf: l[9], nascimento: l[10], idade: l[11], telefone: l[12],
        embarque: l[15], emgNome: l[16], emgTel: l[17], idadeViagem: iv,
        menor: iv != null && iv >= 0 && iv < 18, entregue: String(l[35]).toUpperCase() === 'TRUE', aut: l[27] };
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
// colunas extras da semente (local, embarques, criança grátis até, valores de criança, aviso de criança)
var AGENDA_EXTRAS_INICIAL = {"olimpia-jan-30": ["Olímpia - SP"], "rio-de-janeiro-fev-06": ["Rio de Janeiro - RJ"], "sao-thome-das-letras-fev-27": ["São Thomé das Letras - MG"], "boraceia-bertioga-jan-02": ["Bertioga - SP"], "ilhabela-jan-02": ["Ilhabela - SP"], "ipanema-rj-jan-10": ["Rio de Janeiro - RJ"], "prumirim-jan-24": ["Ubatuba - SP"], "guaruja-fev-02": ["Guarujá - SP"], "copacabana-fev-07": ["Rio de Janeiro - RJ"], "maresias-fev-21": ["São Sebastião - SP"], "hopi-hari-jan-16": ["Vinhedo - SP", "", "", "", "Criança acima de 1 metro paga o ingresso do parque (valor confirmado no WhatsApp)."], "wet-n-wild-jan-17": ["Itupeva - SP", "", 1, "2 a 4 = 99,99; 5 a 6 = 199,99", "A partir de 7 anos, valor normal."], "maeda-fev-02": ["Itu - SP"], "thermas-de-sao-pedro-fev-07": ["São Pedro - SP"], "holambra-jan-24": ["Holambra - SP", "", 5], "extrema-mg-fev-09": ["Extrema - MG"], "campos-do-jordao-fev-21": ["Campos do Jordão - SP"], "zoologico-de-sao-paulo-jan-03": ["São Paulo - SP"], "aparecida-do-norte-jan-10": ["Aparecida - SP"], "serra-negra-jan-17": ["Serra Negra - SP"], "ctn-fev-28": ["São Paulo - SP"]};
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
  if (!m) return ['', '', '', '', '', '', '', '', '', ''];
  var r = m.responsavel || {};
  return [VINC_ROTULO[m.vinculo] || '', r.nome || '', r.papel || '', r.cpf || '', r.rg || '', r.telefone || '', '', false, r.nascimento || '', r.email || ''];
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
    var ehContratante = /^Contratante/.test(l[6]);
    var menor = id != null && id >= 0 && id < 18;
    if (!menor) {
      // deixou de ser menor (data ou nascimento corrigidos): tira o destaque e a autorização
      if (String(faixa.getBackground()).toLowerCase() === COR_MENOR) faixa.setBackground(null);
      if (/^Menor/.test(l[COL_AUT - 1])) sh.getRange(linha, COL_AUT).setValue('');
      if (l[COL_LINK - 1]) { apagaArquivo_(l[COL_LINK - 1]); sh.getRange(linha, COL_LINK).setValue(''); }
      return;
    }
    res.menores++;
    if (String(faixa.getBackground()).toLowerCase() === COR_MENOR) faixa.setBackground(null);   // o destaque do menor agora é feito pelas cores automáticas
    var ent = String(l[COL_ENTREGUE - 1]).toUpperCase();
    if (ent !== 'TRUE' && ent !== 'FALSE') sh.getRange(linha, COL_ENTREGUE).insertCheckboxes();
    var c = contratantes[l[1]] || [];
    var a = { contratante: ehContratante, nome: l[7], nasc: isoDe_(l[10]), rg: l[8], cpf: l[9], dif: c.length && l[15] !== c[15], emb: l[15],
      vinc: chaveVinculo_(l[COL_VINC - 1]), rNome: l[29], rVinc: l[30], rCpf: l[31], rRg: l[32], rTel: l[33], rNasc: isoDe_(l[36]), rEmail: l[37] };
    var adultos = txt.filter(function (o) { if (o[1] !== l[1]) return false; var io = idadeNaViagem_(o[10], o[5]); return io != null && io >= 18; })
      .map(function (o) { return o[7]; });
    var r = { codigo: l[1], ano: ANO_VIAGENS, v: { destino: l[4], data: l[5], dia: dias[l[3]] || '' },
      f: { nome: c[7] || '', rg: c[8] || '', cpf: c[9] || '', tel: c[12] || '', nasc: isoDe_(c[10]), email: c[13] || '', embarque: c[15] || l[15], cidade: cidadeDe_(c[14]), saude: c[18] || '', emgNome: c[16] || '', emgTel: c[17] || '' },
      adultos: adultos };
    var falta = [];
    if (!c.length) falta.push('linha do contratante');
    if (!a.vinc) falta.push(ehContratante ? 'com quem o menor viaja (coluna AC)' : 'quem é o contratante (coluna AC)');
    else if (ehContratante && a.vinc === 'acomp' && !adultos.length) falta.push('um acompanhante maior de idade na reserva');
    else if (AUT_.precisaResp(a)) {
      if (String(a.rNome).trim().split(/\s+/).length < 2) falta.push('nome do responsável (AD)');
      if (!a.rVinc) falta.push('responsável é mãe, pai ou tutor (AE)');
      if (!a.rCpf) falta.push('CPF do responsável (AF)');
      if (!a.rRg) falta.push('RG do responsável (AG)');
      if (!a.rTel) falta.push('telefone do responsável (AH)');
      if (!a.rNasc) falta.push('nascimento do responsável (AK)');
      if (!a.rEmail) falta.push('e-mail do responsável (AL)');
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
  if (c0 >= COL_LINK && c1 <= COL_ENTREGUE) return;     // link e "entregue" não mudam o documento (AK e AL mudam)
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
  // contratante menor de idade: com quem ele viaja
  var VIAJA_COM = {
    junto: 'Com o responsável (ele vai como acompanhante nesta reserva)',
    acomp: 'Com outro adulto desta reserva (acompanhante maior de idade)',
    sozinho: 'Sem adulto conhecido, só com o grupo da excursão'
  };

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
  function precisaResp(a) { return !!a.contratante || a.vinc === 'parente' || a.vinc === 'outro'; }
  function exigeFirma(a, idadeNaViagem) { return idadeNaViagem < 16 && (a.contratante ? a.vinc === 'sozinho' : a.vinc === 'outro'); }
  function quemAssina(a, f) {
    if (precisaResp(a)) return { nome: (a.rNome || '').trim(), rg: (a.rRg || '').trim(), cpf: a.rCpf || '', tel: a.rTel || '', papel: a.rVinc || '', nasc: a.rNasc || '', email: (a.rEmail || '').trim() };
    return { nome: f.nome, rg: f.rg, cpf: f.cpf, tel: f.tel, papel: a.vinc === 'resp' ? 'Tutor(a) ou guardião(ã)' : '', nasc: f.nasc || '', email: f.email || '' };
  }
  function texto(a, f, idadeNaViagem) {
    var q = quemAssina(a, f);
    return 'assinada por ' + q.nome + (q.papel ? ' (' + q.papel.toLowerCase() + ')' : '') + (exigeFirma(a, idadeNaViagem) ? ', com firma reconhecida' : '') + ', entregue no embarque';
  }

  // r = { codigo, ano, v: { destino, data, dia }, f: { nome, rg, cpf, tel, embarque, cidade, saude, emgNome, emgTel } }
  function html(r, a) {
    var v = r.v, f = r.f, q = quemAssina(a, f), id = idade(a.nasc, v.data, r.ano);
    var mesmo = a.contratante ? a.vinc === 'junto' : !precisaResp(a);
    var box = function (on) { return '<span class="ap-box">' + (on ? 'X' : '&nbsp;') + '</span>'; };
    var ln = function (t) { return t ? '<strong>' + esc(t) + '</strong>' : '<span class="ap-blank"></span>'; };
    var nota = exigeFirma(a, id)
      ? '<strong>Firma reconhecida obrigatória.</strong> O(a) menor tem menos de 16 anos e viaja com quem não é parente próximo: reconheça a firma desta assinatura em cartório (Resolução CNJ nº 295/2019). Assinatura eletrônica (gov.br) não é aceita.'
      : (id < 16 && a.contratante && a.vinc === 'acomp'
        ? 'Se o adulto acompanhante não for avô/avó, tio(a) ou irmão(ã) maior de idade, reconheça a firma desta assinatura em cartório (Resolução CNJ nº 295/2019). Se for parente, leve documento que comprove o parentesco.'
        : id < 16 && a.vinc === 'parente'
        ? 'O(a) menor viaja com parente: leve também um documento que comprove o parentesco (certidão de nascimento ou RG com filiação).'
        : 'Leve esta autorização assinada e um documento com foto do(a) menor no dia do embarque.');
    return '<section class="ap-doc">' +
      '<table class="ap-head"><tr><td><strong class="ap-brand">Bora Ali Excursões</strong><br>Salto/SP · Reserva ' + esc(r.codigo) + '</td><td class="ap-right">' + esc(v.destino) + ' · ' + esc(v.data) + '</td></tr></table>' +
      '<h1>Autorização de viagem para menor de idade</h1>' +
      '<p>Eu, ' + ln(q.nome) + ', nascido(a) em ' + ln(dataBr(q.nasc)) + ', RG nº ' + ln(q.rg) + ', CPF nº ' + ln(q.cpf) + ', telefone ' + ln(q.tel) + ', e-mail ' + ln(q.email) + ', na qualidade de ' +
        box(q.papel === 'Mãe') + ' mãe ' + box(q.papel === 'Pai') + ' pai ' + box(q.papel === PAPEIS[2]) + ' tutor(a) ou guardião(ã),</p>' +
      '<p><strong>AUTORIZO</strong> o(a) menor ' + ln((a.nome || '').trim()) + ', nascido(a) em ' + ln(dataBr(a.nasc)) + ' (' + id + (id === 1 ? ' ano' : ' anos') + ' na data do passeio), RG nº ' + ln((a.rg || '').trim()) + ', CPF nº ' + ln(a.cpf) +
        ', a participar da excursão para <strong>' + esc(v.destino) + '</strong> no dia <strong>' + esc(v.data) + (v.dia ? ' (' + esc(v.dia) + ')' : '') + '</strong>, organizada pela Bora Ali Excursões, com embarque e retorno em <strong>' + esc(a.dif && a.emb ? a.emb : f.embarque) + '</strong>.</p>' +
      (a.contratante && !mesmo
        ? (a.vinc === 'acomp'
          ? '<p>O(a) menor, que fez esta reserva, viajará acompanhado(a) de ' + ln((r.adultos || []).join(', ')) + ', maior(es) de idade, que se responsabiliza(m) por ele(a) durante toda a excursão.</p>'
          : '<p>O(a) menor, que fez esta reserva, viajará com o grupo da excursão, sem acompanhante adulto conhecido, sob os cuidados da equipe da Bora Ali Excursões.</p>')
        : mesmo
        ? '<p>O(a) menor viajará acompanhado(a) por mim' + (a.contratante ? '' : ', responsável pela reserva,') + ' durante toda a excursão.</p>'
        : '<p>O(a) menor viajará acompanhado(a) de ' + ln(f.nome) + ', RG nº ' + ln(f.rg) + ', CPF nº ' + ln(f.cpf) + ', telefone ' + ln(f.tel) + ', ' +
          (a.vinc === 'parente' ? 'parente maior de idade do(a) menor' : 'pessoa maior de idade de minha confiança') + ', que se responsabiliza por ele(a) durante toda a excursão.</p>') +
      '<p>Saúde e necessidades informadas: ' + esc(f.saude || 'nenhuma') + '. Contato de emergência: ' + esc([f.emgNome, f.emgTel].filter(Boolean).join(' - ') || q.nome + ' - ' + q.tel) + '.</p>' +
      '<p>Em caso de emergência, autorizo ' + (mesmo || (a.contratante && a.vinc === 'sozinho') ? 'a Bora Ali Excursões' : 'o(a) acompanhante e a Bora Ali Excursões') + ' a levar o(a) menor para atendimento médico. Declaro que as informações acima são verdadeiras.</p>' +
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
  return { VINCULOS: VINCULOS, PAPEIS: PAPEIS, VIAJA_COM: VIAJA_COM, idade: idade, precisaResp: precisaResp, exigeFirma: exigeFirma, texto: texto, html: html, CSS: CSS };
})();

// ======================================================================
// SINAL: link de pagamento (Mercado Pago), prazo e baixa automática
// ======================================================================
function tokenMP_() { return PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN') || ''; }
function dataMP_(d) { return Utilities.formatDate(d, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"); }

// Cria o link de pagamento do sinal. Vence no prazo do sinal. Sem Mercado Pago ligado, devolve ''.
function criarLinkPagamento_(d, sinal, prazo) {
  var token = tokenMP_();
  if (!token || !(sinal > 0)) return '';
  var c = d.contratante || {}, v = d.viagem || {};
  var nomes = String(c.nome || '').trim().split(/\s+/);
  var corpo = {
    items: [{ id: d.codigo, title: 'Sinal 50% - ' + v.destino + ' ' + v.data + ' (' + d.codigo + ')', quantity: 1, currency_id: 'BRL', unit_price: Math.round(sinal * 100) / 100 }],
    payer: { name: nomes[0] || '', surname: nomes.slice(1).join(' '), email: c.email || undefined,
      identification: { type: 'CPF', number: String(c.cpf || '').replace(/\D/g, '') } },
    external_reference: d.codigo,
    notification_url: ScriptApp.getService().getUrl() + '?origem=mp',
    expires: true, expiration_date_from: dataMP_(new Date()), expiration_date_to: dataMP_(prazo),
    date_of_expiration: dataMP_(prazo),
    payment_methods: { installments: 12, excluded_payment_types: [{ id: 'ticket' }] },   // sem boleto (demora dias para cair)
    statement_descriptor: 'BORA ALI'
  };
  var r = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify(corpo)
  });
  if (r.getResponseCode() >= 300) return '';
  var j = JSON.parse(r.getContentText());
  return j.init_point || '';
}

// Aviso automático do Mercado Pago ("notification_url")
function ehAvisoPagamento_(e, d) {
  var prm = (e && e.parameter) || {};
  return prm.origem === 'mp' || prm.topic === 'payment' || prm.type === 'payment' || d.type === 'payment' || /^payment\./.test(d.action || '');
}
function receberAvisoPagamento_(e, d) {
  var prm = (e && e.parameter) || {};
  var id = (d.data && d.data.id) || prm['data.id'] || prm.id;
  if (!id || !tokenMP_()) return;
  var pg = consultarPagamentoMP_(id);   // sempre confere direto no Mercado Pago (o aviso em si não é confiável)
  if (pg && pg.status === 'approved' && pg.external_reference) marcarSinalPago_(pg.external_reference, pg.transaction_amount, pg.date_approved);
}
function consultarPagamentoMP_(id) {
  var r = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(id), {
    muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + tokenMP_() } });
  return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
}
function pagamentoAprovadoDe_(codigo) {
  var r = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(codigo), {
    muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + tokenMP_() } });
  if (r.getResponseCode() !== 200) return null;
  var lista = (JSON.parse(r.getContentText()).results) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].status === 'approved') return lista[i];
  return null;
}

// Marca todas as linhas da reserva como "Sinal pago" (ou "Pago", se pagou o total)
function marcarSinalPago_(codigo, valor, quando) {
  var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!sh || sh.getLastRow() < 2) return false;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var dados = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_RESERVAS.length).getValues();
    var total = 0, achou = false;
    dados.forEach(function (l) { if (l[1] === codigo && /^Contratante/.test(l[6])) total = numero_(l[21]); });
    var novo = valor && total && Number(valor) >= total - 0.01 ? 'Pago' : 'Sinal pago';
    var dataPg = quando ? new Date(quando) : new Date();
    dados.forEach(function (l, i) {
      if (l[1] !== codigo) return;
      achou = true;
      if (l[2] === 'Aguardando sinal' || l[2] === 'Prazo vencido') {
        if (l[2] === 'Prazo vencido') sh.getRange(i + 2, 24).setValue(String(l[23] || '') + ' [pagou depois do prazo: conferir se ainda há vaga]');
        sh.getRange(i + 2, 3).setValue(novo);
      }
      if (/^Contratante/.test(l[6])) sh.getRange(i + 2, COL_PAGOEM).setValue(dataPg).setNumberFormat('dd/mm/yyyy hh:mm');
    });
    if (achou) confirmarReserva_(sh, codigo, novo);
    return achou;
  } finally { lock.releaseLock(); }
}

// Confere reservas aguardando sinal: pagamento aprovado vira "Sinal pago"; prazo vencido libera a vaga.
function conferirPagamentos(silencioso) {
  var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  var res = { pagos: [], vencidos: [] };
  if (!sh || sh.getLastRow() < 2) return res;
  var dados = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_RESERVAS.length).getValues();
  var agora = new Date(), temMP = !!tokenMP_();
  dados.forEach(function (l, i) {
    if (!/^Contratante/.test(l[6]) || l[2] !== 'Aguardando sinal') return;
    var codigo = l[1];
    if (temMP) {
      var pg = pagamentoAprovadoDe_(codigo);
      if (pg) { marcarSinalPago_(codigo, pg.transaction_amount, pg.date_approved); res.pagos.push(codigo); return; }
    }
    var prazo = l[COL_PRAZO - 1];
    if (LIBERAR_VAGA_AO_VENCER && prazo instanceof Date && prazo < agora) {
      dados.forEach(function (o, k) { if (o[1] === codigo && o[2] === 'Aguardando sinal') sh.getRange(k + 2, 3).setValue('Prazo vencido'); });
      res.vencidos.push(codigo);
    }
  });
  return res;
}
function conferirPagamentosMenu() {
  var r = conferirPagamentos(false);
  SpreadsheetApp.getUi().alert((tokenMP_() ? '' : 'Mercado Pago ainda não ligado: só os prazos foram conferidos.\n\n') +
    'Sinais pagos agora: ' + (r.pagos.join(', ') || 'nenhum') + '\nPrazos vencidos (vaga liberada): ' + (r.vencidos.join(', ') || 'nenhum'));
}
function conferirPagamentosAgendado() { conferirPagamentos(true); }
function ativarConferenciaPagamentos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'conferirPagamentosAgendado') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('conferirPagamentosAgendado').timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert('Pronto! A cada 10 minutos a planilha confere os pagamentos no Mercado Pago e libera as vagas com prazo vencido.');
}
function configurarMercadoPago() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Ligar Mercado Pago',
    'Cole o Access Token de PRODUÇÃO (Mercado Pago › Seu negócio › Configurações › Credenciais).\nEle fica guardado em segredo no projeto, fora da planilha. Para desligar, deixe em branco.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var t = r.getResponseText().trim(), props = PropertiesService.getScriptProperties();
  if (!t) { props.deleteProperty('MP_ACCESS_TOKEN'); ui.alert('Mercado Pago desligado. As reservas continuam com prazo do sinal, sem link automático.'); return; }
  props.setProperty('MP_ACCESS_TOKEN', t);
  var teste = UrlFetchApp.fetch('https://api.mercadopago.com/users/me', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + t } });
  ui.alert(teste.getResponseCode() === 200 ? 'Mercado Pago ligado! Cada nova reserva recebe um link de pagamento do sinal, que vence no prazo de ' + PRAZO_SINAL_HORAS + ' horas.'
    : 'O Mercado Pago não aceitou esse token (código ' + teste.getResponseCode() + '). Confira se é o Access Token de produção.');
}

// Situação de uma reserva para o contador do site (só status, prazo e link: nenhum dado pessoal)
function statusDaReserva_(codigo) {
  if (!/^BA-[A-Z0-9]{4,8}$/.test(codigo)) return { ok: false };
  var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  var dados = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_RESERVAS.length).getValues(), l = null;
  for (var i = 0; i < dados.length; i++) if (dados[i][1] === codigo && /^Contratante/.test(dados[i][6])) { l = dados[i]; break; }
  if (!l) return { ok: false };
  // confere no banco no máximo a cada 30 segundos por reserva
  if (l[2] === 'Aguardando sinal' && tokenMP_()) {
    var cache = CacheService.getScriptCache(), chave = 'st-' + codigo;
    if (!cache.get(chave)) {
      cache.put(chave, '1', 30);
      var pg = pagamentoAprovadoDe_(codigo);
      if (pg) { marcarSinalPago_(codigo, pg.transaction_amount, pg.date_approved); l[2] = 'Sinal pago'; }
    }
  }
  var prazo = l[COL_PRAZO - 1];
  return { ok: true, codigo: codigo, status: l[2], prazo: prazo instanceof Date ? prazo.toISOString() : '', link: l[COL_LINKPAG - 1] || '' };
}

// ======================================================================
// CONFIRMAÇÃO MANUAL: o cliente manda o comprovante no WhatsApp e o gestor muda o status
// ======================================================================
// Gatilho simples do Google (funciona sozinho, sem instalar): ao mudar o Status de uma linha,
//  - "Sinal pago" ou "Pago": confirma a reserva inteira, registra a data e prepara a mensagem de confirmação;
//  - qualquer status na linha do contratante vale para todos os passageiros da reserva.
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() === ABA_AGENDA) { try { aoEditarAgenda_(sh, e.range); } catch (er) { /* segue */ } return; }
  if (sh.getName() !== ABA_RESERVAS || e.range.getColumn() > 3 || e.range.getLastColumn() < 3) return;
  var r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
  if (r1 < 2) return;
  var linhas = sh.getRange(r0, 1, r1 - r0 + 1, 7).getValues();
  var feitos = {};
  linhas.forEach(function (l) {
    var codigo = l[1], status = l[2];
    if (!codigo || feitos[codigo] || STATUS.indexOf(status) < 0) return;
    if (status === 'Sinal pago' || status === 'Pago' || /^Contratante/.test(l[6])) {
      feitos[codigo] = 1;
      aplicarStatusNaReserva_(sh, codigo, status);
    }
  });
  var cods = Object.keys(feitos);
  if (cods.length) SpreadsheetApp.getActive().toast(cods.map(function (c) { return c; }).join(', ') +
    (/^(Sinal pago|Pago)$/.test(linhas[0][2]) ? ': reserva confirmada. A mensagem para o cliente está na coluna "Confirmação ao cliente".' : ': status aplicado a todos os passageiros.'), 'Bora Ali', 6);
}

function aplicarStatusNaReserva_(sh, codigo, status) {
  var n = sh.getLastRow() - 1;
  var dados = sh.getRange(2, 1, n, CAB_RESERVAS.length).getValues();
  var pago = status === 'Sinal pago' || status === 'Pago';
  dados.forEach(function (l, i) {
    if (l[1] !== codigo) return;
    // pagamento confirmado não "ressuscita" passageiro cancelado à parte
    if (l[2] !== status && !(pago && l[2] === 'Cancelada' && !/^Contratante/.test(l[6]))) sh.getRange(i + 2, 3).setValue(status);
    if (pago && /^Contratante/.test(l[6])) {
      if (!l[COL_PAGOEM - 1]) sh.getRange(i + 2, COL_PAGOEM).setValue(new Date()).setNumberFormat('dd/mm/yyyy hh:mm');
      if (l[2] === 'Prazo vencido') sh.getRange(i + 2, 24).setValue(String(l[23] || '') + ' [pago depois do prazo: conferir se ainda há vaga]');
    }
  });
  if (pago) confirmarReserva_(sh, codigo, status);
}

// Prepara, na linha do contratante, o link do WhatsApp com a confirmação da reserva para o cliente
function confirmarReserva_(sh, codigo, status) {
  var dados = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues();
  var c = null, nomes = [], linhaC = 0;
  dados.forEach(function (l, i) {
    if (l[1] !== codigo || l[2] === 'Cancelada') return;
    if (/^Contratante/.test(l[6])) { c = l; linhaC = i + 2; }
    nomes.push(l[7]);
  });
  if (!c) return;
  var tel = String(c[12]).replace(/\D/g, '');
  if (tel.length >= 10 && tel.length <= 11) tel = '55' + tel;
  var primeiro = String(c[7]).trim().split(/\s+/)[0];
  var texto = 'Olá, ' + primeiro + '! Aqui é da ' + NOME_AGENCIA + ' 💙🧡\n\n' +
    (status === 'Pago' ? 'Recebemos o pagamento total' : 'Recebemos o seu sinal') + ' e a sua *reserva está confirmada!* ✅\n\n' +
    '*Código:* ' + codigo + '\n*Destino:* ' + c[4] + '\n*Data:* ' + c[5] + '\n*Embarque:* ' + c[15] + '\n*Passageiros:* ' + nomes.join(', ') +
    (status === 'Pago' ? '' : '\n\nO restante (' + brl_(numero_(c[21]) - numero_(c[22])) + ') deve ser pago antes do passeio.') +
    '\nO horário de embarque chega por aqui antes da viagem. Qualquer dúvida, é só chamar!';
  var url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(texto);
  sh.getRange(linhaC, COL_CONFIRMA).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Enviar confirmação no WhatsApp').setLinkUrl(url).build());
}

// ======================================================================
// ANIVERSARIANTES DO MÊS: desconto especial, condições combinadas no WhatsApp
// ======================================================================
// "02/02/1985" + data da viagem "24/01" -> texto da coluna "Aniversariante do mês" da reserva
function niverTxt_(nasc, dataViagem) {
  var n = /^(\d{1,2})\/(\d{1,2})\//.exec(String(nasc || '')), d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(String(dataViagem || ''));
  if (!n || !d || +n[2] !== +d[2]) return '';
  return 'Sim (' + ('0' + n[1]).slice(-2) + '/' + ('0' + n[2]).slice(-2) + '): conferir desconto no WhatsApp';
}

// Monta a aba "Aniversariantes" com quem faz aniversário no mês (a partir dos cadastros das reservas)
function atualizarAniversariantes(silencioso) {
  var ss = SpreadsheetApp.getActive(), res = ss.getSheetByName(ABA_RESERVAS);
  if (!res || res.getLastRow() < 2) { if (silencioso !== true) SpreadsheetApp.getUi().alert('Ainda não há reservas.'); return; }
  var hoje = new Date(), mes = hoje.getMonth() + 1, ano = hoje.getFullYear();
  if (silencioso !== true) {
    var ui = SpreadsheetApp.getUi();
    var r = ui.prompt('Aniversariantes do mês', 'Qual mês? (1 a 12, vazio = mês atual: ' + mes + ')', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    var m = parseInt(r.getResponseText(), 10);
    if (m >= 1 && m <= 12) { if (m < mes) ano++; mes = m; }
  }
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var txt = res.getRange(2, 1, res.getLastRow() - 1, CAB_RESERVAS.length).getDisplayValues();
  var contrat = {};
  txt.forEach(function (l) { if (/^Contratante/.test(l[6])) contrat[l[1]] = { nome: l[7], tel: l[12], novidades: l[25] }; });
  // uma linha por pessoa (CPF), com a reserva mais recente
  var pessoas = {};
  txt.forEach(function (l) {
    var n = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(l[10]).trim());
    if (!n || +n[2] !== mes) return;
    var chave = String(l[9]).replace(/\D/g, '') || 'nome:' + String(l[7]).toLowerCase();
    var p = pessoas[chave] || (pessoas[chave] = { nome: l[7], cpf: l[9], dia: +n[1], anoNasc: +n[3], viagens: 0, ultimo: '', tel: '', contato: '', novidades: '' });
    if (l[2] !== 'Cancelada' && l[2] !== 'Prazo vencido') { p.viagens++; p.ultimo = l[4]; }
    if (/^Contratante/.test(l[6])) { p.tel = l[12]; p.contato = 'próprio'; p.novidades = l[25]; p.email = l[13]; }
    else if (!p.tel) { var d = contrat[l[1]] || {}; p.tel = d.tel || ''; p.contato = 'via ' + (d.nome || 'contratante'); p.novidades = d.novidades || ''; }
  });
  // viagens da agenda no mês do aniversário (para sugerir na mensagem)
  var noMes = lerAgenda_().filter(function (v) { var d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(v.data); return d && +d[2] === mes; });
  // guarda o que o gestor já marcou ("Desconto usado") e as anotações, para não perder ao atualizar
  var sh = ss.getSheetByName(ABA_ANIVERSARIANTES), antes = {};
  if (sh && sh.getLastRow() > 4) sh.getRange(5, 1, sh.getLastRow() - 4, 11).getValues().forEach(function (l) { antes[String(l[1]).replace(/\D/g, '') + '|' + l[10]] = { usado: l[8], obs: l[9] }; });
  var ref = ano + '-' + ('0' + mes).slice(-2);
  var desconto = DESCONTO_ANIVERSARIO || 'um desconto especial';
  var saida = Object.keys(pessoas).map(function (k) {
    var p = pessoas[k], primeiro = String(p.nome).split(' ')[0], tel = String(p.tel).replace(/\D/g, '');
    var sug = noMes.slice(0, 3).map(function (v) { return v.destino + ' (' + v.data + ')'; });
    var msg = 'Feliz aniversário, ' + primeiro + '! 🎂🎉 Aqui é da ' + NOME_AGENCIA + '.\n\nNo mês do seu aniversário você tem *' + desconto + '* nas nossas excursões!' +
      (sug.length ? ' Que tal comemorar viajando? Em ' + MESES[mes - 1] + ' tem ' + sug.join(', ') + '.' : '') +
      '\n\nResponda esta mensagem que a gente te passa as condições. 💙🧡';
    var podeEnviar = p.contato === 'próprio' && p.novidades === 'Sim' && tel.length >= 10;
    var acao = podeEnviar ? SpreadsheetApp.newRichTextValue().setText('Enviar parabéns + desconto').setLinkUrl('https://wa.me/55' + tel + '?text=' + encodeURIComponent(msg)).build()
      : SpreadsheetApp.newRichTextValue().setText(p.contato !== 'próprio' ? 'Falar com o contratante (' + p.contato.replace('via ', '') + ')' : 'Sem autorização para novidades').build();
    var a = antes[String(p.cpf).replace(/\D/g, '') + '|' + ref] || {};
    return { dia: p.dia, linha: [p.nome, p.cpf, ('0' + p.dia).slice(-2) + '/' + ('0' + mes).slice(-2), ano - p.anoNasc,
      p.tel + (p.contato && p.contato !== 'próprio' ? ' (' + p.contato + ')' : ''), p.viagens, p.ultimo || '—', p.novidades || 'Não informado',
      a.usado === true, a.obs || '', ref], acao: acao };
  }).sort(function (x, y) { return x.dia - y.dia; });

  sh = sh || ss.insertSheet(ABA_ANIVERSARIANTES, 2);
  sh.clear();
  var cab = ['Nome completo', 'CPF', 'Aniversário', 'Faz (anos)', 'Telefone', 'Viagens', 'Último destino', 'Aceita novidades', 'Desconto usado', 'Condições combinadas', 'Mês', 'Ação'];
  sh.getRange('A1').setValue('Aniversariantes de ' + MESES[mes - 1] + ' 🎂').setFontSize(16).setFontWeight('bold').setFontColor('#0A4D8C');
  sh.getRange('A2').setValue(saida.length + ' aniversariante(s). Desconto de aniversário com condições combinadas no WhatsApp. Marque "Desconto usado" quando o cliente aproveitar.' +
    (DESCONTO_ANIVERSARIO ? ' Desconto: ' + DESCONTO_ANIVERSARIO + '.' : '')).setFontColor('#33445A');
  sh.getRange(4, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#F47B20').setFontColor('#06284D');
  if (saida.length) {
    sh.getRange(5, 1, saida.length, 11).setValues(saida.map(function (x) { return x.linha.map(function (v, j) { return j === 8 ? v : limpa_(v); }); }));
    sh.getRange(5, 9, saida.length, 1).insertCheckboxes();
    sh.getRange(5, 9, saida.length, 1).setValues(saida.map(function (x) { return [x.linha[8]]; }));
    sh.getRange(5, 12, saida.length, 1).setRichTextValues(saida.map(function (x) { return [x.acao]; }));
    var dia = hoje.getDate(), mesHoje = hoje.getMonth() + 1;
    saida.forEach(function (x, i) { if (mesHoje === mes && x.dia === dia) sh.getRange(5 + i, 1, 1, cab.length).setBackground('#FFE8D6'); });
  }
  sh.hideColumns(11);
  sh.setFrozenRows(4); sh.setColumnWidths(1, cab.length, 130); sh.setColumnWidth(1, 220); sh.setColumnWidth(10, 220); sh.setColumnWidth(12, 230);
  if (silencioso !== true) { ss.setActiveSheet(sh); ss.toast(saida.length + ' aniversariante(s) em ' + MESES[mes - 1] + '.', 'Bora Ali', 5); }
}

// ======================================================================
// CORES POR SITUAÇÃO: cada linha da aba Reservas muda de cor sozinha conforme o Status
// ======================================================================
var CORES_STATUS = {
  'Aguardando sinal': { linha: '#FFF6DB', status: '#FFE08A', texto: '#7A4B00' },
  'Sinal pago':       { linha: '#E4F0FD', status: '#A9CFF7', texto: '#0A3D6E' },
  'Pago':             { linha: '#E4F6EA', status: '#93D8A8', texto: '#14532D' },
  'Prazo vencido':    { linha: '#FDE6E3', status: '#F4A99F', texto: '#7F1D1D' },
  'Cancelada':        { linha: '#EFEFEF', status: '#C9C9C9', texto: '#555555' }
};
function aplicarCoresStatus_(sh) {
  var n = Math.max(sh.getMaxRows() - 1, 1), cols = CAB_RESERVAS.length;
  var linhas = sh.getRange(2, 1, n, cols), status = sh.getRange(2, 3, n, 1);
  var nome = sh.getRange(2, 8, n, 1), aut = sh.getRange(2, COL_AUT, n, 1);
  var R = function () { return SpreadsheetApp.newConditionalFormatRule(); };
  var regras = [];
  // 1) a célula do Status, em destaque
  Object.keys(CORES_STATUS).forEach(function (st) {
    var c = CORES_STATUS[st];
    regras.push(R().whenTextEqualTo(st).setBackground(c.status).setFontColor(c.texto).setBold(true).setRanges([status]).build());
  });
  // 2) menor de idade: nome e autorização em laranja
  regras.push(R().whenFormulaSatisfied('=$AB2<>""').setBackground(COR_MENOR).setFontColor('#7A3608').setBold(true).setRanges([nome, aut]).build());
  // 3) a linha inteira na cor da situação
  Object.keys(CORES_STATUS).forEach(function (st) {
    var c = CORES_STATUS[st], r = R().whenFormulaSatisfied('=$C2="' + st + '"').setBackground(c.linha).setRanges([linhas]);
    if (st === 'Cancelada') r = r.setFontColor('#8A8A8A');
    regras.push(r.build());
  });
  sh.setConditionalFormatRules(regras);
}
function aplicarCoresStatus() {
  var sh = SpreadsheetApp.getActive().getSheetByName(ABA_RESERVAS);
  if (!sh) { SpreadsheetApp.getUi().alert('Ainda não existe a aba Reservas.'); return; }
  // tira cores antigas pintadas à mão pelo script (as novas são automáticas)
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, CAB_RESERVAS.length).setBackground(null);
  aplicarCoresStatus_(sh);
  SpreadsheetApp.getActive().toast('Cores aplicadas: amarelo = aguardando sinal, azul = sinal pago, verde = pago, vermelho = prazo vencido, cinza = cancelada. Menores ficam em laranja no nome.', 'Bora Ali', 8);
}


// =====================================================================
// AGENDA DO SITE: viagens, vagas, local, fotos e regras de criança
// =====================================================================
function normCab_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function colLetra_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// { chave: nº da coluna } lendo o cabeçalho (aceita colunas fora de ordem)
function mapaAgenda_(a) {
  var cab = a.getRange(1, 1, 1, Math.max(1, a.getLastColumn())).getDisplayValues()[0].map(normCab_);
  var m = {};
  CAB_AGENDA.forEach(function (k) { var i = cab.indexOf(normCab_(k)); if (i >= 0) m[k] = i + 1; });
  AGENDA_EXTRAS.forEach(function (c) { var i = cab.indexOf(normCab_(c.h)); if (i >= 0) m[c.k] = i + 1; });
  return m;
}

// Cria as colunas que faltam, notas, listas de escolha, contas de vagas e cores. Pode rodar quantas vezes quiser.
function prepararAbaAgenda_(a) {
  if (!a) return;
  if (a.getLastRow() === 0) a.appendRow(CAB_AGENDA);
  var m = mapaAgenda_(a);
  CAB_AGENDA.forEach(function (k) { if (!m[k]) { a.getRange(1, a.getLastColumn() + 1).setValue(k); } });
  AGENDA_EXTRAS.forEach(function (c) { if (!m[c.k]) a.getRange(1, a.getLastColumn() + 1).setValue(c.h); });
  m = mapaAgenda_(a);
  var ultima = a.getLastColumn();
  a.setFrozenRows(1);
  a.getRange(1, 1, 1, ultima).setFontWeight('bold').setBackground('#F47B20').setFontColor('#06284D').setWrap(true);
  AGENDA_EXTRAS.forEach(function (c) {
    var cel = a.getRange(1, m[c.k]);
    if (c.nota) cel.setNote(c.nota);
    if (c.calc) cel.setBackground('#0A4D8C').setFontColor('#FFFFFF');
  });
  // semente das colunas extras (só onde estiver tudo vazio, na 1ª vez)
  var n = Math.max(0, a.getLastRow() - 1);
  if (n) {
    var ids = a.getRange(2, m.id, n, 1).getDisplayValues();
    ['local', 'embarques', 'gratis', 'valoresCrianca', 'avisoCrianca'].forEach(function (k, j) {
      var faixa = a.getRange(2, m[k], n, 1), vals = faixa.getValues(), mudou = false;
      if (vals.some(function (r) { return r[0] !== ''; })) return;
      ids.forEach(function (r, i) { var e = AGENDA_EXTRAS_INICIAL[r[0]]; if (e && e[j] !== undefined && e[j] !== '') { vals[i][0] = e[j]; mudou = true; } });
      if (mudou) faixa.setValues(vals);
    });
  }
  // listas de escolha e números
  var linhas = a.getMaxRows() - 1;
  a.getRange(2, m.categoria, linhas, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIAS_AGENDA, true).setAllowInvalid(false).setHelpText('fds, praia, parques, natureza ou passeios').build());
  a.getRange(2, m.ativo, linhas, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['sim', 'não'], true).setAllowInvalid(false).build());
  [['vagas', 'Total de lugares no ônibus (ex.: 46). Vazio = não controlar vagas.'], ['gratis', 'Idade (ex.: 5)'], ['valor', 'Preço por pessoa (ex.: 199,99)']].forEach(function (x) {
    a.getRange(2, m[x[0]], linhas, 1).setDataValidation(SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).setHelpText(x[1]).build());
  });
  a.getRange(2, m.valor, linhas, 1).setNumberFormat('"R$ "#,##0.00');
  a.getRange(1, m.vagas).setNote('Total de lugares no ônibus (ex.: 46). O site mostra "Restam X vagas" e "Esgotado". Vazio = não controlar.');
  // contas: reservadas e restantes (fórmula única no cabeçalho, vale para todas as linhas)
  var A = colLetra_(m.id), V = colLetra_(m.vagas), R = colLetra_(m.reservadas);
  a.getRange(2, m.reservadas, linhas, 2).clearContent();
  a.getRange(1, m.reservadas).setFormula('={"reservadas";ARRAYFORMULA(IF(' + A + '2:' + A + '="","",COUNTIFS(' + ABA_RESERVAS + '!D:D,' + A + '2:' + A +
    ',' + ABA_RESERVAS + '!C:C,"<>Cancelada",' + ABA_RESERVAS + '!C:C,"<>Prazo vencido")))}');
  a.getRange(1, m.restantes).setFormula('={"restantes";ARRAYFORMULA(IF((' + A + '2:' + A + '="")+(' + V + '2:' + V + '=""),"",' + V + '2:' + V + '-' + R + '2:' + R + '))}');
  a.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === 'Contas da agenda') p.remove(); });
  a.getRange(1, m.reservadas, a.getMaxRows(), 2).protect().setDescription('Contas da agenda').setWarningOnly(true);
  // cores: esgotado, poucas vagas, viagem escondida
  var tudo = a.getRange(2, 1, linhas, ultima), RS = colLetra_(m.restantes), AT = colLetra_(m.ativo);
  var fInat = '=$' + AT + '2="não"', fEsg = '=AND($' + RS + '2<>"",$' + RS + '2<=0)', fPoucas = '=AND($' + RS + '2<>"",$' + RS + '2<=10)';
  var regras = a.getConditionalFormatRules().filter(function (r) {
    var c = r.getBooleanCondition(), f = c && c.getCriteriaValues()[0];
    return [fInat, fEsg, fPoucas].indexOf(f) < 0;
  });
  regras.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(fInat).setBackground('#E6E6E6').setFontColor('#7A7A7A').setRanges([tudo]).build());
  regras.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(fEsg).setBackground('#FDE2E1').setRanges([tudo]).build());
  regras.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(fPoucas).setBackground('#FFF1E6').setRanges([tudo]).build());
  a.setConditionalFormatRules(regras);
  a.setColumnWidths(1, ultima, 130);
  for (var f = 1; f <= 5; f++) a.setColumnWidth(m['foto' + f], 180);
  a.setColumnWidth(m.descricao, 260);
}
function arrumarAbaAgenda() {
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA);
  if (!a) { SpreadsheetApp.getUi().alert('Rode "Preparar planilha (1ª vez)" primeiro.'); return; }
  prepararAbaAgenda_(a);
  SpreadsheetApp.getUi().alert('Pronto! A aba Agenda tem as colunas de local, embarques, crianças, 5 fotos e descrição, ' +
    'listas de escolha, e as contas de "reservadas" e "restantes" por viagem.');
}

// lê todas as viagens ativas como objetos
function lerLinhasAgenda_(incluirInativas) {
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA);
  if (!a || a.getLastRow() < 2) return [];
  var m = mapaAgenda_(a), nc = a.getLastColumn();
  var faixa = a.getRange(2, 1, a.getLastRow() - 1, nc), brutos = faixa.getValues(), txt = faixa.getDisplayValues();
  var out = [];
  txt.forEach(function (r, n) {
    var b = brutos[n];
    function T(k) { return m[k] ? String(r[m[k] - 1]).trim() : ''; }
    function B(k) { return m[k] ? b[m[k] - 1] : ''; }
    var ativo = T('ativo').toLowerCase();
    if (!T('id') || (!incluirInativas && (ativo === 'não' || ativo === 'nao'))) return;
    var fotos = [];
    for (var f = 1; f <= 5; f++) { var u = fotoUrl_(B('foto' + f) || T('foto' + f)); if (u) fotos.push(u); }
    out.push({
      linha: n + 2, id: T('id'), data: T('data'), dia: T('dia'), destino: T('destino'), categoria: T('categoria'),
      valor: numero_(B('valor')), obs: T('obs'), selo: T('selo'), mes: T('mes'), cena: T('cena'),
      vagas: B('vagas') === '' ? null : numero_(B('vagas')), ativo: ativo,
      local: T('local'), embarques: T('embarques').split(/\s*;\s*|\n+/).filter(String),
      gratis: B('gratis') === '' ? null : numero_(B('gratis')), valoresCrianca: T('valoresCrianca'), avisoCrianca: T('avisoCrianca'),
      fotos: fotos, descricao: T('descricao')
    });
  });
  return out;
}

// "5 a 8 = 50%; 9 a 11 = 199,99; 3 = 0" -> faixas
function faixasCrianca_(t) {
  var out = [];
  String(t || '').split(/[;\n]+/).forEach(function (p) {
    var m = /^\s*(\d{1,2})\s*(?:(?:a|até|ate|-)\s*(\d{1,2}))?\s*(?:anos?)?\s*[=:]\s*(?:R\$\s*)?([\d.,]+)\s*(%?)\s*$/i.exec(p);
    if (!m) return;
    var de = +m[1], ate = m[2] ? +m[2] : de;
    if (ate < de) { var x = de; de = ate; ate = x; }
    if (m[4]) out.push({ de: de, ate: ate, percentual: Math.min(100, numero_(m[3])) });
    else out.push({ de: de, ate: ate, valor: numero_(m[3]) });
  });
  return out;
}

// o que vai para o site (sem dados pessoais)
function viagemParaSite_(v) {
  var o = { id: v.id, data: v.data, dia: v.dia, destino: v.destino, categoria: v.categoria, valor: v.valor, obs: v.obs, selo: v.selo,
    mes: v.mes, cena: v.cena, vagas: v.vagas, local: v.local, embarques: v.embarques, fotos: v.fotos, descricao: v.descricao };
  var faixas = faixasCrianca_(v.valoresCrianca);
  if (v.gratis != null || faixas.length || v.avisoCrianca) o.criancas = { isentaAte: v.gratis, faixas: faixas, aviso: v.avisoCrianca };
  return o;
}

// link do Google Drive (ou link direto) -> endereço de imagem que o site consegue mostrar
function fotoUrl_(x) {
  if (x && typeof x === 'object') {
    try { x = (x.getUrl && x.getUrl()) || (x.getContentUrl && x.getContentUrl()) || ''; } catch (e) { x = ''; }
  }
  var t = String(x || '').trim();
  if (!t) return '';
  var id = (/\/file\/d\/([\w-]{20,})/.exec(t) || /[?&]id=([\w-]{20,})/.exec(t) || /googleusercontent\.com\/d\/([\w-]{20,})/.exec(t) || [])[1];
  if (/drive\.google\.com|docs\.google\.com|googleusercontent\.com\/d\//.test(t) && id) return 'https://lh3.googleusercontent.com/d/' + id + '=w1600';
  if (/^https:\/\/\S+$/i.test(t)) return t;
  return '';
}

// id sozinho: ao preencher data e destino numa linha nova
function slugId_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
var MES_CURTO_ = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
var MES_NOME_ = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function novoIdViagem_(destino, data, existentes) {
  var d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(String(data || ''));
  var base = slugId_(destino) + (d ? '-' + MES_CURTO_[(+d[2] - 1) % 12] + '-' + ('0' + d[1]).slice(-2) : '');
  var id = base, k = 2;
  while (existentes[id]) id = base + '-' + (k++);
  return id;
}
function aoEditarAgenda_(a, faixa) {
  if (faixa.getLastRow() < 2) return;
  var m = mapaAgenda_(a);
  if (!m.id || !m.destino || !m.data) return;
  var r0 = Math.max(2, faixa.getRow()), n = faixa.getLastRow() - r0 + 1;
  var nc = a.getLastColumn(), linhas = a.getRange(r0, 1, n, nc).getDisplayValues();
  var existentes = {};
  a.getRange(2, m.id, a.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) { if (r[0]) existentes[r[0]] = 1; });
  linhas.forEach(function (r, i) {
    var lin = r0 + i, destino = r[m.destino - 1], data = r[m.data - 1];
    if (r[m.id - 1] || !destino || !data) return;
    var id = novoIdViagem_(destino, data, existentes);
    existentes[id] = 1;
    a.getRange(lin, m.id).setValue(id);
    if (m.ativo && !r[m.ativo - 1]) a.getRange(lin, m.ativo).setValue('sim');
    var d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(data);
    if (m.mes && !r[m.mes - 1] && d) a.getRange(lin, m.mes).setValue(MES_NOME_[(+d[2] - 1) % 12]);
    SpreadsheetApp.getActive().toast('Viagem "' + destino + '" criada (id ' + id + '). Ela já aparece no site.', 'Bora Ali', 5);
  });
}

// ---------- duplicar viagem (mesmo destino em outra data) ----------
function duplicarViagem() {
  var ui = SpreadsheetApp.getUi();
  var v = escolherViagem_('Duplicar viagem');
  if (!v) return;
  var resp = ui.prompt('Nova data para ' + v.destino, 'Como aparece no site. Ex.: 14/03 ou 20 e 21/03', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK || !resp.getResponseText().trim()) return;
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA), m = mapaAgenda_(a);
  var orig = lerLinhasAgenda_(true).filter(function (x) { return x.id === v.id; })[0];
  if (!orig) return;
  var nc = a.getLastColumn(), linha = a.getRange(orig.linha, 1, 1, nc).getValues()[0];
  var existentes = {}; lerLinhasAgenda_(true).forEach(function (x) { existentes[x.id] = 1; });
  var data = resp.getResponseText().trim(), d = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(data);
  linha[m.id - 1] = novoIdViagem_(orig.destino, data, existentes);
  linha[m.data - 1] = data;
  if (d && m.mes) linha[m.mes - 1] = MES_NOME_[(+d[2] - 1) % 12];
  if (m.dia) linha[m.dia - 1] = '';
  if (m.ativo) linha[m.ativo - 1] = 'sim';
  if (m.reservadas) { linha[m.reservadas - 1] = ''; linha[m.restantes - 1] = ''; }
  var nova = a.getLastRow() + 1;
  a.getRange(nova, 1, 1, nc).setValues([linha]);
  a.getRange(nova, m.data).setNumberFormat('@').setValue(data);
  a.setActiveRange(a.getRange(nova, m.dia || m.data));
  ui.alert('Pronto! Criei a linha ' + nova + ' com ' + orig.destino + ' em ' + data + ' (mesmo valor, local, fotos e regras de criança). ' +
    'Confira o dia da semana e as vagas.');
}

// ---------- enviar fotos do computador ----------
function enviarFotosViagem() {
  var viagens = lerLinhasAgenda_(true).map(function (v) {
    return { id: v.id, nome: v.destino + ' — ' + v.data, fotos: v.fotos.length };
  });
  if (!viagens.length) { SpreadsheetApp.getUi().alert('A aba Agenda está vazia.'); return; }
  var t = HtmlService.createTemplate(HTML_FOTOS_);
  t.viagens = JSON.stringify(viagens).replace(/</g, '\\u003c');
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(520).setHeight(560), 'Fotos da viagem no site');
}
// chamada pela janela de envio (não renomeie: o nome não pode terminar com _)
function salvarFotosViagem(id, arquivos, substituir) {
  if (!arquivos || !arquivos.length) return { ok: false, msg: 'Escolha pelo menos uma foto.' };
  var a = SpreadsheetApp.getActive().getSheetByName(ABA_AGENDA), m = mapaAgenda_(a);
  var v = lerLinhasAgenda_(true).filter(function (x) { return x.id === id; })[0];
  if (!v) return { ok: false, msg: 'Viagem não encontrada.' };
  var cols = [1, 2, 3, 4, 5].map(function (f) { return m['foto' + f]; });
  var atuais = cols.map(function (c) { return a.getRange(v.linha, c).getDisplayValue(); });
  if (substituir) atuais = ['', '', '', '', ''];
  var livres = []; atuais.forEach(function (x, i) { if (!x) livres.push(i); });
  if (!livres.length) return { ok: false, msg: 'Esta viagem já tem 5 fotos. Marque "Trocar as fotos atuais" ou apague uma na planilha.' };
  var it = DriveApp.getFoldersByName(PASTA_FOTOS), pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_FOTOS);
  var postas = 0, aviso = '';
  arquivos.slice(0, livres.length).forEach(function (arq, k) {
    var blob = Utilities.newBlob(Utilities.base64Decode(arq.b64), arq.tipo || 'image/jpeg', v.id + '-' + (livres[k] + 1) + '-' + Date.now() + '.jpg');
    var file = pasta.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { aviso = ' Atenção: o Google não deixou compartilhar as fotos por link; abra a pasta "' + PASTA_FOTOS + '" no Drive e compartilhe como "Qualquer pessoa com o link".'; }
    atuais[livres[k]] = 'https://drive.google.com/file/d/' + file.getId() + '/view';
    postas++;
  });
  cols.forEach(function (c, i) { a.getRange(v.linha, c).setValue(atuais[i]); });
  var sobra = arquivos.length - postas;
  return { ok: true, msg: postas + (postas === 1 ? ' foto colocada' : ' fotos colocadas') + ' em ' + v.destino + '. Ao recarregar o site, ' + (postas === 1 ? 'ela já aparece' : 'elas já aparecem') + '.' + (sobra > 0 ? ' ' + sobra + ' ficaram de fora (máximo de 5 por viagem).' : '') + aviso };
}
var HTML_FOTOS_ = '<!DOCTYPE html><html><head><base target="_top"><style>' +
  'body{font-family:Arial,sans-serif;color:#0F1B2D;margin:0;padding:4px 6px;font-size:14px}label{font-weight:bold;display:block;margin:14px 0 6px}' +
  'select,input[type=file]{width:100%;font-size:14px;padding:8px;box-sizing:border-box}.dica{color:#55657A;font-size:12px;margin-top:4px}' +
  '#prev{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#prev img{width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #DDE6F0}' +
  'button{background:#F47B20;color:#06284D;border:none;border-radius:999px;padding:12px 22px;font-weight:bold;font-size:15px;cursor:pointer;margin-top:16px}' +
  'button:disabled{opacity:.5;cursor:default}#msg{margin-top:12px;font-weight:bold}.ok{color:#1E5B37}.erro{color:#B42318}' +
  '</style></head><body>' +
  '<label for="v">Viagem</label><select id="v"></select>' +
  '<label for="f">Fotos (até 5)</label><input id="f" type="file" accept="image/*" multiple>' +
  '<div class="dica">Fotos na horizontal ficam melhores. Elas são reduzidas sozinhas antes de enviar. A 1ª vira a capa do card.</div>' +
  '<div id="prev"></div>' +
  '<label style="font-weight:normal"><input type="checkbox" id="trocar"> Trocar as fotos atuais desta viagem</label>' +
  '<button id="ir" disabled>Enviar para o site</button><div id="msg" role="status"></div>' +
  '<script>var V=<?!= viagens ?>;var sel=document.getElementById("v");' +
  'V.forEach(function(x){var o=document.createElement("option");o.value=x.id;o.textContent=x.nome+(x.fotos?" ("+x.fotos+" foto"+(x.fotos>1?"s":"")+")":"");sel.appendChild(o);});' +
  'var prontos=[];function reduz(file){return new Promise(function(ok,erro){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){' +
  'var M=1600,w=im.width,h=im.height,k=Math.min(1,M/Math.max(w,h));var c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);' +
  'c.getContext("2d").drawImage(im,0,0,c.width,c.height);var u=c.toDataURL("image/jpeg",0.85);ok({url:u,b64:u.split(",")[1],tipo:"image/jpeg"});};' +
  'im.onerror=function(){erro("Não consegui abrir "+file.name)};im.src=r.result;};r.onerror=erro;r.readAsDataURL(file);});}' +
  'document.getElementById("f").onchange=function(){var fs=[].slice.call(this.files,0,5);var p=document.getElementById("prev");p.innerHTML="";prontos=[];' +
  'document.getElementById("ir").disabled=true;document.getElementById("msg").textContent=fs.length?"Preparando...":"";' +
  'Promise.all(fs.map(reduz)).then(function(l){prontos=l;l.forEach(function(x){var i=document.createElement("img");i.src=x.url;i.alt="";p.appendChild(i);});' +
  'document.getElementById("msg").textContent=this.files&&this.files.length>5?"Só as 5 primeiras serão enviadas.":"";document.getElementById("ir").disabled=!l.length;}.bind(this))' +
  '.catch(function(e){document.getElementById("msg").textContent=String(e);});};' +
  'document.getElementById("ir").onclick=function(){var b=this,msg=document.getElementById("msg");b.disabled=true;msg.className="";msg.textContent="Enviando...";' +
  'google.script.run.withSuccessHandler(function(r){msg.className=r.ok?"ok":"erro";msg.textContent=r.msg;b.disabled=!r.ok;})' +
  '.withFailureHandler(function(e){msg.className="erro";msg.textContent="Não deu certo: "+e.message;b.disabled=false;})' +
  '.salvarFotosViagem(sel.value,prontos.map(function(x){return{b64:x.b64,tipo:x.tipo}}),document.getElementById("trocar").checked);};' +
  '</script></body></html>';
