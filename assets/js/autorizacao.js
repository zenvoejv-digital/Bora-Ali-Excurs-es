/* Bora Ali Excursões — autorização de viagem para menor de idade.
   Usado pelo site (depois da reserva) e pela planilha de demonstração (/demo/planilha).
   A planilha Google tem a mesma lógica em google-apps-script/Codigo.gs. */
(function () {
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

  // pares = [[reserva, acompanhante], ...]
  function imprimir(pares) {
    if (!pares.length) return;
    if (!document.getElementById('aut-print-css')) {
      var st = document.createElement('style'); st.id = 'aut-print-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var el = document.getElementById('aut-print');
    if (!el) { el = document.createElement('div'); el.id = 'aut-print'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    el.innerHTML = pares.map(function (p) { return html(p[0], p[1]); }).join('');
    document.body.classList.add('imprimindo');
    var fim = function () { document.body.classList.remove('imprimindo'); window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim);
    window.print();
    setTimeout(fim, 1500);
  }

  window.BoraAut = { VINCULOS: VINCULOS, PAPEIS: PAPEIS, VIAJA_COM: VIAJA_COM, idade: idade, ehMenor: ehMenor, precisaResp: precisaResp,
    exigeFirma: exigeFirma, quemAssina: quemAssina, texto: texto, html: html, imprimir: imprimir, dataBr: dataBr };
})();
