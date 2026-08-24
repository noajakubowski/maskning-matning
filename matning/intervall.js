'use strict';

const { skapaSlump } = require('./slump.js');

const Z95 = 1.959963984540054;
const Z95_2 = Z95 * Z95;
const TANGO_ROT_TOL = 1e-10;
const BOOTSTRAP_B = 10000;

function avrundaIntervall(x) {
  return Math.round(x * 1e10) / 1e10;
}

function wilson95(traff, n) {
  if (n <= 0) throw new Error('wilson95: n måste vara positivt');
  if (traff < 0 || traff > n) throw new Error('wilson95: ogiltigt antal träffar');
  const p = traff / n;
  const z2 = Z95_2;
  const denom = 1 + z2 / n;
  const radicand = (p * (1 - p) / n) + (z2 / (4 * n * n));
  const margin = (Z95 / denom) * Math.sqrt(Math.max(0, radicand));
  const center = (p + z2 / (2 * n)) / denom;
  return {
    p,
    lo: avrundaIntervall(Math.max(0, center - margin)),
    hi: avrundaIntervall(Math.min(1, center + margin)),
  };
}

function tangoScoreZ(n01, n10, n, delta) {
  const b = n01;
  const c = n10;
  const p = -delta;
  const pa = 2 * n;
  const pb = -b - c + (2 * n - c + b) * p;
  const pc = -b * p * (1 - p);
  const disc = pb * pb - 4 * pa * pc;
  if (disc < 0) return NaN;
  const q21 = (Math.sqrt(disc) - pb) / (2 * pa);
  const denom = n * (2 * q21 + p * (1 - p));
  if (denom <= 0) return NaN;
  return (c - b - n * p) / Math.sqrt(denom);
}

function tangoScoreChi2(n01, n10, n, delta) {
  const m = n01 + n10;
  if (m === 0) {
    const g = Z95_2 / (n + Z95_2);
    if (Math.abs(delta) <= g + 1e-15) return 0;
    if (Math.abs(delta) >= 2) return Infinity;
    const denom = 4 - n * delta * delta;
    if (denom <= 0) return Infinity;
    return (n * delta * delta) / denom;
  }
  const z = tangoScoreZ(n01, n10, n, delta);
  if (!Number.isFinite(z)) return Infinity;
  return z * z;
}

function bracketScoreRot(n01, n10, n, min, max, wantAbove) {
  let lo = min;
  let hi = max;
  let flo = tangoScoreChi2(n01, n10, n, lo) - Z95_2;
  let fhi = tangoScoreChi2(n01, n10, n, hi) - Z95_2;

  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) {
    const steg = (max - min) / 64;
    for (let i = 0; i <= 64; i++) {
      const x = min + i * steg;
      const fx = tangoScoreChi2(n01, n10, n, x) - Z95_2;
      if (!Number.isFinite(fx)) continue;
      if (wantAbove ? fx >= 0 : fx <= 0) {
        lo = x;
        flo = fx;
        break;
      }
    }
    for (let i = 64; i >= 0; i--) {
      const x = min + i * steg;
      const fx = tangoScoreChi2(n01, n10, n, x) - Z95_2;
      if (!Number.isFinite(fx)) continue;
      if (wantAbove ? fx <= 0 : fx >= 0) {
        hi = x;
        fhi = fx;
        break;
      }
    }
  }

  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) {
    return null;
  }
  return { lo, hi, flo, fhi };
}


function forfinTangoRot(n01, n10, n, delta) {
  let d = delta;
  for (let k = 0; k < 32; k++) {
    const f = tangoScoreChi2(n01, n10, n, d) - Z95_2;
    if (Math.abs(f) < TANGO_ROT_TOL) return d;
    const h = 1e-8;
    const fp = (tangoScoreChi2(n01, n10, n, d + h) - tangoScoreChi2(n01, n10, n, d - h)) / (2 * h);
    if (!Number.isFinite(fp) || Math.abs(fp) < 1e-15) break;
    d -= f / fp;
    if (d < -1) d = -1 + 1e-12;
    if (d > 1) d = 1 - 1e-12;
  }
  return d;
}

function rotsokTango(n01, n10, n, min, max) {
  const bracket = bracketScoreRot(n01, n10, n, min, max, true);
  if (!bracket) return forfinTangoRot(n01, n10, n, (min + max) / 2);

  let { lo, hi, flo } = bracket;
  let fhi = bracket.fhi;

  if (flo === 0) return forfinTangoRot(n01, n10, n, lo);
  if (fhi === 0) return forfinTangoRot(n01, n10, n, hi);

  for (let i = 0; i < 512; i++) {
    const mid = (lo + hi) / 2;
    const fm = tangoScoreChi2(n01, n10, n, mid) - Z95_2;
    if (Math.abs(fm) < TANGO_ROT_TOL) return forfinTangoRot(n01, n10, n, mid);
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
    if ((hi - lo) < TANGO_ROT_TOL) break;
  }
  return forfinTangoRot(n01, n10, n, (lo + hi) / 2);
}

function tango95(n01, n10, n) {
  if (n <= 0) throw new Error('tango95: n måste vara positivt');
  const m = n01 + n10;
  const delta = m === 0 ? 0 : (n01 - n10) / n;

  if (m === 0) {
    const g = Z95_2 / (n + Z95_2);
    return { delta, lo: -g, hi: g, n01, n10, n, nDisc: m };
  }

  const eps = 1e-12;
  if (m === n && n10 === 0) {
    const lo = rotsokTango(n01, n10, n, -1 + eps, delta - eps);
    return { delta, lo, hi: 1, n01, n10, n, nDisc: m };
  }
  if (m === n && n01 === 0) {
    const hi = rotsokTango(n01, n10, n, delta + eps, 1 - eps);
    return { delta, lo: -1, hi, n01, n10, n, nDisc: m };
  }

  const span = Math.max(0.25, Math.abs(delta) + 0.05);
  const lo = rotsokTango(n01, n10, n, Math.max(-1, delta - span), delta);
  const hi = rotsokTango(n01, n10, n, delta, Math.min(1, delta + span));
  return { delta, lo, hi, n01, n10, n, nDisc: m };
}

function klusterbootstrapKvot(dokumentData, seed) {
  if (!dokumentData.length) {
    return { p: 0, lo: 0, hi: 0, b: 0, dokument: 0 };
  }
  const slump = skapaSlump(seed);
  const nDoc = dokumentData.length;
  const bootstrap = [];

  for (let b = 0; b < BOOTSTRAP_B; b++) {
    let talare = 0;
    let namnare = 0;
    for (let i = 0; i < nDoc; i++) {
      const idx = slump.heltal(0, nDoc - 1);
      talare += dokumentData[idx].overflaggadeTecken;
      namnare += dokumentData[idx].totalTecken;
    }
    bootstrap.push(namnare > 0 ? (talare / namnare) * 1000 : 0);
  }

  bootstrap.sort((a, b) => a - b);
  const pIdx = Math.floor(0.5 * (BOOTSTRAP_B - 1));
  const loIdx = Math.floor(0.025 * (BOOTSTRAP_B - 1));
  const hiIdx = Math.floor(0.975 * (BOOTSTRAP_B - 1));
  const totalOver = dokumentData.reduce((s, d) => s + d.overflaggadeTecken, 0);
  const totalTecken = dokumentData.reduce((s, d) => s + d.totalTecken, 0);

  return {
    p: totalTecken > 0 ? (totalOver / totalTecken) * 1000 : 0,
    lo: bootstrap[loIdx],
    hi: bootstrap[hiIdx],
    b: BOOTSTRAP_B,
    dokument: nDoc,
  };
}

function genereraParadStickprov(slump, n, delta) {
  const p01 = 0.05 + delta / 2;
  const p10 = 0.05 - delta / 2;
  if (p01 < 0 || p10 < 0 || p01 + p10 > 0.4) return null;
  const rest = 1 - p01 - p10;
  const p00 = rest / 2;
  const p11 = rest / 2;
  if (p00 < 0 || p11 < 0) return null;

  let n01 = 0;
  let n10 = 0;
  for (let i = 0; i < n; i++) {
    const u = slump.nasta();
    if (u < p10) n10++;
    else if (u < p10 + p01) n01++;
  }
  return { n01, n10, n, delta };
}

function tangoTackningsSimulering(seed, upprepningar = 10000) {
  const slump = skapaSlump(seed);
  let tackt = 0;
  let korningar = 0;

  while (korningar < upprepningar) {
    const n = slump.heltal(80, 400);
    const delta = (slump.heltal(-40, 40)) / 100;
    const sample = genereraParadStickprov(slump, n, delta);
    if (!sample || sample.n01 + sample.n10 === 0) continue;
    const { lo, hi } = tango95(sample.n01, sample.n10, sample.n);
    korningar++;
    if (sample.delta >= lo - 1e-12 && sample.delta <= hi + 1e-12) tackt++;
  }

  return { tackt, korningar, andel: tackt / korningar };
}

module.exports = {
  Z95,
  Z95_2,
  TANGO_ROT_TOL,
  BOOTSTRAP_B,
  wilson95,
  tangoScoreChi2,
  tango95,
  klusterbootstrapKvot,
  tangoTackningsSimulering,
};
