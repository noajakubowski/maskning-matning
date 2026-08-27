#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { genereraHog, lasDokumentStruktur } = require('../generator/index.js');
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
  const mallar = valjMallar(skapaSlump('beslut-test'));
  return { namnpool, kollisionsord: koll, mallar };
}

function genereraBeslut(data, seed) {
  const { namnpool, kollisionsord, mallar } = data;
  const hog = genereraHog({
    seed,
    hogtyp: 1,
    namnpool,
    kollisionsord: [],
    mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  return { hog, beslut };
}

function testIngetDiarienummerIFacit() {
  const data = lasTestData();
  if (!data) return;
  const ut = genereraBeslut(data, 'beslut-facit');
  const poster = ut.hog.facit.filter((p) =>
    ut.beslut.some((d) => d.id === p['dokument-id']));
  console.log(`Granskade ${poster.length} facitposter i beslutsdokument`);
  if (poster.length === 0) {
    fail('noll facitposter i beslutsdokument');
    return;
  }
  const medSnedstreck = poster.filter((p) => String(p['ursprunglig sträng']).includes('/'));
  const medDatum = poster.filter((p) => /\d{4}-\d{2}-\d{2}/.test(String(p['ursprunglig sträng'])));
  if (medSnedstreck.length || medDatum.length) {
    fail('diarienummer eller beslutsdatum i facit');
  } else {
    console.log('OK  inget diarienummer eller beslutsdatum i facit');
  }
}

function testBeslutAvsnitt() {
  const data = lasTestData();
  if (!data) return;
  const ut = genereraBeslut(data, 'beslut-avsnitt');
  console.log(`Granskade ${ut.beslut.length} beslutsdokument`);
  for (const dok of ut.beslut) {
    const t = dok.text;
    if (!t.includes('BAKGRUND')) fail(`saknar BAKGRUND i ${dok.id}`);
    else if (!t.includes('SKÄL')) fail(`saknar SKÄL i ${dok.id}`);
    else if (!t.includes('BESLUT')) fail(`saknar BESLUT i ${dok.id}`);
    else if (t.indexOf('BAKGRUND') >= t.indexOf('BESLUT')) fail(`fel avsnittsordning i ${dok.id}`);
  }
  if (!fel) console.log('OK  varje beslutsdokument har avsnitten bakgrund, skäl och beslut');
}

function testBeslutRubrikOchFormalia() {
  const data = lasTestData();
  if (!data) return;
  const ut = genereraBeslut(data, 'beslut-rubrik');
  for (const dok of ut.beslut) {
    const rader = dok.text.split('\n');
    if (!rader[0].trim()) fail(`${dok.id}: saknar rubrikrad`);
    else if (!rader.some((r) => r.startsWith('Diarienummer: '))) fail(`${dok.id}: saknar diarienummer-rad`);
    else if (!rader.some((r) => r.startsWith('Beslutsdatum: '))) fail(`${dok.id}: saknar datum-rad`);
    else if (rader.indexOf('BAKGRUND') <= rader.findIndex((r) => r.startsWith('Beslutsdatum: '))) {
      fail(`${dok.id}: formalia saknas före BAKGRUND`);
    }
  }
  if (!fel) console.log('OK  beslutsdokument börjar med rubrik, diarienummer och datum');
}

function testAntalMeningar() {
  const data = lasTestData();
  if (!data) return;
  const struktur = lasDokumentStruktur();
  const ut = genereraBeslut(data, 'beslut-antal');
  for (const dok of ut.beslut) {
    const bakgrund = dok.text.split('BAKGRUND\n\n')[1].split('\n\nSKÄL')[0]
      .split('\n').filter((s) => s.trim()).length;
    const skal = dok.text.split('SKÄL\n\n')[1].split('\n\nBESLUT')[0]
      .split('\n').filter((s) => s.trim()).length;
    const slut = dok.text.split('BESLUT\n\n')[1].trim().split('\n').filter((s) => s.trim()).length;
    if (bakgrund !== struktur.beslut.bakgrund) {
      fail(`${dok.id}: bakgrund ${bakgrund} !== ${struktur.beslut.bakgrund}`);
      return;
    }
    if (skal !== struktur.beslut.skal) {
      fail(`${dok.id}: skäl ${skal} !== ${struktur.beslut.skal}`);
      return;
    }
    if (slut !== struktur.beslut.slut) {
      fail(`${dok.id}: beslut ${slut} !== ${struktur.beslut.slut}`);
      return;
    }
  }
  console.log(`OK  antal meningar per avsnitt stämmer (${ut.beslut.length} dokument)`);
}

function testDeterminism() {
  const data = lasTestData();
  if (!data) return;
  const { namnpool, kollisionsord, mallar } = data;
  const seed = 'beslut-det';
  const a = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const b = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  if (JSON.stringify(a) !== JSON.stringify(b)) fail('determinism bruten efter beslutsändring');
  else console.log('OK  samma frö ger identisk hög efter beslutsändringen');
}

console.log('Test beslut');
testIngetDiarienummerIFacit();
testBeslutAvsnitt();
testBeslutRubrikOchFormalia();
testAntalMeningar();
testDeterminism();

if (fel) process.exit(1);
console.log('Alla tester OK');
