/* =========================================================
   Bora Ali Excursões — comportamento do site
   - monta categorias, seções e cards a partir de data.js
   - filtro por mês
   - aba de reserva que envia o cadastro pronto pelo WhatsApp
   ========================================================= */
(function () {
  'use strict';

  var CONFIG = window.BORA_CONFIG || {};
  var MESES = window.BORA_MESES || [];
  var VIAGENS = window.BORA_VIAGENS || [];
  var ART = window.BORA_ART || { ICONS: {}, BANDS: {}, SCENES: {} };
  var WA = 'https://wa.me/' + (CONFIG.whatsapp || '5511974882023') + '?text=';
  var MAX_PARCELAS = Math.max(1, Math.min(12, parseInt(CONFIG.maxParcelas, 10) || 10));

  var CATEGORIAS = [
    { id: 'fins-de-semana', key: 'fds', kicker: 'VIAGENS DE 2 A 4 DIAS', title: 'Fins de semana', subtitle: 'Mais tempo para aproveitar cada destino', band: '#0A4D8C', bandInk: '#FFFFFF', tileBg: '#0A4D8C', tileInk: '#FFFFFF', anim: 'r-zoom' },
    { id: 'praias', key: 'praia', kicker: 'BATE E VOLTA', title: 'Praias', subtitle: 'Litoral paulista e Rio de Janeiro', band: '#1B8EDB', bandInk: '#06284D', tileBg: '#E2F1FC', tileInk: '#0A6BB0', anim: 'r-up' },
    { id: 'parques', key: 'parques', kicker: 'DIVERSÃO GARANTIDA', title: 'Parques e águas termais', subtitle: 'Brinquedos, piscinas e muita risada', band: '#F47B20', bandInk: '#06284D', tileBg: '#FFEADB', tileInk: '#B4520A', anim: 'r-pop' },
    { id: 'natureza', key: 'natureza', kicker: 'SERRA E MONTANHA', title: 'Natureza', subtitle: 'Mirantes, flores e ar puro', band: '#06284D', bandInk: '#FFFFFF', tileBg: '#E7EEF6', tileInk: '#06284D', anim: 'r-left' },
    { id: 'passeios', key: 'passeios', kicker: 'CULTURA, FÉ E COMPRAS', title: 'Passeios', subtitle: 'Zoológico, Aparecida, Serra Negra e mais', band: '#FFF1E6', bandInk: '#06284D', tileBg: '#FFF1E6', tileInk: '#B4520A', anim: 'r-flip' }
  ];

  var PAGAMENTOS = [
    { id: 'pix', label: 'Pix', sub: 'À vista' },
    { id: 'credito', label: 'Cartão de crédito', sub: 'Até ' + MAX_PARCELAS + 'x' },
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
      return '<a class="tile" href="#' + c.id + '" style="display: flex; flex-direction: column; gap: 12px; text-decoration: none; color: #0F1B2D; border: 2px solid #E4EDF6; border-radius: 20px; padding: 18px; background: #FFFFFF">' +
        '<span style="width: 48px; height: 48px; border-radius: 14px; background: ' + c.tileBg + '; color: ' + c.tileInk + '; display: flex; align-items: center; justify-content: center">' + (ART.ICONS[c.key] || '') + '</span>' +
        '<span style="display: flex; flex-direction: column; gap: 2px">' +
        '<span style="font-family: \'Poppins\', sans-serif; font-weight: 600; font-size: 17px">' + esc(c.title) + '</span>' +
        '<span style="font-size: 14px; color: #55657A">' + count + ' · a partir de ' + (list.length ? brl(min) : '—') + '</span>' +
        '</span></a>';
    }).join('');
  }

  // ---------- card de viagem ----------
  function cardHTML(v, cat) {
    var idx = VIAGENS.indexOf(v);
    var badge = v.selo ? '<span style="font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px; background: #F47B20; color: #06284D">' + esc(v.selo) + '</span>' : '';
    return '<article class="card ' + cat.anim + '" style="border: 1px solid #E4EDF6; border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; background: #FFFFFF">' +
      '<div style="position: relative; height: 128px; background: #E2F1FC; overflow: hidden">' + (ART.SCENES[v.cena] || GENERIC_SCENE) +
      '<div style="position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px">' +
      '<span style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; color: #0A4D8C; box-shadow: 0 2px 8px rgba(6,40,77,0.15); font-weight: 700; font-size: 14px; padding: 7px 12px; border-radius: 999px">' +
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>' +
      esc(v.data) + ' · ' + esc(v.dia) + '</span>' + badge + '</div></div>' +
      '<div style="padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 16px; flex-grow: 1">' +
      '<div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1">' +
      '<h3 style="font-family: \'Poppins\', sans-serif; margin: 0; font-weight: 600; font-size: 21px; color: #0F1B2D">' + esc(v.destino) + '</h3>' +
      '<span style="font-size: 14px; color: #55657A">' + esc(v.obs) + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #E4EDF6; padding-top: 14px">' +
      '<div style="display: flex; flex-direction: column; line-height: 1.15"><span style="font-size: 12px; font-weight: 600; color: #55657A">por pessoa</span>' +
      '<span style="font-family: \'Poppins\', sans-serif; font-weight: 700; font-size: 22px; color: #0A4D8C">' + brl(v.valor) + '</span></div>' +
      '<button type="button" class="btn" data-reservar="' + idx + '" aria-label="Reservar ' + esc(v.destino) + ' em ' + esc(v.data) + '" style="font-family: inherit; border: none; cursor: pointer; background: #F47B20; color: #06284D; font-weight: 700; font-size: 15px; padding: 10px 18px; border-radius: 999px; min-height: 44px; display: inline-flex; align-items: center">Reservar</button>' +
      '</div></div></article>';
  }

  // ---------- seções ----------
  function renderSections() {
    $('trip-sections').innerHTML = CATEGORIAS.map(function (c) {
      var list = viagensDe(c);
      var cards = list.map(function (v) { return cardHTML(v, c); }).join('');
      var empty = list.length ? '' : '<p style="margin: 0; font-size: 15px; color: #55657A; background: #EEF5FC; border-radius: 16px; padding: 16px 18px">Sem saídas desta categoria no mês escolhido. Troque o mês lá em cima ou chame a gente no WhatsApp.</p>';
      return '<section id="' + c.id + '" style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 8px; display: flex; flex-direction: column; gap: 24px; scroll-margin-top: 80px">' +
        '<div style="background: ' + c.band + '; color: ' + c.bandInk + '; border-radius: 28px; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 0 0 0 clamp(24px, 4vw, 44px); min-height: 170px">' +
        '<div style="flex: 999 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 28px 0">' +
        '<span style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; opacity: 0.9">' + esc(c.kicker) + '</span>' +
        '<h2 style="font-family: \'Poppins\', sans-serif; margin: 0; font-weight: 700; font-size: clamp(28px, 3.4vw, 40px); line-height: 1.1">' + esc(c.title) + '</h2>' +
        '<span style="font-size: 16px; opacity: 0.92">' + esc(c.subtitle) + '</span></div>' +
        '<div style="flex: 1 1 260px; max-width: 320px; height: 170px; position: relative">' + (ART.BANDS[c.key] || '') + '</div></div>' +
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

  // cidades de embarque
  $('bk-emb').innerHTML = '<option value="">Selecione</option>' + (CONFIG.cidadesEmbarque || []).map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');

  function total() { return (viagemAtual ? viagemAtual.valor : 0) * pax; }

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

  function updateSummary() {
    $('bk-pax').textContent = pax;
    $('bk-acomp-wrap').hidden = pax < 2;
    $('bk-parc-wrap').hidden = pagamento !== 'credito';
    $('bk-sum-left').textContent = pax + ' × ' + brl(viagemAtual ? viagemAtual.valor : 0);
    var nomes = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
    $('bk-pay-label').textContent = pagamento === 'credito'
      ? parcelas + 'x de aprox. ' + brl(total() / parcelas)
      : (pagamento ? nomes[pagamento] : 'Escolha o pagamento');
    $('bk-total').textContent = brl(total());
    renderPays();
    if (pagamento === 'credito') renderParcelas();
  }

  function clearMessages() { $('bk-error').hidden = true; $('bk-sent').hidden = true; }

  function openBooking(v) {
    viagemAtual = v;
    pax = 1; pagamento = ''; parcelas = 1;
    // mantém os dados pessoais já digitados; limpa o resto
    ['bk-acomp', 'bk-obs'].forEach(function (id) { $(id).value = ''; });
    $('bk-ok').checked = false;
    clearMessages();
    $('bk-trip-name').textContent = v.destino;
    $('bk-trip-meta').textContent = v.data + ' · ' + v.dia + ' · ' + v.obs;
    $('bk-trip-price').textContent = brl(v.valor);
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
    if (b) openBooking(VIAGENS[+b.getAttribute('data-reservar')]);
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

  $('bk-pax-up').addEventListener('click', function () { pax = Math.min(20, pax + 1); clearMessages(); updateSummary(); });
  $('bk-pax-down').addEventListener('click', function () { pax = Math.max(1, pax - 1); clearMessages(); updateSummary(); });
  $('bk-cpf').addEventListener('input', function (e) { e.target.value = maskCpf(e.target.value); });
  $('bk-tel').addEventListener('input', function (e) { e.target.value = maskTel(e.target.value); });
  booking.addEventListener('input', clearMessages);

  $('bk-submit').addEventListener('click', function () {
    var f = {
      nome: $('bk-nome').value.trim(), cpf: $('bk-cpf').value, rg: $('bk-rg').value.trim(),
      nasc: $('bk-nasc').value, tel: $('bk-tel').value, email: $('bk-email').value.trim(),
      embarque: $('bk-emb').value, acomp: $('bk-acomp').value.trim(), obs: $('bk-obs').value.trim(),
      ok: $('bk-ok').checked
    };
    var miss = [];
    if (f.nome.split(/\s+/).length < 2) miss.push('nome completo');
    if (digits(f.cpf).length !== 11) miss.push('CPF');
    if (!f.rg) miss.push('RG');
    if (!f.nasc) miss.push('data de nascimento');
    if (digits(f.tel).length < 10) miss.push('telefone');
    if (!f.embarque) miss.push('cidade de embarque');
    if (pax > 1 && !f.acomp) miss.push('dados dos acompanhantes');
    if (!pagamento) miss.push('forma de pagamento');
    if (!f.ok) miss.push('autorização de envio');
    if (miss.length) {
      $('bk-sent').hidden = true;
      $('bk-error').textContent = 'Falta preencher: ' + miss.join(', ') + '.';
      $('bk-error').hidden = false;
      return;
    }
    var nomes = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
    var pagTxt = pagamento === 'credito'
      ? 'Cartão de crédito em ' + parcelas + 'x (aprox. ' + brl(total() / parcelas) + ' cada)'
      : nomes[pagamento];
    var v = viagemAtual;
    var lines = [
      '*NOVA RESERVA - BORA ALI EXCURSÕES*', '',
      '*Viagem:* ' + v.destino + ' (' + v.data + ' - ' + v.dia + ')',
      '*Valor por pessoa:* ' + brl(v.valor),
      '*Passageiros:* ' + pax,
      '*Total estimado:* ' + brl(total()), '',
      '*Nome:* ' + f.nome,
      '*CPF:* ' + f.cpf,
      '*RG:* ' + f.rg,
      '*Nascimento:* ' + fmtDate(f.nasc),
      '*Telefone:* ' + f.tel
    ];
    if (f.email) lines.push('*E-mail:* ' + f.email);
    lines.push('*Embarque:* ' + f.embarque);
    if (pax > 1) lines.push('*Acompanhantes:* ' + f.acomp);
    lines.push('', '*Pagamento:* ' + pagTxt);
    if (f.obs) lines.push('*Observações:* ' + f.obs);
    window.open(WA + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    $('bk-error').hidden = true;
    $('bk-sent').hidden = false;
  });

  renderAll();
})();
