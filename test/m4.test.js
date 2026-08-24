#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  wilson95,
  tango95,
  tangoScoreChi2,
  Z95_2,
  TANGO_ROT_TOL,
  tangoTackningsSimulering,
} = require('../matning/intervall.js');
const { matUppsattning, unionFlaggor } = require('../matning/matchning.js');
const { paraFacit, kravPlantId, arMiss } = require('../matning/parning.js');
const { matAlla, formatUtskrift, MATUPPSATTNINGAR, paradDifferens, typEtikett, matHog } = require('../matning/index.js');

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
    return { kod: 0 };
  } catch (err) {
    return { kod: err.status || 1, ut: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

function nara(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

function testWilsonFixture() {
  const fix = JSON.parse(fs.readFileSync(path.join(repo, 'test/fixtur/intervall-referens.json'), 'utf8'));
  const fall = fix.wilson_95;
  console.log(`Granskade ${fall.length} Wilson-fall i fixturen`);
  if (fall.length === 0) {
    fail('Wilson-fixturen är tom');
    return;
  }
  for (const f of fall) {
    const w = wilson95(f.traff, f.n);
    if (!nara(w.lo, f.lo, 1e-12) || !nara(w.hi, f.hi, 1e-12)) {
      fail(`Wilson avviker för traff=${f.traff}, n=${f.n}: lo=${w.lo}, hi=${w.hi}`);
    }
  }
  console.log('OK  Wilson stämmer mot fixturen');
}

function testTangoFixture() {
  const fix = JSON.parse(fs.readFileSync(path.join(repo, 'test/fixtur/intervall-referens.json'), 'utf8'));
  const fall = fix.tango_95;
  console.log(`Granskade ${fall.length} Tango-fall i fixturen`);
  if (fall.length === 0) {
    fail('Tango-fixturen är tom');
    return;
  }
  for (const f of fall) {
    const t = tango95(f.n01, f.n10, f.n);
    if (!nara(t.delta, f.delta, 1e-12)) {
      fail(`Tango delta avviker för n01=${f.n01}, n10=${f.n10}, n=${f.n}: ${t.delta}`);
    }
    if (!nara(t.lo, f.lo, 1e-6) || !nara(t.hi, f.hi, 1e-6)) {
      fail(`Tango intervall avviker för n01=${f.n01}, n10=${f.n10}, n=${f.n}: lo=${t.lo}, hi=${t.hi}`);
    }
  }
  console.log('OK  Tango stämmer mot fixturen');
}

function testTangoKonvergens() {
  const f = { n01: 60, n10: 20, n: 1000 };
  const t = tango95(f.n01, f.n10, f.n);
  const chiLo = tangoScoreChi2(f.n01, f.n10, f.n, t.lo);
  const chiHi = tangoScoreChi2(f.n01, f.n10, f.n, t.hi);
  console.log(`Granskade Tango-konvergens vid n01=${f.n01}, n10=${f.n10}, n=${f.n}`);
  if (!nara(chiLo, Z95_2, TANGO_ROT_TOL) || !nara(chiHi, Z95_2, TANGO_ROT_TOL)) {
    fail(`Tango rotsökning konvergerade inte till 1e-10: chiLo=${chiLo}, chiHi=${chiHi}`);
  } else {
    console.log('OK  Tango rotsökning konvergerar till 1e-10');
  }
}

function testTangoTackning() {
  const sim = tangoTackningsSimulering('tango-tackning-m4', 10000);
  console.log(`Granskade ${sim.korningar} Tango-täckningsupprepningar`);
  if (sim.korningar === 0) {
    fail('täckningssimuleringen körde inga upprepningar');
    return;
  }
  const pct = sim.andel * 100;
  if (pct < 93 || pct > 97) {
    fail(`Tango-täckning ${pct.toFixed(2)} % ligger utanför 93–97 %`);
  } else {
    console.log(`OK  Tango-täckning ${pct.toFixed(2)} % inom 93–97 %`);
  }
}

function testMatningImport() {
  const gen = korGranska(path.join(repo, 'matning'), ['--forbjud-import', 'generator']);
  if (gen.kod === 2) fail(`granska-kod kunde inte parsa matning/: ${gen.ut.trim()}`);
  else if (gen.kod !== 0) fail('matning/ importerar från generator/');
  else {
    const det = korGranska(path.join(repo, 'matning'), ['--forbjud-import', 'detektor']);
    if (det.kod === 2) fail(`granska-kod kunde inte parsa matning/: ${det.ut.trim()}`);
    else if (det.kod !== 0) fail('matning/ importerar från detektor/');
    else console.log('OK  matning/ importerar inte generator/ eller detektor/');
  }

  const filer = listaJs(path.join(repo, 'matning'));
  const medFs = filer.filter((f) => /require\s*\(\s*['"]fs['"]/.test(fs.readFileSync(f, 'utf8')));
  if (medFs.length) fail(`matning/ använder fs: ${medFs.join(', ')}`);
  else console.log('OK  ingen filhantering i matning/');
}

function testMatningLaserInteFixtur() {
  const r = korGranska(path.join(repo, 'matning'), ['--forbjud-strang', 'test/fixtur']);
  if (r.kod === 2) fail(`granska-kod kunde inte parsa matning/: ${r.ut.trim()}`);
  else if (r.kod !== 0) fail('matning/ läser test/fixtur/');
  else console.log('OK  matning/ läser aldrig test/fixtur/');
}

function testIngetPVarde() {
  const text = [
    ...listaJs(path.join(repo, 'matning')),
    path.join(repo, 'cli/mat.js'),
  ].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  if (/p-värde|p-värde|pvarde|pValue|p_value|\bp\s*=\s*.*test/i.test(text)) {
    fail('kod nämner p-värde eller hypotestest');
  } else {
    console.log('OK  inget p-värde beräknas eller skrivs ut');
  }
  const ut = formatUtskrift({ perHog: [], parvis: [] });
  if (/p-värde|p-värde/i.test(ut)) fail('utskrift nämner p-värde');
}

function byggMiniHog(seed, hogtyp, facit, flaggorMonster, flaggorLexikon) {
  return {
    seed,
    hogtyp,
    dokument: [{ id: 'doc-0001', text: 'x'.repeat(200) }],
    facit,
    flaggorMonster,
    flaggorLexikon,
  };
}

function testSummering() {
  const facit = [
    {
      plant_id: 'plant-0001',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 10,
      slutposition: 22,
      'ursprunglig sträng': '890101-2384',
    },
    {
      plant_id: 'plant-0002',
      'dokument-id': 'doc-0001',
      typ: 'telefonnummer',
      'undertyp eller ark': 'med skiljetecken',
      startposition: 30,
      slutposition: 44,
      'ursprunglig sträng': '070-123 45 67',
    },
  ];
  const monster = [{
    'dokument-id': 'doc-0001',
    startposition: 10,
    slutposition: 22,
    typ: 'personnummer',
    detektor: 'monster',
  }];
  const lexikon = [];
  const hog = byggMiniHog('sum-test', 1, facit, monster, lexikon);
  for (const upp of MATUPPSATTNINGAR) {
    const flaggor = upp === 'monster' ? monster : upp === 'lexikon' ? lexikon : unionFlaggor(monster, lexikon);
    const r = matUppsattning(facit, hog.dokument, flaggor);
    const sum = r.perTyp.reduce((acc, t) => acc + t.full + t.delvis + t.miss, 0);
    console.log(`Granskade ${sum} facitposter i summering (${upp})`);
    if (sum === 0) fail(`summering ${upp}: noll poster`);
    else if (sum !== facit.length) fail(`summering ${upp}: ${sum} !== ${facit.length}`);
  }
  console.log('OK  full + delvis + miss = antalet facitposter');
}

function testPlantIdParning() {
  try {
    kravPlantId([{ typ: 'personnummer' }], 'test');
    fail('saknat plant_id borde kasta');
  } catch (err) {
    if (!err.kod) fail('saknat plant_id gav inte felkod');
    else console.log('OK  saknat plant_id avslutar med felkod');
  }

  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    fail('Saknar namnpool.json för parningstest');
    return;
  }
  const { genereraHog } = require(path.join(repo, 'generator/index.js'));
  const { valjMallar } = require(path.join(repo, 'generator/mallar.js'));
  const { skapaSlump } = require(path.join(repo, 'generator/slump.js'));
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const mallar = valjMallar(skapaSlump('m4-test'));
  const seed = 'm4-par-test';
  const hog1 = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const hog2 = genereraHog({ seed, hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const par = paraFacit(hog1.facit, hog2.facit);
  console.log(`Granskade ${par.antalPar} parade poster på plant_id`);
  if (par.antalPar === 0) fail('parning gav noll poster');
  else if (par.antalPar !== 1000) fail(`parning gav ${par.antalPar} av 1000`);
  else console.log('OK  parning på plant_id ger 1000 av 1000');
}

function testDeltaTecken() {
  const facit = [
    {
      plant_id: 'plant-0001',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 10,
      slutposition: 22,
      'ursprunglig sträng': '890101-2384',
    },
    {
      plant_id: 'plant-0002',
      'dokument-id': 'doc-0001',
      typ: 'telefonnummer',
      'undertyp eller ark': 'med skiljetecken',
      startposition: 30,
      slutposition: 44,
      'ursprunglig sträng': '070-123 45 67',
    },
    {
      plant_id: 'plant-0003',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 50,
      slutposition: 62,
      'ursprunglig sträng': '850505-1234',
    },
  ];
  const monsterA = [
    {
      'dokument-id': 'doc-0001',
      startposition: 10,
      slutposition: 22,
      typ: 'personnummer',
      detektor: 'monster',
    },
    {
      'dokument-id': 'doc-0001',
      startposition: 30,
      slutposition: 44,
      typ: 'telefonnummer',
      detektor: 'monster',
    },
    {
      'dokument-id': 'doc-0001',
      startposition: 50,
      slutposition: 62,
      typ: 'personnummer',
      detektor: 'monster',
    },
  ];
  const monsterB = [
    {
      'dokument-id': 'doc-0001',
      startposition: 10,
      slutposition: 22,
      typ: 'personnummer',
      detektor: 'monster',
    },
  ];
  const hogA = byggMiniHog('delta-a', 1, facit, monsterA, []);
  const hogB = byggMiniHog('delta-b', 2, facit, monsterB, []);
  const diff = paradDifferens(hogA, hogB, 'monster');
  const par = paraFacit(hogA.facit, hogB.facit);
  const matA = matUppsattning(facit, hogA.dokument, monsterA);
  const matB = matUppsattning(facit, hogB.dokument, monsterB);
  const idxA = new Map(facit.map((p, i) => [p.plant_id, i]));
  const idxB = new Map(facit.map((p, i) => [p.plant_id, i]));
  let missA = 0;
  let missB = 0;
  for (const p of par.par) {
    const iA = idxA.get(p.a.plant_id);
    const iB = idxB.get(p.b.plant_id);
    if (arMiss(matA.perPost[iA].klass)) missA++;
    if (arMiss(matB.perPost[iB].klass)) missB++;
  }
  const n = par.antalPar;
  const forvantadDiff = (missB - missA) / n;
  console.log(`Granskade delta mot rå missfrekvens (${missA}→${missB} missar av ${n})`);
  if (!nara(diff.delta, forvantadDiff, 1e-12)) {
    fail(`delta ${diff.delta} avviker från rå missdifferens ${forvantadDiff} (n01=${diff.n01}, n10=${diff.n10})`);
  } else if (forvantadDiff !== 0 && Math.sign(diff.delta) !== Math.sign(forvantadDiff)) {
    fail(`delta har fel tecken: ${diff.delta} vs forvantad ${forvantadDiff}`);
  } else if (forvantadDiff <= 0) {
    fail('testupplägg: hög B borde missa mer än hög A');
  } else {
    console.log('OK  delta har samma tecken och belopp som rå missdifferens');
  }
}

function testDeltaKontrollrakning() {
  // Ett vänt tecken ger intervall som är korrekt brett, centrerat och innehåller
  // punktskattningen — enda sättet att fånga fel tecken är att kontrollräkna
  // det som faktiskt står i utskriften mot L2:s (n01 − n10) / n.
  const facit = [
    {
      plant_id: 'plant-0001',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 10,
      slutposition: 22,
      'ursprunglig sträng': '890101-2384',
    },
    {
      plant_id: 'plant-0002',
      'dokument-id': 'doc-0001',
      typ: 'telefonnummer',
      'undertyp eller ark': 'med skiljetecken',
      startposition: 30,
      slutposition: 44,
      'ursprunglig sträng': '070-123 45 67',
    },
    {
      plant_id: 'plant-0003',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 50,
      slutposition: 62,
      'ursprunglig sträng': '850505-1234',
    },
  ];
  const monsterA = [
    {
      'dokument-id': 'doc-0001',
      startposition: 10,
      slutposition: 22,
      typ: 'personnummer',
      detektor: 'monster',
    },
    {
      'dokument-id': 'doc-0001',
      startposition: 30,
      slutposition: 44,
      typ: 'telefonnummer',
      detektor: 'monster',
    },
    {
      'dokument-id': 'doc-0001',
      startposition: 50,
      slutposition: 62,
      typ: 'personnummer',
      detektor: 'monster',
    },
  ];
  const monsterB = [
    {
      'dokument-id': 'doc-0001',
      startposition: 10,
      slutposition: 22,
      typ: 'personnummer',
      detektor: 'monster',
    },
  ];
  const hogA = byggMiniHog('kontroll-a', 1, facit, monsterA, []);
  const hogB = byggMiniHog('kontroll-b', 2, facit, monsterB, []);
  const diff = paradDifferens(hogA, hogB, 'monster');
  const text = diff.text;
  const celler = text.match(/n01=(\d+), n10=(\d+), n=(\d+)/);
  if (!celler) {
    fail('kontrollräkning: kunde inte läsa n01, n10, n ur utskriften');
    return;
  }
  const n01 = Number(celler[1]);
  const n10 = Number(celler[2]);
  const n = Number(celler[3]);
  const deltaMatch = text.match(/δ=([+-]?\d+\.\d+) pp/);
  if (!deltaMatch) {
    fail('kontrollräkning: kunde inte läsa delta ur utskriften');
    return;
  }
  const rapporterat = Number(deltaMatch[1]) / 100;
  const exakt = (n01 - n10) / n;
  const somUtskrift = Number((exakt * 100).toFixed(1)) / 100;
  console.log(`Granskade L2-kontroll (n01=${n01}, n10=${n10}, n=${n})`);
  if (rapporterat !== somUtskrift) {
    fail(`kontrollräkning: δ=${rapporterat} avviker från (n01-n10)/n=${exakt} (avrundat ${somUtskrift})`);
  } else if (n01 <= n10) {
    fail('kontrollräkning: n01 borde vara större än n10 i testupplägget');
  } else if (Math.sign(rapporterat) !== Math.sign(exakt)) {
    fail('kontrollräkning: utskrivet delta har fel tecken');
  } else {
    console.log('OK  utskrivet delta stämmer med (n01 − n10) / n');
  }
}

function testTypEtiketter() {
  const facit = [
    {
      plant_id: 'plant-0001',
      'dokument-id': 'doc-0001',
      typ: 'personnummer',
      'undertyp eller ark': 'tiosiffriga',
      startposition: 10,
      slutposition: 22,
      'ursprunglig sträng': '890101-2384',
    },
    {
      plant_id: 'plant-0002',
      'dokument-id': 'doc-0001',
      typ: 'telefonnummer',
      'undertyp eller ark': 'med skiljetecken',
      startposition: 30,
      slutposition: 44,
      'ursprunglig sträng': '070-123 45 67',
    },
  ];
  const monster = [{
    'dokument-id': 'doc-0001',
    startposition: 10,
    slutposition: 22,
    typ: 'personnummer',
    detektor: 'monster',
  }];
  const hog = byggMiniHog('typ-test', 1, facit, monster, []);
  const ut = formatUtskrift({ perHog: [matHog(hog)], parvis: [] });
  const rader = ut.split('\n');
  const pnIdx = rader.findIndex((r) => r.includes(typEtikett('personnummer', 'tiosiffriga')));
  const telIdx = rader.findIndex((r) => r.includes(typEtikett('telefonnummer', 'med skiljetecken')));
  if (pnIdx < 0 || telIdx < 0) fail('saknar typetiketter i utskrift');
  else if (pnIdx > telIdx) fail('typer inte grupperade i ordning');
  else if (ut.indexOf('personnamn, var annat') >= 0) fail('skriver omöjlig typförväxling');
  else console.log('OK  typetiketter och filtrerad typförväxling i utskrift');
}

function testUtskriftAntal() {
  const rader = formatUtskrift({
    perHog: [{
      seed: 'x',
      hogtyp: 1,
      antalDokument: 3,
      antalFacit: 10,
      matuppsattningar: {
        monster: {
          summering: { total: 10 },
          rader: [{ text: 'full träff: 1 av 10 (n=10)' }],
          overflaggning: {
            textAbs: 'överflaggning absolut: 0 tecken (n=100 tecken)',
            textPer1000: 'överflaggning per 1000: 0 (n=3 dokument)',
            textSpann: 'överflaggade spann: 0 (n=0 spann)',
          },
        },
        lexikon: {
          summering: { total: 10 },
          rader: [],
          overflaggning: {
            textAbs: 'a (n=1)',
            textPer1000: 'b (n=2)',
            textSpann: 'c (n=3)',
          },
        },
        union: {
          summering: { total: 10 },
          rader: [],
          overflaggning: {
            textAbs: 'd (n=4)',
            textPer1000: 'e (n=5)',
            textSpann: 'f (n=6)',
          },
        },
      },
    }],
    parvis: [{ text: 'parad differens (n=1000 parade poster)' }],
  }).split('\n');
  console.log(`Granskade ${rader.length} utskriftrader`);
  if (rader.length === 0) {
    fail('ingen utskrift');
    return;
  }
  const utanN = rader.filter((r) => !/\bn=\d+/.test(r) && !/^(Frö|Högtyp|Mätuppsättning|Antal|IMPLEMENTATIONSVERIFIERING)/.test(r)
    && !r.includes(' / '));
  if (utanN.length) fail(`rader utan n= antal: ${utanN.join(' | ')}`);
  else console.log('OK  varje utskriven rad anger n= antal poster');
}

console.log('Test M4');
testWilsonFixture();
testTangoFixture();
testTangoKonvergens();
testTangoTackning();
testMatningImport();
testMatningLaserInteFixtur();
testIngetPVarde();
testSummering();
testDeltaTecken();
testDeltaKontrollrakning();
testTypEtiketter();
testPlantIdParning();
testUtskriftAntal();

if (fel) process.exit(1);
console.log('Alla tester OK');
