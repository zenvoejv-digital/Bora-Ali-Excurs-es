/* =========================================================
   Bora Ali Excursões — comportamento do site
   - monta categorias, seções e cards a partir de data.js
   - filtro por mês
   - aba de reserva que envia o cadastro pronto pelo WhatsApp
   - (opcional) envio para planilha Google, agenda e vagas pela planilha
   - Pix copia e cola do sinal, validação de CPF, CEP automático
   ========================================================= */
(function () {
  'use strict';

  var CONFIG = window.BORA_CONFIG || {};
  var MESES = window.BORA_MESES || [];
  var VIAGENS = window.BORA_VIAGENS || [];
  var ART = window.BORA_ART || { ICONS: {}, BANDS: {}, SCENES: {} };
  var NUMEROS = (CONFIG.whatsappReservas && CONFIG.whatsappReservas.length) ? CONFIG.whatsappReservas : ['5511974882023'];
  // intercala as reservas entre os números (sorteio a cada envio: na média, metade para cada um)
  function waReserva() { return 'https://wa.me/' + NUMEROS[Math.floor(Math.random() * NUMEROS.length)] + '?text='; }
  var MAX_PARCELAS = Math.max(1, Math.min(12, parseInt(CONFIG.maxParcelas, 10) || 10));
  var PIX = CONFIG.pix || {};
  var PLANILHA = (CONFIG.planilhaUrl || '').trim();
  var AVISO_VAGAS = parseInt(CONFIG.avisoVagas, 10) || 10;
  var PRAZO_SINAL_H = Number(CONFIG.prazoSinalHoras) > 0 ? Number(CONFIG.prazoSinalHoras) : 24;
  var ocupadas = {};   // id da viagem -> lugares já reservados (vem da planilha)

  // ---------- modo demonstração: abra o site com ?demo=1 ----------
  // Mostra Pix, vagas e avaliação com dados fictícios, sem enviar nada para a planilha.
  var DEMO = /[?&]demo=1\b/.test(location.search);
  if (DEMO) {
    PIX = { chave: 'demonstracao@boraali.com.br', nome: 'BORA ALI EXCURSOES', cidade: 'SALTO' };
    PLANILHA = '';
    CONFIG.linkAvaliacao = CONFIG.linkAvaliacao || 'https://www.google.com/search?q=Bora+Ali+Excurs%C3%B5es+Salto';
    var demoVagas = { 'olimpia-jan-30': [46, 46], 'ilhabela-jan-02': [46, 40], 'hopi-hari-jan-16': [46, 45], 'campos-do-jordao-fev-21': [46, 42] };
    VIAGENS.forEach(function (v) { if (demoVagas[v.id]) { v.vagas = demoVagas[v.id][0]; ocupadas[v.id] = demoVagas[v.id][1]; } });
    var aviso = document.createElement('div');
    aviso.setAttribute('role', 'note');
    aviso.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:40;background:#FFE2C4;color:#7A3608;font:800 13px Inter,sans-serif;letter-spacing:.5px;padding:10px 16px;border-radius:999px;box-shadow:0 6px 20px rgba(6,40,77,.2)';
    aviso.innerHTML = 'DEMONSTRAÇÃO · dados fictícios · <a href="/demo/planilha" style="color:#7A3608">ver a planilha de reservas</a> · <a href="/demo/admin" style="color:#7A3608">painel de clientes</a>';
    document.body.appendChild(aviso);
  }

  var CATEGORIAS = [
    { id: 'fins-de-semana', key: 'fds', kicker: 'VIAGENS DE 2 A 4 DIAS', title: 'Fins de semana', subtitle: 'Mais tempo para aproveitar cada destino', band: '#0A4D8C', bandInk: '#FFFFFF', tileBg: '#DCEBFA', tileInk: '#0A4D8C', anim: 'r-zoom' , tileGrad: 'linear-gradient(155deg,#DCEBFA 0%,#F7E4C8 62%,#F2C98E 100%)', tileAcc: '#C8913A' , bandGrad: 'linear-gradient(100deg,#DCEBFA 0%,#F7E4C8 60%,#F2C98E 100%)', bandKicker: '#8A5A12' },
    { id: 'praias', key: 'praia', kicker: 'BATE E VOLTA', title: 'Praias', subtitle: 'Litoral paulista e Rio de Janeiro', band: '#1B8EDB', bandInk: '#06284D', tileBg: '#E2F1FC', tileInk: '#0A6BB0', anim: 'r-up' , tileGrad: 'linear-gradient(180deg,#CDEEFF 0%,#A9E0F5 48%,#FBE6A8 100%)', tileAcc: '#1B8EDB' , bandGrad: 'linear-gradient(100deg,#CDEEFF 0%,#A9E0F5 55%,#FBE6A8 100%)', bandKicker: '#0A6BB0' },
    { id: 'parques', key: 'parques', kicker: 'DIVERSÃO GARANTIDA', title: 'Parques e águas termais', subtitle: 'Brinquedos, piscinas e muita risada', band: '#F47B20', bandInk: '#06284D', tileBg: '#FFEADB', tileInk: '#B4520A', anim: 'r-pop' , tileGrad: 'linear-gradient(160deg,#FFF1D0 0%,#C7F0EA 52%,#9FE3D6 100%)', tileAcc: '#14A39A' , bandGrad: 'linear-gradient(100deg,#FFF1D0 0%,#C7F0EA 55%,#9FE3D6 100%)', bandKicker: '#0D7A73' },
    { id: 'natureza', key: 'natureza', kicker: 'SERRA E MONTANHA', title: 'Natureza', subtitle: 'Mirantes, flores e ar puro', band: '#06284D', bandInk: '#FFFFFF', tileBg: '#E7EEF6', tileInk: '#06284D', anim: 'r-left' , tileGrad: 'linear-gradient(160deg,#FFF0C2 0%,#D8F0BE 50%,#A9DB8C 100%)', tileAcc: '#4E9A2E' , bandGrad: 'linear-gradient(100deg,#FFF0C2 0%,#D8F0BE 55%,#A9DB8C 100%)', bandKicker: '#2F6E16' },
    { id: 'passeios', key: 'passeios', kicker: 'CULTURA, FÉ E COMPRAS', title: 'Passeios', subtitle: 'Zoológico, Aparecida, Serra Negra e mais', band: '#FFF1E6', bandInk: '#06284D', tileBg: '#FFF1E6', tileInk: '#B4520A', anim: 'r-flip' , tileGrad: 'linear-gradient(160deg,#FFE9C4 0%,#EFE3B5 45%,#BFE0B0 100%)', tileAcc: '#B8862C' , bandGrad: 'linear-gradient(100deg,#FFE9C4 0%,#EFE3B5 50%,#BFE0B0 100%)', bandKicker: '#8A5A12' }
  ];

  var PAGAMENTOS = [
    { id: 'pix', label: 'Pix', sub: 'À vista' },
    { id: 'credito', label: 'Cartão de crédito', sub: 'Até ' + MAX_PARCELAS + 'x (com taxa)' },
    { id: 'debito', label: 'Cartão de débito', sub: 'À vista' }
  ];

  // ---------- utilidades ----------
  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function brl(v) {
    var p = (Math.round(v * 100) / 100).toFixed(2).split('.');
    return 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
  }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }
  function maskCpf(v) {
    var d = digits(v).slice(0, 11), o = d.slice(0, 3);
    if (d.length > 3) o += '.' + d.slice(3, 6);
    if (d.length > 6) o += '.' + d.slice(6, 9);
    if (d.length > 9) o += '-' + d.slice(9, 11);
    return o;
  }
  function maskTel(v) {
    var d = digits(v).slice(0, 11);
    if (!d.length) return '';
    if (d.length <= 2) return '(' + d;
    var rest = d.slice(2), o = '(' + d.slice(0, 2) + ') ';
    if (rest.length > 8) return o + rest.slice(0, 5) + '-' + rest.slice(5);
    if (rest.length > 4) return o + rest.slice(0, 4) + '-' + rest.slice(4);
    return o + rest;
  }
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : v;
  }

  function cpfValido(v) {
    var d = digits(v);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += +d[i] * (t + 1 - i);
      var dig = (soma * 10) % 11 % 10;
      if (dig !== +d[t]) return false;
    }
    return true;
  }
  function idade(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var hoje = new Date(), a = hoje.getFullYear() - +m[1];
    if (hoje.getMonth() + 1 < +m[2] || (hoje.getMonth() + 1 === +m[2] && hoje.getDate() < +m[3])) a--;
    return a;
  }
  function comIdade(iso) {
    // idade no dia do passeio (é ela que define o valor da criança)
    var a = viagemAtual ? idadeNaViagem(iso, viagemAtual) : idade(iso);
    return fmtDate(iso) + (a == null ? '' : ' (' + a + (a === 1 ? ' ano' : ' anos') + (a < 12 ? ', criança' : '') + ')');
  }
  function maskCep(v) { var d = digits(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; }
  function semAcento(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase(); }
  // código curto e único para a reserva, ex.: BA-K3F9Q2
  function gerarCodigo() {
    var t = Date.now().toString(36).toUpperCase().slice(-4);
    var r = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    return 'BA-' + t + ('00' + r).slice(-2);
  }
  // Pix copia e cola (BR Code do Banco Central) com valor e código da reserva
  function pixCopiaECola(valor, txid) {
    function f(id, v) { return id + ('0' + v.length).slice(-2) + v; }
    var chave = String(PIX.chave || '').trim();
    var payload = f('00', '01') +
      f('26', f('00', 'br.gov.bcb.pix') + f('01', chave)) +
      f('52', '0000') + f('53', '986') + f('54', valor.toFixed(2)) + f('58', 'BR') +
      f('59', semAcento(PIX.nome || 'BORA ALI EXCURSOES').slice(0, 25)) +
      f('60', semAcento(PIX.cidade || 'SALTO').slice(0, 15)) +
      f('62', f('05', (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25))) + '6304';
    var crc = 0xFFFF;
    for (var i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return payload + ('000' + crc.toString(16).toUpperCase()).slice(-4);
  }
  function vagasRestantes(v) {
    if (typeof v.vagas !== 'number' || !(v.vagas > 0)) return null;
    return Math.max(0, v.vagas - (ocupadas[v.id] || 0));
  }

  var GENERIC_SCENE = '<svg aria-hidden="true" viewBox="0 0 300 128" width="100%" height="128" preserveAspectRatio="xMidYMid slice" style="display: block"><circle class="a-sun" cx="240" cy="40" r="16" fill="#F47B20"></circle><path d="M0 104 Q150 84 300 104 V128 H0 Z" fill="#0A4D8C"></path></svg>';

  // ---------- estado ----------
  var mesAtual = 'todos';

  // ---------- filtro de mês ----------
  function renderMonths() {
    var opts = [{ id: 'todos', label: 'Todos' }].concat(MESES);
    $('month-filter').innerHTML = opts.map(function (m) {
      var on = m.id === mesAtual;
      return '<button type="button" data-month="' + esc(m.id) + '" aria-pressed="' + on + '" style="font-family: inherit; font-weight: ' + (on ? 700 : 600) + '; font-size: 15px; border: none; cursor: pointer; padding: 10px 18px; min-height: 44px; border-radius: 999px; background: ' + (on ? '#0A4D8C' : 'transparent') + '; color: ' + (on ? '#FFFFFF' : '#0A4D8C') + '">' + esc(m.label) + '</button>';
    }).join('');
  }

  function viagensDe(cat) {
    return VIAGENS.filter(function (v) {
      return v.categoria === cat.key && (mesAtual === 'todos' || v.mes === mesAtual);
    });
  }

  // ---------- atalhos de categoria ----------
  function renderTiles() {
    $('category-tiles').innerHTML = CATEGORIAS.map(function (c) {
      var list = viagensDe(c);
      var min = list.length ? Math.min.apply(null, list.map(function (v) { return v.valor; })) : 0;
      var count = list.length === 1 ? '1 viagem' : list.length + ' viagens';
      return '<a class="tile" href="#' + c.id + '" style="--acc: ' + c.tileAcc + '; display: flex; flex-direction: column; gap: 12px; text-decoration: none; color: #0F1B2D; border: 2px solid #E4EDF6; border-radius: 20px; padding: 18px; background: #FFFFFF">' +
        '<span class="tile-img" style="height: 112px; border-radius: 16px; background: ' + c.tileGrad + '; display: flex; align-items: center; justify-content: center; padding: 8px; overflow: hidden">' +
          '<img src="/assets/img/categorias/' + c.key + '.webp" alt="" width="180" height="140" loading="lazy" decoding="async" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain">' +
        '</span>' +
        '<span style="display: flex; flex-direction: column; gap: 2px">' +
        '<span style="font-family: \'Poppins\', sans-serif; font-weight: 600; font-size: 17px">' + esc(c.title) + '</span>' +
        '<span style="font-size: 14px; color: #55657A">' + count + ' · a partir de ' + (list.length ? brl(min) : '—') + '</span>' +
        '</span></a>';
    }).join('');
  }

  // ---------- card de viagem ----------
  function cardHTML(v, cat) {
    var idx = VIAGENS.indexOf(v);
    var rest = vagasRestantes(v), esgotado = rest === 0;
    var badge = esgotado
      ? '<span style="font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 999px; background: #06284D; color: #FFFFFF">Esgotado</span>'
      : (v.selo ? '<span style="font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px; background: #F47B20; color: #06284D">' + esc(v.selo) + '</span>' : '');
    var aviso = (!esgotado && rest != null && rest <= AVISO_VAGAS)
      ? '<span style="align-self: flex-start; font-size: 13px; font-weight: 700; color: #B4520A; background: #FFF1E6; padding: 4px 10px; border-radius: 999px">' + (rest === 1 ? 'Última vaga!' : 'Restam ' + rest + ' vagas') + '</span>' : '';
    var botao = esgotado
      ? '<button type="button" class="btn" data-espera="' + idx + '" aria-label="Entrar na lista de espera de ' + esc(v.destino) + '" style="font-family: inherit; cursor: pointer; background: #FFFFFF; border: 2px solid #0A4D8C; color: #0A4D8C; font-weight: 700; font-size: 14px; padding: 8px 14px; border-radius: 999px; min-height: 44px; display: inline-flex; align-items: center">Lista de espera</button>'
      : '<button type="button" class="btn" data-reservar="' + idx + '" aria-label="Reservar ' + esc(v.destino) + ' em ' + esc(v.data) + '" style="font-family: inherit; border: none; cursor: pointer; background: #F47B20; color: #06284D; font-weight: 700; font-size: 15px; padding: 10px 18px; border-radius: 999px; min-height: 44px; display: inline-flex; align-items: center">Reservar</button>';
    return '<article class="card ' + cat.anim + '" style="border: 1px solid #E4EDF6; border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; background: #FFFFFF">' +
      '<div style="position: relative; height: 128px; background: #E2F1FC; overflow: hidden">' + (ART.SCENES[v.cena] || GENERIC_SCENE) +
      '<div style="position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px">' +
      '<span style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; color: #0A4D8C; box-shadow: 0 2px 8px rgba(6,40,77,0.15); font-weight: 700; font-size: 14px; padding: 7px 12px; border-radius: 999px">' +
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>' +
      esc(v.data) + ' · ' + esc(v.dia) + '</span>' + badge + '</div></div>' +
      '<div style="padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 16px; flex-grow: 1">' +
      '<div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1">' +
      '<h3 style="font-family: \'Poppins\', sans-serif; margin: 0; font-weight: 600; font-size: 21px; color: #0F1B2D">' + esc(v.destino) + '</h3>' +
      '<span style="font-size: 14px; color: #55657A">' + esc(v.obs) + '</span>' + aviso + '</div>' +
      '<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #E4EDF6; padding-top: 14px">' +
      '<div style="display: flex; flex-direction: column; line-height: 1.15"><span style="font-size: 12px; font-weight: 600; color: #55657A">por pessoa</span>' +
      '<span style="font-family: \'Poppins\', sans-serif; font-weight: 700; font-size: 22px; color: #0A4D8C; white-space: nowrap">' + brl(v.valor) + '</span></div>' +
      botao + '</div></div></article>';
  }

  // ---------- seções ----------
  function renderSections() {
    $('trip-sections').innerHTML = CATEGORIAS.map(function (c) {
      var list = viagensDe(c);
      var cards = list.map(function (v) { return cardHTML(v, c); }).join('');
      var empty = list.length ? '' : '<p style="margin: 0; font-size: 15px; color: #55657A; background: #EEF5FC; border-radius: 16px; padding: 16px 18px">Sem saídas desta categoria no mês escolhido. Troque o mês lá em cima ou chame a gente no WhatsApp.</p>';
      return '<section id="' + c.id + '" style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 8px; display: flex; flex-direction: column; gap: 24px; scroll-margin-top: 80px">' +
        '<div style="background: ' + c.bandGrad + '; color: #06284D; border-radius: 28px; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 0 clamp(16px, 3vw, 36px) 0 clamp(24px, 4vw, 44px); min-height: 170px">' +
        '<div style="flex: 999 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 28px 0">' +
        '<span style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: ' + c.bandKicker + '">' + esc(c.kicker) + '</span>' +
        '<h2 style="font-family: \'Poppins\', sans-serif; margin: 0; font-weight: 700; font-size: clamp(28px, 3.4vw, 40px); line-height: 1.1">' + esc(c.title) + '</h2>' +
        '<span style="font-size: 16px; color: #33445A">' + esc(c.subtitle) + '</span></div>' +
        '<div style="flex: 0 1 260px; height: 170px; display: flex; align-items: center; justify-content: center; padding: 10px 0">' +
        '<img class="band-img" src="/assets/img/categorias/' + c.key + '.webp" alt="" width="220" height="160" loading="lazy" decoding="async" style="max-width: 100%; max-height: 150px; width: auto; height: auto; object-fit: contain"></div></div>' +
        '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px">' + cards + '</div>' + empty +
        '</section>';
    }).join('');
  }

  function renderAll() { renderMonths(); renderTiles(); renderSections(); }

  $('month-filter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-month]');
    if (!b) return;
    mesAtual = b.getAttribute('data-month');
    renderAll();
  });

  // =========================================================
  // Aba de reserva
  // =========================================================
  var booking = $('booking');
  var viagemAtual = null;
  var pax = 1, pagamento = '', parcelas = 1, lastFocus = null;
  var acomps = [];   // dados de cada acompanhante

  // cidades de embarque
  function opcoesEmbarque(sel) {
    return '<option value="">Selecione</option>' + (CONFIG.cidadesEmbarque || []).map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
  }
  $('bk-emb').innerHTML = opcoesEmbarque('');
  // "só transporte" (ex.: Hopi Hari para aniversariante, PcD e idoso)
  function opcoesTipo(v, sel) {
    var st = v && v.soTransporte; if (!st) return '';
    return '<option value="">Transporte + ingresso (' + brl(v.valor) + ')</option>' + st.motivos.map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === sel ? ' selected' : '') + '>Só transporte (' + brl(st.valor) + ') · ' + esc(m) + '</option>';
    }).join('');
  }
  function aplicaTipo(v, p, tipo) {
    var st = v && v.soTransporte;
    if (!st || !tipo || p.pendente || p.valor === 0) return p;
    return { valor: st.valor, rotulo: 'só transporte · ' + tipo };
  }

  // ---------- crianças: preço pela idade no dia do passeio ----------
  var ISENTA_ATE = (CONFIG.criancaIsentaAte == null) ? 4 : +CONFIG.criancaIsentaAte;
  function dataDaViagem(v) {
    var m = /(\d{1,2})(?:\D+\d{1,2})?\/(\d{1,2})/.exec(v ? v.data : '');
    return m ? new Date(+(CONFIG.anoAgenda || new Date().getFullYear()), +m[2] - 1, +m[1]) : new Date();
  }
  function idadeNaViagem(iso, v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var d = dataDaViagem(v), a = d.getFullYear() - +m[1];
    if (d.getMonth() + 1 < +m[2] || (d.getMonth() + 1 === +m[2] && d.getDate() < +m[3])) a--;
    return a;
  }
  // devolve { valor, rotulo } de um passageiro
  function precoPassageiro(v, idade) {
    var cri = v.criancas || {}, i;
    if (idade == null || idade < 0) return { valor: v.valor, rotulo: 'preencha a data de nascimento', pendente: true };
    if (cri.faixas) {
      for (i = 0; i < cri.faixas.length; i++) {
        var f = cri.faixas[i];
        if (idade >= f.de && idade <= f.ate) return { valor: f.valor, rotulo: f.valor ? 'tarifa infantil (' + idade + (idade === 1 ? ' ano' : ' anos') + ')' : 'isento (' + idade + (idade === 1 ? ' ano' : ' anos') + ', no colo)', infantil: true };
      }
    }
    var isentaAte = cri.isentaAte != null ? cri.isentaAte : ISENTA_ATE;
    if (!cri.faixas && idade <= isentaAte) return { valor: 0, rotulo: 'isento (' + idade + (idade === 1 ? ' ano' : ' anos') + ', no colo)', infantil: true };
    var dc = CONFIG.descontoCriancas;
    if (dc && dc.percentual > 0 && idade >= dc.de && idade <= dc.ate) {
      return { valor: Math.round(v.valor * (100 - dc.percentual)) / 100, rotulo: 'criança com ' + dc.percentual + '% de desconto (' + idade + ' anos)', infantil: true };
    }
    return { valor: v.valor, rotulo: idade < 12 ? 'criança, valor integral (' + idade + ' anos)' : 'valor integral' };
  }
  function regraCriancas(v) {
    var cri = v.criancas || {};
    var partes = [];
    if (cri.faixas) partes.push(cri.aviso || '');
    else {
      var ate = cri.isentaAte != null ? cri.isentaAte : ISENTA_ATE;
      partes.push('Crianças de até ' + ate + ' anos viajam no colo e não pagam.');
      var dc = CONFIG.descontoCriancas;
      if (dc && dc.percentual > 0) partes.push('De ' + dc.de + ' a ' + dc.ate + ' anos: ' + dc.percentual + '% de desconto.');
      if (cri.aviso) partes.push(cri.aviso);
    }
    return partes.filter(Boolean).join(' ') + ' A idade conta no dia do passeio.';
  }
  function precosDaReserva() {
    var v = viagemAtual; if (!v) return [];
    var lista = [aplicaTipo(v, { valor: v.valor, rotulo: 'contratante' }, $('bk-tipo').value)];
    acomps.forEach(function (a) { lista.push(precoAcomp(v, a)); });
    return lista;
  }
  function precoAcomp(v, a) { return aplicaTipo(v, precoPassageiro(v, idadeNaViagem(a.nasc, v)), a.tipo); }
  function total() { return precosDaReserva().reduce(function (s, p) { return s + p.valor; }, 0); }
  function resumoPassageiros() {
    var ps = precosDaReserva(), pag = 0, isentos = 0, infantis = 0;
    var soT = 0;
    ps.forEach(function (p) { if (p.valor === 0) isentos++; else if (/^só transporte/.test(p.rotulo)) soT++; else if (p.infantil) infantis++; else pag++; });
    var t = pag ? [pag + (pag === 1 ? ' pagante' : ' pagantes')] : [];
    if (infantis) t.push(infantis + (infantis === 1 ? ' infantil' : ' infantis'));
    if (isentos) t.push(isentos + (isentos === 1 ? ' isento' : ' isentos'));
    if (soT) t.push(soT + ' só transporte');
    return t.join(' · ');
  }

  function renderPays() {
    $('bk-pays').innerHTML = PAGAMENTOS.map(function (p) {
      var on = p.id === pagamento;
      return '<button type="button" data-pay="' + p.id + '" aria-pressed="' + on + '" style="font-family: inherit; cursor: pointer; text-align: left; border: 2px solid ' + (on ? '#F47B20' : '#E4EDF6') + '; background: ' + (on ? '#FFF1E6' : '#FFFFFF') + '; color: #0F1B2D; border-radius: 14px; padding: 12px 14px; min-height: 64px; display: flex; flex-direction: column; gap: 2px"><span style="font-weight: 700; font-size: 15px">' + p.label + '</span><span style="font-size: 13px; color: #55657A">' + p.sub + '</span></button>';
    }).join('');
  }

  function renderParcelas() {
    var html = '';
    for (var n = 1; n <= MAX_PARCELAS; n++) {
      var on = n === parcelas;
      html += '<button type="button" data-parc="' + n + '" aria-pressed="' + on + '" style="font-family: inherit; cursor: pointer; border: 2px solid ' + (on ? '#0A4D8C' : '#E4EDF6') + '; background: ' + (on ? '#0A4D8C' : '#FFFFFF') + '; color: ' + (on ? '#FFFFFF' : '#0F1B2D') + '; border-radius: 12px; padding: 8px 6px; min-height: 56px; display: flex; flex-direction: column; align-items: center; gap: 2px"><span style="font-weight: 800; font-size: 16px">' + n + 'x</span><span style="font-size: 12px;' + (on ? '' : ' color: #55657A;') + '">' + brl(total() / n) + '</span></button>';
    }
    $('bk-parc-opts').innerHTML = html;
  }

  function blankAcomp() { return { nome: '', cpf: '', rg: '', nasc: '', dif: false, emb: '', tipo: '', vinc: '', rNome: '', rVinc: '', rCpf: '', rRg: '', rTel: '', rNasc: '', rEmail: '' }; }

  // ---------- menor de idade: autorização do responsável (assets/js/autorizacao.js) ----------
  var AUT = window.BoraAut;
  var VINCULOS = AUT.VINCULOS;
  function ehMenor(a, v) { var id = idadeNaViagem(a.nasc, v); return id != null && id >= 0 && id < 18; }
  var precisaResp = AUT.precisaResp;
  function opcoesSel(mapa, sel) {
    return '<option value="">Selecione</option>' + Object.keys(mapa).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === sel ? ' selected' : '') + '>' + esc(mapa[k]) + '</option>';
    }).join('');
  }
  var VINC_RESP = {}; AUT.PAPEIS.forEach(function (p) { VINC_RESP[p] = p; });
  function exigeFirma(a, v) { return AUT.exigeFirma(a, idadeNaViagem(a.nasc, v)); }
  function textoAutorizacao(a, f, v) { return AUT.texto(a, f, idadeNaViagem(a.nasc, v)); }
  function reservaAut(codigo, v, f) {
    return { codigo: codigo, ano: CONFIG.anoAgenda, v: { destino: v.destino, data: v.data, dia: v.dia },
      f: { nome: f.nome, rg: f.rg, cpf: f.cpf, tel: f.tel, nasc: f.nasc, email: f.email, embarque: f.embarque, cidade: f.cidade, saude: f.saude, emgNome: f.emgNome, emgTel: f.emgTel } };
  }
  var ultimaReserva = null, ultimosAcomps = [];

  // contratante menor de idade: quadro com os dados do responsável
  $('bk-cr-com').innerHTML = '<option value="">Selecione</option>' + Object.keys(AUT.VIAJA_COM).map(function (k) {
    return '<option value="' + k + '">' + esc(AUT.VIAJA_COM[k]) + '</option>';
  }).join('');
  // nascimento (maior de 18) e e-mail do responsável
  function faltaNascEmail(a, suf) {
    var out = [];
    suf = suf || '';
    if (!a.rNasc) out.push('data de nascimento' + suf);
    else { var ir = idade(a.rNasc); if (ir == null || ir < 18) out.push('data de nascimento' + suf + ' (precisa ter 18 anos ou mais)'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.rEmail || '')) out.push('e-mail' + suf);
    return out;
  }
  function textoResp(a) {
    return a.rNome + ' (' + a.rVinc + ') - nasc. ' + AUT.dataBr(a.rNasc) + ' - CPF ' + a.rCpf + ' - RG ' + a.rRg + ' - Tel. ' + a.rTel + ' - ' + a.rEmail;
  }
  function contratanteMenor() { var id = idadeNaViagem($('bk-nasc').value, viagemAtual); return id != null && id >= 0 && id < 18; }
  function dadosContratanteMenor(f) {
    return { contratante: true, nome: f.nome, nasc: f.nasc, rg: f.rg, cpf: f.cpf, dif: false, emb: f.embarque, vinc: $('bk-cr-com').value,
      rNome: $('bk-cr-nome').value.trim(), rVinc: $('bk-cr-papel').value, rCpf: $('bk-cr-cpf').value, rRg: $('bk-cr-rg').value.trim(), rTel: $('bk-cr-tel').value,
      rNasc: $('bk-cr-nasc').value, rEmail: $('bk-cr-email').value.trim() };
  }
  function adultosDaReserva(v) {
    return acomps.filter(function (a) { var id = idadeNaViagem(a.nasc, v); return id != null && id >= 18; }).map(function (a) { return a.nome.trim(); });
  }
  function syncContratanteMenor() {
    var on = !!viagemAtual && contratanteMenor();
    $('bk-cmenor').hidden = !on;
    var com = $('bk-cr-com').value, id = idadeNaViagem($('bk-nasc').value, viagemAtual);
    $('bk-cr-dica').textContent = !on ? '' :
      com === 'junto' ? 'Adicione o responsável como acompanhante, mais abaixo, com o mesmo CPF.' :
      com === 'acomp' ? 'Adicione o adulto como acompanhante, mais abaixo.' + (id < 16 ? ' Se ele não for avô/avó, tio(a) ou irmão(ã), a autorização precisa de firma reconhecida em cartório.' : '') :
      com === 'sozinho' ? (id < 16 ? 'Menor de 16 anos sem adulto conhecido: a autorização precisa de firma reconhecida em cartório.' : 'O responsável assina a autorização e ela é entregue no embarque.') : '';
  }
  ['input', 'change'].forEach(function (ev) {
    $('bk-nasc').addEventListener(ev, syncContratanteMenor);
    $('bk-cr-com').addEventListener(ev, syncContratanteMenor);
  });
  $('bk-cr-cpf').addEventListener('input', function (e) { e.target.value = maskCpf(e.target.value); });
  $('bk-cr-tel').addEventListener('input', function (e) { e.target.value = maskTel(e.target.value); });
  $('bk-cr-cpf').addEventListener('blur', function () { checaCpf($('bk-cr-cpf'), null); });
  $('bk-cr-nasc').max = new Date().toISOString().slice(0, 10);
  function imprimirAutorizacoes(lista) {
    if (!ultimaReserva) return;
    AUT.imprimir(lista.map(function (a) { return [ultimaReserva, a]; }));
  }


  function syncAcomps() {
    pax = acomps.length + 1;
    $('bk-add-label').textContent = acomps.length ? 'Adicionar outro acompanhante' : 'Adicionar acompanhante';
    var F = '<div style="display: flex; flex-direction: column; min-width: 0">';
    var G = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px">';
    $('bk-acomps').innerHTML = acomps.map(function (a, i) {
      var n = i + 1, id = 'bk-a' + n + '-';
      return '<div style="border: 1.5px solid #D6E4F2; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #F7FAFE">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px"><span style="font-family: \'Poppins\', sans-serif; font-weight: 600; font-size: 16px; color: #0A4D8C">Acompanhante ' + n + '</span>' +
        '<button type="button" data-remove="' + i + '" aria-label="Remover acompanhante ' + n + '" style="font-family: inherit; border: none; background: transparent; color: #B4520A; font-weight: 700; font-size: 14px; cursor: pointer; min-height: 44px; padding: 0 4px">Remover</button></div>' +
        F + '<label class="f-label" for="' + id + 'nome">Nome completo *</label><input id="' + id + 'nome" data-a="' + i + '" data-k="nome" class="f-input" type="text" value="' + esc(a.nome) + '"></div>' +
        G + F + '<label class="f-label" for="' + id + 'cpf">CPF *</label><input id="' + id + 'cpf" data-a="' + i + '" data-k="cpf" class="f-input" type="text" inputmode="numeric" placeholder="000.000.000-00" value="' + esc(a.cpf) + '"></div>' +
        F + '<label class="f-label" for="' + id + 'rg">RG *</label><input id="' + id + 'rg" data-a="' + i + '" data-k="rg" class="f-input" type="text" placeholder="00.000.000-0" value="' + esc(a.rg) + '"></div></div>' +
        F + '<label class="f-label" for="' + id + 'nasc">Data de nascimento *</label><input id="' + id + 'nasc" data-a="' + i + '" data-k="nasc" class="f-input" type="date" value="' + esc(a.nasc) + '"></div>' +
        (viagemAtual && viagemAtual.soTransporte ? F + '<label class="f-label" for="' + id + 'tipo">Ingresso</label><select id="' + id + 'tipo" data-a="' + i + '" data-k="tipo" class="f-input">' + opcoesTipo(viagemAtual, a.tipo) + '</select></div>' : '') +
        '<div id="' + id + 'menor" hidden style="border: 1.5px solid #F47B20; background: #FFF8F1; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px">' +
          '<span style="font-weight: 700; font-size: 15px; color: #7A3608">Menor de idade: precisa de autorização do responsável</span>' +
          '<span class="f-hint" style="margin: 0">Depois de enviar a reserva, o site gera a autorização preenchida para imprimir. O responsável assina e ela é entregue no embarque.</span>' +
          F + '<label class="f-label" for="' + id + 'vinc">Quem fez a reserva (contratante) é *</label><select id="' + id + 'vinc" data-a="' + i + '" data-k="vinc" class="f-input">' + opcoesSel(VINCULOS, a.vinc) + '</select></div>' +
          '<div id="' + id + 'resp"' + (precisaResp(a) ? '' : ' hidden') + ' style="display: flex; flex-direction: column; gap: 12px">' +
            '<span style="font-weight: 700; font-size: 14px; color: #33445A">Pai, mãe ou responsável legal que vai assinar</span>' +
            G + F + '<label class="f-label" for="' + id + 'rnome">Nome completo *</label><input id="' + id + 'rnome" data-a="' + i + '" data-k="rNome" class="f-input" type="text" value="' + esc(a.rNome) + '"></div>' +
            F + '<label class="f-label" for="' + id + 'rvinc">É o(a) *</label><select id="' + id + 'rvinc" data-a="' + i + '" data-k="rVinc" class="f-input">' + opcoesSel(VINC_RESP, a.rVinc) + '</select></div></div>' +
            G + F + '<label class="f-label" for="' + id + 'rcpf">CPF *</label><input id="' + id + 'rcpf" data-a="' + i + '" data-k="rCpf" class="f-input" type="text" inputmode="numeric" placeholder="000.000.000-00" value="' + esc(a.rCpf) + '"></div>' +
            F + '<label class="f-label" for="' + id + 'rrg">RG *</label><input id="' + id + 'rrg" data-a="' + i + '" data-k="rRg" class="f-input" type="text" value="' + esc(a.rRg) + '"></div>' +
            F + '<label class="f-label" for="' + id + 'rtel">Telefone *</label><input id="' + id + 'rtel" data-a="' + i + '" data-k="rTel" class="f-input" type="tel" inputmode="tel" placeholder="(11) 90000-0000" value="' + esc(a.rTel) + '"></div></div>' +
            G + F + '<label class="f-label" for="' + id + 'rnasc">Data de nascimento *</label><input id="' + id + 'rnasc" data-a="' + i + '" data-k="rNasc" class="f-input" type="date" value="' + esc(a.rNasc) + '"></div>' +
            F + '<label class="f-label" for="' + id + 'remail">E-mail *</label><input id="' + id + 'remail" data-a="' + i + '" data-k="rEmail" class="f-input" type="email" inputmode="email" placeholder="nome@email.com" value="' + esc(a.rEmail) + '"></div></div>' +
          '</div>' +
        '</div>' +
        '<span id="' + id + 'preco" aria-live="polite" style="align-self: flex-start; font-size: 13px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: #EEF5FC; color: #0A4D8C"></span>' +
        '<span id="' + id + 'niver" hidden style="align-self: flex-start; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 999px; background: #FFF1E6; color: #7A3608; border: 1.5px dashed #F47B20"></span>' +
        '<label for="' + id + 'dif" style="display: flex; gap: 10px; align-items: center; font-size: 15px; color: #33445A; cursor: pointer; min-height: 44px">' +
        '<input id="' + id + 'dif" data-a="' + i + '" data-k="dif" type="checkbox"' + (a.dif ? ' checked' : '') + ' style="width: 22px; height: 22px; margin: 0; flex: none; accent-color: #0A4D8C"><span>Vai embarcar em outro local</span></label>' +
        '<div id="' + id + 'emb-wrap"' + (a.dif ? '' : ' hidden') + '>' + F + '<label class="f-label" for="' + id + 'emb">Ponto de embarque *</label><select id="' + id + 'emb" data-a="' + i + '" data-k="emb" class="f-input">' + opcoesEmbarque(a.emb) + '</select></div></div>' +
        '</div>';
    }).join('');
  }

  // ---------- aniversariante do mês do passeio: desconto com condições no WhatsApp ----------
  var NIVER = CONFIG.descontoAniversario || {};
  function niverNoMes(iso, v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return !!(NIVER.ativo && m && v && +m[2] === dataDaViagem(v).getMonth() + 1);
  }
  function niverTexto(nome) { return '🎂 ' + (nome ? nome + ' faz' : 'Você faz') + ' aniversário no mês do passeio: tem desconto especial! As condições são confirmadas pelo WhatsApp.'; }
  function syncNiver() {
    var on = !!viagemAtual && niverNoMes($('bk-nasc').value, viagemAtual);
    $('bk-niver').hidden = !on;
    if (on) $('bk-niver').textContent = niverTexto('');
  }
  ['input', 'change'].forEach(function (ev) { $('bk-nasc').addEventListener(ev, syncNiver); });
  function precoChips() {
    acomps.forEach(function (a, i) {
      var nv = $('bk-a' + (i + 1) + '-niver');
      if (nv) { var onN = niverNoMes(a.nasc, viagemAtual); nv.hidden = !onN; if (onN) nv.textContent = niverTexto(a.nome.trim().split(/\s+/)[0] || 'Acompanhante'); }
      var mn = $('bk-a' + (i + 1) + '-menor'); if (mn) mn.hidden = !ehMenor(a, viagemAtual);
      var el = $('bk-a' + (i + 1) + '-preco'); if (!el) return;
      var p = precoAcomp(viagemAtual, a);
      el.textContent = p.pendente ? 'Valor: ' + brl(p.valor) + ' (informe a data de nascimento)' : (p.valor === 0 ? 'Não paga · ' + p.rotulo : brl(p.valor) + ' · ' + p.rotulo);
      el.style.background = p.valor === 0 ? '#E6F4EA' : p.infantil ? '#FFF1E6' : '#EEF5FC';
      el.style.color = p.valor === 0 ? '#1E5B37' : p.infantil ? '#7A3608' : '#0A4D8C';
    });
  }

  function updateSummary() {
    $('bk-parc-wrap').hidden = pagamento !== 'credito';
    precoChips();
    $('bk-sum-left').textContent = (pax === 1 ? '1 passageiro' : pax + ' passageiros') + ' (' + resumoPassageiros() + ')';
    var nomes = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
    $('bk-pay-label').textContent = pagamento === 'credito'
      ? parcelas + 'x de aprox. ' + brl(total() / parcelas)
      : (pagamento ? nomes[pagamento] : 'Escolha o pagamento');
    $('bk-total').textContent = brl(total());
    $('bk-sinal').textContent = brl(total() / 2);
    $('bk-sinal-terms').textContent = brl(total() / 2);
    renderPays();
    if (pagamento === 'credito') renderParcelas();
  }

  function clearMessages() { $('bk-error').hidden = true; }

  function openBooking(v) {
    viagemAtual = v;
    pax = 1; pagamento = ''; parcelas = 1; acomps = [];
    // mantém os dados pessoais já digitados; limpa o resto
    $('bk-obs').value = ''; $('bk-saude').value = '';
    $('bk-form').hidden = false; $('bk-done').hidden = true;
    syncAcomps();
    $('bk-ok').checked = false; $('bk-news').checked = false;
    clearMessages();
    $('bk-trip-name').textContent = v.destino;
    $('bk-trip-meta').textContent = v.data + ' · ' + v.dia + ' · ' + v.obs;
    $('bk-trip-price').textContent = brl(v.valor);
    $('bk-kids').textContent = regraCriancas(v) + (v.soTransporte ? ' ' + v.soTransporte.aviso : '');
    syncContratanteMenor();
    syncNiver();
    $('bk-tipo-wrap').hidden = !v.soTransporte;
    $('bk-tipo').innerHTML = opcoesTipo(v, '');
    updateSummary();
    lastFocus = document.activeElement;
    booking.hidden = false;
    document.body.classList.add('no-scroll');
    var drawer = booking.querySelector('[role="dialog"]');
    drawer.scrollTop = 0;
    setTimeout(function () { $('bk-nome').focus(); }, 50);
  }

  function closeBooking() {
    booking.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $('trip-sections').addEventListener('click', function (e) {
    var b = e.target.closest('[data-reservar]');
    if (b) { openBooking(VIAGENS[+b.getAttribute('data-reservar')]); return; }
    var w = e.target.closest('[data-espera]');
    if (w) {
      var v = VIAGENS[+w.getAttribute('data-espera')];
      window.open(waReserva() + encodeURIComponent('Olá! A excursão para ' + v.destino + ' (' + v.data + ') está esgotada no site. Quero entrar na lista de espera, caso abra uma vaga.'), '_blank', 'noopener');
    }
  });

  booking.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeBooking(); return; }
    var p = e.target.closest('[data-pay]');
    if (p) { pagamento = p.getAttribute('data-pay'); clearMessages(); updateSummary(); return; }
    var q = e.target.closest('[data-parc]');
    if (q) { parcelas = +q.getAttribute('data-parc'); clearMessages(); updateSummary(); }
  });

  booking.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBooking();
  });

  $('bk-add-acomp').addEventListener('click', function () {
    if (acomps.length >= 19) return;
    acomps.push(blankAcomp()); syncAcomps(); clearMessages(); updateSummary();
    var novo = $('bk-a' + acomps.length + '-nome'); if (novo) novo.focus();
  });
  $('bk-acomps').addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]');
    if (!b) return;
    acomps.splice(+b.getAttribute('data-remove'), 1); syncAcomps(); clearMessages(); updateSummary();
  });
  // campos dos acompanhantes
  $('bk-acomps').addEventListener('input', function (e) {
    var el = e.target, i = el.getAttribute('data-a'), k = el.getAttribute('data-k');
    if (i == null || k === 'dif') return;
    if (k === 'cpf' || k === 'rCpf') el.value = maskCpf(el.value);
    if (k === 'rTel') el.value = maskTel(el.value);
    acomps[+i][k] = el.value;
    if (k === 'vinc') $('bk-a' + (+i + 1) + '-resp').hidden = !precisaResp(acomps[+i]);
    if (k === 'nasc' || k === 'tipo') updateSummary();
  });
  $('bk-acomps').addEventListener('focusout', function (e) {
    var el = e.target;
    if (el.getAttribute && /^r?[cC]pf$/.test(el.getAttribute('data-k') || '')) checaCpf(el, null);
  });
  $('bk-acomps').addEventListener('change', function (e) {
    var el = e.target, i = el.getAttribute('data-a');
    if (i == null || el.getAttribute('data-k') !== 'dif') return;
    acomps[+i].dif = el.checked;
    $('bk-a' + (+i + 1) + '-emb-wrap').hidden = !el.checked;
  });
  $('bk-tipo').addEventListener('change', function () { clearMessages(); updateSummary(); });
  $('bk-cpf').addEventListener('input', function (e) { e.target.value = maskCpf(e.target.value); });
  $('bk-tel').addEventListener('input', function (e) { e.target.value = maskTel(e.target.value); });
  $('bk-emg-tel').addEventListener('input', function (e) { e.target.value = maskTel(e.target.value); });
  // aviso de CPF inválido ao sair do campo
  function checaCpf(input, msgEl) {
    var d = digits(input.value);
    var ruim = d.length === 11 && !cpfValido(d);
    input.setAttribute('aria-invalid', ruim ? 'true' : 'false');
    input.style.borderColor = ruim ? '#D9480F' : '';
    if (msgEl) { msgEl.textContent = ruim ? 'Esse CPF não parece válido. Confira os números.' : ''; msgEl.style.color = ruim ? '#B4520A' : ''; }
  }
  $('bk-cpf').addEventListener('blur', function () { checaCpf($('bk-cpf'), $('bk-cpf-msg')); });
  // CEP: preenche rua, bairro e cidade automaticamente (ViaCEP)
  var ultimoCep = '';
  $('bk-cep').addEventListener('input', function (e) {
    e.target.value = maskCep(e.target.value);
    var cep = digits(e.target.value);
    if (cep.length !== 8 || cep === ultimoCep) return;
    ultimoCep = cep;
    var msg = $('bk-cep-msg'); msg.textContent = 'Buscando endereço…'; msg.style.color = '';
    fetch('https://viacep.com.br/ws/' + cep + '/json/').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.erro) { msg.textContent = 'CEP não encontrado. Preencha o endereço abaixo.'; msg.style.color = '#B4520A'; return; }
      if (d.logradouro) $('bk-rua').value = d.logradouro;
      if (d.bairro) $('bk-bairro').value = d.bairro;
      if (d.localidade) $('bk-cidade').value = d.localidade + '/' + d.uf;
      msg.textContent = 'Endereço encontrado. Confira e informe o número.';
      $('bk-num').focus();
    }).catch(function () { msg.textContent = 'Não deu para buscar o CEP agora. Preencha o endereço abaixo.'; msg.style.color = '#B4520A'; });
  });
  booking.addEventListener('input', clearMessages);

  function lerFormulario() {
    return {
      nome: $('bk-nome').value.trim(), cpf: $('bk-cpf').value, rg: $('bk-rg').value.trim(),
      nasc: $('bk-nasc').value, tel: $('bk-tel').value, email: $('bk-email').value.trim(),
      cep: $('bk-cep').value, rua: $('bk-rua').value.trim(), num: $('bk-num').value.trim(),
      comp: $('bk-comp').value.trim(), bairro: $('bk-bairro').value.trim(), cidade: $('bk-cidade').value.trim(),
      emgNome: $('bk-emg-nome').value.trim(), emgTel: $('bk-emg-tel').value,
      embarque: $('bk-emb').value, saude: $('bk-saude').value.trim(), obs: $('bk-obs').value.trim(),
      ok: $('bk-ok').checked, novidades: $('bk-news').checked
    };
  }
  function enderecoTexto(f) {
    return f.rua + ', ' + f.num + (f.comp ? ' - ' + f.comp : '') + ' - ' + f.bairro + ', ' + f.cidade + ' - CEP ' + f.cep;
  }

  $('bk-submit').addEventListener('click', function () {
    var f = lerFormulario();
    var miss = [];
    if (f.nome.split(/\s+/).length < 2) miss.push('nome completo');
    if (!f.rg) miss.push('RG');
    if (!cpfValido(f.cpf)) miss.push(digits(f.cpf).length === 11 ? 'CPF válido' : 'CPF');
    if (!f.nasc) miss.push('data de nascimento');
    else if (contratanteMenor()) {
      var cm = dadosContratanteMenor(f), faltaR = [];
      if (cm.rNome.split(/\s+/).length < 2) faltaR.push('nome');
      if (!cm.rVinc) faltaR.push('se é mãe, pai ou tutor');
      if (!cpfValido(cm.rCpf)) faltaR.push('CPF');
      if (!cm.rRg) faltaR.push('RG');
      if (digits(cm.rTel).length < 10) faltaR.push('telefone');
      faltaR = faltaR.concat(faltaNascEmail(cm));
      if (!cm.vinc) faltaR.push('com quem o menor vai viajar');
      if (faltaR.length) miss.push('responsável pelo contratante menor (' + faltaR.join(', ') + ')');
      else if (cm.vinc === 'junto' && !acomps.some(function (a) { return digits(a.cpf) === digits(cm.rCpf); })) miss.push('adicionar o responsável como acompanhante (com o mesmo CPF)');
      else if (cm.vinc === 'acomp' && !adultosDaReserva(viagemAtual).length) miss.push('um acompanhante maior de idade (o contratante é menor)');
    }
    if (digits(f.tel).length < 10) miss.push('telefone');
    if (digits(f.cep).length !== 8) miss.push('CEP');
    if (!f.rua || !f.num || !f.bairro || !f.cidade) miss.push('endereço (rua, número, bairro e cidade)');
    if (!f.embarque) miss.push('cidade de embarque');
    acomps.forEach(function (a, i) {
      var faltam = [];
      if (a.nome.trim().split(/\s+/).length < 2) faltam.push('nome completo');
      if (!a.rg.trim()) faltam.push('RG');
      if (!cpfValido(a.cpf)) faltam.push(digits(a.cpf).length === 11 ? 'CPF válido' : 'CPF');
      if (!a.nasc) faltam.push('nascimento');
      else if (idadeNaViagem(a.nasc, viagemAtual) < 0) faltam.push('data de nascimento válida');
      if (a.dif && !a.emb.trim()) faltam.push('local de embarque');
      if (ehMenor(a, viagemAtual)) {
        if (!a.vinc) faltam.push('quem é o contratante para o menor');
        else if (precisaResp(a)) {
          if (a.rNome.trim().split(/\s+/).length < 2) faltam.push('nome do responsável');
          if (!a.rVinc) faltam.push('se o responsável é mãe, pai ou tutor');
          if (!cpfValido(a.rCpf)) faltam.push('CPF do responsável');
          if (!a.rRg.trim()) faltam.push('RG do responsável');
          if (digits(a.rTel).length < 10) faltam.push('telefone do responsável');
          faltam = faltam.concat(faltaNascEmail(a, ' do responsável'));
        }
      }
      if (faltam.length) miss.push('acompanhante ' + (i + 1) + ' (' + faltam.join(', ') + ')');
    });
    if (!pagamento) miss.push('forma de pagamento');
    if (!f.ok) miss.push('aceite das condições');
    if (miss.length) {
      $('bk-error').textContent = 'Falta preencher: ' + miss.join('; ') + '.';
      $('bk-error').hidden = false;
      $('bk-error').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var v = viagemAtual, codigo = gerarCodigo(), sinal = total() / 2;
    var prazoSinal = new Date(Date.now() + PRAZO_SINAL_H * 3600000);
    var nomes = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
    var pagTxt = pagamento === 'credito'
      ? 'Cartão de crédito em ' + parcelas + 'x (aprox. ' + brl(total() / parcelas) + ' cada, mais a taxa do cartão)'
      : nomes[pagamento];
    var lines = [
      '*NOVA RESERVA - BORA ALI EXCURSÕES*',
      '*Código:* ' + codigo, '',
      '*Destino:* ' + v.destino,
      '*Data:* ' + v.data + ' (' + v.dia + ')',
      '*Valor por pessoa:* ' + brl(v.valor),
      '*Passageiros:* ' + pax + ' (' + resumoPassageiros() + ')',
      '*Total:* ' + brl(total()), '',
      '*CONTRATANTE*',
      'Nome: ' + f.nome,
      'RG: ' + f.rg,
      'CPF: ' + f.cpf,
      'Nascimento: ' + comIdade(f.nasc),
      'Endereço: ' + enderecoTexto(f),
      'Telefone: ' + f.tel
    ];
    var cMenor = contratanteMenor() ? dadosContratanteMenor(f) : null;
    if (cMenor) {
      lines.push('*Contratante menor de idade (' + idadeNaViagem(f.nasc, v) + ' anos na viagem)*',
        'Responsável legal: ' + textoResp(cMenor),
        'Viaja com: ' + AUT.VIAJA_COM[cMenor.vinc].toLowerCase(),
        'Autorização: ' + textoAutorizacao(cMenor, f, v));
    }
    if ($('bk-tipo').value && v.soTransporte) lines.push('Valor: ' + brl(precosDaReserva()[0].valor) + ' - ' + precosDaReserva()[0].rotulo);
    if (f.email) lines.push('E-mail: ' + f.email);
    lines.push('Embarque: ' + f.embarque);
    if (f.emgNome || f.emgTel) lines.push('Contato de emergência: ' + [f.emgNome, f.emgTel].filter(Boolean).join(' - '));
    acomps.forEach(function (a, i) {
      var pp = precoAcomp(v, a);
      lines.push('', '*ACOMPANHANTE ' + (i + 1) + '*',
        'Nome: ' + a.nome.trim(), 'RG: ' + a.rg.trim(), 'CPF: ' + a.cpf, 'Nascimento: ' + comIdade(a.nasc),
        'Valor: ' + (pp.valor === 0 ? 'não paga - ' + pp.rotulo : brl(pp.valor) + ' - ' + pp.rotulo),
        'Embarque: ' + (a.dif ? a.emb.trim() : 'mesmo do contratante (' + f.embarque + ')'));
      if (ehMenor(a, v)) {
        lines.push('Menor de idade: contratante é ' + VINCULOS[a.vinc].toLowerCase());
        if (precisaResp(a)) lines.push('Responsável legal: ' + textoResp({ rNome: a.rNome.trim(), rVinc: a.rVinc, rNasc: a.rNasc, rCpf: a.rCpf, rRg: a.rRg.trim(), rTel: a.rTel, rEmail: a.rEmail.trim() }));
        lines.push('Autorização: ' + textoAutorizacao(a, f, v));
      }
    });
    var niver = [];
    if (niverNoMes(f.nasc, v)) niver.push(f.nome + ' (' + AUT.dataBr(f.nasc).slice(0, 5) + ')');
    acomps.forEach(function (a) { if (niverNoMes(a.nasc, v)) niver.push(a.nome.trim() + ' (' + AUT.dataBr(a.nasc).slice(0, 5) + ')'); });
    if (niver.length) lines.push('', '*🎂 ANIVERSARIANTE DO MÊS:* ' + niver.join(', '), 'Quero saber as condições do desconto de aniversário.');
    if (f.saude) lines.push('', '*Necessidades / saúde:* ' + f.saude);
    lines.push('', '*PAGAMENTO*',
      'Forma: ' + pagTxt,
      'Sinal para reservar (50%): ' + brl(sinal),
      'Prazo para pagar o sinal: ' + ateQuando(prazoSinal) + ' (depois disso a vaga é liberada)',
      '',
      '_Reserva realizada mediante sinal de 50% do valor. Em caso de cancelamento, não haverá estorno. Pagamento concluído antes do passeio._');
    if (f.obs) lines.push('', '*Observações:* ' + f.obs);
    lines.push('', 'Aceita receber novidades: ' + (f.novidades ? 'Sim' : 'Não'));

    var numero = NUMEROS[Math.floor(Math.random() * NUMEROS.length)];
    var link = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(lines.join('\n'));
    window.open(link, '_blank', 'noopener');

    // envia também para a planilha (se configurada)
    if (PLANILHA) {
      var dados = {
        tipo: 'reserva', codigo: codigo, atendente: numero,
        viagem: { id: v.id, destino: v.destino, data: v.data, dia: v.dia, valor: v.valor },
        contratante: {
          nome: f.nome, rg: f.rg, cpf: f.cpf, nascimento: fmtDate(f.nasc), idade: idade(f.nasc), telefone: f.tel, email: f.email,
          endereco: enderecoTexto(f), cep: f.cep, cidade: f.cidade, embarque: f.embarque,
          emergenciaNome: f.emgNome, emergenciaTelefone: f.emgTel, valor: precosDaReserva()[0].valor,
          autorizacao: cMenor ? 'Menor: autorização ' + textoAutorizacao(cMenor, f, v) : '',
          menor: cMenor ? { vinculo: cMenor.vinc, responsavel: { nome: cMenor.rNome, papel: cMenor.rVinc, cpf: cMenor.rCpf, rg: cMenor.rRg, telefone: cMenor.rTel, nascimento: AUT.dataBr(cMenor.rNasc), email: cMenor.rEmail } } : null
        },
        acompanhantes: acomps.map(function (a) {
          return { nome: a.nome.trim(), rg: a.rg.trim(), cpf: a.cpf, nascimento: fmtDate(a.nasc), idade: idade(a.nasc),
            valor: precoAcomp(v, a).valor,
            autorizacao: ehMenor(a, v) ? 'Menor: autorização ' + textoAutorizacao(a, f, v) : '',
            menor: ehMenor(a, v) ? { vinculo: a.vinc, responsavel: precisaResp(a) ? { nome: a.rNome.trim(), papel: a.rVinc, cpf: a.rCpf, rg: a.rRg.trim(), telefone: a.rTel, nascimento: AUT.dataBr(a.rNasc), email: a.rEmail.trim() } : null } : null,
            embarque: a.dif ? a.emb.trim() : f.embarque };
        }),
        pagamento: { forma: nomes[pagamento], parcelas: pagamento === 'credito' ? parcelas : 1, total: total(), sinal: sinal },
        saude: f.saude, observacoes: f.obs, aceitaNovidades: f.novidades, prazoSinal: prazoSinal.toISOString()
      };
      try {
        // a planilha devolve o link de pagamento do sinal e o prazo dele
        fetch(PLANILHA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d && d.ok) atualizaSinal({ link: d.link || '', prazo: d.prazo ? new Date(d.prazo) : null }); })
          .catch(function () { /* sem resposta: segue com o prazo do site e o Pix */ });
      } catch (err) { /* a reserva já foi pelo WhatsApp */ }
      ocupadas[v.id] = (ocupadas[v.id] || 0) + pax;
    }

    // modo demonstração: guarda a reserva neste navegador para aparecer em /demo/planilha
    if (DEMO) {
      try {
        var agora = new Date(), hora = ('0' + agora.getDate()).slice(-2) + '/' + ('0' + (agora.getMonth() + 1)).slice(-2) + ' ' +
          ('0' + agora.getHours()).slice(-2) + ':' + ('0' + agora.getMinutes()).slice(-2);
        var rDemo = reservaAut(codigo, v, f); rDemo.adultos = adultosDaReserva(v);
        var linhasDemo = [{ hora: hora, codigo: codigo, destino: v.destino, data: v.data, tipo: 'Contratante', nome: f.nome, status: 'Aguardando sinal', prazo: prazoSinal.toISOString(), telefone: f.tel,
          embarque: f.embarque, pagamento: pagamento === 'credito' ? 'Crédito ' + parcelas + 'x' : nomes[pagamento], total: brl(total()), sinal: brl(sinal) }];
        if (cMenor) linhasDemo[0].aut = { r: rDemo, a: cMenor, entregue: false };
        acomps.forEach(function (a) {
          var id = idade(a.nasc);
          var linhaA = { hora: hora, codigo: codigo, destino: v.destino, data: v.data, tipo: 'Acompanhante', status: 'Aguardando sinal',
            nome: a.nome.trim() + (id != null && id < 12 ? ' (' + id + ' anos)' : ''), embarque: a.dif ? a.emb.trim() : f.embarque, pagamento: '', total: '', sinal: '' };
          if (ehMenor(a, v)) linhaA.aut = { r: rDemo, a: Object.assign({}, a), entregue: false };
          linhasDemo.push(linhaA);
        });
        var guardadas = JSON.parse(localStorage.getItem('boraDemoReservas') || '[]');
        localStorage.setItem('boraDemoReservas', JSON.stringify(linhasDemo.concat(guardadas).slice(0, 60)));
      } catch (err) { /* navegador sem armazenamento: só não aparece na planilha de demonstração */ }
    }
    $('bk-demo-planilha').hidden = !DEMO;
    $('bk-demo-planilha').href = '/demo/planilha?busca=' + encodeURIComponent(codigo);

    // tela de reserva concluída
    $('bk-code').textContent = codigo; $('bk-code2').textContent = codigo;
    ultimaReserva = reservaAut(codigo, v, f); ultimaReserva.adultos = adultosDaReserva(v);
    ultimosAcomps = (cMenor ? [cMenor] : []).concat(acomps.filter(function (a) { return ehMenor(a, v); }).map(function (a) { return Object.assign({}, a); }));
    var menores = ultimosAcomps;
    $('bk-aut').hidden = !menores.length;
    $('bk-aut-list').innerHTML = menores.map(function (a, n) {
      return '<button type="button" data-aut="' + n + '" class="btn" style="font-family: inherit; cursor: pointer; border: none; background: #F47B20; color: #06284D; font-weight: 800; font-size: 15px; padding: 12px 18px; border-radius: 999px; min-height: 48px">Imprimir autorização de ' + esc(a.nome.trim().split(/\s+/)[0]) + (exigeFirma(a, v) ? ' (firma reconhecida)' : '') + '</button>';
    }).join('') + (menores.length > 1 ? '<button type="button" data-aut="todas" class="btn" style="font-family: inherit; cursor: pointer; border: 2px solid #F47B20; background: #FFFFFF; color: #7A3608; font-weight: 800; font-size: 15px; padding: 10px 18px; border-radius: 999px; min-height: 48px">Imprimir todas</button>' : '');
    $('bk-reopen').href = link;
    var temPix = !!String(PIX.chave || '').trim();
    $('bk-pix-block').hidden = !temPix; $('bk-pix-none').hidden = temPix;
    $('bk-done-sinal').textContent = brl(sinal); $('bk-done-sinal2').textContent = brl(sinal);
    if (temPix) { $('bk-pix-code').value = pixCopiaECola(sinal, codigo); $('bk-pix-key').textContent = PIX.chave; }
    $('bk-copy').textContent = 'Copiar código Pix';
    $('bk-pix-demo').hidden = !DEMO;
    $('bk-form').hidden = true; $('bk-done').hidden = false;
    booking.querySelector('[role="dialog"]').scrollTop = 0;
    $('bk-done-title').focus();
    iniciaSinal({ codigo: codigo, destino: v.destino, sinal: sinal, prazo: prazoSinal, link: DEMO ? '#demo' : '', status: 'Aguardando sinal' });
  });

  // ---------- SINAL: prazo do link de pagamento, contador e confirmação automática ----------
  var sinalAtual = null, sinalTimer = null, sinalPoll = null;
  function duas(n) { return ('0' + n).slice(-2); }
  function ateQuando(d) { return 'até ' + duas(d.getDate()) + '/' + duas(d.getMonth() + 1) + ' às ' + duas(d.getHours()) + ':' + duas(d.getMinutes()); }
  function contador(ms) {
    if (ms <= 0) return '00:00:00';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? d + 'd ' : '') + duas(h) + ':' + duas(m) + ':' + duas(s % 60);
  }
  function guardaPendente(st) {
    try {
      if (!st || st.status !== 'Aguardando sinal' || DEMO) localStorage.removeItem('boraSinalPendente');
      else localStorage.setItem('boraSinalPendente', JSON.stringify({ codigo: st.codigo, destino: st.destino, sinal: st.sinal, prazo: st.prazo.toISOString(), link: st.link }));
    } catch (e) { /* sem armazenamento: só não aparece o aviso ao voltar */ }
  }
  function statusDemo(codigo) {
    try { var l = JSON.parse(localStorage.getItem('boraDemoReservas') || '[]'); for (var i = 0; i < l.length; i++) if (l[i].codigo === codigo && l[i].tipo === 'Contratante') return l[i]; } catch (e) {}
    return null;
  }
  function consultaStatus(st, pronto) {
    if (DEMO) { var r = statusDemo(st.codigo); if (r) pronto({ status: r.status || 'Aguardando sinal', prazo: r.prazo ? new Date(r.prazo) : null }); return; }
    if (!PLANILHA) return;
    fetch(PLANILHA + (PLANILHA.indexOf('?') < 0 ? '?' : '&') + 'acao=status&codigo=' + encodeURIComponent(st.codigo))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) pronto({ status: d.status, prazo: d.prazo ? new Date(d.prazo) : null, link: d.link }); })
      .catch(function () {});
  }
  function pintaSinal() {
    var st = sinalAtual; if (!st) return;
    var box = $('bk-sinalbox'), resta = st.prazo - Date.now();
    var pago = st.status === 'Sinal pago' || st.status === 'Pago';
    var vencido = !pago && (st.status === 'Prazo vencido' || st.status === 'Cancelada' || resta <= 0);
    box.style.background = pago ? '#1E5B37' : vencido ? '#7A3608' : '#06284D';
    $('bk-sinal-titulo').textContent = pago ? 'Reserva confirmada!' : vencido ? 'Prazo do sinal encerrado' : 'Pague o sinal de ' + brl(st.sinal) + ' para garantir a sua vaga';
    $('bk-cont').textContent = pago ? (st.status === 'Pago' ? 'Tudo pago ✓' : 'Sinal pago ✓') : contador(resta);
    $('bk-cont-ate').textContent = pago || vencido ? '' : 'restam · ' + ateQuando(st.prazo);
    var temLink = !!st.link && !pago && !vencido;
    $('bk-paylink').hidden = !temLink;
    $('bk-paylink').href = st.link && st.link !== '#demo' ? st.link : '#';
    $('bk-paylink').textContent = 'Pagar o sinal de ' + brl(st.sinal) + ' pelo link' + (st.link === '#demo' ? ' (demonstração)' : '');
    $('bk-demo-pagar').hidden = !DEMO || pago || vencido;
    $('bk-sinal-status').textContent = pago
      ? 'Recebemos o pagamento e a sua vaga está garantida. A Bora Ali manda a confirmação no WhatsApp.'
      : vencido
        ? 'A vaga foi liberada. Se você já pagou, mande o comprovante no WhatsApp com o código ' + st.codigo + '.'
        : (st.link ? 'Pelo link (Pix ou cartão), a confirmação é automática e esta tela atualiza sozinha.'
          : (String(PIX.chave || '').trim() ? 'Pague por Pix abaixo e mande o comprovante no WhatsApp.' : 'A Bora Ali manda os dados para pagamento no WhatsApp. Pague e mande o comprovante.') +
            (PLANILHA ? ' Quando a Bora Ali confirmar, esta tela atualiza sozinha.' : ''));
    if (pago || vencido) { clearInterval(sinalTimer); clearInterval(sinalPoll); }
    guardaPendente(pago || vencido ? null : st);
  }
  function atualizaSinal(novo) {
    if (!sinalAtual) return;
    if (novo.link) sinalAtual.link = novo.link;
    if (novo.prazo && !isNaN(novo.prazo)) sinalAtual.prazo = novo.prazo;
    if (novo.status) sinalAtual.status = novo.status;
    pintaSinal();
  }
  function iniciaSinal(st) {
    sinalAtual = st;
    clearInterval(sinalTimer); clearInterval(sinalPoll);
    sinalTimer = setInterval(pintaSinal, 1000);
    sinalPoll = setInterval(function () { consultaStatus(sinalAtual, atualizaSinal); }, 15000);
    pintaSinal();
  }
  $('bk-paylink').addEventListener('click', function (e) {
    if (sinalAtual && sinalAtual.link === '#demo') { e.preventDefault(); $('bk-sinal-status').textContent = 'Na versão final, este botão abre a página de pagamento do banco (Pix ou cartão). Use "Simular pagamento aprovado" para ver a confirmação.'; }
  });
  $('bk-demo-pagar').addEventListener('click', function () {
    if (!sinalAtual) return;
    try {
      var l = JSON.parse(localStorage.getItem('boraDemoReservas') || '[]');
      l.forEach(function (r) { if (r.codigo === sinalAtual.codigo) { r.status = 'Sinal pago'; if (r.tipo === 'Contratante') r.pagoEm = new Date().toISOString(); } });
      localStorage.setItem('boraDemoReservas', JSON.stringify(l));
    } catch (e) {}
    atualizaSinal({ status: 'Sinal pago' });
  });
  // a planilha de demonstração (outra aba) mudou o status
  window.addEventListener('storage', function (e) {
    if (e.key === 'boraDemoReservas' && sinalAtual && DEMO) consultaStatus(sinalAtual, atualizaSinal);
  });

  // aviso no topo quando o cliente volta ao site com sinal pendente
  (function () {
    var p = null;
    try { p = JSON.parse(localStorage.getItem('boraSinalPendente') || 'null'); } catch (e) {}
    if (!p || DEMO) return;
    var st = { codigo: p.codigo, destino: p.destino, sinal: p.sinal, prazo: new Date(p.prazo), link: p.link, status: 'Aguardando sinal' };
    if (!(st.prazo - Date.now() > 0)) { guardaPendente(null); return; }
    var ban = $('sinal-banner'), t;
    function pinta() {
      var resta = st.prazo - Date.now();
      if (resta <= 0 || st.status !== 'Aguardando sinal') { ban.hidden = true; clearInterval(t); guardaPendente(null); return; }
      $('sinal-banner-txt').textContent = 'Reserva ' + st.codigo + ' (' + st.destino + '): faltam ' + contador(resta) + ' para pagar o sinal de ' + brl(st.sinal) + '.';
      $('sinal-banner-pagar').hidden = !st.link;
      if (st.link) $('sinal-banner-pagar').href = st.link;
    }
    ban.hidden = false; pinta(); t = setInterval(pinta, 1000);
    consultaStatus(st, function (d) { if (d.status) st.status = d.status; if (d.link) st.link = d.link; pinta(); });
    $('sinal-banner-fechar').addEventListener('click', function () { ban.hidden = true; clearInterval(t); });
  })();

  $('bk-aut-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-aut]'); if (!b || !ultimaReserva) return;
    var menores = ultimosAcomps;
    var k = b.getAttribute('data-aut');
    imprimirAutorizacoes(k === 'todas' ? menores : [menores[+k]]);
  });
  $('bk-copy').addEventListener('click', function () {
    var ta = $('bk-pix-code'), btn = this;
    function ok() { btn.textContent = 'Código copiado!'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(ok, function () { ta.select(); document.execCommand('copy'); ok(); });
    else { ta.select(); document.execCommand('copy'); ok(); }
  });
  $('bk-new').addEventListener('click', function () { closeBooking(); var t = $('destinos'); if (t) t.scrollIntoView({ behavior: 'smooth' }); });

  // ---------- link de avaliação no rodapé ----------
  if (CONFIG.linkAvaliacao) { $('link-avaliacao').href = CONFIG.linkAvaliacao; $('link-avaliacao').hidden = false; }

  // ---------- agenda e vagas pela planilha ----------
  function slugMes(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function carregarPlanilha() {
    if (!PLANILHA) return;
    fetch(PLANILHA + (PLANILHA.indexOf('?') < 0 ? '?' : '&') + 'acao=agenda').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) return;
      if (d.ocupadas) ocupadas = d.ocupadas;
      if (d.viagens && d.viagens.length) {
        var meses = [], vistos = {};
        VIAGENS = d.viagens.map(function (v) {
          var label = String(v.mes || '').trim(), id = slugMes(label);
          if (label && !vistos[id]) { vistos[id] = 1; meses.push({ id: id, label: label }); }
          return { id: String(v.id), data: String(v.data), dia: String(v.dia || ''), destino: String(v.destino),
            categoria: String(v.categoria || 'passeios'), valor: Number(v.valor) || 0, obs: String(v.obs || ''),
            selo: String(v.selo || ''), mes: id, cena: String(v.cena || ''),
            vagas: (v.vagas === '' || v.vagas == null) ? null : Number(v.vagas) };
        });
        MESES = meses;
        if (mesAtual !== 'todos' && !vistos[mesAtual]) mesAtual = 'todos';
      }
      renderAll();
    }).catch(function () { /* sem planilha: fica a agenda do data.js */ });
  }

  renderAll();
  carregarPlanilha();
})();
