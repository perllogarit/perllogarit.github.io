"use strict";

const CALC_NAME = 'makina';

/* ================================================================
   CONFIG update when official values change
================================================================ */
const CFG = {
  VAT_RATE:          0.20,
  ADMIN_FEE_EUR:     185,
  LUXURY_ANNUAL_ALL: 21_000,
  CURRENT_YEAR:      2026,

  /* Base reference values (ALL) for year=current, per CC category.
     dep = ALL depreciation per year of vehicle age.               */
  REFS: {
    '1400': { base: 162_500, dep:  6_500 },
    '1900': { base: 250_000, dep: 10_000 },
    '2500': { base: 406_000, dep: 16_250 },
    '2999': { base: 500_000, dep: 20_000 },
    '3000': { base: 625_000, dep: 25_000 },
  },
};

let selectedCC = '1400';
let currency   = 'ALL';

function fmtALLApprox(allVal) { return '~' + PL.fmtALL(allVal); }

function updateRefGrid() {
  ['1400','1900','2500','2999','3000'].forEach(cc => {
    const base   = CFG.REFS[cc].base;
    const eurVal = Math.round(base / PL.eurRate);
    const eurEl  = document.getElementById('ref-eur-' + cc);
    const allEl  = document.getElementById('ref-all-' + cc);
    if (eurEl) eurEl.textContent = '~' + eurVal.toLocaleString('sq-AL') + ' €';
    if (allEl) allEl.textContent = Math.round(base).toLocaleString('sq-AL') + ' ALL' + (cc === '3000' ? ' · Luks' : '');
  });
  const lr = document.getElementById('live-rate');
  if (lr) lr.textContent = PL.eurRate.toFixed(2);
  updateInfoAmounts();
}

function updateInfoAmounts() {
  const luxEl   = document.getElementById('info-luxury');
  const adminEl = document.getElementById('info-admin');
  if (!luxEl || !adminEl) return;
  luxEl.textContent   = '~' + CFG.LUXURY_ANNUAL_ALL.toLocaleString('sq-AL') + ' ALL';
  adminEl.textContent = '~' + Math.round(CFG.ADMIN_FEE_EUR * PL.eurRate).toLocaleString('sq-AL') + ' ALL';
}

function setCurrency(c) {
  currency = c;
  document.getElementById('currency-unit').textContent = c;
  document.querySelectorAll('.ccy-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.id === 'opt-' + c.toLowerCase());
  });
  document.getElementById('inp-price').placeholder = 'p.sh. 67 420';
  document.getElementById('rate-note-line').classList.toggle('visible', c !== 'ALL');
  PL.toggleEurNote(c);
  updateInfoAmounts();
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'currency', new_value: c });
  calculate();
}

/* Reference value in ALL for a given CC and production year string. */
function getRefAll(cc, yearStr) {
  if (yearStr === 'retro') return 0;
  const r = CFG.REFS[cc];
  if (!r) return 0;
  const age      = CFG.CURRENT_YEAR - parseInt(yearStr, 10);
  const computed = r.base - age * r.dep;
  const floor    = Math.round(r.base * 0.20);
  return Math.max(floor, computed);
}

function setYearQuick(val) {
  document.getElementById('sel-year').value = val;
  calculate();
}

function setCC(cc) {
  selectedCC = cc;
  ['1400','1900','2500','2999','3000'].forEach(k => {
    document.getElementById('cc-' + k).classList.toggle('active', k === cc);
  });
  gtrack('toggle_mode', { calculator: CALC_NAME, toggle_type: 'mode', new_value: cc });
  calculate();
}

function clearResults() {
  document.getElementById('res-val').textContent   = '';
  document.getElementById('res-total').textContent = '';
  document.getElementById('warn-ref').style.display    = 'none';
  document.getElementById('breakdown').style.display   = 'none';
  document.getElementById('breakdown-body').innerHTML  = '';
}

function calculate() {
  const yearStr  = document.getElementById('sel-year').value.trim().toLowerCase();
  const price    = parseFloat(document.getElementById('inp-price').value);
  const cc       = selectedCC;
  const isRetro  = yearStr === 'retro';
  const isLuxury = cc === '3000' && !isRetro;

  document.getElementById('retro-box').style.display = isRetro ? 'block' : 'none';

  const yearNum = parseInt(yearStr, 10);
  if (!yearStr || (yearStr !== 'retro' && (isNaN(yearNum) || yearNum < 1900 || yearNum > CFG.CURRENT_YEAR))) { clearResults(); return; }
  if (!price || price <= 0 || isNaN(price)) { clearResults(); return; }

  const priceAll  = PL.toALL(price, currency);
  const refAll    = getRefAll(cc, yearStr);
  const belowRef  = !isRetro && priceAll < refAll;
  const taxAll    = isRetro ? priceAll : Math.max(priceAll, refAll);

  const tvshAll   = taxAll * CFG.VAT_RATE;
  const luxuryAll = isLuxury ? CFG.LUXURY_ANNUAL_ALL : 0;
  const adminAll  = CFG.ADMIN_FEE_EUR * PL.eurRate;
  const totalAll  = tvshAll + luxuryAll + adminAll;

  const warnEl = document.getElementById('warn-ref');
  if (belowRef) {
    warnEl.style.display = 'block';
    warnEl.innerHTML = `⚠ <strong>Kujdes nga Dogana:</strong> Çmimi juaj është nën Referencën Minimale ${yearNum}. Shteti do ju taksojë mbi vlerën <strong>${PL.fmtALL(refAll)}</strong>.`;
  } else {
    warnEl.style.display = 'none';
  }

  document.getElementById('res-title').textContent = isRetro ? 'TVSH E IMPORTIT RETRO' : 'TVSH E IMPORTIT';
  document.getElementById('res-sub').textContent   = isRetro
    ? 'Taksa mbi vlerën e deklaruar (20%)'
    : belowRef
      ? 'Llogaritet mbi referencën minimale (20%)'
      : 'Taksa parashikuese doganore (20%)';

  const eurEquivTvsh  = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(tvshAll) + '</span>' : '';
  const eurEquivTotal = currency === 'EUR' ? ' <span class="eur-equiv">' + PL.fmtEurEquiv(totalAll) + '</span>' : '';

  document.getElementById('res-val').innerHTML   = PL.fmtALL(tvshAll) + eurEquivTvsh;
  document.getElementById('res-total').innerHTML = 'Totali me kosto: ' + fmtALLApprox(totalAll) + (currency === 'EUR' ? ' ' + PL.fmtEurEquiv(totalAll) : '');

  const tbody = document.getElementById('breakdown-body');
  let rows = '';

  if (belowRef) {
    rows += `<tr class="row-base">
      <td>Vlera Doganore (referenca minimale)<span class="tip" data-tip="Çmimi juaj është nën referencën minimale. Dogana llogarit TVSH mbi këtë vlerë.">?</span></td>
      <td></td>
      <td>${PL.fmtALL(taxAll)}</td>
    </tr>`;
  }

  rows += `<tr class="row-tvsh">
    <td>TVSH (20%) <span class="badge badge-red">20%</span></td>
    <td>${PL.fmtALL(taxAll)} &times; 20%</td>
    <td>${PL.fmtALL(tvshAll)}</td>
  </tr>`;

  if (isLuxury) {
    rows += `<tr class="row-luks">
      <td>Taksë Luksi (Vjetore) <span class="badge badge-warn">≥ 3000 cc</span><span class="tip" data-tip="Taksë vjetore shtesë për autovetura me motor ≥ 3000 cc. Paguhet çdo vit te DPSHTRR.">?</span></td>
      <td>${fmtALLApprox(luxuryAll)} / vit</td>
      <td>${fmtALLApprox(luxuryAll)}</td>
    </tr>`;
  }

  rows += `<tr class="row-admin">
    <td>Tarifa Administrate &amp; Regjistrim <span class="tip" data-tip="Tarifat e regjistrimit DPSHTRR: leje qarkullimi, targa, kontroll fizik. Vlerë orientuese.">?</span></td>
    <td>DPSHTRR (orientuese)</td>
    <td>${fmtALLApprox(adminAll)}</td>
  </tr>
  <tr class="row-total">
    <td>Kosto Totale e Parashikuar</td>
    <td style="font-size:.76rem;color:#888">TVSH + ${isLuxury ? 'luks + ' : ''}admin</td>
    <td>${fmtALLApprox(totalAll)}</td>
  </tr>`;

  tbody.innerHTML = rows;
  document.getElementById('breakdown').style.display = '';
  gtrack('calculate', { calculator: CALC_NAME, currency: currency, cc: selectedCC, is_retro: isRetro });
}

document.getElementById('inp-price').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});

updateInfoAmounts();

/* Re-trigger grid and recalculate once the shared live rate loads */
window.onEurRateLoaded = function() {
  updateRefGrid();
  const inp = document.getElementById('inp-price');
  if (inp && inp.value) calculate();
};
