#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { detekteraDokument } = require('../detektor/index.js');
const { granskaKall } = require('../verktyg/granska-kod.js');

const repo = path.resolve(__dirname, '..');
let fel = 0;

function fail(msg) {
  console.error(`BRIST: ${msg}`);
  fel++;
}

function listaJs(mapp) {
  const ut = [];
  if (!fs.existsSync(mapp)) return ut;
  for (const namn of fs.readdirSync(mapp)) {
    const full = path.join(mapp, namn);
    if (fs.statSync(full).isDirectory()) ut.push(...listaJs(full));
    else if (namn.endsWith('.js')) ut.push(full);
  }
  return ut;
}

function korGranska(mal, flaggor) {
  const args = [path.join(repo, 'verktyg/granska-kod.js'), mal];
  for (const f of flaggor) args.push(f);
  try {
    execFileSync(process.execPath, args, { encoding: 'utf8', stdio: 'pipe' });
    return 0;
  } catch (err) {
    return err.status || 1;
  }
}

function testDetektorImporterarInteGenerator() {
  if (korGranska(path.join(repo, 'detektor'), ['--forbjud-import', 'generator']) !== 0) {
    fail('detektor/ importerar från generator/');
  } else {
    console.log('OK  detektor/ importerar aldrig från generator/');
  }
}

function testNamnerInteFacit() {
  const mal = [
    ...listaJs(path.join(repo, 'detektor')),
    path.join(repo, 'cli/detektera.js'),
  ];
  let ok = true;
  for (const fil of mal) {
    const kall = fs.readFileSync(fil, 'utf8');
    const r = granskaKall(kall, fil, {
      forbjudAnrop: [],
      forbjudImport: [],
      forbjudStrang: ['facit'],
    });
    if (r.kod !== 0) ok = false;
  }
  if (!ok) fail('detektor/ eller cli/detektera.js nämner facit');
  else console.log('OK  detektor/ och cli/detektera.js nämner aldrig facit');
}

function testIngenMathRandom() {
  if (korGranska(path.join(repo, 'detektor'), ['--forbjud-anrop', 'Math.random']) !== 0) {
    fail('Math.random i detektor/');
  } else {
    console.log('OK  ingen Math.random i detektor/');
  }
}

function testIngenUndertyp() {
  const lexikonPath = path.join(repo, 'detektor/namn/lexikon.json');
  if (!fs.existsSync(lexikonPath)) {
    fail('Saknar lexikon.json');
    return;
  }
  const lexikon = JSON.parse(fs.readFileSync(lexikonPath, 'utf8'));
  const text = [
    'Kontakt 070-123 45 67 och 0701234567 samt +46701234567.',
    'Personnummer 890101-2384 och 19890101-2384.',
    'Namn Andersson och Berg i texten.',
  ].join('\n');
  const r = detekteraDokument('doc-test', text, lexikon);
  const alla = [...r.monster, ...r.lexikon];
  const medUndertyp = alla.filter((f) =>
    Object.prototype.hasOwnProperty.call(f, 'undertyp') ||
    Object.prototype.hasOwnProperty.call(f, 'undertyp eller ark'),
  );
  if (medUndertyp.length > 0) fail('flagga bär undertyp för personnummer eller telefon');
  else console.log('OK  ingen flagga bär undertyp för personnummer eller telefon');
}

function testReproducerbarhet() {
  const lexikonPath = path.join(repo, 'detektor/namn/lexikon.json');
  if (!fs.existsSync(lexikonPath)) {
    fail('Saknar lexikon.json');
    return;
  }
  const lexikon = JSON.parse(fs.readFileSync(lexikonPath, 'utf8'));
  const text = 'Anna-Karin 890101-2384 Andersson +46701234567';
  const a = detekteraDokument('doc-0001', text, lexikon);
  const b = detekteraDokument('doc-0001', text, lexikon);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    fail('samma text gav olika flaggor');
  } else {
    console.log('OK  samma text ger identiska flaggor vid upprepad körning');
  }
}

console.log('Test M2');
testDetektorImporterarInteGenerator();
testNamnerInteFacit();
testIngenMathRandom();
testIngenUndertyp();
testReproducerbarhet();

if (fel) process.exit(1);
console.log('Alla tester OK');
