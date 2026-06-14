"use strict";

const CALC_NAME = 'qiraja';

const TAX_RATE = 0.15;

let currency = 'ALL';
let months   = 1;
let mode     = 'bruto';

function setMode(m) {
  mode = m;
  document.getElementById('btn-bruto').classList.toggle('active', m === 'bruto');
  document.getElementById('btn-neto').classList.toggle('active',  m === 'neto');
  document.getElementById('rent-label').textContent = m === 'bruto'
    ? 'Qiraja Mujore Bruto'
    : 'Qiraja Mujore Neto (e dëshiruar)';
  document.getElementById('rent-input').placeholder = 'p.sh. 67 420';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: m });
  calculate();
}

function setCurrency(c) {
  currency = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('currency-unit').textContent = c;
  document.getElementById('rent-input').placeholder = 'p.sh. 67 420';
  PL.toggleEurNote(c);

  const qa = document.getElementById('quick-amounts');
  if (c === 'ALL') {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(30000)">30,000</button>'
      + '<button class="quick-btn" onclick="setAmount(50000)">50,000</button>'
      + '<button class="quick-btn" onclick="setAmount(100000)">100,000</button>';
  } else {
    qa.innerHTML = '<span class="quick-lbl">Bjeri shkurt:</span>'
      + '<button class="quick-btn" onclick="setAmount(300)">300</button>'
      + '<button class="quick-btn" onclick="setAmount(500)">500</button>'
      + '<button class="quick-btn" onclick="setAmount(1000)">1,000</button>';
  }
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

function setAmount(val) {
  document.getElementById('rent-input').value = val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: String(val) });
  calculate();
}

function changeMonths(d) {
  months = Math.max(1, Math.min(120, months + d));
  document.getElementById('months-input').value = months;
  calculate();
}

function onMonthsInput() {
  const v = parseInt(document.getElementById('months-input').value, 10);
  if (!isNaN(v) && v >= 1 && v <= 120) { months = v; calculate(); }
}

function setMonths(n) {
  months = n;
  document.getElementById('months-input').value = n;
  calculate();
}

function calculate() {
  const input = parseFloat(document.getElementById('rent-input').value);

  if (!input || input <= 0 || isNaN(input)) {
    document.getElementById('result-net').innerHTML      = '';
    document.getElementById('result-tax-val').innerHTML  = '';
    document.getElementById('breakdown-body').innerHTML  = '';
    document.getElementById('period-grid').style.display = 'none';
    document.getElementById('result-sub-net').textContent = mode === 'bruto'
      ? 'Pas tatimit 15% · ' + months + ' muaj'
      : 'Qiraja në kontratë · ' + months + ' muaj';
    document.getElementById('result-sub-tax').textContent = '15% · ' + months + ' muaj';
    return;
  }

  const baseALL = PL.toALL(input, currency);

  const monthlyBruto = mode === 'bruto' ? baseALL : baseALL / (1 - TAX_RATE);
  const monthlyTax   = monthlyBruto * TAX_RATE;
  const monthlyNet   = monthlyBruto - monthlyTax;

  const totalBruto = monthlyBruto * months;
  const totalTax   = totalBruto * TAX_RATE;
  const totalNet   = totalBruto - totalTax;

  const primaryVal   = mode === 'bruto' ? totalNet   : totalBruto;
  const primarySub   = mode === 'bruto'
    ? 'Pas tatimit 15% · ' + months + ' muaj'
    : 'Qiraja në kontratë · ' + months + ' muaj';
  const primaryTitle = mode === 'bruto' ? 'Të ardhura neto totale' : 'Qiraja bruto e nevojshme';

  const eurEquivPrimary = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(primaryVal) + '</span>' : '';
  const eurEquivTax     = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(totalTax) + '</span>' : '';

  document.getElementById('result-primary-title').textContent = primaryTitle;
  document.getElementById('result-sub-net').textContent       = primarySub;
  document.getElementById('result-sub-tax').textContent       = '15% · ' + months + ' muaj';
  document.getElementById('result-net').innerHTML             = PL.fmtALL(primaryVal) + eurEquivPrimary;
  document.getElementById('result-tax-val').innerHTML         = PL.fmtALL(totalTax) + eurEquivTax;

  const pgVal    = mode === 'bruto' ? monthlyNet   : monthlyBruto;
  const pgLbl    = mode === 'bruto' ? 'Neto'       : 'Bruto';
  const pgSubLbl = 'Tatimi: ';
  document.getElementById('pg-lbl-m').textContent = pgLbl + ' mujore';
  document.getElementById('pg-lbl-q').textContent = pgLbl + ' tremujore';
  document.getElementById('pg-lbl-y').textContent = pgLbl + ' vjetore';
  document.getElementById('pg-net-m').textContent = PL.fmtNum(pgVal)      + ' ALL';
  document.getElementById('pg-tax-m').textContent = pgSubLbl + PL.fmtNum(monthlyTax) + ' ALL';
  document.getElementById('pg-net-q').textContent = PL.fmtNum(pgVal * 3)  + ' ALL';
  document.getElementById('pg-tax-q').textContent = pgSubLbl + PL.fmtNum(monthlyTax * 3) + ' ALL';
  document.getElementById('pg-net-y').textContent = PL.fmtNum(pgVal * 12) + ' ALL';
  document.getElementById('pg-tax-y').textContent = pgSubLbl + PL.fmtNum(monthlyTax * 12) + ' ALL';
  document.getElementById('period-grid').style.display = 'grid';

  document.getElementById('breakdown-body').innerHTML = `
    <tr class="row-separator"><td colspan="3">Mujore</td></tr>
    <tr>
      <td>Qiraja bruto mujore</td>
      <td></td>
      <td>${PL.fmtALL(monthlyBruto)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Tatimi mbi qiranë <span class="badge badge-red">15%</span></td>
      <td>${PL.fmtNum(monthlyBruto)} × 15%</td>
      <td>&minus; ${PL.fmtALL(monthlyTax)}</td>
    </tr>
    <tr class="row-total">
      <td colspan="2">Të ardhura neto mujore</td>
      <td>${PL.fmtALL(monthlyNet)}</td>
    </tr>
    <tr class="row-separator"><td colspan="3">Totali · ${months} muaj</td></tr>
    <tr>
      <td>Qiraja bruto totale</td>
      <td>${PL.fmtNum(monthlyBruto)} × ${months}</td>
      <td>${PL.fmtALL(totalBruto)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Tatimi total 15%</td>
      <td>${PL.fmtNum(totalBruto)} × 15%</td>
      <td>&minus; ${PL.fmtALL(totalTax)}</td>
    </tr>
    <tr class="row-total">
      <td colspan="2">Të ardhura neto totale</td>
      <td>${PL.fmtALL(totalNet)}</td>
    </tr>`;
  gtrack('calculate', { calculator: CALC_NAME, mode: mode, currency: currency });
}

document.getElementById('rent-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});
