"use strict";

const CALC_NAME = 'paga';

const SS_EMP   = 0.095;
const HI_EMP   = 0.017;
const SS_EMPR  = 0.15;
const HI_EMPR  = 0.017;
const TAX_THR  = 170000;
const TAX_LOW  = 0.13;
const TAX_HIGH = 0.23;

const YEAR_DATA = {
  2025: { ssCap: 176416, minWage: 40000 },
  2026: { ssCap: 186416, minWage: 50000 },
};

let selectedYear = 2026;
let ssCap     = YEAR_DATA[2026].ssCap;
let mode      = "bruto";
let workDays  = 22;

let currency = 'ALL';

function toALL(v) { return PL.toALL(v, currency); }

function setCurrency(c) {
  currency = c;
  document.getElementById('currency-unit').textContent = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('salary-input').placeholder = 'p.sh. 67 420';
  PL.toggleEurNote(c);
  const d = YEAR_DATA[selectedYear];
  document.getElementById('btn-minwage-quick').textContent = 'Paga Min. (' +
    (c === 'EUR' ? (d.minWage / PL.eurRate).toFixed(0) + ' EUR' : d.minWage.toLocaleString('sq-AL') + ' ALL') + ')';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

function calcFromGross(gross) {
  const ssBase = Math.min(gross, ssCap);
  const ss     = ssBase * SS_EMP;
  const hi     = gross  * HI_EMP;

  let ded;
  if      (gross <= 50000) ded = 50000;
  else if (gross <= 60000) ded = 35000;
  else                     ded = 30000;

  const taxable = Math.max(0, gross - ded);
  const tax = taxable <= TAX_THR
    ? taxable * TAX_LOW
    : TAX_THR * TAX_LOW + (taxable - TAX_THR) * TAX_HIGH;

  const totalDed = ss + hi + tax;
  const net      = gross - totalDed;

  const ssE  = ssBase * SS_EMPR;
  const hiE  = gross  * HI_EMPR;
  const cost = gross  + ssE + hiE;

  return { gross, net, ss, hi, tax, taxable, ded, totalDed, ssE, hiE, cost };
}

/* Net-to-gross binary search across three monotone segments */
function netToGross(targetNet) {
  const segs = [[0, 50000], [50001, 60000], [60001, 1600000]];
  const hits  = [];

  for (const [lo, hi] of segs) {
    const nLo = calcFromGross(lo).net;
    const nHi = calcFromGross(hi).net;
    if (targetNet < nLo - 0.5 || targetNet > nHi + 0.5) continue;

    let L = lo, R = hi, found = null;
    for (let i = 0; i < 80; i++) {
      const mid = (L + R) / 2;
      const mn  = calcFromGross(mid).net;
      if (Math.abs(mn - targetNet) < 0.1) { found = mid; break; }
      if (mn < targetNet) L = mid; else R = mid;
    }
    if (found !== null) hits.push(found);
  }

  const unique = [];
  for (const g of hits) {
    if (!unique.some(u => Math.abs(u - g) < 1)) unique.push(g);
  }
  return unique.map(g => Math.round(g));
}

function setYear(yr) {
  selectedYear = yr;
  ssCap = YEAR_DATA[yr].ssCap;

  document.getElementById("btn-2025").classList.toggle("active", yr === 2025);
  document.getElementById("btn-2026").classList.toggle("active", yr === 2026);
  document.getElementById("rates-year-label").textContent = yr;

  const d = YEAR_DATA[yr];
  document.getElementById("note-cap"    ).textContent = d.ssCap.toLocaleString("sq-AL");
  document.getElementById("note-minwage").textContent = d.minWage.toLocaleString("sq-AL");
  document.getElementById("btn-minwage-quick").textContent = "Paga Min. (" +
    (currency === 'EUR' ? (d.minWage / PL.eurRate).toFixed(0) + ' EUR' : d.minWage.toLocaleString("sq-AL") + ' ALL') + ")";

  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'year', new_value: String(yr) });
  calculate();
}

function setMinWage() {
  const val = YEAR_DATA[selectedYear].minWage;
  document.getElementById("salary-input").value = currency === 'EUR' ? (val / PL.eurRate).toFixed(2) : val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: 'min_wage' });
  calculate();
}
function setTavanSS() {
  const val = YEAR_DATA[selectedYear].ssCap;
  document.getElementById("salary-input").value = currency === 'EUR' ? (val / PL.eurRate).toFixed(2) : val;
  gtrack('quick_amount_used', { calculator: CALC_NAME, label: 'tavan_ss' });
  calculate();
}

function setMode(m) {
  mode = m;
  document.getElementById("btn-bruto"   ).classList.toggle("active", m === "bruto");
  document.getElementById("btn-neto"    ).classList.toggle("active", m === "neto" );
  document.getElementById("input-label" ).textContent = m === "bruto" ? "Paga Bruto Mujore"       : "Paga Neto Mujore";
  document.getElementById("result-title").textContent = m === "bruto" ? "Paga Neto"                : "Paga Bruto";
  document.getElementById("result-sub"  ).textContent = m === "bruto" ? "Pas të gjitha zbritjeve." : "Para zbritjeve të aplikueshme.";
  document.getElementById("salary-input").placeholder = 'p.sh. 67 420';
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: m });
  calculate();
}

function clearUI() {
  ["result-val","result-daily","emp-gross","emp-ss","emp-hi","emp-total","emp-total-preview","daily-gross","daily-net","daily-gross-sub","daily-net-sub"]
    .forEach(id => { document.getElementById(id).textContent = ""; });
  document.getElementById("breakdown-body").innerHTML = "";
  document.getElementById("cliff-warn"   ).style.display = "none";
  document.getElementById("multi-result" ).style.display = "none";
  document.getElementById("daily-section").style.display = "none";
  document.getElementById("emp-box"      ).style.display = "none";
}

function renderResult(r) {
  const displayVal = mode === "bruto" ? r.net : r.gross;
  const netPct     = ((r.net / r.gross) * 100).toFixed(1);
  const taxLbl     = r.taxable > TAX_THR ? "13% / 23%" : "13%";
  const eurEquiv   = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(displayVal) + '</span>' : '';

  document.getElementById("result-val"  ).innerHTML = PL.fmtALL(displayVal) + eurEquiv;
  document.getElementById("result-daily").textContent = "Ditore (div " + workDays + "): " + PL.fmtNum(displayVal / workDays) + " ALL";

  document.getElementById("breakdown-body").innerHTML = `
    <tr class="row-gross">
      <td>Paga Bruto</td><td></td><td>${PL.fmtALL(r.gross)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Sigurim Shoqëror <span class="badge badge-red">9.5%</span><span class="tip" data-tip="Kontribut i detyrueshëm i punonjësit për pension dhe sigurime shoqërore. Aplikohet mbi pagën deri në tavanin mujor.">?</span></td>
      <td>${PL.fmtNum(Math.min(r.gross, ssCap))} x 9.5%</td>
      <td>&minus; ${PL.fmtALL(r.ss)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Sigurim Shëndetsor <span class="badge badge-red">1.7%</span><span class="tip" data-tip="Kontribut i detyrueshëm i punonjësit për sigurimin shëndetësor publik. Aplikohet mbi pagën bruto pa tavan.">?</span></td>
      <td>${PL.fmtNum(r.gross)} x 1.7%</td>
      <td>&minus; ${PL.fmtALL(r.hi)}</td>
    </tr>
    <tr class="row-deduct">
      <td>Tatim mbi të Ardhurat <span class="badge badge-red">${taxLbl}</span><span class="tip" data-tip="Tatim progresiv personal. Deri 50,000 ALL nuk tatohet fare. Mbi këtë shumë, norma është 13% deri 170,000 ALL dhe 23% mbi 170,000 ALL.">?</span></td>
      <td>Tatueshme: ${PL.fmtNum(r.taxable)} ALL (zbritje ${PL.fmtNum(r.ded)} ALL)</td>
      <td>&minus; ${PL.fmtALL(r.tax)}</td>
    </tr>
    <tr class="row-subtotal">
      <td colspan="2">TOTALI</td>
      <td>&minus; ${PL.fmtALL(r.totalDed)}</td>
    </tr>
    <tr class="row-total">
      <td>Paga Neto <span class="badge badge-green">${netPct}%</span></td>
      <td style="font-weight:400;font-size:.78rem;color:#888">e pagës bruto</td>
      <td>${PL.fmtALL(r.net)}</td>
    </tr>`;

  document.getElementById("emp-gross"        ).textContent = PL.fmtALL(r.gross);
  document.getElementById("emp-ss"           ).textContent = PL.fmtALL(r.ssE);
  document.getElementById("emp-hi"           ).textContent = PL.fmtALL(r.hiE);
  document.getElementById("emp-total"        ).textContent = PL.fmtALL(r.cost);
  document.getElementById("emp-total-preview").textContent = PL.fmtALL(r.cost);

  document.getElementById("daily-gross"    ).textContent = PL.fmtNum(r.gross / workDays) + " ALL";
  document.getElementById("daily-net"      ).textContent = PL.fmtNum(r.net   / workDays) + " ALL";
  document.getElementById("daily-gross-sub").textContent = "bruto / " + workDays;
  document.getElementById("daily-net-sub"  ).textContent = "neto / "  + workDays;
  document.getElementById("daily-section"  ).style.display = "block";
  document.getElementById("emp-box"        ).style.display = "block";
}

function calculate() {
  const raw = parseFloat(document.getElementById("salary-input").value);
  if (!raw || raw <= 0 || isNaN(raw)) { clearUI(); return; }
  const rawALL = toALL(raw);

  if (mode === "bruto") {
    renderResult(calcFromGross(rawALL));
    document.getElementById("cliff-warn"  ).style.display = "none";
    document.getElementById("multi-result").style.display = "none";
    gtrack('calculate', { calculator: CALC_NAME, mode: mode, currency: currency, year: selectedYear });
    return;
  }

  const grossVals = netToGross(rawALL);
  if (!grossVals.length) { clearUI(); document.getElementById("result-val").textContent = "Nuk u gjet"; return; }

  grossVals.sort((a, b) => a - b);
  renderResult(calcFromGross(grossVals[0]));

  if (grossVals.length > 1) {
    const r2 = calcFromGross(grossVals[1]);
    document.getElementById("cliff-warn"  ).style.display = "block";
    document.getElementById("multi-result").style.display = "block";
    document.getElementById("alt-gross"   ).textContent = PL.fmtALL(r2.gross);
    document.getElementById("alt-net"     ).textContent = PL.fmtALL(r2.net);
    document.getElementById("alt-cost"    ).textContent = PL.fmtALL(r2.cost);
  } else {
    document.getElementById("cliff-warn"  ).style.display = "none";
    document.getElementById("multi-result").style.display = "none";
  }
  gtrack('calculate', { calculator: CALC_NAME, mode: mode, currency: currency, year: selectedYear });
}

function changeDays(delta) {
  workDays = Math.min(31, Math.max(1, workDays + delta));
  document.getElementById("days-display").value = workDays;
  calculate();
}
function onDaysInput() {
  const v = parseInt(document.getElementById("days-display").value, 10);
  if (v >= 1 && v <= 31) { workDays = v; calculate(); }
}

function toggleEmpBox() {
  document.getElementById("emp-box").classList.toggle("emp-box--open");
}

document.getElementById("salary-input").addEventListener("keydown", e => {
  if (e.key === "Enter") calculate();
});

setYear(selectedYear);
