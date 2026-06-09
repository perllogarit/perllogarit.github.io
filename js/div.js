"use strict";

const CALC_NAME = 'dividende';

const TAX_RATE = 0.08;

let currency = 'ALL';
let mode     = 'bruto';

function setMode(m) {
  mode = m;
  document.getElementById('btn-bruto').classList.toggle('active', m === 'bruto');
  document.getElementById('btn-neto').classList.toggle('active',  m === 'neto');
  document.getElementById('div-label').textContent = m === 'bruto'
    ? 'Dividenti Bruto'
    : 'Dividenti Neto (i dëshiruar)';
  document.getElementById('div-input').placeholder = 'p.sh. 67 420';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: m });
  calculate();
}

function setCurrency(c) {
  currency = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('currency-unit').textContent = c;
  document.getElementById('div-input').placeholder = 'p.sh. 67 420';
  PL.toggleEurNote(c);

  const qa = document.getElementById('quick-amounts');
  if (c === 'ALL') {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(100000)">100,000</button>'
      + '<button class="quick-btn" onclick="setAmount(500000)">500,000</button>'
      + '<button class="quick-btn" onclick="setAmount(1000000)">1,000,000</button>';
  } else {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(1000)">1,000</button>'
      + '<button class="quick-btn" onclick="setAmount(5000)">5,000</button>'
      + '<button class="quick-btn" onclick="setAmount(10000)">10,000</button>';
  }
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

function setAmount(val) {
  document.getElementById('div-input').value = val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: String(val) });
  calculate();
}

function calculate() {
  const input = parseFloat(document.getElementById('div-input').value);

  if (!input || input <= 0 || isNaN(input)) {
    document.getElementById('result-net').innerHTML      = '';
    document.getElementById('result-tax-val').innerHTML  = '';
    document.getElementById('breakdown-body').innerHTML  = '';
    document.getElementById('result-sub-net').textContent = mode === 'bruto'
      ? 'Pas tatimit 8%'
      : 'Dividenti neto i garantuar';
    return;
  }

  const baseALL = PL.toALL(input, currency);
  const bruto   = mode === 'bruto' ? baseALL : baseALL / (1 - TAX_RATE);
  const tax     = bruto * TAX_RATE;
  const neto    = bruto - tax;

  const primaryVal   = mode === 'bruto' ? neto  : bruto;
  const primaryTitle = mode === 'bruto' ? 'Dividenti neto' : 'Dividenti bruto i nevojshëm';
  const primarySub   = mode === 'bruto' ? 'Pas tatimit 8%' : 'Para mbajtjes tatimore';

  const eurEquivPrimary = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(primaryVal) + '</span>' : '';
  const eurEquivTax     = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(tax) + '</span>' : '';

  document.getElementById('result-primary-title').textContent = primaryTitle;
  document.getElementById('result-sub-net').textContent       = primarySub;
  document.getElementById('result-net').innerHTML             = PL.fmtALL(primaryVal) + eurEquivPrimary;
  document.getElementById('result-tax-val').innerHTML         = PL.fmtALL(tax) + eurEquivTax;
  gtrack('calculate', { calculator: CALC_NAME, mode: mode, currency: currency });

  document.getElementById('breakdown-body').innerHTML = `
    <tr>
      <td>Dividenti bruto</td>
      <td></td>
      <td>${PL.fmtALL(bruto)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Tatim mbi dividentin <span class="badge badge-red">8%</span></td>
      <td>${PL.fmtNum(bruto)} &times; 8%</td>
      <td>&minus; ${PL.fmtALL(tax)}</td>
    </tr>
    <tr class="row-total">
      <td colspan="2">Dividenti neto</td>
      <td>${PL.fmtALL(neto)}</td>
    </tr>`;
}

document.getElementById('div-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});
