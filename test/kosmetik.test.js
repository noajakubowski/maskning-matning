#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { genereraHog } = require('../generator/index.js');
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
  const mallar = valjMallar(skapaSlump('kosmetik-test'));
  return { namnpool, kollisionsord: koll, mallar };
}

function formaliaBlock(text) {
  const rader = text.split('\n');
  const bakgrundIdx = rader.indexOf('BAKGRUND');
  if (bakgrundIdx < 0) return [];
  let start = 0;
  for (let i = 0; i < bakgrundIdx; i++) {
    if (rader[i].startsWith('Beslutsdatum: ')) start = i + 1;
  }
  return rader.slice(start, bakgrundIdx).filter((r) => r.trim());
}

const SOKANDE_MENING = [
  / är sökande i ärendet\.$/,
  /^Namn enligt ansökan: .+\.$/,
  /^Sökanden i ärendet är .+\.$/,
  /^.+ anges som sökande i ärendet\.$/,
];

function arSokandeMening(rad) {
  return SOKANDE_MENING.some((re) => re.test(rad));
}

function testArstalMatchar() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'kosm-ar',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length === 0) {
    fail('noll beslutsdokument');
    return;
  }
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const diarie = dok.text.match(/Diarienummer:\s*(\d{4})\/\d{4}/);
    const datum = dok.text.match(/Beslutsdatum:\s*(\d{4})-/);
    if (!diarie || !datum || diarie[1] !== datum[1]) {
      fail(`${dok.id}: diarieår ${diarie && diarie[1]} ≠ datumår ${datum && datum[1]}`);
      return;
    }
  }
  console.log(`OK  diarienumrets årtal matchar beslutsdatum (${granskade} dokument)`);
}

function testIngetFramtidaDatum() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'kosm-datum',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length === 0) {
    fail('noll beslutsdokument');
    return;
  }
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const m = dok.text.match(/Beslutsdatum:\s*(\d{4})-(\d{2})-(\d{2})/);
    if (!m || parseInt(m[1], 10) > 2024) {
      fail(`${dok.id}: datum efter 2024`);
      return;
    }
  }
  console.log(`OK  inget beslutsdatum efter 2024 (${granskade} dokument)`);
}

function testLopnummerFyraSiffror() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'kosm-lop',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length === 0) {
    fail('noll beslutsdokument');
    return;
  }
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const m = dok.text.match(/Diarienummer:\s*\d{4}\/(\d{4})/);
    if (!m || m[1].length !== 4) {
      fail(`${dok.id}: löpnummer har inte fyra siffror`);
      return;
    }
  }
  console.log(`OK  löpnummer har fyra siffror (${granskade} dokument)`);
}

function testEnSokandeMening() {
  const data = lasTestData();
  if (!data) return;
  const hog = genereraHog({
    seed: 'kosm-sok',
    hogtyp: 1,
    namnpool: data.namnpool,
    kollisionsord: [],
    mallar: data.mallar,
  });
  const beslut = hog.dokument.filter((d) => d.typ === 'beslut');
  if (beslut.length === 0) {
    fail('noll beslutsdokument');
    return;
  }
  let granskade = 0;
  for (const dok of beslut) {
    granskade++;
    const block = formaliaBlock(dok.text);
    const sokande = block.filter((r) => arSokandeMening(r));
    if (sokande.length !== 1) {
      fail(`${dok.id}: ${sokande.length} sökandemeningar i formalia`);
      return;
    }
  }
  console.log(`OK  exakt en sökandemening i formalia (${granskade} dokument)`);
}

console.log('Test kosmetik');
testArstalMatchar();
testIngetFramtidaDatum();
testLopnummerFyraSiffror();
testEnSokandeMening();

if (fel) process.exit(1);
console.log('Alla tester OK');
