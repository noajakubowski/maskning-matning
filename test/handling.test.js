#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  genereraHog,
  lasDokumentStruktur,
  planeraDokument,
  skapaKvotPlan,
  valjMeningarUtanAterlaggning,
} = require('../generator/index.js');
const { valjMallar } = require('../generator/mallar.js');
const { skapaSlump } = require('../generator/slump.js');

const repo = path.resolve(__dirname, '..');
let fel = 0;

function fail(msg) {
  console.error(`BRIST: ${msg}`);
  fel++;
}

function lasTestData() {
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    fail('Saknar namnpool.json');
    return null;
  }
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const koll = fs.readFileSync(path.join(repo, 'generator/kollisionslista.md'), 'utf8')
    .split('\n')
    .filter((l) => /^\| [A-ZÅÄÖ]/.test(l))
    .map((l) => ({ ord: l.split('|')[1].trim() }));
  const mallar = valjMallar(skapaSlump('handling-test'));
  return { namnpool, kollisionsord: koll, mallar };
}

function testLasDokumentStruktur() {
  const s = lasDokumentStruktur();
  if (s.beslut.bakgrund !== 5 || s.beslut.skal !== 5 || s.beslut.slut !== 3) {
    fail('beslutsantal stämmer inte');
    return;
  }
  if (s.ansokan.arende !== 4 || s.tjansteanteckning.anteckning !== 3) {
    fail('ansökan/tjänsteanteckning antal stämmer inte');
    return;
  }
  console.log('OK  lasDokumentStruktur läser värden ur gallande-varden.md');
}

function testPlaneraDokument() {
  const slump = skapaSlump('plan-test');
  const plan = skapaKvotPlan(1, []);
  const dokument = planeraDokument(slump.blandning(plan), slump);
  const beslut = dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length !== 200) {
    fail(`förväntade 200 beslut, fick ${beslut.length}`);
    return;
  }
  for (const d of beslut) {
    if (d.uppgifter.length !== 3) {
      fail('beslut saknar tre uppgifter');
      return;
    }
  }
  console.log('OK  planeraDokument skapar min(namn, pnr, tel) beslut med en uppgift vardera');
}

function testEnSokandePerBeslut() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-sokande',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  for (const dok of beslut) {
    const poster = hog.facit.filter((p) => p['dokument-id'] === dok.id);
    const namn = poster.filter((p) => p.typ === 'personnamn').length;
    const pnr = poster.filter((p) => p.typ === 'personnummer').length;
    const tel = poster.filter((p) => p.typ === 'telefonnummer').length;
    if (namn !== 1 || pnr !== 1 || tel !== 1) {
      fail(`${dok.id}: förväntade 1 namn, 1 pnr, 1 tel — fick ${namn}, ${pnr}, ${tel}`);
      return;
    }
  }
  console.log(`OK  varje beslut har en sökande (${beslut.length} dokument)`);
}

function testAnsokanStruktur() {
  const data = lasTestData();
  if (!data) return;
  const struktur = lasDokumentStruktur();
  const hog = genereraHog({
    seed: 'handling-ansokan',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const ansokningar = hog.dokument.filter((d) => d.typ === 'ansokan');
  if (!ansokningar.length) {
    fail('ingen ansökan genererades');
    return;
  }
  for (const dok of ansokningar) {
    if (!dok.text.includes('ÄRENDET\n\n')) {
      fail(`${dok.id}: saknar avsnittet ÄRENDET`);
      return;
    }
    const arende = dok.text.split('ÄRENDET\n\n')[1].trim().split('\n').filter((s) => s.trim());
    if (arende.length !== struktur.ansokan.arende) {
      fail(`${dok.id}: ärende ${arende.length} !== ${struktur.ansokan.arende}`);
      return;
    }
  }
  console.log(`OK  ansökan har avsnittet ÄRENDET (${ansokningar.length} dokument)`);
}

function testTjansteanteckningStruktur() {
  const data = lasTestData();
  if (!data) return;
  const struktur = lasDokumentStruktur();
  const hog = genereraHog({
    seed: 'handling-tjanst',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const anteckningar = hog.dokument.filter((d) => d.typ === 'tjansteanteckning');
  if (!anteckningar.length) {
    fail('ingen tjänsteanteckning genererades');
    return;
  }
  for (const dok of anteckningar) {
    if (!dok.text.includes('ANTECKNING\n\n')) {
      fail(`${dok.id}: saknar avsnittet ANTECKNING`);
      return;
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(dok.text.split('\n')[0])) {
      fail(`${dok.id}: rubrik saknar datum`);
      return;
    }
    const anteckning = dok.text.split('ANTECKNING\n\n')[1].trim().split('\n').filter((s) => s.trim());
    if (anteckning.length !== struktur.tjansteanteckning.anteckning) {
      fail(`${dok.id}: anteckning ${anteckning.length} !== ${struktur.tjansteanteckning.anteckning}`);
      return;
    }
  }
  console.log(`OK  tjänsteanteckning har avsnittet ANTECKNING (${anteckningar.length} dokument)`);
}

function testValjMeningarUtanAterlaggning() {
  const slump = skapaSlump('meningar-utan');
  const mallar = valjMallar(slump);
  const valda = valjMeningarUtanAterlaggning(slump, mallar, 'beslut', 'bakgrund', 5);
  const unika = new Set(valda);
  if (unika.size !== valda.length) {
    fail('meningar återanvänds inom avsnitt');
    return;
  }
  console.log('OK  valjMeningarUtanAterlaggning ger inga dubbletter');
}

function testRadbrytningInomAvsnitt() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-radbryt',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.find((d) => d.typ === 'beslut');
  if (!beslut) {
    fail('inget beslutsdokument');
    return;
  }
  const bakgrund = beslut.text.split('BAKGRUND\n\n')[1].split('\n\nSKÄL')[0];
  if (bakgrund.includes('\n\n')) {
    fail('dubbel radbrytning inom bakgrundsavsnitt');
    return;
  }
  if (!beslut.text.includes('BAKGRUND\n\n')) {
    fail('saknar dubbel radbrytning före bakgrund');
    return;
  }
  console.log('OK  enkel radbrytning inom avsnitt, dubbel mellan avsnitt');
}

function testIngetDiarienummerIAndraTyper() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-diarium',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const ovriga = hog.dokument.filter((d) => d.typ !== 'beslut');
  for (const dok of ovriga) {
    if (/Diarienummer:/.test(dok.text)) {
      fail(`${dok.id}: diarienummer i ${dok.typ}`);
      return;
    }
  }
  console.log(`OK  inget diarienummer i ansökan eller tjänsteanteckning (${ovriga.length} dokument)`);
}

function testDeterminism() {
  const data = lasTestData();
  if (!data) return;
  const seed = 'handling-det';
  const a = genereraHog({ seed, hogtyp: 1, namnpool: data.namnpool, kollisionsord: [], mallar: data.mallar });
  const b = genereraHog({ seed, hogtyp: 1, namnpool: data.namnpool, kollisionsord: [], mallar: data.mallar });
  if (JSON.stringify(a) !== JSON.stringify(b)) fail('determinism bruten efter dokumentform v2');
  else console.log('OK  samma frö ger identisk hög efter dokumentform v2');
}

function testIngaDubletterInomAvsnitt() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-dubb',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const rubrikRe = /^[A-ZÅÄÖ]{4,}$/;
  let granskade = 0;
  for (const dok of hog.dokument) {
    let avs = null;
    const buf = {};
    for (const rad of dok.text.split('\n')) {
      const s = rad.trim();
      if (rubrikRe.test(s)) { avs = s; buf[avs] = buf[avs] || []; continue; }
      if (avs && s) buf[avs].push(s);
    }
    for (const rader of Object.values(buf)) {
      granskade++;
      const unika = new Set(rader);
      if (unika.size !== rader.length) {
        fail('dubblett inom avsnitt');
        return;
      }
    }
  }
  if (granskade === 0) {
    fail('noll avsnitt granskade');
    return;
  }
  console.log(`OK  inga dubbletter inom avsnitt (${granskade} avsnitt)`);
}

function testSammaNamnGenomBeslut() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-namn',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const poster = hog.facit.filter((p) => p['dokument-id'] === dok.id && p.typ === 'personnamn');
    if (poster.length !== 1) {
      fail(`${dok.id}: förväntade 1 personnamn i facit, fick ${poster.length}`);
      return;
    }
    const bakgrundIdx = dok.text.indexOf('BAKGRUND');
    const bröd = dok.text.slice(bakgrundIdx);
    const sokande = poster[0]['ursprunglig sträng'];
    if (bröd.includes(sokande)) {
      fail(`${dok.id}: sökandens namn förekommer i brödtext utanför formalia`);
      return;
    }
  }
  console.log(`OK  ett namn per beslut, inget namn i brödtext (${granskade} dokument)`);
}

function testFacitPositioner() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-pos',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const txt = Object.fromEntries(hog.dokument.map((d) => [d.id, d.text]));
  let granskade = 0;
  for (const p of hog.facit) {
    granskade++;
    const t = txt[p['dokument-id']];
    const v = p['skadad sträng'] || p['ursprunglig sträng'];
    if (t.slice(p.startposition, p.slutposition) !== v) {
      fail(`position pekar fel i ${p['dokument-id']}`);
      return;
    }
  }
  console.log(`OK  facitpositioner stämmer (${granskade} poster)`);
}

function testKvoter() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-kvot',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const namn = hog.facit.filter((p) => p.typ === 'personnamn').length;
  const pnr = hog.facit.filter((p) => p.typ === 'personnummer').length;
  const tel = hog.facit.filter((p) => p.typ === 'telefonnummer').length;
  if (hog.facit.length !== 1000) { fail(`facit ${hog.facit.length} !== 1000`); return; }
  if (namn !== 400) { fail(`namn ${namn} !== 400`); return; }
  if (pnr !== 400) { fail(`pnr ${pnr} !== 400`); return; }
  if (tel !== 200) { fail(`tel ${tel} !== 200`); return; }
  console.log(`OK  kvoter stämmer (${hog.facit.length} poster)`);
}

function testIngetDiarienummerIFacit() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-facit-dek',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  let granskade = 0;
  for (const p of hog.facit) {
    granskade++;
    const s = String(p['ursprunglig sträng']);
    if (/\d{4}\/\d{5}/.test(s)) { fail('diarienummer i facit'); return; }
    if (p.typ === 'personnummer') continue;
    if (/\d{4}-\d{2}-\d{2}/.test(s) && p.typ !== 'personnummer') {
      fail('beslutsdatum i facit');
      return;
    }
  }
  console.log(`OK  inget diarienummer eller beslutsdatum i facit (${granskade} poster)`);
}

function testBeslutDiariumOchDatum() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-diarium-beslut',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const rader = dok.text.split('\n');
    if (!/\d{4}\/\d{4}/.test(rader.find((r) => r.startsWith('Diarienummer: ')) || '')) {
      fail(`${dok.id}: saknar diarienummer`);
      return;
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(rader.find((r) => r.startsWith('Beslutsdatum: ')) || '')) {
      fail(`${dok.id}: saknar beslutsdatum`);
      return;
    }
  }
  console.log(`OK  varje beslut har diarienummer och datum (${granskade} dokument)`);
}

function testHog3Struktur() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'handling-hog3',
    hogtyp: 3,
    namnpool: data.namnpool,
    kollisionsord: data.kollisionsord,
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length !== 200) {
    fail(`hög 3: förväntade 200 beslut, fick ${beslut.length}`);
    return;
  }
  const kollisionNamn = hog.facit.filter((p) => p['undertyp eller ark'] === 'kollisionsord').length;
  if (kollisionNamn !== 200) {
    fail(`hög 3: förväntade 200 kollisionsord-namn, fick ${kollisionNamn}`);
    return;
  }
  console.log('OK  hög 3 följer samma dokumentstruktur och kollisionskvot');
}

console.log('Test handling');
testLasDokumentStruktur();
testPlaneraDokument();
testEnSokandePerBeslut();
testAnsokanStruktur();
testTjansteanteckningStruktur();
testValjMeningarUtanAterlaggning();
testRadbrytningInomAvsnitt();
testIngetDiarienummerIAndraTyper();
testDeterminism();
testIngaDubletterInomAvsnitt();
testBeslutDiariumOchDatum();
testIngetDiarienummerIFacit();
testSammaNamnGenomBeslut();
testFacitPositioner();
testKvoter();
testHog3Struktur();

if (fel) process.exit(1);
console.log('Alla tester OK');
