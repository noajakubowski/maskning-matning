'use strict';

const fs = require('fs');
const path = require('path');
const { skapaSlump } = require('./slump.js');
const { tillNfc } = require('./text.js');
const { TELEFON_FORMER, personnummer, telefonnummer, valjNamn, formateraNamn } = require('./uppgifter.js');
const {
  korrumperaUppgift,
  nollstallKorruptionstypByten,
  rapporteraKorruptionstypByten,
} = require('./korruption.js');

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

const PLATSHALLARE_RE = /\{(NAMN|PERSONNUMMER|TELEFON|ORD|DIARIENUMMER|BESLUTSDATUM|DATUM)\}/g;
const DEKORATION_NYCKLAR = new Set(['DIARIENUMMER', 'BESLUTSDATUM', 'DATUM']);

function lasDokumentStruktur() {
  const fil = path.join(__dirname, '..', 'docs/gallande-varden.md');
  const rader = fs.readFileSync(fil, 'utf8').split('\n');
  const ut = {
    beslut: { bakgrund: null, skal: null, slut: null },
    ansokan: { arende: null },
    tjansteanteckning: { anteckning: null },
  };
  for (const rad of rader) {
    if (!rad.includes('|')) continue;
    const m = rad.match(/\| ([^|]+?) \| (\d+) \|/);
    if (!m) continue;
    const etikett = m[1].trim().normalize('NFC').toLowerCase();
    const antal = parseInt(m[2], 10);
    if (etikett === 'beslut, meningar i bakgrund') ut.beslut.bakgrund = antal;
    else if (etikett === 'beslut, meningar i skäl') ut.beslut.skal = antal;
    else if (etikett === 'beslut, meningar i beslut') ut.beslut.slut = antal;
    else if (etikett === 'ansökan, meningar i ärendet') ut.ansokan.arende = antal;
    else if (etikett === 'tjänsteanteckning, meningar i anteckning') ut.tjansteanteckning.anteckning = antal;
  }
  if (ut.beslut.bakgrund === null || ut.beslut.skal === null || ut.beslut.slut === null) {
    throw new Error('Saknar antal meningar för beslutsdokument i gallande-varden.md');
  }
  if (ut.ansokan.arende === null || ut.tjansteanteckning.anteckning === null) {
    throw new Error('Saknar antal meningar för ansökan/tjänsteanteckning i gallande-varden.md');
  }
  return ut;
}

function lasBeslutsArIntervall() {
  const fil = path.join(__dirname, '..', 'docs/gallande-varden.md');
  const rader = fs.readFileSync(fil, 'utf8').split('\n');
  let min = null;
  let max = null;
  for (const rad of rader) {
    if (!rad.includes('|')) continue;
    const m = rad.match(/\| ([^|]+?) \| (\d+) \|/);
    if (!m) continue;
    const etikett = m[1].trim().normalize('NFC').toLowerCase();
    const antal = parseInt(m[2], 10);
    if (etikett === 'beslutsår, min') min = antal;
    else if (etikett === 'beslutsår, max') max = antal;
  }
  if (min === null || max === null) {
    throw new Error('Saknar beslutsårsintervall i gallande-varden.md');
  }
  return { min, max };
}

function lasBeslutStruktur() {
  return lasDokumentStruktur().beslut;
}

// Systemklockan får inte styra årtal i en förhandsregistrerad mätning:
// samma frö ska ge identisk korpus oavsett när genereringen körs.
function valjBeslutsar(slump) {
  const { min, max } = lasBeslutsArIntervall();
  return slump.heltal(min, max);
}

function genereraDiarienummer(slump, ar) {
  const lop = slump.heltal(1, 9999);
  return ar + '/' + String(lop).padStart(4, '0');
}

function genereraBeslutsdatum(slump, ar) {
  const manad = String(slump.heltal(1, 12)).padStart(2, '0');
  const dag = String(slump.heltal(1, 28)).padStart(2, '0');
  return ar + '-' + manad + '-' + dag;
}

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
  const re = /\{(NAMN|PERSONNUMMER|TELEFON|ORD|DIARIENUMMER|BESLUTSDATUM|DATUM)\}/g;
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
    if (paSpan && !DEKORATION_NYCKLAR.has(nyckel)) paSpan(nyckel, start, end, varde);
    last = m.index + m[0].length;
  }
  result += mall.slice(last);
  return result;
}

function valjMening(slump, mallar, typ, kategori, nyckel, kvotKvar, { endastNyckel = false } = {}) {
  if (!nyckel) return slump.val(mallar[typ][kategori]);
  const lista = mallar[typ][kategori].filter((m) => {
    const ph = platshallareIMall(m);
    if (!ph.includes(nyckel)) return false;
    if (endastNyckel && ph.some((p) => !DEKORATION_NYCKLAR.has(p) && p !== nyckel)) return false;
    return ph.every((p) => DEKORATION_NYCKLAR.has(p) || kvotKvar[p] > 0);
  });
  if (!lista.length) {
    throw new Error(`Ingen mall med {${nyckel}} och tillräcklig kvot för ${typ}/${kategori}`);
  }
  return slump.val(lista);
}

function valjMeningarUtanAterlaggning(slump, mallar, typ, kategori, antal) {
  const pool = mallar[typ][kategori];
  if (antal > pool.length) {
    throw new Error(`För få mallar i ${typ}/${kategori}: behöver ${antal}, har ${pool.length}`);
  }
  return slump.blandning(pool).slice(0, antal);
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

function laggTillAvsnittsrubrik(text, rubrik) {
  if (!text.length) return rubrik + '\n\n';
  return text.replace(/\n+$/, '') + '\n\n' + rubrik + '\n\n';
}

function laggTillMeningar(text, meningar) {
  if (!meningar.length) return text;
  return text + meningar.join('\n') + '\n';
}

function laggTillMening(text, mall, varden, paFacit, plantIdRef) {
  const bas = [...text].length;
  let prefix = '';
  if (text.length && !text.endsWith('\n\n')) prefix = '\n';
  const offset = [...prefix].length;
  const spans = [];
  const mening = fyllMall(mall, varden, (nyckel, start, end, varde) => {
    const meta = paFacit ? paFacit(nyckel, varde) : null;
    if (meta) {
      spans.push({
        plant_id: `plant-${String(plantIdRef.next++).padStart(4, '0')}`,
        start: bas + offset + start,
        end: bas + offset + end,
        meta,
        ursprunglig: varde,
      });
    }
  });
  let nyText;
  if (!text.length) nyText = mening + '\n';
  else if (text.endsWith('\n\n')) nyText = text + mening + '\n';
  else nyText = text + prefix + mening;
  return { text: nyText, spans };
}

function skapaHoppaOver() {
  return { namn_vanlig: 0, kollision: 0, pnr: 0, tel: 0 };
}

function skaHoppa(upp, hoppaOver) {
  if (upp.typ === 'namn_vanlig' && hoppaOver.namn_vanlig > 0) { hoppaOver.namn_vanlig--; return true; }
  if (upp.typ === 'kollision' && hoppaOver.kollision > 0) { hoppaOver.kollision--; return true; }
  if (upp.typ === 'pnr' && hoppaOver.pnr > 0) { hoppaOver.pnr--; return true; }
  if (upp.typ === 'tel' && hoppaOver.tel > 0) { hoppaOver.tel--; return true; }
  return false;
}

function bearbetaUppgift(text, spans, upp, i, uppgifter, dokTyp, slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, dekoration, medKategori = 'med', { endastPrimar = false } = {}) {
  if (skaHoppa(upp, hoppaOver)) return { text, spans };
  const aterstaende = uppgifter.slice(i + 1);

  if (upp.typ === 'kollision') {
    const mallNamn = valjMening(slump, mallar, dokTyp, medKategori, 'NAMN', kvotKvar, { endastNyckel: endastPrimar });
    const vardenNamn = dekoration ? { ...dekoration } : {};
    const facitNamn = {};
    for (const p of platshallareIMall(mallNamn)) {
      if (p === 'NAMN') {
        vardenNamn.NAMN = formateraNamn(upp.ord);
        facitNamn.NAMN = { typ: 'personnamn', 'undertyp eller ark': 'kollisionsord' };
      } else if (DEKORATION_NYCKLAR.has(p)) {
        vardenNamn[p] = dekoration[p];
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
    const r1 = laggTillMening(text, mallNamn, vardenNamn, (nyckel) => facitNamn[nyckel] || null, plantIdRef);
    text = r1.text;
    spans.push(...r1.spans);

    const mallOrd = valjMening(slump, mallar, dokTyp, 'kollision', 'ORD', kvotKvar);
    forbrukaKvot(kvotKvar, 'ORD');
    const r2 = laggTillMening(text, mallOrd, { ORD: upp.ord.toLowerCase() }, () => null, plantIdRef);
    text = r2.text;
    return { text, spans };
  }

  if (upp.typ === 'namn_vanlig') {
    const namn = valjNamn(namnpool, slump);
    const mall = valjMening(slump, mallar, dokTyp, medKategori, 'NAMN', kvotKvar, { endastNyckel: endastPrimar });
    const varden = dekoration ? { ...dekoration } : {};
    const facitMap = {};
    for (const p of platshallareIMall(mall)) {
      if (p === 'NAMN') {
        varden.NAMN = namn.text;
        facitMap.NAMN = { typ: 'personnamn', 'undertyp eller ark': namn.ark };
      } else if (DEKORATION_NYCKLAR.has(p)) {
        varden[p] = dekoration[p];
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
    return { text: r.text, spans: spans.concat(r.spans) };
  }

  if (upp.typ === 'pnr') {
    const varde = personnummer(slump, upp.langd, upp.bindestreck);
    const mall = valjMening(slump, mallar, dokTyp, medKategori, 'PERSONNUMMER', kvotKvar, { endastNyckel: endastPrimar });
    const varden = dekoration ? { ...dekoration } : {};
    const facitMap = {};
    for (const p of platshallareIMall(mall)) {
      if (p === 'PERSONNUMMER') {
        varden.PERSONNUMMER = varde;
        facitMap.PERSONNUMMER = { typ: 'personnummer', 'undertyp eller ark': upp.langd };
      } else if (DEKORATION_NYCKLAR.has(p)) {
        varden[p] = dekoration[p];
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
    return { text: r.text, spans: spans.concat(r.spans) };
  }

  if (upp.typ === 'tel') {
    const varde = telefonnummer(slump, upp.form);
    const mall = valjMening(slump, mallar, dokTyp, medKategori, 'TELEFON', kvotKvar, { endastNyckel: endastPrimar });
    const varden = dekoration ? { ...dekoration } : {};
    const facitMap = {};
    for (const p of platshallareIMall(mall)) {
      if (p === 'TELEFON') {
        varden.TELEFON = varde;
        facitMap.TELEFON = { typ: 'telefonnummer', 'undertyp eller ark': upp.form };
      } else if (DEKORATION_NYCKLAR.has(p)) {
        varden[p] = dekoration[p];
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
    return { text: r.text, spans: spans.concat(r.spans) };
  }

  return { text, spans };
}

function bearbetaFormaliaUppgift(text, spans, upp, i, uppgifter, slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, dekoration) {
  return bearbetaUppgift(text, spans, upp, i, uppgifter, 'beslut', slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, dekoration, 'formalia', { endastPrimar: true });
}

function byggBeslutDokument(dokId, uppgifter, slump, namnpool, mallar, plantIdRef, struktur) {
  let text = '';
  let spans = [];
  const kvotKvar = initKvotKvar(uppgifter);
  const hoppaOver = skapaHoppaOver();
  const ar = valjBeslutsar(slump);
  const dekoration = {
    DIARIENUMMER: genereraDiarienummer(slump, ar),
    BESLUTSDATUM: genereraBeslutsdatum(slump, ar),
  };

  const rubrikMall = valjMening(slump, mallar, 'beslut', 'rubrik', null, kvotKvar);
  text = rubrikMall + '\n\n';
  text += 'Diarienummer: ' + dekoration.DIARIENUMMER + '\n';
  text += 'Beslutsdatum: ' + dekoration.BESLUTSDATUM + '\n\n';

  // Formaliablocket: raderna efter rubrik, diarienummer och datum, fram till
  // första avsnittsrubriken (BAKGRUND). Formalia är det enda avsnitt där
  // personuppgifter planteras i beslut.
  for (let i = 0; i < uppgifter.length; i++) {
    const r = bearbetaFormaliaUppgift(text, spans, uppgifter[i], i, uppgifter, slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, dekoration);
    text = r.text;
    spans = r.spans;
  }

  text = laggTillAvsnittsrubrik(text.replace(/\n+$/, ''), 'BAKGRUND');
  text = laggTillMeningar(text, valjMeningarUtanAterlaggning(slump, mallar, 'beslut', 'bakgrund', struktur.beslut.bakgrund));

  text = laggTillAvsnittsrubrik(text.replace(/\n+$/, ''), 'SKÄL');
  text = laggTillMeningar(text, valjMeningarUtanAterlaggning(slump, mallar, 'beslut', 'skal', struktur.beslut.skal));

  text = laggTillAvsnittsrubrik(text.replace(/\n+$/, ''), 'BESLUT');
  text = laggTillMeningar(text, valjMeningarUtanAterlaggning(slump, mallar, 'beslut', 'slut', struktur.beslut.slut));

  text = tillNfc(text.replace(/\s+$/, '') + '\n');
  return { id: dokId, typ: 'beslut', text, spans };
}

function byggAnsokanDokument(dokId, uppgifter, slump, namnpool, mallar, plantIdRef, struktur) {
  let text = '';
  let spans = [];
  const kvotKvar = initKvotKvar(uppgifter);
  const hoppaOver = skapaHoppaOver();

  const rubrikMall = valjMening(slump, mallar, 'ansokan', 'rubrik', null, kvotKvar);
  text = rubrikMall + '\n\n';

  for (let i = 0; i < uppgifter.length; i++) {
    const r = bearbetaUppgift(text, spans, uppgifter[i], i, uppgifter, 'ansokan', slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, null);
    text = r.text;
    spans = r.spans;
  }

  text = laggTillAvsnittsrubrik(text.replace(/\n+$/, ''), 'ÄRENDET');
  text = laggTillMeningar(text, valjMeningarUtanAterlaggning(slump, mallar, 'ansokan', 'arende', struktur.ansokan.arende));

  text = tillNfc(text.replace(/\s+$/, '') + '\n');
  return { id: dokId, typ: 'ansokan', text, spans };
}

function byggTjansteanteckningDokument(dokId, uppgifter, slump, namnpool, mallar, plantIdRef, struktur) {
  let text = '';
  let spans = [];
  const kvotKvar = initKvotKvar(uppgifter);
  const hoppaOver = skapaHoppaOver();
  const datum = genereraBeslutsdatum(slump, valjBeslutsar(slump));

  const rubrikMall = valjMening(slump, mallar, 'tjansteanteckning', 'rubrik', null, kvotKvar);
  text = fyllMall(rubrikMall, { DATUM: datum }) + '\n\n';

  for (let i = 0; i < uppgifter.length; i++) {
    const r = bearbetaUppgift(text, spans, uppgifter[i], i, uppgifter, 'tjansteanteckning', slump, namnpool, mallar, kvotKvar, hoppaOver, plantIdRef, null);
    text = r.text;
    spans = r.spans;
  }

  text = laggTillAvsnittsrubrik(text.replace(/\n+$/, ''), 'ANTECKNING');
  text = laggTillMeningar(text, valjMeningarUtanAterlaggning(slump, mallar, 'tjansteanteckning', 'anteckning', struktur.tjansteanteckning.anteckning));

  text = tillNfc(text.replace(/\s+$/, '') + '\n');
  return { id: dokId, typ: 'tjansteanteckning', text, spans };
}

function packaRest(uppgifter, slump) {
  const grupper = [];
  let buf = [];
  for (const upp of uppgifter) {
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

function planeraDokument(plan, slump) {
  const namn = [];
  const pnr = [];
  const tel = [];
  const ordningRest = [];

  for (const upp of plan) {
    if (upp.typ === 'namn_vanlig' || upp.typ === 'kollision') namn.push(upp);
    else if (upp.typ === 'pnr') pnr.push(upp);
    else if (upp.typ === 'tel') tel.push(upp);
  }

  const antalBeslut = Math.min(namn.length, pnr.length, tel.length);
  const dokument = [];

  for (let i = 0; i < antalBeslut; i++) {
    dokument.push({ typ: 'beslut', uppgifter: [namn[i], pnr[i], tel[i]] });
  }

  const bundna = new Set();
  for (let i = 0; i < antalBeslut; i++) {
    bundna.add(namn[i]);
    bundna.add(pnr[i]);
    bundna.add(tel[i]);
  }

  for (const upp of plan) {
    if (!bundna.has(upp)) ordningRest.push(upp);
  }

  for (const grupp of packaRest(ordningRest, slump)) {
    dokument.push({
      typ: slump.val(['ansokan', 'tjansteanteckning']),
      uppgifter: grupp,
    });
  }

  return dokument;
}

function genereraHog({ seed, hogtyp, namnpool, kollisionsord, mallar }) {
  nollstallKorruptionstypByten();
  const slump = skapaSlump(seed);
  const plan = slump.blandning(skapaKvotPlan(hogtyp, kollisionsord));
  const struktur = lasDokumentStruktur();
  const dokumentPlan = planeraDokument(plan, slump);

  const dokument = [];
  const facit = [];
  const byggda = [];
  const plantIdRef = { next: 1 };

  dokumentPlan.forEach((spec, idx) => {
    const dokId = `doc-${String(idx + 1).padStart(4, '0')}`;
    let dok;
    if (spec.typ === 'beslut') {
      dok = byggBeslutDokument(dokId, spec.uppgifter, slump, namnpool, mallar, plantIdRef, struktur);
    } else if (spec.typ === 'ansokan') {
      dok = byggAnsokanDokument(dokId, spec.uppgifter, slump, namnpool, mallar, plantIdRef, struktur);
    } else {
      dok = byggTjansteanteckningDokument(dokId, spec.uppgifter, slump, namnpool, mallar, plantIdRef, struktur);
    }
    byggda.push(dok);
  });

  const beslutUtanSokande = byggda.filter((d) => {
    if (d.typ !== 'beslut') return false;
    return !d.spans.some((s) => s.meta.typ === 'personnamn');
  }).length;
  if (beslutUtanSokande > 0) {
    console.error('beslut utan sökande: ' + beslutUtanSokande);
  }

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

  rapporteraKorruptionstypByten();

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

module.exports = {
  genereraHog,
  fordelningJamt,
  skapaKvotPlan,
  lasDokumentStruktur,
  lasBeslutStruktur,
  lasBeslutsArIntervall,
  planeraDokument,
  valjMeningarUtanAterlaggning,
};
