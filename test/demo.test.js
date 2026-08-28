#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { detekteraDokument } = require('../detektor/index.js');
const { genereraHog } = require('../generator/index.js');
const { valjMallar } = require('../generator/mallar.js');
const { skapaSlump } = require('../generator/slump.js');

const repo = path.resolve(__dirname, '..');
let fel = 0;

function fail(msg) {
  console.error('BRIST: ' + msg);
  fel++;
}

function lasFro(fil) {
  const text = fs.readFileSync(fil, 'utf8');
  const m = text.match(/^\s*frö\s+(\S+)\s*$/m);
  if (!m) return null;
  return m[1];
}

function lasKollisionsord(fil) {
  const text = fs.readFileSync(fil, 'utf8');
  const ord = [];
  for (const rad of text.split('\n')) {
    const m = rad.match(/^\| ([^|]+) \|/);
    if (!m) continue;
    const o = m[1].trim();
    if (o === 'Ord' || o.startsWith('---')) continue;
    ord.push({ ord: o });
  }
  return ord;
}

function lasData() {
  const dataFil = path.join(repo, 'demo/data.js');
  if (!fs.existsSync(dataFil)) return null;
  return require('../demo/data.js');
}

function testHtmlIngenNatverkskod() {
  const fil = path.join(repo, 'demo/index.html');
  if (!fs.existsSync(fil)) {
    fail('saknar demo/index.html');
    return;
  }
  const rader = fs.readFileSync(fil, 'utf8').split('\n');
  const forbjudet = ['fetch(', 'XMLHttpRequest', 'http://', 'https://'];
  let granskade = 0;
  const extra = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    for (const t of forbjudet) {
      if (!rader[i].includes(t)) continue;
      const tillaten =
        rader[i].includes('testa-matare') && rader[i].includes('matare-test');
      if (!tillaten) extra.push(fil + ':' + (i + 1) + ' ' + t);
    }
  }
  if (granskade === 0) {
    fail('html: noll rader granskade');
    return;
  }
  if (extra.length) fail('nätverkskod utanför knappen: ' + extra.join('; '));
  else console.log('OK  index.html nätverkskod bara i mätarknappen (' + granskade + ' rader)');
}

function testFacitPekarRatt() {
  const data = lasData();
  if (!data || !data.dokument) {
    fail('saknar DEMODATA.dokument');
    return;
  }
  let granskade = 0;
  let felPek = 0;
  for (const dok of data.dokument) {
    for (const p of dok.facit || []) {
      granskade++;
      const vantad = p['skadad sträng'] || p['ursprunglig sträng'];
      const faktisk = [...dok.text].slice(p.startposition, p.slutposition).join('');
      if (faktisk !== vantad) felPek++;
    }
  }
  if (granskade === 0) {
    fail('facitpositioner: noll poster granskade');
    return;
  }
  if (felPek) fail(felPek + ' facitposter pekar fel');
  else console.log('OK  facitpositioner pekar rätt (' + granskade + ' poster)');
}

function testAntalMotKorpus() {
  const data = lasData();
  if (!data || !data.dokument) {
    fail('saknar DEMODATA.dokument');
    return;
  }
  const fro = lasFro(path.join(repo, 'docs/fro.md'));
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fro || !fs.existsSync(namnpoolPath)) {
    fail('saknar frö eller namnpool för korpusjämförelse');
    return;
  }
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const kollisionsord = lasKollisionsord(path.join(repo, 'generator/kollisionslista.md'));
  const mallar = valjMallar(skapaSlump(fro));
  const hog1 = genereraHog({ seed: fro, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const hog2 = genereraHog({ seed: fro, hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const hog3 = genereraHog({ seed: fro, hogtyp: 3, namnpool, kollisionsord, mallar });
  const korpus = [hog1, hog2, hog3];
  let granskade = 0;
  for (const hog of korpus) granskade += hog.dokument.length;
  const perData = { 1: 0, 2: 0, 3: 0 };
  for (const dok of data.dokument) perData[dok.hog] = (perData[dok.hog] || 0) + 1;
  const perKorpus = {
    1: hog1.dokument.length,
    2: hog2.dokument.length,
    3: hog3.dokument.length,
  };
  if (granskade === 0) {
    fail('korpus: noll dokument granskade');
    return;
  }
  if (perData[1] !== perKorpus[1] || perData[2] !== perKorpus[2] || perData[3] !== perKorpus[3]) {
    fail(
      'antal dokument stämmer inte: data ' +
        JSON.stringify(perData) +
        ' korpus ' +
        JSON.stringify(perKorpus),
    );
  } else {
    console.log(
      'OK  dokumentantal = korpusen (' +
        granskade +
        ' dokument: hög1 ' +
        perKorpus[1] +
        ', hög2 ' +
        perKorpus[2] +
        ', hög3 ' +
        perKorpus[3] +
        ')',
    );
  }
}

function tioDokument(lista) {
  const per = { 1: [], 2: [], 3: [] };
  for (const dok of lista) {
    if (per[dok.hog]) per[dok.hog].push(dok);
  }
  return per[1].slice(0, 4).concat(per[2].slice(0, 3), per[3].slice(0, 3));
}

function testPaketTioDokument() {
  const webbFil = path.join(repo, 'demo/detektor-webb.js');
  const lexikonFil = path.join(repo, 'detektor/namn/lexikon.json');
  if (!fs.existsSync(webbFil)) {
    fail('saknar demo/detektor-webb.js');
    return;
  }
  if (!fs.existsSync(lexikonFil)) {
    fail('saknar detektor/namn/lexikon.json');
    return;
  }
  const data = lasData();
  if (!data || !data.dokument || data.dokument.length === 0) {
    fail('tio dokument: noll poster i data.js');
    return;
  }
  const lexikon = JSON.parse(fs.readFileSync(lexikonFil, 'utf8'));
  const paketerad = require('../demo/detektor-webb.js');
  const texter = tioDokument(data.dokument);
  if (texter.length === 0) {
    fail('tio dokument: noll dokument att granska');
    return;
  }
  let flaggor = 0;
  let granskade = 0;
  for (const t of texter) {
    granskade++;
    const orig = detekteraDokument(t.id, t.text, lexikon);
    const pak = paketerad.detekteraDokument(t.id, t.text, lexikon);
    flaggor += orig.monster.length + orig.lexikon.length;
    if (JSON.stringify(orig) !== JSON.stringify(pak)) fail('flaggor skiljer sig för ' + t.id);
  }
  if (!fel) {
    console.log(
      'OK  paketerad detektor = originalet (' +
        flaggor +
        ' flaggor, ' +
        granskade +
        ' dokument ur data.js)',
    );
  }
}

function testIngaFlikar() {
  const fil = path.join(repo, 'demo/index.html');
  const rader = fs.readFileSync(fil, 'utf8').split('\n');
  let granskade = 0;
  const traff = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (rader[i].toLowerCase().includes('flik')) traff.push(i + 1);
  }
  if (granskade === 0) {
    fail('flikar: noll rader granskade');
    return;
  }
  if (traff.length) fail('index.html nämner flik på rad ' + traff.join(', '));
  else console.log('OK  inga flikar (' + granskade + ' rader)');
}

function testSammaDokumentnummer() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const data = lasData();
  if (!data || !data.dokument || data.dokument.length === 0) {
    fail('samma dokumentnummer: noll poster i data.js');
    return;
  }
  const per = { 1: [], 2: [], 3: [] };
  for (const dok of data.dokument) {
    if (per[dok.hog]) per[dok.hog].push(dok);
  }
  const n = Math.min(per[1].length, per[2].length, per[3].length);
  let granskade = 0;
  let felId = 0;
  for (let i = 0; i < n; i++) {
    granskade++;
    if (per[1][i].id !== per[2][i].id) felId++;
    if (per[1][i].id !== per[3][i].id) felId++;
  }
  if (granskade === 0) {
    fail('samma dokumentnummer: noll dokument granskade');
    return;
  }
  const kodOk =
    html.includes('perHog[1][index]') &&
    html.includes('perHog[2][index]') &&
    html.includes('perHog[3][index]') &&
    html.includes('id="spalt-1"') &&
    html.includes('id="spalt-2"') &&
    html.includes('id="spalt-3"');
  if (!kodOk) fail('spalterna använder inte samma index');
  if (felId) fail(felId + ' löpnummer har olika id');
  if (kodOk && !felId) {
    console.log('OK  samma dokumentnummer i tre spalter (' + granskade + ' löpnummer, kod använder samma index)');
  }
}

function testFelflaggadeKollisioner() {
  const data = lasData();
  const webbFil = path.join(repo, 'demo/detektor-webb.js');
  if (!data || !data.dokument) {
    fail('kollision: saknar data');
    return;
  }
  if (!fs.existsSync(webbFil)) {
    fail('kollision: saknar detektor-webb.js');
    return;
  }
  const lexikon = JSON.parse(fs.readFileSync(path.join(repo, 'detektor/namn/lexikon.json'), 'utf8'));
  const { slaaIhopSpann } = require('../demo/detektor-webb.js');
  const h3 = data.dokument.filter((x) => x.hog === 3);
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  if (!html.includes("=== 'kollisionsord'")) {
    fail('kollision: sidan hårdkodar inte mot facit-undertyp kollisionsord');
    return;
  }
  let granskade = 0;
  let medFel = 0;
  for (const dok of h3) {
    const kollPoster = (dok.facit || []).filter((p) => (p['undertyp eller ark'] || '') === 'kollisionsord');
    if (!kollPoster.length) continue;
    granskade++;
    const r = detekteraDokument(dok.id, dok.text, lexikon);
    const spann = slaaIhopSpann(
      r.monster.concat(r.lexikon).map((f) => ({
        start: f.startposition,
        end: f.slutposition,
        typ: f.typ,
      })),
    );
    const facit = dok.facit || [];
    let dokFel = 0;
    for (const s of spann) {
      const overFacit = facit.some(
        (p) => s.start < p.slutposition && s.end > p.startposition,
      );
      if (overFacit) continue;
      const text = [...dok.text].slice(s.start, s.end).join('');
      const arKoll = kollPoster.some(
        (p) => (p['ursprunglig sträng'] || '').toLowerCase() === text.toLowerCase(),
      );
      if (arKoll) dokFel++;
    }
    if (dokFel) medFel++;
    if (granskade >= 10) break;
  }
  if (granskade === 0) {
    fail('kollision: noll dokument granskade');
    return;
  }
  if (granskade < 10) fail('kollision: bara ' + granskade + ' dokument, behöver minst 10');
  if (medFel === 0) fail('kollision: inga felflaggade kollisionsord i de ' + granskade + ' dokumenten');
  else console.log('OK  felflaggade kollisionsord mot facit (' + granskade + ' dokument ur hög 3, ' + medFel + ' med felflaggat kollisionsord)');
}

function testExempelIDatan() {
  const data = lasData();
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  if (!data || !data.dokument) {
    fail('exempel: saknar data');
    return;
  }
  const alla = data.dokument.map((x) => x.text).join('\n');
  const re = /data-exempel>([^<]+)</g;
  const exempel = [];
  let m;
  while ((m = re.exec(html)) !== null) exempel.push(m[1]);
  if (exempel.length === 0) {
    fail('exempel: noll poster granskade');
    return;
  }
  const saknas = [];
  for (const e of exempel) {
    if (!alla.includes(e)) saknas.push(e);
  }
  if (saknas.length) fail('exempel saknas i data.js: ' + saknas.join(', '));
  else console.log('OK  ingressens exempel finns i data.js (' + exempel.length + ' poster: ' + exempel.join(', ') + ')');
}

function testOppnarMaskerat() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const rader = html.split('\n');
  let granskade = 0;
  let lageRader = 0;
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (/lage-maskerat|var maskerat/.test(rader[i])) lageRader++;
  }
  if (granskade === 0) {
    fail('maskerat: noll rader granskade');
    return;
  }
  const body = html.match(/<body[^>]*>/);
  const klass = !!(body && body[0].includes('lage-maskerat'));
  const startarTrue = /var maskerat = true/.test(html);
  if (!klass) fail('maskerat: body saknar class lage-maskerat vid öppning');
  if (!startarTrue) fail('maskerat: var maskerat startar inte som true');
  if (klass && startarTrue) {
    console.log(
      'OK  sidan öppnar i maskerat läge (' +
        granskade +
        ' rader, ' +
        lageRader +
        ' nämner läget)',
    );
  }
}

function testSlumpknapp() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const knappar = html.split('\n').filter((r) => r.includes('id="slumpa"'));
  const granskade = knappar.length;
  if (granskade === 0) {
    fail('slump: noll knappar granskade');
    return;
  }
  const handler = html.match(
    /getElementById\('slumpa'\)\.addEventListener\('click',\s*function\s*\(\)\s*\{([^}]+)\}/,
  );
  if (!handler || !/index\s*=\s*Math\.floor\(\s*Math\.random\(\)\s*\*\s*antal\s*\)/.test(handler[1])) {
    fail('slump: knappen sätter inte index från Math.random * antal');
    return;
  }
  const data = lasData();
  const per = { 1: 0, 2: 0, 3: 0 };
  for (const dok of (data && data.dokument) || []) {
    if (per[dok.hog] !== undefined) per[dok.hog]++;
  }
  const antal = Math.min(per[1], per[2], per[3]);
  if (antal === 0) {
    fail('slump: noll dokument att slumpa bland');
    return;
  }
  let index = 0;
  const sedda = new Set([index]);
  for (let n = 0; n < 40; n++) {
    index = Math.floor(Math.random() * antal);
    sedda.add(index);
  }
  if (sedda.size < 2) fail('slump: dokumentnummer byttes inte på 40 dragningar');
  else {
    console.log(
      'OK  slumpknapp finns och byter dokumentnummer (' +
        granskade +
        ' knapp, ' +
        sedda.size +
        ' unika nummer på 40 dragningar ur ' +
        antal +
        ')',
    );
  }
}

function testNatverkBaraMatarknapp() {
  const fil = path.join(repo, 'demo/index.html');
  const rader = fs.readFileSync(fil, 'utf8').split('\n');
  const forbjudet = ['fetch(', 'XMLHttpRequest', 'http://', 'https://'];
  let granskade = 0;
  const extra = [];
  const tillatna = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    for (const t of forbjudet) {
      if (!rader[i].includes(t)) continue;
      const tillaten = rader[i].includes('testa-matare') && rader[i].includes('matare-test');
      if (tillaten) tillatna.push(fil + ':' + (i + 1) + ' ' + t);
      else extra.push(fil + ':' + (i + 1) + ' ' + t);
    }
  }
  if (granskade === 0) {
    fail('nätverk: noll rader granskade');
    return;
  }
  if (extra.length) fail('nätverkskod utanför knappen: ' + extra.join('; '));
  else {
    console.log(
      'OK  inga nätverksanrop utom mätarknappen (' +
        granskade +
        ' rader, ' +
        tillatna.length +
        ' tillåtna träffar på knappraden)',
    );
  }
}

function testIngressExempelIDataIgen() {
  const data = lasData();
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  if (!data || !data.dokument) {
    fail('ingress-exempel: saknar data');
    return;
  }
  const alla = data.dokument.map((x) => x.text).join('\n');
  const re = /data-exempel>([^<]+)</g;
  const exempel = [];
  let m;
  while ((m = re.exec(html)) !== null) exempel.push(m[1]);
  if (exempel.length === 0) {
    fail('ingress-exempel: noll poster granskade');
    return;
  }
  const saknas = [];
  for (const e of exempel) {
    if (!alla.includes(e)) saknas.push(e);
  }
  if (saknas.length) fail('ingress-exempel saknas i data.js: ' + saknas.join(', '));
  else {
    console.log(
      'OK  varje exempel i ingressen finns i data.js (' +
        exempel.length +
        ' poster: ' +
        exempel.join(', ') +
        ')',
    );
  }
}

function testLista1BaraObservator() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const start = html.lastIndexOf('<script>');
  const script = start >= 0 ? html.slice(start) : '';
  const rader = script.split('\n');
  let granskade = 0;
  const refs = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (rader[i].includes('lista-matare')) refs.push(rader[i].trim());
  }
  if (granskade === 0) {
    fail('lista1: noll rader granskade');
    return;
  }
  const skriv = refs.filter((t) => /appendChild|innerHTML|textContent\s*=/.test(t));
  if (skriv.length === 0) {
    fail('lista1: noll skrivningar granskade');
    return;
  }
  if (skriv.length !== 1 || !skriv[0].includes("getElementById('lista-matare').appendChild")) {
    fail('lista1: annan kod skriver till listan: ' + skriv.join(' | '));
    return;
  }
  const iObs = script.indexOf('new PerformanceObserver');
  const iFn = script.indexOf('function laggMatareFranObservator');
  const iAnrop = script.indexOf('laggMatareFranObservator(arr[k])');
  if (iObs < 0 || iFn < 0 || iAnrop < 0 || iAnrop < iObs) {
    fail('lista1: observatörens callback anropar inte laggMatareFranObservator');
    return;
  }
  console.log(
    'OK  lista 1 skrivs bara från observatören (' +
      granskade +
      ' rader, ' +
      refs.length +
      ' nämner lista-matare, ' +
      skriv.length +
      ' skrivning)',
  );
}

function testIngenLindningNatverk() {
  const rader = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8').split('\n');
  const monster = [
    /window\.fetch\s*=/,
    /\bfetch\s*=\s*function/,
    /XMLHttpRequest\.prototype/,
    /sendBeacon\s*=/,
    /const\s+origFetch/,
    /originalFetch/,
  ];
  let granskade = 0;
  const felTraff = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    for (const m of monster) {
      if (m.test(rader[i])) felTraff.push(i + 1);
    }
  }
  if (granskade === 0) {
    fail('lindning: noll rader granskade');
    return;
  }
  if (felTraff.length) fail('lindning av nätverksfunktion på rad ' + felTraff.join(', '));
  else console.log('OK  fetch, XMLHttpRequest och sendBeacon lindas inte (' + granskade + ' rader)');
}

function testTvaListorOlikaId() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const ider = [...html.matchAll(/id=["']([^"']*(?:logg|lista)[^"']*)["']/g)].map((m) => m[1]);
  const unika = [...new Set(ider)];
  const granskade = unika.length;
  if (granskade === 0) {
    fail('list-id: noll poster granskade');
    return;
  }
  if (unika.length < 2) fail('list-id: färre än två olika id: ' + unika.join(', '));
  else if (unika.indexOf('lista-matare') < 0 || unika.indexOf('lista-forsok') < 0) {
    fail('list-id: saknar lista-matare eller lista-forsok: ' + unika.join(', '));
  } else {
    console.log(
      'OK  två listor med olika id (' +
        granskade +
        ' unika: ' +
        unika.join(', ') +
        ')',
    );
  }
}

function testMaskeratOchSlumpKvar() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const rader = html.split('\n');
  let granskade = 0;
  let mask = 0;
  let slump = 0;
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (/lage-maskerat|var maskerat = true/.test(rader[i])) mask++;
    if (rader[i].includes('id="slumpa"') || rader[i].includes('Slumpa dokument')) slump++;
  }
  if (granskade === 0) {
    fail('kvar: noll rader granskade');
    return;
  }
  const body = html.match(/<body[^>]*>/);
  const klass = !!(body && body[0].includes('lage-maskerat'));
  const startarTrue = /var maskerat = true/.test(html);
  const harSlump = html.includes('id="slumpa"') && html.includes('Slumpa dokument');
  if (!klass || !startarTrue) fail('kvar: öppnar inte maskerat');
  if (!harSlump) fail('kvar: slumpknapp saknas');
  if (klass && startarTrue && harSlump) {
    console.log(
      'OK  öppnar maskerat och slumpknapp finns (' +
        granskade +
        ' rader, ' +
        mask +
        ' nämner läget, ' +
        slump +
        ' nämner slump)',
    );
  }
}

function testEgenSammaDetektor() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const start = html.lastIndexOf('<script>');
  const script = start >= 0 ? html.slice(start) : '';
  const rader = script.split('\n');
  let granskade = 0;
  const flagg = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (rader[i].includes('flaggSpann(')) flagg.push(rader[i].trim());
  }
  if (granskade === 0) {
    fail('egen-detektor: noll rader granskade');
    return;
  }
  const spalt = flagg.some((t) => t.includes('flaggSpann(dok)'));
  const egen = flagg.some((t) => t.includes("flaggSpann({ id: 'egen-text'"));
  if (!spalt) fail('egen-detektor: spalterna anropar inte flaggSpann(dok)');
  if (!egen) fail('egen-detektor: egen text anropar inte samma flaggSpann');
  if (spalt && egen) {
    console.log(
      'OK  egen text körs genom samma flaggSpann som spalterna (' +
        granskade +
        ' rader, ' +
        flagg.length +
        ' anrop)',
    );
  }
}

function testEgenIngenLagringEllerNat() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const start = html.lastIndexOf('<script>');
  const script = start >= 0 ? html.slice(start) : '';
  const iEx = script.indexOf('function byggExempeltext');
  const iStang = script.indexOf("getElementById('egen-stang')");
  if (iEx < 0 || iStang < 0) {
    fail('egen-lagring: hittar inte egen-text-koden');
    return;
  }
  const stycke = script.slice(iEx, iStang + 200);
  const rader = stycke.split('\n');
  const forbjudet = ['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'https://', 'http://'];
  let granskade = 0;
  const extra = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    for (const t of forbjudet) {
      if (rader[i].includes(t)) extra.push(t);
    }
  }
  if (granskade === 0) {
    fail('egen-lagring: noll rader granskade');
    return;
  }
  if (extra.length) fail('egen-lagring: förbjuden träff ' + extra.join(', '));
  else console.log('OK  egen text utan lagring eller nätverk (' + granskade + ' rader i egen-blocket)');
}

function testEgenResultatInteAv() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const iRita = html.indexOf('function ritaEgen');
  const iSlut = html.indexOf("getElementById('egen-exempel')", iRita);
  if (iRita < 0 || iSlut < 0) {
    fail('egen-av: hittar inte ritaEgen');
    return;
  }
  const fn = html.slice(iRita, iSlut);
  const rader = fn.split('\n');
  let granskade = 0;
  const av = [];
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (/\d+\s*av\s*\d+/.test(rader[i]) || rader[i].includes(' av ')) av.push(rader[i].trim());
  }
  const overlay = html.match(/id="egen-overlay"[\s\S]*?id="egen-dokument"/);
  const overlayText = overlay ? overlay[0].replace(/<[^>]+>/g, ' ') : '';
  if (granskade === 0) {
    fail('egen-av: noll rader granskade');
    return;
  }
  if (av.length || /\d+\s*av\s*\d+/.test(overlayText) || overlayText.includes(' av ')) {
    fail('egen-av: resultatrutan innehåller n av m');
  } else {
    console.log('OK  egen resultatruta utan n av m (' + granskade + ' rader i ritaEgen)');
  }
}

function testExempelNummerIData() {
  const data = lasData();
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  if (!data || !data.dokument) {
    fail('exempel-nummer: saknar data');
    return;
  }
  const anrop = [...html.matchAll(/strangUrDokument\('([^']+)',\s*'([^']+)'\)/g)];
  const nummerAnrop = anrop.filter((m) => m[2] === 'personnummer' || m[2] === 'telefonnummer');
  if (nummerAnrop.length === 0) {
    fail('exempel-nummer: noll poster granskade');
    return;
  }
  const alla = data.dokument.map((x) => x.text).join('\n');
  const saknas = [];
  for (const m of nummerAnrop) {
    const dok = data.dokument.find((x) => x.id === m[1] && x.hog === 1) || data.dokument.find((x) => x.id === m[1]);
    if (!dok) {
      saknas.push(m[1] + ' saknas');
      continue;
    }
    const post = (dok.facit || []).find((p) => p.typ === m[2]);
    const s = post ? post['ursprunglig sträng'] || post['skadad sträng'] || '' : '';
    if (!s || !alla.includes(s)) saknas.push(m[1] + ' ' + m[2] + ' ' + s);
  }
  if (saknas.length) fail('exempel-nummer saknas i data.js: ' + saknas.join('; '));
  else {
    console.log(
      'OK  exempeltextens personnummer och telefonnummer finns i data.js (' +
        nummerAnrop.length +
        ' poster: ' +
        nummerAnrop.map((m) => m[1] + ' ' + m[2]).join(', ') +
        ')',
    );
  }
}

function testTalSkadaISidan() {
  const data = lasData();
  if (!data || !data.dokument) {
    fail('tal: saknar data');
    return;
  }
  const h1 = new Map(data.dokument.filter((x) => x.hog === 1).map((x) => [x.id, x.text]));
  const h2 = data.dokument.filter((x) => x.hog === 2);
  let lika = 0;
  let granskade = 0;
  for (const dok of h2) {
    const a = h1.get(dok.id);
    if (a === undefined) continue;
    granskade++;
    if (a === dok.text) lika++;
  }
  if (granskade === 0) {
    fail('tal: noll par granskade');
    return;
  }
  const skadade = granskade - lika;
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const tal = [
    [granskade, 'totalt'],
    [lika, 'oskadade'],
    [skadade, 'skadade'],
  ];
  const saknas = tal.filter(([n]) => !html.includes(String(n)));
  if (saknas.length) fail('tal saknas i sidan: ' + saknas.map((t) => t[1] + '=' + t[0]).join(', '));
  else {
    console.log(
      'OK  talen stämmer med omräkning ur data.js (' +
        granskade +
        ' par: skadade ' +
        skadade +
        ', oskadade ' +
        lika +
        ')',
    );
  }
}

function testForbehallEnGang() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const nal = 'gick ut på nätet';
  const rader = html.split('\n');
  let granskade = 0;
  let n = 0;
  for (let i = 0; i < rader.length; i++) {
    granskade++;
    if (rader[i].includes(nal)) n++;
  }
  if (granskade === 0) {
    fail('förbehåll: noll rader granskade');
    return;
  }
  if (n !== 1) fail('förbehåll: ' + n + ' förekomster, ska vara 1');
  else console.log('OK  förbehållstexten förekommer exakt en gång (' + granskade + ' rader)');
}

function testIngetTakLoggrader() {
  const html = fs.readFileSync(path.join(repo, 'demo/index.html'), 'utf8');
  const start = html.indexOf('function laggForsok');
  const slut = html.indexOf('function kortAdress', start);
  if (start < 0 || slut < 0) {
    fail('tak: hittar inte laggForsok');
    return;
  }
  const fn = html.slice(start, slut);
  const rader = fn.split('\n');
  if (rader.length === 0) {
    fail('tak: noll rader granskade');
    return;
  }
  const tak = [];
  for (let i = 0; i < rader.length; i++) {
    if (/length\s*[<>=].*\d|slice\s*\(|max.*rad|om\s+fler\s+än/.test(rader[i])) tak.push(rader[i].trim());
  }
  const append = fn.includes('appendChild');
  if (!append) fail('tak: laggForsok appenderar inte');
  if (tak.length) fail('tak på loggrader: ' + tak.join('; '));
  else console.log('OK  inget tak på antal loggrader (' + rader.length + ' rader i laggForsok, appendChild finns)');
}

function main() {
  console.log('Test demo');
  testHtmlIngenNatverkskod();
  testFacitPekarRatt();
  testAntalMotKorpus();
  testPaketTioDokument();
  testIngaFlikar();
  testSammaDokumentnummer();
  testFelflaggadeKollisioner();
  testExempelIDatan();
  testOppnarMaskerat();
  testSlumpknapp();
  testNatverkBaraMatarknapp();
  testIngressExempelIDataIgen();
  testLista1BaraObservator();
  testIngenLindningNatverk();
  testTvaListorOlikaId();
  testMaskeratOchSlumpKvar();
  testEgenSammaDetektor();
  testEgenIngenLagringEllerNat();
  testEgenResultatInteAv();
  testExempelNummerIData();
  testTalSkadaISidan();
  testForbehallEnGang();
  testIngetTakLoggrader();
  if (fel) process.exit(1);
  console.log('Alla tester OK');
}

main();
