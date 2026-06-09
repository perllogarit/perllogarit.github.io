"use strict";

const CALC_NAME = 'tvsh';

let currency = 'ALL';
let rate     = 0.20;
let mode     = 'add';

function setRate(r) {
  rate = r;
  document.getElementById('btn-20').classList.toggle('active', r === 0.20);
  document.getElementById('btn-6').classList.toggle('active',  r === 0.06);
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: (r * 100) + '%' });
  calculate();
}

function setMode(m) {
  mode = m;
  document.getElementById('btn-add').classList.toggle('active', m === 'add');
  document.getElementById('btn-sub').classList.toggle('active', m === 'sub');
  document.getElementById('price-label').textContent = m === 'add' ? 'Çmimi pa TVSH' : 'Çmimi me TVSH';
  document.getElementById('price-input').placeholder = 'p.sh. 67 420';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: m });
  calculate();
}

function setCurrency(c) {
  currency = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('currency-unit').textContent = c;
  document.getElementById('price-input').placeholder = 'p.sh. 67 420';
  PL.toggleEurNote(c);

  const qa = document.getElementById('quick-amounts');
  if (c === 'ALL') {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(1000)">1,000</button>'
      + '<button class="quick-btn" onclick="setAmount(5000)">5,000</button>'
      + '<button class="quick-btn" onclick="setAmount(10000)">10,000</button>'
      + '<button class="quick-btn" onclick="setAmount(50000)">50,000</button>';
  } else {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(10)">10</button>'
      + '<button class="quick-btn" onclick="setAmount(50)">50</button>'
      + '<button class="quick-btn" onclick="setAmount(100)">100</button>'
      + '<button class="quick-btn" onclick="setAmount(500)">500</button>';
  }
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

function setAmount(val) {
  document.getElementById('price-input').value = val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: String(val) });
  calculate();
}

function calculate() {
  const input = parseFloat(document.getElementById('price-input').value);
  const rPct  = (rate * 100) + '%';

  if (!input || input <= 0 || isNaN(input)) {
    document.getElementById('res-green-val').innerHTML = '';
    document.getElementById('res-red-val').innerHTML   = '';
    document.getElementById('breakdown-body').innerHTML  = '';
    return;
  }

  const baseALL = PL.toALL(input, currency);

  let priceWithout, priceWith, tvsh;
  if (mode === 'add') {
    priceWithout = baseALL;
    tvsh         = baseALL * rate;
    priceWith    = baseALL + tvsh;
  } else {
    priceWith    = baseALL;
    priceWithout = baseALL / (1 + rate);
    tvsh         = baseALL - priceWithout;
  }

  const greenVal   = mode === 'add' ? priceWith    : priceWithout;
  const greenTitle = mode === 'add' ? 'ÇMIMI ME TVSH' : 'ÇMIMI PA TVSH';
  const greenSub   = mode === 'add'
    ? 'Çmimi total që paguan klienti'
    : 'Çmimi neto pa tatim';

  const eurEquivGreen = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(greenVal) + '</span>' : '';
  const eurEquivTvsh  = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(tvsh) + '</span>' : '';

  document.getElementById('res-green-title').textContent = greenTitle;
  document.getElementById('res-green-sub').textContent   = greenSub;
  document.getElementById('res-green-val').innerHTML     = PL.fmtALL(greenVal) + eurEquivGreen;
  document.getElementById('res-red-title').textContent   = 'TVSH ' + rPct;
  document.getElementById('res-red-val').innerHTML       = PL.fmtALL(tvsh) + eurEquivTvsh;
  gtrack('calculate', { calculator: CALC_NAME, mode: mode, currency: currency });

  document.getElementById('breakdown-body').innerHTML = `
    <tr>
      <td>Çmimi pa TVSH</td>
      <td></td>
      <td>${PL.fmtALL(priceWithout)}</td>
    </tr>
    <tr class="row-add">
      <td>TVSH <span class="badge badge-red">${rPct}</span></td>
      <td>${PL.fmtNum(priceWithout)} &times; ${rPct}</td>
      <td>+ ${PL.fmtALL(tvsh)}</td>
    </tr>
    <tr class="row-total">
      <td colspan="2">Çmimi me TVSH</td>
      <td>${PL.fmtALL(priceWith)}</td>
    </tr>`;
}

document.getElementById('price-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});
