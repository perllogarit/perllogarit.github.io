"use strict";

const CALC_NAME = 'sigurime';

const SS_RATE = 0.23;
const HI_RATE = 0.034;

const YEAR_DATA = {
  2025: { ssCap: 176416, minWage: 40000 },
  2026: { ssCap: 186416, minWage: 50000 },
};

let selectedYear = 2026;
let familyCount  = 0;

let currency = 'ALL';

function toALL(v) { return PL.toALL(v, currency); }

function setCurrency(c) {
  currency = c;
  document.getElementById('currency-unit').textContent = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('base-input').placeholder = 'p.sh. 67 420';
  PL.toggleEurNote(c);
  const mw = getYD().minWage;
  document.getElementById('btn-minwage').textContent = 'Paga Min. (' +
    (c === 'EUR' ? (mw / PL.eurRate).toFixed(0) + ' EUR' : mw.toLocaleString('sq-AL') + ' ALL') + ')';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

function getYD() { return YEAR_DATA[selectedYear]; }

function calc(rawBase, nFamily) {
  const { ssCap, minWage } = getYD();
  const base = Math.min(Math.max(rawBase, minWage), ssCap);

  const ssSelf   = base          * SS_RATE;
  const hiSelf   = 2 * minWage   * HI_RATE;
  const ssFamily = nFamily * minWage       * SS_RATE;
  const hiFamily = nFamily * 2 * minWage   * HI_RATE;
  const ssTotal  = ssSelf  + ssFamily;
  const hiTotal  = hiSelf  + hiFamily;
  const monthly  = ssTotal + hiTotal;

  return { base, ssSelf, hiSelf, ssFamily, hiFamily, ssTotal, hiTotal, monthly };
}

function setYear(yr) {
  selectedYear = yr;
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'year', new_value: String(yr) });
  document.getElementById("btn-2025").classList.toggle("active", yr === 2025);
  document.getElementById("btn-2026").classList.toggle("active", yr === 2026);
  document.getElementById("rates-year-label").textContent = yr;
  document.getElementById("note-year").textContent        = yr;

  const { minWage, ssCap } = getYD();
  document.getElementById("ref-minwage").textContent    = minWage.toLocaleString("sq-AL");
  document.getElementById("ref-sscap").textContent      = Math.round(ssCap / 1000) + "K";
  document.getElementById("note-minwage").textContent   = minWage.toLocaleString("sq-AL");
  document.getElementById("note-hi-base").textContent   = (2 * minWage).toLocaleString("sq-AL");
  document.getElementById("note-ss-min").textContent    = PL.fmtNum(minWage * SS_RATE);
  document.getElementById("note-hi-val").textContent    = PL.fmtNum(2 * minWage * HI_RATE);
  document.getElementById("note-total-min").textContent = PL.fmtNum(minWage * SS_RATE + 2 * minWage * HI_RATE);
  document.getElementById("min-wage-lbl").textContent   = minWage.toLocaleString("sq-AL");
  document.getElementById("btn-minwage").textContent    = "Paga Min. (" +
    (currency === 'EUR' ? (minWage / PL.eurRate).toFixed(0) + ' EUR' : minWage.toLocaleString("sq-AL") + ' ALL') + ")";

  calculate();
}

function setMinWage() {
  const val = getYD().minWage;
  document.getElementById("base-input").value = currency === 'EUR' ? (val / PL.eurRate).toFixed(2) : val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: 'min_wage' });
  calculate();
}

function setMaxBase() {
  const val = getYD().ssCap;
  document.getElementById("base-input").value = currency === 'EUR' ? (val / PL.eurRate).toFixed(2) : val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: 'max_base' });
  calculate();
}

function changeFamily(d) {
  familyCount = Math.max(0, Math.min(10, familyCount + d));
  document.getElementById("family-count").value = familyCount;
  calculate();
}

function onFamilyInput() {
  const v = parseInt(document.getElementById("family-count").value, 10);
  if (!isNaN(v) && v >= 0 && v <= 10) { familyCount = v; calculate(); }
}

function calculate() {
  const raw = parseFloat(document.getElementById("base-input").value);
  const rawALL = toALL(raw);
  const { minWage } = getYD();

  const belowMin = rawALL > 0 && rawALL < minWage;
  document.getElementById("min-warn").style.display = belowMin ? "block" : "none";

  if (!rawALL || rawALL <= 0 || isNaN(rawALL)) {
    document.getElementById("result-val").textContent = "";
    document.getElementById("breakdown-body").innerHTML = "";
    document.getElementById("period-grid").style.display = "none";
    return;
  }

  const r = calc(rawALL, familyCount);
  const { minWage: mw } = getYD();

  const eurEquiv = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(r.monthly) + '</span>' : '';
  document.getElementById("result-val").innerHTML          = PL.fmtALL(r.monthly) + eurEquiv;
  document.getElementById("period-monthly").textContent    = PL.fmtNum(r.monthly)       + " ALL";
  document.getElementById("period-quarterly").textContent  = PL.fmtNum(r.monthly * 3)   + " ALL";
  document.getElementById("period-annual").textContent     = PL.fmtNum(r.monthly * 12)  + " ALL";
  document.getElementById("period-grid").style.display     = "grid";
  gtrack('calculate', { calculator: CALC_NAME, currency: currency, year: selectedYear });

  const belowMinNote = rawALL < mw
    ? ` <span class="badge badge-gray">llogaritet mbi ${PL.fmtNum(mw)} ALL</span>`
    : "";

  let familyRows = "";
  if (familyCount > 0) {
    familyRows = `
      <tr class="row-separator"><td colspan="3">Punonjës të papaguar (${familyCount})</td></tr>
      <tr class="row-deduct">
        <td>Sig. Shoqëror familjarë <span class="badge badge-red">23%</span></td>
        <td>${PL.fmtNum(mw)} &times; 23% &times; ${familyCount}</td>
        <td>&minus; ${PL.fmtALL(r.ssFamily)}</td>
      </tr>
      <tr class="row-deduct">
        <td>Sig. Shëndetësor familjarë <span class="badge badge-red">3.4%</span></td>
        <td>${PL.fmtNum(2 * mw)} &times; 3.4% &times; ${familyCount}</td>
        <td>&minus; ${PL.fmtALL(r.hiFamily)}</td>
      </tr>`;
  }

  document.getElementById("breakdown-body").innerHTML = `
    <tr class="row-separator"><td colspan="3">I vetëpunësuari</td></tr>
    <tr class="row-deduct">
      <td>Sig. Shoqëror <span class="badge badge-red">23%</span>${belowMinNote}<span class="tip" data-tip="Kontribut i detyrueshëm mbi bazën e deklaruar. Minimumi është paga minimale; maksimumi është tavani i SS-së.">?</span></td>
      <td>${PL.fmtNum(r.base)} &times; 23%</td>
      <td>&minus; ${PL.fmtALL(r.ssSelf)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Sig. Shëndetësor <span class="badge badge-red">3.4%</span><span class="tip" data-tip="Llogaritet mbi dyfishin e pagës minimale mujore (${PL.fmtNum(2 * mw)} ALL), pavarësisht nga baza e deklaruar për SS.">?</span></td>
      <td>${PL.fmtNum(2 * mw)} &times; 3.4%</td>
      <td>&minus; ${PL.fmtALL(r.hiSelf)}</td>
    </tr>
    ${familyRows}
    <tr class="row-total">
      <td colspan="2">KONTRIBUTI MUJOR TOTAL</td>
      <td>${PL.fmtALL(r.monthly)}</td>
    </tr>`;
}

document.getElementById("base-input").addEventListener("keydown", e => {
  if (e.key === "Enter") calculate();
});

setYear(2026);
