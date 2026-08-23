'use strict';

const { skapaSlump } = require('./slump.js');
const { tillNfc } = require('./text.js');
const { TELEFON_FORMER, personnummer, telefonnummer, valjNamn, formateraNamn } = require('./uppgifter.js');
const { korrumperaUppgift } = require('./korruption.js');
const { DOKUMENTTYPER } = require('./mallar.js');

const KVOT_NAMN_TOTAL = 400;
const KVOT_NAMN_KOLLISION = 200;
const KVOT_NAMN_VANLIG_HOG3 = 200;
const KVOT_PNR_TIO = 200;
const KVOT_PNR_TOLV = 200;
const KVOT_TEL = 200;

function fordelningJamt(total, delar) {
  const bas = Math.floor(total / delar);
  const rest = total % delar;
  return Array.from({ length: delar }, (_, i) => bas + (i < rest ? 1 : 0));
}

function skapaKvotPlan(hogtyp, kollisionsord) {
  const plan = [];
  const namnVanlig = hogtyp === 3 ? KVOT_NAMN_VANLIG_HOG3 : KVOT_NAMN_TOTAL;
  for (let i = 0; i < namnVanlig; i++) plan.push({ typ: 'namn_vanlig' });

  if (hogtyp === 3) {
    const perOrd = fordelningJamt(KVOT_NAMN_KOLLISION, kollisionsord.length);
    kollisionsord.forEach((post, idx) => {
      for (let n = 0; n < perOrd[idx]; n++) plan.push({ typ: 'kollision', ord: post.ord });
    });
  }

  for (let i = 0; i < KVOT_PNR_TIO / 2; i++) {
    plan.push({ typ: 'pnr', langd: 'tiosiffriga', bindestreck: true });
  }
  for (let i = 0; i < KVOT_PNR_TIO / 2; i++) {
    plan.push({ typ: 'pnr', langd: 'tiosiffriga', bindestreck: false });
  }
  for (let i = 0; i < KVOT_PNR_TOLV / 2; i++) {
    plan.push({ typ: 'pnr', langd: 'tolvsiffriga', bindestreck: true });
  }
  for (let i = 0; i < KVOT_PNR_TOLV / 2; i++) {
    plan.push({ typ: 'pnr', langd: 'tolvsiffriga', bindestreck: false });
  }

  const telFord = fordelningJamt(KVOT_TEL, TELEFON_FORMER.length);
  TELEFON_FORMER.forEach((form, idx) => {
    for (let n = 0; n < telFord[idx]; n++) plan.push({ typ: 'tel', form });
  });

  return plan;
}

const PLATSHALLARE_RE = /\{(NAMN|PERSONNUMMER|TELEFON|ORD)\}/g;

function platshallareIMall(mall) {
  const set = new Set();
  let m;
  const re = new RegExp(PLATSHALLARE_RE.source, 'g');
  while ((m = re.exec(mall))) set.add(m[1]);
  return [...set];
}

function initKvotKvar(uppgifter) {
  const k = { NAMN: 0, PERSONNUMMER: 0, TELEFON: 0, ORD: 0 };
  for (const u of uppgifter) {
    if (u.typ === 'namn_vanlig') k.NAMN++;
    if (u.typ === 'kollision') { k.NAMN++; k.ORD++; }
    if (u.typ === 'pnr') k.PERSONNUMMER++;
    if (u.typ === 'tel') k.TELEFON++;
  }
  return k;
}

function fyllMall(mall, varden, paSpan) {
  const re = /\{(NAMN|PERSONNUMMER|TELEFON|ORD)\}/g;
  let result = '';
  let last = 0;
  let m;
  while ((m = re.exec(mall))) {
    result += mall.slice(last, m.index);
    const nyckel = m[1];
    const varde = varden[nyckel];
    if (varde === undefined || varde === '') {
      throw new Error(`Tom mallplats {${nyckel}} i mening: ${mall}`);
    }
    const start = [...result].length;
    result += varde;
    const end = [...result].length;
    if (paSpan) paSpan(nyckel, start, end, varde);
    last = m.index + m[0].length;
  }
  result += mall.slice(last);
  return result;
}

function valjMening(slump, mallar, typ, kategori, nyckel, kvotKvar) {
  if (!nyckel) return slump.val(mallar[typ][kategori]);
  const lista = mallar[typ][kategori].filter((m) => {
    const ph = platshallareIMall(m);
    if (!ph.includes(nyckel)) return false;
    return ph.every((p) => kvotKvar[p] > 0);
  });
  if (!lista.length) {
    throw new Error(`Ingen mall med {${nyckel}} och tillräcklig kvot för ${typ}/${kategori}`);
  }
  return slump.val(lista);
}

function forbrukaKvot(kvotKvar, nyckel) {
  kvotKvar[nyckel]--;
}

function planteraSekundar(nyckel, slump, namnpool, kvotKvar, aterstaende) {
  if (nyckel === 'NAMN') {
    const namn = valjNamn(namnpool, slump);
    return {
      varde: namn.text,
      meta: { typ: 'personnamn', 'undertyp eller ark': namn.ark },
      hoppaOver: { typ: 'namn_vanlig', antal: 1 },
    };
  }
  if (nyckel === 'PERSONNUMMER') {
    const pnrUpp = aterstaende.find((u) => u.typ === 'pnr');
    const langd = pnrUpp ? pnrUpp.langd : 'tiosiffriga';
    const bindestreck = pnrUpp ? pnrUpp.bindestreck : false;
    return {
      varde: personnummer(slump, langd, bindestreck),
      meta: { typ: 'personnummer', 'undertyp eller ark': langd },
      hoppaOver: { typ: 'pnr', antal: 1 },
    };
  }
  if (nyckel === 'TELEFON') {
    const telUpp = aterstaende.find((u) => u.typ === 'tel');
    const form = telUpp ? telUpp.form : slump.val(TELEFON_FORMER);
    return {
      varde: telefonnummer(slump, form),
      meta: { typ: 'telefonnummer', 'undertyp eller ark': form },
      hoppaOver: { typ: 'tel', antal: 1 },
    };
  }
  throw new Error(`Okänd sekundär platshållare: ${nyckel}`);
}

function laggTillMening(text, mall, varden, paFacit, plantIdRef) {
  const bas = [...text].length;
  const spans = [];
  const mening = fyllMall(mall, varden, (nyckel, start, end, varde) => {
    const meta = paFacit ? paFacit(nyckel, varde) : null;
    if (meta) {
      spans.push({
        plant_id: `plant-${String(plantIdRef.next++).padStart(4, '0')}`,
        start: bas + start,
        end: bas + end,
        meta,
        ursprunglig: varde,
      });
    }
  });
  return { text: text + mening + '\n\n', spans };
}

function byggDokument(dokId, uppgifter, slump, namnpool, mallar, plantIdRef) {
  const dokTyp = slump.val(DOKUMENTTYPER);
  let text = '';
  const spans = [];
  const kvotKvar = initKvotKvar(uppgifter);
  const hoppaOver = { namn_vanlig: 0, kollision: 0, pnr: 0, tel: 0 };

  function skaHoppa(upp) {
    if (upp.typ === 'namn_vanlig' && hoppaOver.namn_vanlig > 0) { hoppaOver.namn_vanlig--; return true; }
    if (upp.typ === 'kollision' && hoppaOver.kollision > 0) { hoppaOver.kollision--; return true; }
    if (upp.typ === 'pnr' && hoppaOver.pnr > 0) { hoppaOver.pnr--; return true; }
    if (upp.typ === 'tel' && hoppaOver.tel > 0) { hoppaOver.tel--; return true; }
    return false;
  }

  for (let i = 0; i < uppgifter.length; i++) {
    const upp = uppgifter[i];
    if (skaHoppa(upp)) continue;
    const aterstaende = uppgifter.slice(i + 1);

    if (upp.typ === 'kollision') {
      const mallNamn = valjMening(slump, mallar, dokTyp, 'med', 'NAMN', kvotKvar);
      const vardenNamn = {};
      const facitNamn = {};
      for (const p of platshallareIMall(mallNamn)) {
        if (p === 'NAMN') {
          vardenNamn.NAMN = formateraNamn(upp.ord);
          facitNamn.NAMN = { typ: 'personnamn', 'undertyp eller ark': 'kollisionsord' };
        } else {
          const sek = planteraSekundar(p, slump, namnpool, kvotKvar, aterstaende);
          vardenNamn[p] = sek.varde;
          facitNamn[p] = sek.meta;
          if (sek.hoppaOver.typ === 'namn_vanlig') hoppaOver.namn_vanlig += sek.hoppaOver.antal;
          if (sek.hoppaOver.typ === 'pnr') hoppaOver.pnr += sek.hoppaOver.antal;
          if (sek.hoppaOver.typ === 'tel') hoppaOver.tel += sek.hoppaOver.antal;
        }
      }
      for (const p of platshallareIMall(mallNamn)) forbrukaKvot(kvotKvar, p);
      const r1 = laggTillMening(text, mallNamn, vardenNamn, (nyckel, varde) => facitNamn[nyckel] || null, plantIdRef);
      text = r1.text;
      spans.push(...r1.spans);

      const mallOrd = valjMening(slump, mallar, dokTyp, 'kollision', 'ORD', kvotKvar);
      forbrukaKvot(kvotKvar, 'ORD');
      const r2 = laggTillMening(text, mallOrd, { ORD: upp.ord.toLowerCase() }, () => null, plantIdRef);
      text = r2.text;
    } else if (upp.typ === 'namn_vanlig') {
      const namn = valjNamn(namnpool, slump);
      const mall = valjMening(slump, mallar, dokTyp, 'med', 'NAMN', kvotKvar);
      const varden = {};
      const facitMap = {};
      for (const p of platshallareIMall(mall)) {
        if (p === 'NAMN') {
          varden.NAMN = namn.text;
          facitMap.NAMN = { typ: 'personnamn', 'undertyp eller ark': namn.ark };
        } else {
          const sek = planteraSekundar(p, slump, namnpool, kvotKvar, aterstaende);
          varden[p] = sek.varde;
          facitMap[p] = sek.meta;
          if (sek.hoppaOver.typ === 'pnr') hoppaOver.pnr += sek.hoppaOver.antal;
          if (sek.hoppaOver.typ === 'tel') hoppaOver.tel += sek.hoppaOver.antal;
        }
      }
      for (const p of platshallareIMall(mall)) forbrukaKvot(kvotKvar, p);
      const r = laggTillMening(text, mall, varden, (nyckel) => facitMap[nyckel] || null, plantIdRef);
      text = r.text;
      spans.push(...r.spans);
    } else if (upp.typ === 'pnr') {
      const varde = personnummer(slump, upp.langd, upp.bindestreck);
      const mall = valjMening(slump, mallar, dokTyp, 'med', 'PERSONNUMMER', kvotKvar);
      const varden = {};
      const facitMap = {};
      for (const p of platshallareIMall(mall)) {
        if (p === 'PERSONNUMMER') {
          varden.PERSONNUMMER = varde;
          facitMap.PERSONNUMMER = { typ: 'personnummer', 'undertyp eller ark': upp.langd };
        } else {
          const sek = planteraSekundar(p, slump, namnpool, kvotKvar, aterstaende);
          varden[p] = sek.varde;
          facitMap[p] = sek.meta;
          if (sek.hoppaOver.typ === 'namn_vanlig') hoppaOver.namn_vanlig += sek.hoppaOver.antal;
          if (sek.hoppaOver.typ === 'tel') hoppaOver.tel += sek.hoppaOver.antal;
        }
      }
      for (const p of platshallareIMall(mall)) forbrukaKvot(kvotKvar, p);
      const r = laggTillMening(text, mall, varden, (nyckel) => facitMap[nyckel] || null, plantIdRef);
      text = r.text;
      spans.push(...r.spans);
    } else if (upp.typ === 'tel') {
      const varde = telefonnummer(slump, upp.form);
      const mall = valjMening(slump, mallar, dokTyp, 'med', 'TELEFON', kvotKvar);
      const varden = {};
      const facitMap = {};
      for (const p of platshallareIMall(mall)) {
        if (p === 'TELEFON') {
          varden.TELEFON = varde;
          facitMap.TELEFON = { typ: 'telefonnummer', 'undertyp eller ark': upp.form };
        } else {
          const sek = planteraSekundar(p, slump, namnpool, kvotKvar, aterstaende);
          varden[p] = sek.varde;
          facitMap[p] = sek.meta;
          if (sek.hoppaOver.typ === 'namn_vanlig') hoppaOver.namn_vanlig += sek.hoppaOver.antal;
          if (sek.hoppaOver.typ === 'pnr') hoppaOver.pnr += sek.hoppaOver.antal;
        }
      }
      for (const p of platshallareIMall(mall)) forbrukaKvot(kvotKvar, p);
      const r = laggTillMening(text, mall, varden, (nyckel) => facitMap[nyckel] || null, plantIdRef);
      text = r.text;
      spans.push(...r.spans);
    }
  }

  for (let i = 0; i < slump.heltal(1, 2); i++) {
    text += valjMening(slump, mallar, dokTyp, 'utan', null, kvotKvar) + '\n\n';
  }

  text = tillNfc(text.replace(/\s+$/, '') + '\n');
  return { id: dokId, typ: dokTyp, text, spans };
}

function packaIDokument(plan, slump) {
  const grupper = [];
  let buf = [];
  for (const upp of plan) {
    if (upp.typ === 'kollision' && buf.length > 0) {
      grupper.push(buf);
      buf = [];
    }
    buf.push(upp);
    if (buf.length >= slump.heltal(4, 8)) {
      grupper.push(buf);
      buf = [];
    }
  }
  if (buf.length) grupper.push(buf);
  return grupper;
}

function genereraHog({ seed, hogtyp, namnpool, kollisionsord, mallar }) {
  const slump = skapaSlump(seed);
  const plan = slump.blandning(skapaKvotPlan(hogtyp, kollisionsord));
  const grupper = packaIDokument(plan, slump);

  const dokument = [];
  const facit = [];
  const byggda = [];
  const plantIdRef = { next: 1 };

  grupper.forEach((uppgifter, idx) => {
    const dokId = `doc-${String(idx + 1).padStart(4, '0')}`;
    const dok = byggDokument(dokId, uppgifter, slump, namnpool, mallar, plantIdRef);
    byggda.push(dok);
  });

  let korruptaGlobalt = new Set();
  if (hogtyp === 2) {
    const allaIdx = [];
    byggda.forEach((dok, dIdx) => {
      dok.spans.forEach((_, sIdx) => allaIdx.push({ dIdx, sIdx }));
    });
    const antal = Math.floor((allaIdx.length * 30) / 100);
    const valda = slump.blandning(allaIdx).slice(0, antal);
    korruptaGlobalt = new Set(valda.map((v) => `${v.dIdx}:${v.sIdx}`));
  }

  byggda.forEach((dok, dIdx) => {
    let text = dok.text;
    const spans = dok.spans.map((s) => ({ ...s }));

    const ersattningar = [];
    for (let i = 0; i < spans.length; i++) {
      if (hogtyp === 2 && korruptaGlobalt.has(`${dIdx}:${i}`)) {
        const r = korrumperaUppgift(spans[i].ursprunglig, slump);
        ersattningar.push({
          idx: i,
          start: spans[i].start,
          end: spans[i].end,
          ny: r.text,
          typ: r.typ,
        });
      }
    }
    ersattningar.sort((a, b) => b.start - a.start);
    for (const e of ersattningar) {
      const fore = [...text].slice(0, e.start).join('');
      const efter = [...text].slice(e.end).join('');
      const diff = [...e.ny].length - (e.end - e.start);
      text = tillNfc(fore + e.ny + efter);
      spans[e.idx].skadad = e.ny;
      spans[e.idx].korruptionstyp = e.typ;
      spans[e.idx].end = e.start + [...e.ny].length;
      for (let j = 0; j < spans.length; j++) {
        if (j === e.idx) continue;
        if (spans[j].start >= e.end) {
          spans[j].start += diff;
          spans[j].end += diff;
        }
      }
    }

    for (const s of spans) {
      facit.push({
        plant_id: s.plant_id,
        'dokument-id': dok.id,
        typ: s.meta.typ,
        'undertyp eller ark': s.meta['undertyp eller ark'],
        startposition: s.start,
        slutposition: s.end,
        'ursprunglig sträng': s.ursprunglig,
        ...(s.skadad !== undefined ? { 'skadad sträng': s.skadad } : {}),
        ...(s.korruptionstyp ? { korruptionstyp: s.korruptionstyp } : {}),
      });
    }

    dokument.push({ id: dok.id, typ: dok.typ, text });
  });

  return {
    seed,
    hogtyp,
    meta: {
      antalDokument: dokument.length,
      antalFacit: facit.length,
      kvotPoster: plan.length,
    },
    dokument,
    facit,
  };
}

module.exports = { genereraHog, fordelningJamt, skapaKvotPlan };
