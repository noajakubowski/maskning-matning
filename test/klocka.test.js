#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { genereraHog, lasBeslutsArIntervall } = require('../generator/index.js');
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
  const mallar = valjMallar(skapaSlump('klocka-test'));
  return { namnpool, kollisionsord: koll, mallar };
}

function testIngenSystemklocka() {
  const mappar = ['generator', 'matning', 'cli'];
  let granskade = 0;
  const träffar = [];
  for (const mapp of mappar) {
    const rot = path.join(repo, mapp);
    if (!fs.existsSync(rot)) continue;
    for (const fil of fs.readdirSync(rot, { withFileTypes: true })) {
      if (!fil.name.endsWith('.js')) continue;
      granskade++;
      const innehall = fs.readFileSync(path.join(rot, fil.name), 'utf8').split('\n');
      innehall.forEach((rad, idx) => {
        if (rad.includes('new Date') || rad.includes('Date.now')) {
          träffar.push(`${mapp}/${fil.name}:${idx + 1}`);
        }
      });
    }
  }
  if (granskade === 0) {
    fail('noll filer granskade');
    return;
  }
  if (träffar.length) {
    fail(`systemklocka i: ${träffar.join(', ')}`);
    return;
  }
  console.log(`OK  ingen systemklocka (${granskade} filer granskade)`);
}

function testArtalInomIntervall() {
  const data = lasTestData();
  if (!data) return;
  const { min, max } = lasBeslutsArIntervall();
  const hog = genereraHog({
    seed: 'klocka-artal',
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
    if (!diarie || !datum) {
      fail(`${dok.id}: saknar diarienummer eller datum`);
      return;
    }
    const arD = parseInt(diarie[1], 10);
    const arB = parseInt(datum[1], 10);
    if (arD < min || arD > max || arB < min || arB > max) {
      fail(`${dok.id}: årtal utanför ${min}–${max}`);
      return;
    }
  }
  console.log(`OK  alla årtal inom ${min}–${max} (${granskade} dokument)`);
}

function testIntervallStammerMedDocs() {
  const kod = lasBeslutsArIntervall();
  const docs = fs.readFileSync(path.join(repo, 'docs/gallande-varden.md'), 'utf8');
  let min = null;
  let max = null;
  for (const rad of docs.split('\n')) {
    if (!rad.includes('|')) continue;
    const m = rad.match(/\| ([^|]+?) \| (\d+) \|/);
    if (!m) continue;
    const etikett = m[1].trim().normalize('NFC').toLowerCase();
    const antal = parseInt(m[2], 10);
    if (etikett === 'beslutsår, min') min = antal;
    else if (etikett === 'beslutsår, max') max = antal;
  }
  if (min === null || max === null) {
    fail('saknar intervall i gallande-varden.md');
    return;
  }
  if (kod.min !== min || kod.max !== max) {
    fail(`kod ${kod.min}–${kod.max} ≠ docs ${min}–${max}`);
    return;
  }
  console.log(`OK  intervall i kod stämmer med gallande-varden.md (${min}–${max})`);
}

console.log('Test klocka');
testIngenSystemklocka();
testArtalInomIntervall();
testIntervallStammerMedDocs();

if (fel) process.exit(1);
console.log('Alla tester OK');
